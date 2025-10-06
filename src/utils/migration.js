// Script de Migração para Sistema de Autenticação Idempotente
import { AuthService } from '../services/authService.js';
import { SyncServiceUnified } from '../services/syncServiceUnified.js';

export class MigrationService {
  
  // Migração completa do sistema antigo para o novo
  static async migrateToIdempotentAuth() {
    try {
      console.log('🔄 Iniciando migração completa...');
      
      // 1. Migrar usuários duplicados
      console.log('📝 Passo 1: Migrando usuários duplicados...');
      const migrationResult = AuthService.migrateDuplicateUsers();
      
      // 2. Criar usuário Premium se não existir
      console.log('📝 Passo 2: Verificando usuário Premium...');
      await this.ensurePremiumUser();
      
      // 3. Migrar dados de sincronização
      console.log('📝 Passo 3: Migrando dados de sincronização...');
      await this.migrateSyncData();
      
      // 4. Limpar dados antigos
      console.log('📝 Passo 4: Limpando dados antigos...');
      this.cleanupOldData();
      
      console.log('✅ Migração concluída com sucesso!');
      return migrationResult;
      
    } catch (error) {
      console.error('❌ Erro na migração:', error);
      throw error;
    }
  }
  
  // Garantir que usuário Premium existe
  static async ensurePremiumUser() {
    try {
      const premiumEmail = 'vasculargabriel@gmail.com';
      const normalizedEmail = AuthService.normalizeEmail(premiumEmail);
      
      if (!AuthService.userExists(normalizedEmail)) {
        console.log('💎 Criando usuário Premium...');
        
        const user = AuthService.createUser(premiumEmail, '123456', {
          plano: 'premium',
          trialStatus: {
            inicio: new Date().toISOString(),
            laudosGerados: [],
            status: 'premium'
          },
          transacao: {
            id: 'HOTMART_PREMIUM_2024',
            data: new Date().toISOString(),
            status: 'active'
          }
        });
        
        console.log('✅ Usuário Premium criado:', user.email);
      } else {
        console.log('✅ Usuário Premium já existe');
      }
      
    } catch (error) {
      console.error('❌ Erro ao criar usuário Premium:', error);
      throw error;
    }
  }
  
  // Migrar dados de sincronização antigos
  static async migrateSyncData() {
    try {
      // Migrar dados do localStorage antigo
      const oldUsers = JSON.parse(localStorage.getItem('usuariosCadastrados') || '[]');
      
      oldUsers.forEach(email => {
        try {
          const normalizedEmail = AuthService.normalizeEmail(email);
          
          if (!AuthService.userExists(normalizedEmail)) {
            // Criar usuário se não existir
            AuthService.createUser(email, 'temp_password');
          }
          
          // Migrar dados específicos
          const plano = localStorage.getItem(`plano_${email}`);
          const trial = localStorage.getItem(`trial_${email}`);
          const transacao = localStorage.getItem(`transacao_${email}`);
          
          if (plano || trial || transacao) {
            const user = AuthService.getUserByEmail(normalizedEmail);
            if (user) {
              const profileData = {};
              
              if (plano) profileData.plano = plano;
              if (trial) profileData.trialStatus = JSON.parse(trial);
              if (transacao) profileData.transacao = JSON.parse(transacao);
              
              AuthService.updateUserProfile(user.id, profileData);
              console.log(`✅ Dados migrados para: ${normalizedEmail}`);
            }
          }
          
        } catch (error) {
          console.error(`❌ Erro ao migrar dados para ${email}:`, error);
        }
      });
      
    } catch (error) {
      console.error('❌ Erro na migração de dados de sync:', error);
      throw error;
    }
  }
  
  // Limpar dados antigos
  static cleanupOldData() {
    try {
      // Lista de chaves antigas para remover
      const oldKeys = [
        'usuariosCadastrados',
        'venoai_user_data',
        'venoai_backup_',
        'venoai_sync_data_old'
      ];
      
      // Remover chaves específicas
      Object.keys(localStorage).forEach(key => {
        if (oldKeys.some(oldKey => key.includes(oldKey))) {
          localStorage.removeItem(key);
          console.log(`🗑️ Removido: ${key}`);
        }
      });
      
      console.log('✅ Dados antigos limpos');
      
    } catch (error) {
      console.error('❌ Erro na limpeza:', error);
    }
  }
  
  // Verificar integridade dos dados
  static verifyDataIntegrity() {
    try {
      console.log('🔍 Verificando integridade dos dados...');
      
      const users = AuthService.getAllUsers();
      const profiles = AuthService.getAllProfiles();
      
      let issues = 0;
      
      // Verificar se todos os usuários têm perfis
      Object.values(users).forEach(user => {
        if (!profiles[user.id]) {
          console.warn(`⚠️ Usuário ${user.email} não tem perfil`);
          issues++;
        }
      });
      
      // Verificar se todos os perfis têm usuários
      Object.keys(profiles).forEach(userId => {
        if (!users[userId]) {
          console.warn(`⚠️ Perfil ${userId} não tem usuário correspondente`);
          issues++;
        }
      });
      
      // Verificar normalização de emails
      Object.keys(users).forEach(email => {
        const normalized = AuthService.normalizeEmail(email);
        if (email !== normalized) {
          console.warn(`⚠️ Email não normalizado: ${email}`);
          issues++;
        }
      });
      
      if (issues === 0) {
        console.log('✅ Integridade dos dados verificada - sem problemas');
      } else {
        console.log(`⚠️ ${issues} problemas encontrados`);
      }
      
      return { users: Object.keys(users).length, profiles: Object.keys(profiles).length, issues };
      
    } catch (error) {
      console.error('❌ Erro na verificação:', error);
      throw error;
    }
  }
  
  // Executar migração completa
  static async runFullMigration() {
    try {
      console.log('🚀 Iniciando migração completa do sistema...');
      
      // Verificar estado atual
      const beforeState = this.verifyDataIntegrity();
      console.log('📊 Estado antes da migração:', beforeState);
      
      // Executar migração
      await this.migrateToIdempotentAuth();
      
      // Verificar estado após migração
      const afterState = this.verifyDataIntegrity();
      console.log('📊 Estado após migração:', afterState);
      
      console.log('🎉 Migração completa finalizada!');
      return { before: beforeState, after: afterState };
      
    } catch (error) {
      console.error('❌ Erro na migração completa:', error);
      throw error;
    }
  }
}

// Executar migração automaticamente se chamado diretamente
if (typeof window !== 'undefined') {
  // Adicionar ao window para acesso global
  window.MigrationService = MigrationService;
  
  // Executar migração automática
  console.log('🔄 Executando migração automática...');
  MigrationService.runFullMigration().catch(error => {
    console.error('❌ Migração automática falhou:', error);
  });
}




