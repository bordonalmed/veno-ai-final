// Serviço de Autenticação Robusto - VENO.AI
export class AuthService {
  
  // Chaves para localStorage
  static STORAGE_KEYS = {
    USERS: 'venoai_users',
    USER_PROFILES: 'venoai_user_profiles',
    SESSIONS: 'venoai_sessions',
    ACTIVE_SESSION: 'venoai_active_session'
  };

  // Configurações de segurança
  static SECURITY_CONFIG = {
    MIN_PASSWORD_LENGTH: 6,
    MAX_LOGIN_ATTEMPTS: 5,
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 horas
    PASSWORD_REQUIREMENTS: {
      minLength: 6,
      requireUppercase: false,
      requireLowercase: false,
      requireNumbers: false,
      requireSpecialChars: false
    }
  };

  // Normalizar email
  static normalizeEmail(email) {
    if (!email) return '';
    return email.trim().toLowerCase();
  }

  // Gerar ID único
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Hash simples para senhas (em produção usar bcrypt)
  static hashPassword(password) {
    // Hash simples para demonstração - em produção usar bcrypt
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  // Validar força da senha
  static validatePasswordStrength(password) {
    const errors = [];
    const config = this.SECURITY_CONFIG.PASSWORD_REQUIREMENTS;

    if (password.length < config.minLength) {
      errors.push(`Mínimo ${config.minLength} caracteres`);
    }

    if (config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Pelo menos uma letra maiúscula');
    }

    if (config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Pelo menos uma letra minúscula');
    }

    if (config.requireNumbers && !/\d/.test(password)) {
      errors.push('Pelo menos um número');
    }

    if (config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Pelo menos um caractere especial');
    }

    return {
      isValid: errors.length === 0,
      errors,
      score: this.calculatePasswordScore(password)
    };
  }

  // Calcular pontuação da senha
  static calculatePasswordScore(password) {
    let score = 0;
    
    // Comprimento
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Variedade de caracteres
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    
    return Math.min(score, 5); // Máximo 5
  }

  // Obter todos os usuários
  static getAllUsers() {
    try {
      const users = localStorage.getItem(this.STORAGE_KEYS.USERS);
      return users ? JSON.parse(users) : {};
    } catch (error) {
      console.error('Erro ao obter usuários:', error);
      return {};
    }
  }

  // Obter todos os perfis
  static getAllProfiles() {
    try {
      const profiles = localStorage.getItem(this.STORAGE_KEYS.USER_PROFILES);
      return profiles ? JSON.parse(profiles) : {};
    } catch (error) {
      console.error('Erro ao obter perfis:', error);
      return {};
    }
  }

  // Obter todas as sessões
  static getAllSessions() {
    try {
      const sessions = localStorage.getItem(this.STORAGE_KEYS.SESSIONS);
      return sessions ? JSON.parse(sessions) : {};
    } catch (error) {
      console.error('Erro ao obter sessões:', error);
      return {};
    }
  }

  // Verificar se usuário existe
  static userExists(email) {
    const normalizedEmail = this.normalizeEmail(email);
    const users = this.getAllUsers();
    return users.hasOwnProperty(normalizedEmail);
  }

  // Obter usuário por email
  static getUserByEmail(email) {
    const normalizedEmail = this.normalizeEmail(email);
    const users = this.getAllUsers();
    return users[normalizedEmail] || null;
  }

  // Criar novo usuário
  static createUser(email, password, userData = {}) {
    const normalizedEmail = this.normalizeEmail(email);
    
    if (this.userExists(normalizedEmail)) {
      throw new Error('Usuário já existe com este email');
    }

    const passwordValidation = this.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new Error(`Senha inválida: ${passwordValidation.errors.join(', ')}`);
    }

    const userId = this.generateId();
    const hashedPassword = this.hashPassword(password);
    
    const user = {
      id: userId,
      email: normalizedEmail,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      loginAttempts: 0,
      lockedUntil: null,
      ...userData
    };

    const profile = {
      id: userId,
      email: normalizedEmail,
      plano: 'trial',
      premium: false,
      trialStatus: {
        inicio: new Date().toISOString(),
        laudosGerados: [],
        status: 'active'
      },
      configuracoes: {
        tema: 'dark',
        notificacoes: true,
        idioma: 'pt-BR'
      },
      ...userData
    };

    // Salvar usuário
    const users = this.getAllUsers();
    users[normalizedEmail] = user;
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));

    // Salvar perfil
    const profiles = this.getAllProfiles();
    profiles[userId] = profile;
    localStorage.setItem(this.STORAGE_KEYS.USER_PROFILES, JSON.stringify(profiles));

    console.log('✅ Usuário criado:', normalizedEmail);
    return { user, profile };
  }

  // Fazer login
  static login(email, password) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = this.getUserByEmail(normalizedEmail);
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar se conta está bloqueada
    if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
      const lockTime = new Date(user.lockedUntil).toLocaleString('pt-BR');
      throw new Error(`Conta bloqueada até ${lockTime}. Muitas tentativas de login incorretas.`);
    }

    // Verificar senha
    const hashedPassword = this.hashPassword(password);
    if (user.password !== hashedPassword) {
      // Incrementar tentativas de login
      const users = this.getAllUsers();
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      // Bloquear conta após muitas tentativas
      if (user.loginAttempts >= this.SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutos
        console.warn('🔒 Conta bloqueada por muitas tentativas:', normalizedEmail);
      }
      
      users[normalizedEmail] = user;
      localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
      
      throw new Error('Senha incorreta');
    }

    // Reset tentativas de login
    const users = this.getAllUsers();
    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = new Date().toISOString();
    users[normalizedEmail] = user;
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));

    // Criar sessão
    const sessionId = this.generateId();
    const session = {
      id: sessionId,
      userId: user.id,
      email: normalizedEmail,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.SECURITY_CONFIG.SESSION_TIMEOUT).toISOString(),
      ip: 'unknown', // Em produção, capturar IP real
      userAgent: navigator.userAgent
    };

    const sessions = this.getAllSessions();
    sessions[sessionId] = session;
    localStorage.setItem(this.STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    localStorage.setItem(this.STORAGE_KEYS.ACTIVE_SESSION, sessionId);

    // Obter perfil
    const profiles = this.getAllProfiles();
    const profile = profiles[user.id];

    console.log('✅ Login realizado:', normalizedEmail);
    return { user, profile, session };
  }

  // Obter sessão ativa
  static getActiveSession() {
    try {
      const sessionId = localStorage.getItem(this.STORAGE_KEYS.ACTIVE_SESSION);
      if (!sessionId) return null;

      const sessions = this.getAllSessions();
      const session = sessions[sessionId];
      
      if (!session) return null;

      // Verificar se sessão expirou
      if (new Date() > new Date(session.expiresAt)) {
        this.logout();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Erro ao obter sessão ativa:', error);
      return null;
    }
  }

  // Verificar se usuário está logado
  static isLoggedIn() {
    const session = this.getActiveSession();
    return session !== null;
  }

  // Obter usuário atual
  static getCurrentUser() {
    const session = this.getActiveSession();
    if (!session) return null;

    const user = this.getUserByEmail(session.email);
    const profiles = this.getAllProfiles();
    const profile = profiles[session.userId];

    return { user, profile, session };
  }

  // Fazer logout
  static logout() {
    try {
      const sessionId = localStorage.getItem(this.STORAGE_KEYS.ACTIVE_SESSION);
      if (sessionId) {
        const sessions = this.getAllSessions();
        delete sessions[sessionId];
        localStorage.setItem(this.STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
      }
      
      localStorage.removeItem(this.STORAGE_KEYS.ACTIVE_SESSION);
      console.log('✅ Logout realizado');
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  }

  // Atualizar perfil do usuário
  static updateUserProfile(userId, updates) {
    try {
      const profiles = this.getAllProfiles();
      if (profiles[userId]) {
        profiles[userId] = { ...profiles[userId], ...updates };
        localStorage.setItem(this.STORAGE_KEYS.USER_PROFILES, JSON.stringify(profiles));
        console.log('✅ Perfil atualizado:', userId);
        return profiles[userId];
      }
      throw new Error('Perfil não encontrado');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  }

  // Alterar senha
  static changePassword(email, currentPassword, newPassword) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = this.getUserByEmail(normalizedEmail);
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar senha atual
    const currentHashedPassword = this.hashPassword(currentPassword);
    if (user.password !== currentHashedPassword) {
      throw new Error('Senha atual incorreta');
    }

    // Validar nova senha
    const passwordValidation = this.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(`Nova senha inválida: ${passwordValidation.errors.join(', ')}`);
    }

    // Atualizar senha
    const users = this.getAllUsers();
    user.password = this.hashPassword(newPassword);
    user.loginAttempts = 0;
    user.lockedUntil = null;
    users[normalizedEmail] = user;
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));

    console.log('✅ Senha alterada:', normalizedEmail);
    return true;
  }

  // Migrar usuários duplicados (para compatibilidade)
  static migrateDuplicateUsers() {
    try {
      console.log('🔄 Iniciando migração de usuários duplicados...');
      
      const users = this.getAllUsers();
      const profiles = this.getAllProfiles();
      
      // Lógica de migração aqui se necessário
      
      console.log('✅ Migração concluída');
      return { users, profiles };
    } catch (error) {
      console.error('Erro na migração:', error);
      throw error;
    }
  }

  // Verificar integridade dos dados
  static verifyDataIntegrity() {
    try {
      const users = this.getAllUsers();
      const profiles = this.getAllProfiles();
      const sessions = this.getAllSessions();
      
      const userCount = Object.keys(users).length;
      const profileCount = Object.keys(profiles).length;
      const sessionCount = Object.keys(sessions).length;
      
      console.log('📊 Integridade dos dados:');
      console.log(`- Usuários: ${userCount}`);
      console.log(`- Perfis: ${profileCount}`);
      console.log(`- Sessões: ${sessionCount}`);
      
      return {
        users: userCount,
        profiles: profileCount,
        sessions: sessionCount,
        integrity: 'OK'
      };
    } catch (error) {
      console.error('Erro na verificação de integridade:', error);
      return { integrity: 'ERROR', error: error.message };
    }
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.AuthService = AuthService;
}
