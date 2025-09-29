// Serviço de Sincronização Unificado - VENO.AI
import { AuthService } from './authService.js';

export class SyncServiceUnified {
  
  static STORAGE_KEYS = {
    SYNC_CODES: 'venoai_sync_codes',
    USER_DATA: 'venoai_user_data'
  };

  // Gerar código de sincronização
  static generateSyncCode(email) {
    try {
      const normalizedEmail = AuthService.normalizeEmail(email);
      const user = AuthService.getUserByEmail(normalizedEmail);
      
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      const syncCode = this.createSyncCode(user);
      
      // Salvar código temporariamente (válido por 1 hora)
      const codes = this.getSyncCodes();
      codes[syncCode] = {
        email: normalizedEmail,
        userId: user.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hora
        used: false
      };
      
      localStorage.setItem(this.STORAGE_KEYS.SYNC_CODES, JSON.stringify(codes));
      
      console.log('✅ Código de sincronização gerado:', normalizedEmail);
      return syncCode;
      
    } catch (error) {
      console.error('Erro ao gerar código de sincronização:', error);
      throw error;
    }
  }

  // Criar código de sincronização
  static createSyncCode(user) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 8);
    const userId = user.id.substr(-4);
    
    return `${timestamp}-${random}-${userId}`.toUpperCase();
  }

  // Aplicar código de sincronização
  static applySyncCode(syncCode) {
    try {
      const codes = this.getSyncCodes();
      const codeData = codes[syncCode];
      
      if (!codeData) {
        throw new Error('Código de sincronização inválido');
      }

      // Verificar se código expirou
      if (new Date() > new Date(codeData.expiresAt)) {
        throw new Error('Código de sincronização expirado');
      }

      // Verificar se já foi usado
      if (codeData.used) {
        throw new Error('Código de sincronização já foi usado');
      }

      // Marcar como usado
      codeData.used = true;
      codeData.usedAt = new Date().toISOString();
      codes[syncCode] = codeData;
      localStorage.setItem(this.STORAGE_KEYS.SYNC_CODES, JSON.stringify(codes));

      // Obter dados do usuário
      const user = AuthService.getUserByEmail(codeData.email);
      const profiles = AuthService.getAllProfiles();
      const profile = profiles[codeData.userId];

      console.log('✅ Código de sincronização aplicado:', codeData.email);
      return { user, profile };
      
    } catch (error) {
      console.error('Erro ao aplicar código de sincronização:', error);
      throw error;
    }
  }

  // Sincronizar dados do usuário
  static syncUserData(email, userData) {
    try {
      const normalizedEmail = AuthService.normalizeEmail(email);
      const user = AuthService.getUserByEmail(normalizedEmail);
      
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Atualizar perfil
      const updatedProfile = AuthService.updateUserProfile(user.id, userData);
      
      console.log('✅ Dados sincronizados:', normalizedEmail);
      return updatedProfile;
      
    } catch (error) {
      console.error('Erro na sincronização de dados:', error);
      throw error;
    }
  }

  // Obter dados do usuário
  static getUserData(email) {
    try {
      const normalizedEmail = AuthService.normalizeEmail(email);
      const user = AuthService.getUserByEmail(normalizedEmail);
      
      if (!user) {
        return null;
      }

      const profiles = AuthService.getAllProfiles();
      const profile = profiles[user.id];

      return { user, profile };
      
    } catch (error) {
      console.error('Erro ao obter dados do usuário:', error);
      return null;
    }
  }

  // Obter códigos de sincronização
  static getSyncCodes() {
    try {
      const codes = localStorage.getItem(this.STORAGE_KEYS.SYNC_CODES);
      return codes ? JSON.parse(codes) : {};
    } catch (error) {
      console.error('Erro ao obter códigos de sincronização:', error);
      return {};
    }
  }

  // Limpar códigos expirados
  static cleanupExpiredCodes() {
    try {
      const codes = this.getSyncCodes();
      const now = new Date();
      let cleaned = 0;

      Object.keys(codes).forEach(code => {
        if (now > new Date(codes[code].expiresAt)) {
          delete codes[code];
          cleaned++;
        }
      });

      if (cleaned > 0) {
        localStorage.setItem(this.STORAGE_KEYS.SYNC_CODES, JSON.stringify(codes));
        console.log(`🧹 ${cleaned} códigos expirados removidos`);
      }

      return cleaned;
      
    } catch (error) {
      console.error('Erro na limpeza de códigos:', error);
      return 0;
    }
  }

  // Exportar dados do usuário
  static exportUserData(email) {
    try {
      const normalizedEmail = AuthService.normalizeEmail(email);
      const userData = this.getUserData(normalizedEmail);
      
      if (!userData) {
        throw new Error('Usuário não encontrado');
      }

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        user: {
          id: userData.user.id,
          email: userData.user.email,
          createdAt: userData.user.createdAt,
          lastLogin: userData.user.lastLogin
        },
        profile: userData.profile
      };

      console.log('✅ Dados exportados:', normalizedEmail);
      return exportData;
      
    } catch (error) {
      console.error('Erro na exportação de dados:', error);
      throw error;
    }
  }

  // Importar dados do usuário
  static importUserData(importData) {
    try {
      if (!importData || !importData.user || !importData.profile) {
        throw new Error('Dados de importação inválidos');
      }

      const normalizedEmail = AuthService.normalizeEmail(importData.user.email);
      
      // Verificar se usuário já existe
      if (AuthService.userExists(normalizedEmail)) {
        throw new Error('Usuário já existe');
      }

      // Criar usuário
      const { user, profile } = AuthService.createUser(
        normalizedEmail,
        'imported123', // Senha temporária
        {
          createdAt: importData.user.createdAt,
          lastLogin: importData.user.lastLogin
        }
      );

      // Atualizar perfil com dados importados
      const updatedProfile = AuthService.updateUserProfile(user.id, importData.profile);

      console.log('✅ Dados importados:', normalizedEmail);
      return { user, profile: updatedProfile };
      
    } catch (error) {
      console.error('Erro na importação de dados:', error);
      throw error;
    }
  }

  // Verificar status de sincronização
  static getSyncStatus(email) {
    try {
      const normalizedEmail = AuthService.normalizeEmail(email);
      const userData = this.getUserData(normalizedEmail);
      
      if (!userData) {
        return { status: 'not_found', message: 'Usuário não encontrado' };
      }

      const codes = this.getSyncCodes();
      const activeCodes = Object.values(codes).filter(
        code => code.email === normalizedEmail && !code.used && new Date() < new Date(code.expiresAt)
      );

      return {
        status: 'active',
        user: userData.user,
        profile: userData.profile,
        activeSyncCodes: activeCodes.length,
        lastSync: userData.user.lastLogin
      };
      
    } catch (error) {
      console.error('Erro ao verificar status de sincronização:', error);
      return { status: 'error', message: error.message };
    }
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.SyncServiceUnified = SyncServiceUnified;
}
