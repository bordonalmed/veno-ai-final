/**
 * Premium Service - Usando localStorage (Firebase removido)
 * TODO: Migrar para Supabase quando configurado
 */

class PremiumService {
  /**
   * Refresh premium status from localStorage
   */
  static async refreshPremium() {
    try {
      const userEmail = localStorage.getItem('userEmail');
      
      if (!userEmail) {
        console.warn('⚠️ [PREMIUM] No user logged in');
        return { premium: false, source: 'no-user' };
      }

      const premium = this.getPremiumFromLocalStorage().premium;
      
      console.log('✅ [PREMIUM] Status refreshed:', {
        email: userEmail,
        premium: premium
      });

      return {
        premium,
        source: 'localStorage'
      };

    } catch (error) {
      console.error('❌ [PREMIUM] Error refreshing premium:', error);
      return { premium: false, error: error.message };
    }
  }

  /**
   * Sync premium status to localStorage
   */
  static async syncPremiumToLocalStorage(uid, premium) {
    try {
      const userEmail = localStorage.getItem('userEmail');
      
      if (userEmail) {
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
   * Check if user has premium (from localStorage)
   */
  static async checkPremiumStatus() {
    try {
      return this.getPremiumFromLocalStorage();
    } catch (error) {
      console.error('❌ [PREMIUM] Error checking premium status:', error);
      return { premium: false, error: error.message };
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
   * Get premium from claims (stub - não usado mais)
   */
  static async getPremiumFromClaims() {
    return this.getPremiumFromLocalStorage();
  }

  /**
   * Get premium from Firestore (stub - não usado mais)
   */
  static async getPremiumFromFirestore() {
    return this.getPremiumFromLocalStorage();
  }

  /**
   * Force refresh premium status
   */
  static async forceRefresh() {
    console.log('🔄 [PREMIUM] Force refreshing premium status...');
    
    const result = await this.refreshPremium();
    
    console.log('✅ [PREMIUM] Refresh completed:', result);
    
    return result;
  }

  /**
   * Watch premium status changes (simulado)
   */
  static onPremiumStatusChange(callback) {
    // Simular mudanças verificando periodicamente
    const intervalId = setInterval(() => {
      const status = this.getPremiumFromLocalStorage();
      callback(status);
    }, 5000);

    // Retornar função para cancelar
    return () => {
      clearInterval(intervalId);
    };
  }
}

export default PremiumService;