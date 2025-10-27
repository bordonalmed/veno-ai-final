/**
 * Hotmart Webhook Handler - Full Implementation with Firebase Admin
 * 
 * This is the COMPLETE implementation with Firebase Admin SDK.
 * To use this, you need to:
 * 1. Install firebase-admin: npm install firebase-admin
 * 2. Configure service account credentials
 * 3. Replace THIS file with hotmartWebhook.js
 */

const crypto = require('crypto');
const admin = require('firebase-admin');

// Initialize Firebase Admin (one-time)
if (!admin.apps.length) {
  try {
    // Use service account from environment variable
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString()
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || 'veno-ai-final'
    });

    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error);
    // Fallback: initialize without service account (development)
    try {
      admin.initializeApp();
      console.log('⚠️ Firebase Admin initialized in development mode');
    } catch (err) {
      console.error('❌ Failed to initialize Firebase Admin:', err);
    }
  }
}

const HOTMART_SECRET = process.env.HOTMART_WEBHOOK_SECRET || 'SEU_SECRET_AQUI';

exports.handler = async (event, context) => {
  const startTime = Date.now();
  
  console.log('🔥 [HOTMART WEBHOOK] Event received:', {
    httpMethod: event.httpMethod,
    timestamp: new Date().toISOString()
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
    // 1. Parse and validate webhook data
    const webhookData = JSON.parse(event.body);
    const { event: webhookEvent, data } = webhookData;

    console.log('📨 [WEBHOOK] Event type:', webhookEvent);
    console.log('📦 [WEBHOOK] Event data keys:', Object.keys(data));

    // 2. Extract mapping info
    const { 
      buyer_email, 
      purchase_transaction_id, 
      subscription_status,
      external_reference, // ← THIS IS THE KEY: Firebase UID passed during checkout
      product,
      purchase_date,
      warranty_date,
      checkout_country,
      buyer_phone
    } = data;

    console.log('🔍 [WEBHOOK] Extracted data:', {
      email: buyer_email,
      transactionId: purchase_transaction_id,
      externalReference: external_reference,
      subscriptionStatus: subscription_status
    });

    // 3. Map to Firebase UID using external_reference (CRITICAL!)
    const firebaseUID = external_reference;
    
    if (!firebaseUID) {
      console.error('❌ [WEBHOOK] No external_reference (Firebase UID) provided!');
      console.error('💡 [WEBHOOK] TIP: Pass Firebase UID as external_reference during Hotmart checkout');
      
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing external_reference (Firebase UID)',
          tip: 'Pass Firebase UID as external_reference parameter in Hotmart checkout URL'
        })
      };
    }

    console.log('✅ [WEBHOOK] Using Firebase UID from external_reference:', firebaseUID);

    // 4. Determine premium status
    const isPremiumActive = shouldActivatePremium(webhookEvent, subscription_status);
    
    console.log('💎 [WEBHOOK] Premium decision:', {
      event: webhookEvent,
      status: subscription_status,
      shouldActivate: isPremiumActive
    });

    // 5. Check idempotency (has this transaction been processed?)
    const transactionDoc = await admin.firestore()
      .collection('transactions')
      .doc(purchase_transaction_id)
      .get();
    
    const transactionProcessed = transactionDoc.exists;
    
    if (transactionProcessed) {
      console.log('⚠️ [WEBHOOK] Transaction already processed:', purchase_transaction_id);
      
      const existingData = transactionDoc.data();
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Transaction already processed',
          transactionId: purchase_transaction_id,
          processedAt: existingData.processedAt,
          alreadyProcessed: true
        })
      };
    }

    // 6. Update Firestore user document
    const userDocRef = admin.firestore().collection('users').doc(firebaseUID);
    
    const updateData = {
      premium: isPremiumActive,
      premiumUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      premiumExpiresAt: warranty_date || null,
      lastPurchaseTransactionId: purchase_transaction_id,
      lastPurchaseDate: purchase_date,
      productId: product?.id,
      // Update these only if not already set
      email: buyer_email,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await userDocRef.set(updateData, { merge: true });
    
    console.log('✅ [WEBHOOK] Firestore document updated:', {
      uid: firebaseUID,
      premium: isPremiumActive,
      transactionId: purchase_transaction_id
    });

    // 7. Set custom claims for Firebase Auth
    const claims = {
      premium: isPremiumActive
    };
    
    if (warranty_date) {
      claims.premiumExpiresAt = warranty_date;
    }

    await admin.auth().setCustomUserClaims(firebaseUID, claims);
    
    console.log('✅ [WEBHOOK] Custom claims set:', {
      uid: firebaseUID,
      claims: JSON.stringify(claims)
    });

    // 8. Mark transaction as processed (idempotency)
    await admin.firestore().collection('transactions').doc(purchase_transaction_id).set({
      uid: firebaseUID,
      email: buyer_email,
      event: webhookEvent,
      premium: isPremiumActive,
      transactionData: data,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      processingTimeMs: Date.now() - startTime
    });

    console.log('✅ [WEBHOOK] Transaction marked as processed');

    // 9. Success response
    const processingTime = Date.now() - startTime;
    
    console.log('🎉 [WEBHOOK] Successfully processed in', processingTime, 'ms');

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
        event: webhookEvent,
        processedAt: new Date().toISOString(),
        processingTimeMs: processingTime
      })
    };

  } catch (error) {
    console.error('❌ [WEBHOOK] Error processing webhook:', error);
    console.error('Stack:', error.stack);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

/**
 * Determine if premium should be activated based on event and status
 */
function shouldActivatePremium(event, subscriptionStatus) {
  console.log('🔍 [PREMIUM CHECK] Event:', event, 'Status:', subscriptionStatus);
  
  // Events that ACTIVATE premium
  const activeEvents = [
    'PURCHASE_APPROVED',
    'PURCHASE_COMPLETE',
    'PURCHASE_BILLED',
    'SUBSCRIPTION_ACTIVATED',
    'SUBSCRIPTION_RENEWED',
    'ORDER_APPROVED',
    'ORDER_BILLED'
  ];

  // Events that DEACTIVATE premium
  const deactiveEvents = [
    'PURCHASE_CHARGEBACK',
    'PURCHASE_REFUNDED',
    'PURCHASE_CANCELED',
    'SUBSCRIPTION_CANCELED',
    'SUBSCRIPTION_EXPIRED',
    'ORDER_CANCELLED',
    'ORDER_REFUNDED',
    'ORDER_CHARGEBACK'
  ];

  if (activeEvents.includes(event)) {
    console.log('✅ [PREMIUM CHECK] Activating premium - active event');
    return true;
  }

  if (deactiveEvents.includes(event)) {
    console.log('❌ [PREMIUM CHECK] Deactivating premium - deactive event');
    return false;
  }

  // Check subscription status as fallback
  const activeStatuses = ['ACTIVE', 'APPROVED', 'COMPLETED', 'RELEASED', 'LATE_PAYMENT'];
  const shouldActivate = activeStatuses.includes(subscriptionStatus);
  
  console.log('⚠️ [PREMIUM CHECK] Using subscription status:', subscriptionStatus, '→', shouldActivate);
  
  return shouldActivate;
}

