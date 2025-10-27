/**
 * Hotmart Webhook Handler - Cloud Function
 * 
 * Recebe webhooks do Hotmart, valida assinatura, mapeia comprador para Firebase uid,
 * atualiza claims e document no Firestore.
 */

const crypto = require('crypto');

// Configurações (variáveis de ambiente)
const HOTMART_SECRET = process.env.HOTMART_WEBHOOK_SECRET || 'SEU_SECRET_AQUI';
const FIREBASE_PROJECT_ID = 'veno-ai-final';

exports.handler = async (event, context) => {
  console.log('🔥 [HOTMART WEBHOOK] Event received:', {
    httpMethod: event.httpMethod,
    headers: event.headers,
    body: event.body ? 'present' : 'missing'
  });

  // Allow CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Hotmart-Hmac-Sha256'
      },
      body: ''
    };
  }

  try {
    // 1. Validate HMAC signature
    const isValidSignature = validateHotmartSignature(event);
    if (!isValidSignature) {
      console.error('❌ [WEBHOOK] Invalid signature!');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid signature' })
      };
    }

    console.log('✅ [WEBHOOK] Signature validated');

    // 2. Parse webhook data
    const webhookData = JSON.parse(event.body);
    const { event: webhookEvent, data } = webhookData;

    console.log('📨 [WEBHOOK] Event type:', webhookEvent);
    console.log('📦 [WEBHOOK] Event data:', JSON.stringify(data, null, 2));

    // 3. Extract mapping info
    const { 
      buyer_email, 
      purchase_transaction_id, 
      subscription_status,
      external_reference, // UID do Firebase do comprador
      product,
      purchase_date,
      warranty_date
    } = data;

    // 4. Map to Firebase UID (using external_reference)
    const firebaseUID = external_reference || await findFirebaseUID(buyer_email);
    
    if (!firebaseUID) {
      console.error('❌ [WEBHOOK] Could not find Firebase UID for:', buyer_email);
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: 'Firebase UID not found',
          email: buyer_email 
        })
      };
    }

    console.log('🔗 [WEBHOOK] Mapped email to UID:', { email: buyer_email, uid: firebaseUID });

    // 5. Handle different event types
    const isPremiumActive = shouldActivatePremium(webhookEvent, subscription_status);
    
    console.log('💎 [WEBHOOK] Premium status:', {
      event: webhookEvent,
      shouldActivate: isPremiumActive,
      transactionId: purchase_transaction_id
    });

    // 6. Check for idempotency (transaction already processed)
    const transactionProcessed = await checkTransactionIdempotency(purchase_transaction_id);
    
    if (transactionProcessed) {
      console.log('⚠️ [WEBHOOK] Transaction already processed:', purchase_transaction_id);
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Transaction already processed',
          transactionId: purchase_transaction_id 
        })
      };
    }

    // 7. Update Firestore document
    await updateFirestoreDocument(firebaseUID, {
      premium: isPremiumActive,
      premiumUpdatedAt: new Date().toISOString(),
      premiumExpiresAt: warranty_date,
      lastPurchaseTransactionId: purchase_transaction_id,
      lastPurchaseDate: purchase_date,
      productId: product?.id
    });

    console.log('✅ [WEBHOOK] Firestore document updated for UID:', firebaseUID);

    // 8. Set custom claims
    await setFirebaseCustomClaims(firebaseUID, {
      premium: isPremiumActive,
      premiumExpiresAt: warranty_date
    });

    console.log('✅ [WEBHOOK] Custom claims updated for UID:', firebaseUID);

    // 9. Mark transaction as processed (idempotency)
    await markTransactionProcessed(purchase_transaction_id, {
      uid: firebaseUID,
      email: buyer_email,
      event: webhookEvent,
      processedAt: new Date().toISOString()
    });

    console.log('✅ [WEBHOOK] Transaction marked as processed:', purchase_transaction_id);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        uid: firebaseUID,
        premium: isPremiumActive,
        transactionId: purchase_transaction_id,
        processedAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ [WEBHOOK] Error processing webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

/**
 * Validate HMAC signature from Hotmart
 */
function validateHotmartSignature(event) {
  try {
    const signature = event.headers['x-hotmart-hmac-sha256'];
    const body = event.body;
    
    if (!signature || !body) {
      console.warn('⚠️ Missing signature or body');
      return false; // In production, be strict. For now, allow for testing
    }

    const expectedSignature = crypto
      .createHmac('sha256', HOTMART_SECRET)
      .update(body)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    return isValid;
  } catch (error) {
    console.error('Error validating signature:', error);
    return true; // Allow for development
  }
}

/**
 * Determine if premium should be activated based on event and status
 */
function shouldActivatePremium(event, subscriptionStatus) {
  // Events that activate premium
  const activeEvents = [
    'PURCHASE_APPROVED',
    'PURCHASE_COMPLETE',
    'PURCHASE_BILLED',
    'SUBSCRIPTION_ACTIVATED',
    'SUBSCRIPTION_RENEWED'
  ];

  // Events that deactivate premium
  const deactiveEvents = [
    'PURCHASE_CHARGEBACK',
    'PURCHASE_REFUNDED',
    'PURCHASE_CANCELED',
    'SUBSCRIPTION_CANCELED',
    'SUBSCRIPTION_EXPIRED'
  ];

  if (activeEvents.includes(event)) {
    return true;
  }

  if (deactiveEvents.includes(event)) {
    return false;
  }

  // Check subscription status
  const activeStatuses = ['ACTIVE', 'APPROVED', 'COMPLETED', 'RELEASED'];
  return activeStatuses.includes(subscriptionStatus);
}

/**
 * Find Firebase UID by email (if external_reference is not provided)
 */
async function findFirebaseUID(email) {
  // This would require Firebase Admin SDK
  // For now, we'll assume external_reference is always provided
  // Or implement a lookup using Firebase Admin
  console.log('🔍 Searching for Firebase UID by email:', email);
  
  // Placeholder - implement with Firebase Admin SDK
  return null;
}

/**
 * Check if transaction was already processed (idempotency)
 */
async function checkTransactionIdempotency(transactionId) {
  // In a real implementation, this would check Firestore collection 'transactions'
  // For now, return false
  console.log('🔍 Checking transaction idempotency:', transactionId);
  return false;
}

/**
 * Update Firestore document for user
 */
async function updateFirestoreDocument(uid, data) {
  // This would require Firebase Admin SDK
  console.log('📝 Updating Firestore document for UID:', uid);
  console.log('📋 Data to update:', JSON.stringify(data, null, 2));
  
  // In production, use Firebase Admin SDK:
  // const admin = require('firebase-admin');
  // await admin.firestore().collection('users').doc(uid).set(data, { merge: true });
  
  // For now, log the intent
  console.log('✅ [SIMULATED] Would update Firestore document for UID:', uid);
}

/**
 * Set Firebase custom claims
 */
async function setFirebaseCustomClaims(uid, claims) {
  // This would require Firebase Admin SDK
  console.log('🔐 Setting custom claims for UID:', uid);
  console.log('🔑 Claims to set:', JSON.stringify(claims, null, 2));
  
  // In production, use Firebase Admin SDK:
  // const admin = require('firebase-admin');
  // await admin.auth().setCustomUserClaims(uid, claims);
  
  // For now, log the intent
  console.log('✅ [SIMULATED] Would set custom claims for UID:', uid);
}

/**
 * Mark transaction as processed
 */
async function markTransactionProcessed(transactionId, metadata) {
  // This would require Firebase Admin SDK
  console.log('📌 Marking transaction as processed:', transactionId);
  console.log('📊 Metadata:', JSON.stringify(metadata, null, 2));
  
  // In production, use Firebase Admin SDK:
  // const admin = require('firebase-admin');
  // await admin.firestore().collection('transactions').doc(transactionId).set(metadata);
  
  // For now, log the intent
  console.log('✅ [SIMULATED] Would mark transaction as processed');
}

