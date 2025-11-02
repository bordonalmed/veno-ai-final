/**
 * Premium Service - Usando Supabase + localStorage
 */
import { supabase, supabaseConfig } from '../config/supabase';

class PremiumService {
  /**
   * Refresh premium status from Supabase + localStorage
   */
  static async refreshPremium() {
    try {
      const userEmail = localStorage.getItem('userEmail');
      const userUID = localStorage.getItem('userUID');
      
      if (!userEmail) {
        console.warn('⚠️ [PREMIUM] No user logged in');
        return { premium: false, source: 'no-user' };
      }

      // Buscar do Supabase primeiro se configurado
      if (supabaseConfig.isConfigured && supabase && userUID) {
        try {
          console.log('🔍 [PREMIUM] Buscando status no Supabase...');
          const { data: userData, error: supabaseError } = await supabase
            .from('users')
            .select('premium, plano')
            .eq('id', userUID)
            .single();

          if (!supabaseError && userData) {
            const isPremium = userData.premium === true;
            
            // Sincronizar com localStorage
            if (isPremium) {
              localStorage.setItem(`plano_${userEmail}`, 'premium');
              localStorage.setItem('plano_premium', 'true');
            } else {
              localStorage.removeItem(`plano_${userEmail}`);
              localStorage.removeItem('plano_premium');
            }

            console.log('✅ [PREMIUM] Status do Supabase:', {
              email: userEmail,
              premium: isPremium
            });

            return {
              premium: isPremium,
              source: 'supabase'
            };
          }
        } catch (supabaseErr) {
          console.warn('⚠️ [PREMIUM] Erro ao buscar do Supabase:', supabaseErr);
        }
      }

      // Fallback para localStorage
      const premium = this.getPremiumFromLocalStorage().premium;
      
      console.log('✅ [PREMIUM] Status refreshed (localStorage):', {
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
   * Sync premium status to Supabase + localStorage
   */
  static async syncPremiumToLocalStorage(uid, premium) {
    try {
      const userEmail = localStorage.getItem('userEmail');
      
      // Salvar no Supabase se configurado
      if (supabaseConfig.isConfigured && supabase && uid) {
        try {
          console.log('💾 [PREMIUM] Salvando status no Supabase...');
          const { error: updateError } = await supabase
            .from('users')
            .update({
              premium: premium === true,
              plano: premium ? 'premium' : 'trial',
              updated_at: new Date().toISOString()
            })
            .eq('id', uid);

          if (updateError) {
            console.error('❌ [PREMIUM] Erro ao salvar no Supabase:', updateError);
          } else {
            console.log('✅ [PREMIUM] Status salvo no Supabase:', premium);
          }
        } catch (supabaseErr) {
          console.error('❌ [PREMIUM] Erro ao conectar com Supabase:', supabaseErr);
        }
      }

      // Salvar em localStorage também
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