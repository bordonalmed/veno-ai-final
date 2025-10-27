/**
 * Premium Service - Client-side implementation
 * 
 * Handles premium status reading from Firebase Auth claims and Firestore,
 * refreshes tokens, and provides UI helpers.
 */

import { auth } from '../config/firebase';

class PremiumService {
  /**
   * Refresh auth token and get premium status from claims
   * This MUST be called after any payment/webhook to get latest claims
   */
  static async refreshPremium() {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        console.warn('⚠️ [PREMIUM] No user logged in');
        return { premium: false, source: 'no-user' };
      }

      // Force token refresh to get latest claims
      await user.getIdToken(true);
      
      const tokenResult = await user.getIdTokenResult();
      
      console.log('✅ [PREMIUM] Claims refreshed:', {
        uid: user.uid,
        premium: tokenResult.claims.premium,
        premiumExpiresAt: tokenResult.claims.premiumExpiresAt
      });

      const premium = !!tokenResult.claims.premium;
      
      // Also sync to Firestore for double-check
      await this.syncPremiumToLocalStorage(user.uid, premium);

      return {
        premium,
        premiumExpiresAt: tokenResult.claims.premiumExpiresAt,
        source: 'claims'
      };

    } catch (error) {
      console.error('❌ [PREMIUM] Error refreshing premium:', error);
      return { premium: false, error: error.message };
    }
  }

  /**
   * Sync premium status from Firestore to localStorage
   */
  static async syncPremiumToLocalStorage(uid, premium) {
    try {
      const userEmail = localStorage.getItem('userEmail');
      
      if (userEmail) {
        // Update localStorage with premium status
        if (premium) {
          localStorage.setItem(`plano_${userEmail}`, 'premium');
          localStorage.setItem('plano_premium', 'true');
          console.log('✅ [PREMIUM] Synced to localStorage:', userEmail, '→', premium);
        } else {
          localStorage.removeItem(`plano_${userEmail}`);
          localStorage.removeItem('plano_premium');
        }
      }
    } catch (error) {
      console.error('❌ [PREMIUM] Error syncing to localStorage:', error);
    }
  }

  /**
   * Check if user has premium (from multiple sources with fallback)
   */
  static async checkPremiumStatus() {
    try {
      // Method 1: Check custom claims (most reliable)
      const claimsResult = await this.getPremiumFromClaims();
      if (claimsResult.premium !== undefined) {
        return claimsResult;
      }

      // Method 2: Check Firestore document
      const firestoreResult = await this.getPremiumFromFirestore();
      if (firestoreResult.premium !== undefined) {
        return firestoreResult;
      }

      // Method 3: Check localStorage (fallback)
      const localResult = this.getPremiumFromLocalStorage();
      return localResult;

    } catch (error) {
      console.error('❌ [PREMIUM] Error checking premium status:', error);
      return { premium: false, error: error.message };
    }
  }

  /**
   * Get premium status from Firebase Auth claims
   */
  static async getPremiumFromClaims() {
    try {
      const user = auth.currentUser;
      if (!user) return { premium: false, source: 'no-user' };

      const tokenResult = await user.getIdTokenResult();
      const premium = !!tokenResult.claims.premium;

      console.log('📋 [PREMIUM] From claims:', premium);

      return {
        premium,
        premiumExpiresAt: tokenResult.claims.premiumExpiresAt,
        source: 'claims'
      };

    } catch (error) {
      console.error('❌ [PREMIUM] Error getting claims:', error);
      return { error: error.message };
    }
  }

  /**
   * Get premium status from Firestore
   */
  static async getPremiumFromFirestore() {
    try {
      const { db } = await import('../config/firebase');
      const { getDoc, doc } = await import('firebase/firestore');
      
      const user = auth.currentUser;
      if (!user) return { premium: false, source: 'no-user' };

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        const premium = !!data.premium;

        console.log('📋 [PREMIUM] From Firestore:', premium);

        return {
          premium,
          premiumExpiresAt: data.premiumExpiresAt,
          source: 'firestore'
        };
      }

      return { premium: false, source: 'no-doc' };

    } catch (error) {
      console.error('❌ [PREMIUM] Error getting from Firestore:', error);
      return { error: error.message };
    }
  }

  /**
   * Get premium status from localStorage (fallback)
   */
  static getPremiumFromLocalStorage() {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) return { premium: false, source: 'no-email' };

      const plano = localStorage.getItem(`plano_${userEmail}`);
      const premium = plano === 'premium';

      console.log('📋 [PREMIUM] From localStorage:', premium);

      return {
        premium,
        source: 'localStorage'
      };

    } catch (error) {
      console.error('❌ [PREMIUM] Error getting from localStorage:', error);
      return { premium: false };
    }
  }

  /**
   * Force refresh premium status (call after payment returns)
   */
  static async forceRefresh() {
    console.log('🔄 [PREMIUM] Force refreshing premium status...');
    
    const result = await this.refreshPremium();
    
    console.log('✅ [PREMIUM] Refresh completed:', result);
    
    return result;
  }

  /**
   * Watch premium status changes (for UI updates)
   */
  static onPremiumStatusChange(callback) {
    return auth.onIdTokenChanged(async (user) => {
      if (user) {
        const status = await this.getPremiumFromClaims();
        callback(status);
      } else {
        callback({ premium: false });
      }
    });
  }
}

export default PremiumService;

