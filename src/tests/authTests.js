// Testes Automatizados para Sistema de Autenticação Idempotente
import { AuthService } from '../services/authService.js';
import { SyncServiceUnified } from '../services/syncServiceUnified.js';

export class AuthTests {
  
  static testResults = [];
  
  static addResult(testName, passed, message, details = null) {
    this.testResults.push({
      testName,
      passed,
      message,
      details,
      timestamp: new Date().toISOString()
    });
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${message}`);
  }
  
  static async runAllTests() {
    console.log('🧪 Iniciando testes de autenticação...');
    this.testResults = [];
    
    try {
      // Teste 1: Normalização de Email
      await this.testEmailNormalization();
      
      // Teste 2: Idempotência do Login
      await this.testLoginIdempotence();
      
      // Teste 3: Sincronização entre Dispositivos
      await this.testDeviceSynchronization();
      
      // Teste 4: Constraint Única de Email
      await this.testEmailUniqueness();
      
      // Teste 5: Sessão e Logout
      await this.testSessionManagement();
      
      // Resumo dos resultados
      this.printTestSummary();
      
      return this.testResults;
      
    } catch (error) {
      console.error('❌ Erro nos testes:', error);
      throw error;
    }
  }
  
  static async testEmailNormalization() {
    try {
      const testEmails = [
        { input: 'VascularGabriel@gmail.com', expected: 'vasculargabriel@gmail.com' },
        { input: 'VASCULARGABRIEL@GMAIL.COM', expected: 'vasculargabriel@gmail.com' },
        { input: ' vasculargabriel@gmail.com ', expected: 'vasculargabriel@gmail.com' },
        { input: 'VascularGabriel@Gmail.Com', expected: 'vasculargabriel@gmail.com' }
      ];
      
      let allPassed = true;
      
      testEmails.forEach(({ input, expected }) => {
        const result = AuthService.normalizeEmail(input);
        if (result !== expected) {
          allPassed = false;
          this.addResult(
            'Normalização de Email',
            false,
            `"${input}" → "${result}" (esperado: "${expected}")`,
            { input, result, expected }
          );
        }
      });
      
      if (allPassed) {
        this.addResult(
          'Normalização de Email',
          true,
          'Todos os emails foram normalizados corretamente',
          { testCount: testEmails.length }
        );
      }
      
    } catch (error) {
      this.addResult('Normalização de Email', false, `Erro: ${error.message}`);
    }
  }
  
  static async testLoginIdempotence() {
    try {
      const testEmail = 'test@example.com';
      const testPassword = '123456';
      
      // Limpar dados de teste
      this.cleanupTestData(testEmail);
      
      // Criar usuário de teste
      const user1 = AuthService.createUser(testEmail, testPassword);
      
      // Primeiro login
      const login1 = AuthService.login(testEmail, testPassword);
      
      // Segundo login (deve ser idempotente)
      const login2 = AuthService.login(testEmail, testPassword);
      
      // Verificar idempotência
      const isIdempotent = login1.user.id === login2.user.id;
      
      if (isIdempotent) {
        this.addResult(
          'Idempotência do Login',
          true,
          'Login retorna mesmo userId em múltiplas tentativas',
          { userId1: login1.user.id, userId2: login2.user.id }
        );
      } else {
        this.addResult(
          'Idempotência do Login',
          false,
          'Login não é idempotente - userIds diferentes',
          { userId1: login1.user.id, userId2: login2.user.id }
        );
      }
      
      // Limpar dados de teste
      this.cleanupTestData(testEmail);
      
    } catch (error) {
      this.addResult('Idempotência do Login', false, `Erro: ${error.message}`);
    }
  }
  
  static async testDeviceSynchronization() {
    try {
      const testEmail = 'sync@example.com';
      const testPassword = '123456';
      
      // Limpar dados de teste
      this.cleanupTestData(testEmail);
      
      // Criar usuário
      const user = AuthService.createUser(testEmail, testPassword);
      
      // Simular dados de sincronização
      const syncData = {
        plano: 'premium',
        trialStatus: {
          inicio: new Date().toISOString(),
          laudosGerados: ['laudo1', 'laudo2'],
          status: 'premium'
        }
      };
      
      // Sincronizar dados
      const syncedProfile = SyncServiceUnified.syncUserData(testEmail, syncData);
      
      // Verificar se dados foram sincronizados
      const retrievedData = SyncServiceUnified.getUserData(testEmail);
      
      const syncWorked = retrievedData && 
                        retrievedData.profile.plano === 'premium' &&
                        retrievedData.profile.trialStatus.laudosGerados.length === 2;
      
      if (syncWorked) {
        this.addResult(
          'Sincronização entre Dispositivos',
          true,
          'Dados sincronizados corretamente',
          { plano: retrievedData.profile.plano, laudosCount: retrievedData.profile.trialStatus.laudosGerados.length }
        );
      } else {
        this.addResult(
          'Sincronização entre Dispositivos',
          false,
          'Falha na sincronização de dados',
          { retrievedData }
        );
      }
      
      // Limpar dados de teste
      this.cleanupTestData(testEmail);
      
    } catch (error) {
      this.addResult('Sincronização entre Dispositivos', false, `Erro: ${error.message}`);
    }
  }
  
  static async testEmailUniqueness() {
    try {
      const testEmail = 'unique@example.com';
      const testPassword = '123456';
      
      // Limpar dados de teste
      this.cleanupTestData(testEmail);
      
      // Criar primeiro usuário
      const user1 = AuthService.createUser(testEmail, testPassword);
      
      // Tentar criar segundo usuário com mesmo email
      let duplicateCreated = false;
      try {
        const user2 = AuthService.createUser(testEmail, testPassword);
        duplicateCreated = true;
      } catch (error) {
        // Esperado - deve falhar
        duplicateCreated = false;
      }
      
      if (!duplicateCreated) {
        this.addResult(
          'Constraint Única de Email',
          true,
          'Não é possível criar usuários duplicados com mesmo email',
          { email: testEmail }
        );
      } else {
        this.addResult(
          'Constraint Única de Email',
          false,
          'Usuário duplicado foi criado com mesmo email',
          { email: testEmail }
        );
      }
      
      // Limpar dados de teste
      this.cleanupTestData(testEmail);
      
    } catch (error) {
      this.addResult('Constraint Única de Email', false, `Erro: ${error.message}`);
    }
  }
  
  static async testSessionManagement() {
    try {
      const testEmail = 'session@example.com';
      const testPassword = '123456';
      
      // Limpar dados de teste
      this.cleanupTestData(testEmail);
      
      // Criar usuário
      const user = AuthService.createUser(testEmail, testPassword);
      
      // Fazer login
      const loginResult = AuthService.login(testEmail, testPassword);
      
      // Verificar sessão ativa
      const activeSession = AuthService.getActiveSession();
      
      if (activeSession && activeSession.userId === user.id) {
        this.addResult(
          'Gerenciamento de Sessão',
          true,
          'Sessão criada e verificada corretamente',
          { sessionId: activeSession.id, userId: activeSession.userId }
        );
        
        // Testar logout
        AuthService.logout();
        const sessionAfterLogout = AuthService.getActiveSession();
        
        if (!sessionAfterLogout) {
          this.addResult(
            'Logout',
            true,
            'Logout removeu sessão corretamente'
          );
        } else {
          this.addResult(
            'Logout',
            false,
            'Sessão ainda ativa após logout'
          );
        }
        
      } else {
        this.addResult(
          'Gerenciamento de Sessão',
          false,
          'Falha na criação/verificação de sessão',
          { activeSession, expectedUserId: user.id }
        );
      }
      
      // Limpar dados de teste
      this.cleanupTestData(testEmail);
      
    } catch (error) {
      this.addResult('Gerenciamento de Sessão', false, `Erro: ${error.message}`);
    }
  }
  
  static cleanupTestData(email) {
    try {
      const normalizedEmail = AuthService.normalizeEmail(email);
      const user = AuthService.getUserByEmail(normalizedEmail);
      
      if (user) {
        // Remover perfil
        const profiles = AuthService.getAllProfiles();
        delete profiles[user.id];
        localStorage.setItem(AuthService.STORAGE_KEYS.USER_PROFILES, JSON.stringify(profiles));
        
        // Remover usuário
        const users = AuthService.getAllUsers();
        delete users[normalizedEmail];
        localStorage.setItem(AuthService.STORAGE_KEYS.USERS, JSON.stringify(users));
        
        // Remover sessões
        const sessions = AuthService.getAllSessions();
        Object.keys(sessions).forEach(sessionId => {
          if (sessions[sessionId].userId === user.id) {
            delete sessions[sessionId];
          }
        });
        localStorage.setItem(AuthService.STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
      }
      
    } catch (error) {
      console.error('Erro na limpeza de dados de teste:', error);
    }
  }
  
  static printTestSummary() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log('\n📊 RESUMO DOS TESTES:');
    console.log(`Total: ${totalTests}`);
    console.log(`✅ Aprovados: ${passedTests}`);
    console.log(`❌ Falharam: ${failedTests}`);
    console.log(`📈 Taxa de sucesso: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ TESTES QUE FALHARAM:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => console.log(`  - ${r.testName}: ${r.message}`));
    }
  }
}

// Executar testes automaticamente se chamado diretamente
if (typeof window !== 'undefined') {
  window.AuthTests = AuthTests;
}



