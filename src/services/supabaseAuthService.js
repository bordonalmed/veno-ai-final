// Serviço de Autenticação usando Supabase
// Se Supabase não estiver configurado, usa localStorage como fallback

import { supabase, supabaseConfig } from '../config/supabase';

class SupabaseAuthService {
  constructor() {
    this.currentUser = null;
    this.useLocalStorage = !supabaseConfig.isConfigured;
    
    if (this.useLocalStorage) {
      console.log("📦 Usando localStorage como sistema de autenticação");
      this.loadCurrentUser();
    } else {
      console.log("✅ Usando Supabase como sistema de autenticação");
      this.setupAuthListener().catch(err => {
        console.error('Erro ao configurar listener do Supabase:', err);
      });
    }
  }

  // ==================== SUPABASE ====================

  // Configurar listener de mudanças de autenticação do Supabase
  async setupAuthListener() {
    if (!supabase) return;
    
    // Verificar sessão atual
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      this.currentUser = {
        email: session.user.email,
        uid: session.user.id,
        ...session.user
      };
      localStorage.setItem('userEmail', session.user.email);
      localStorage.setItem('userUID', session.user.id);
      localStorage.setItem('isLoggedIn', 'true');
      console.log('✅ Sessão Supabase restaurada:', session.user.email);
    }
    
    // Escutar mudanças de autenticação
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this.currentUser = {
          email: session.user.email,
          uid: session.user.id,
          ...session.user
        };
        localStorage.setItem('userEmail', session.user.email);
        localStorage.setItem('userUID', session.user.id);
        localStorage.setItem('isLoggedIn', 'true');
        console.log('✅ Usuário logado no Supabase:', session.user.email);
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userUID');
        localStorage.removeItem('isLoggedIn');
        console.log('✅ Usuário deslogado do Supabase');
      }
    });
  }

  // Criar usuário no Supabase
  async createUserSupabase(email, password, userData = {}) {
    try {
      if (!supabase) {
        throw new Error('Supabase não está configurado');
      }

      console.log('📝 Criando usuário no Supabase:', email);

      // Criar usuário no Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) {
        console.error('Erro ao criar usuário no Supabase:', error);
        return { 
          success: false, 
          error: this.getErrorMessage(error.message) 
        };
      }

      if (!data.user) {
        return { 
          success: false, 
          error: 'Erro ao criar usuário. Tente novamente.' 
        };
      }

      // Criar perfil do usuário na tabela users
      console.log('📝 Salvando perfil do usuário na tabela users...');
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: email,
          nome: userData.nome || email.split('@')[0],
          plano: 'trial',
          premium: false,
          trial_ativo: true,
          trial_inicio: new Date().toISOString(),
          data_cadastro: new Date().toISOString(),
          ...userData
        })
        .select();

      if (profileError) {
        console.error('❌ Erro ao criar perfil do usuário na tabela users:', profileError);
        console.error('💡 Dica: Verifique se a tabela "users" foi criada no Supabase SQL Editor');
        // Ainda assim, o usuário foi criado no Auth, então vamos continuar
        // Mas vamos avisar que precisa criar a tabela
      } else {
        console.log('✅ Perfil do usuário salvo na tabela users:', profileData);
      }

      console.log('✅ Usuário criado no Supabase:', email);

      // Salvar dados no localStorage para compatibilidade
      this.currentUser = {
        email: data.user.email,
        uid: data.user.id,
        ...data.user
      };
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userUID', data.user.id);
      localStorage.setItem('isLoggedIn', 'true');

      return { 
        success: true, 
        user: this.currentUser 
      };

    } catch (error) {
      console.error('Erro ao criar usuário no Supabase:', error);
      return { 
        success: false, 
        error: error.message || 'Erro ao criar conta. Tente novamente.' 
      };
    }
  }

  // Login no Supabase
  async loginSupabase(email, password) {
    try {
      if (!supabase) {
        throw new Error('Supabase não está configurado');
      }

      console.log('🔐 Fazendo login no Supabase:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error('Erro no login no Supabase:', error);
        return { 
          success: false, 
          error: this.getErrorMessage(error.message) 
        };
      }

      if (!data.user) {
        return { 
          success: false, 
          error: 'Erro ao fazer login. Tente novamente.' 
        };
      }

      // Buscar dados do perfil do usuário
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // Salvar dados no localStorage para compatibilidade
      this.currentUser = {
        email: data.user.email,
        uid: data.user.id,
        ...data.user,
        ...userProfile
      };
      
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userUID', data.user.id);
      localStorage.setItem('isLoggedIn', 'true');
      if (userProfile) {
        localStorage.setItem('userData', JSON.stringify(userProfile));
        if (userProfile.plano) {
          localStorage.setItem(`plano_${email}`, userProfile.plano);
        }
      }

      console.log('✅ Login realizado no Supabase:', data.user.email);

      return { 
        success: true, 
        user: this.currentUser 
      };

    } catch (error) {
      console.error('Erro no login no Supabase:', error);
      return { 
        success: false, 
        error: error.message || 'Erro ao fazer login. Tente novamente.' 
      };
    }
  }

  // Logout no Supabase
  async logoutSupabase() {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      
      this.currentUser = null;
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userUID');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userData');
      
      console.log('✅ Logout realizado');
      return { success: true };
    } catch (error) {
      console.error('Erro no logout:', error);
      return { success: false, error: 'Erro ao fazer logout' };
    }
  }

  // Converter erros do Supabase para mensagens amigáveis
  getErrorMessage(errorMessage) {
    const errorMessages = {
      'User already registered': 'Este email já está cadastrado. Tente fazer login.',
      'Invalid login credentials': 'Email ou senha incorretos. Verifique e tente novamente.',
      'Email not confirmed': 'Confirme seu email antes de fazer login.',
      'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
      'Invalid email': 'Email inválido. Verifique e tente novamente.'
    };

    return errorMessages[errorMessage] || errorMessage || 'Ocorreu um erro. Tente novamente.';
  }

  // ==================== SISTEMA LOCAL (localStorage) ====================
  
  loadCurrentUser() {
    try {
      const userEmail = localStorage.getItem('userEmail');
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      if (userEmail && isLoggedIn === 'true') {
        this.currentUser = {
          email: userEmail,
          uid: localStorage.getItem('userUID') || this.generateId()
        };
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  hashPassword(password) {
    // Hash simples para demonstração (em produção usar bcrypt)
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  async createUserLocal(email, password, userData = {}) {
    try {
      const users = this.getAllUsers();
      const normalizedEmail = email.toLowerCase().trim();
      
      if (users[normalizedEmail]) {
        return { 
          success: false, 
          error: 'Este email já está cadastrado. Tente fazer login.' 
        };
      }

      const userId = this.generateId();
      const hashedPassword = this.hashPassword(password);
      
      users[normalizedEmail] = {
        id: userId,
        email: normalizedEmail,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        plano: 'trial',
        premium: false,
        trialAtivo: true,
        trialInicio: new Date().toISOString(),
        ...userData
      };
      
      localStorage.setItem('venoai_users', JSON.stringify(users));
      console.log('✅ Usuário criado (localStorage):', normalizedEmail);
      
      return this.loginLocal(email, password);
      
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      return { success: false, error: 'Erro ao criar conta. Tente novamente.' };
    }
  }

  async loginLocal(email, password) {
    try {
      const users = this.getAllUsers();
      const normalizedEmail = email.toLowerCase().trim();
      const user = users[normalizedEmail];
      
      if (!user) {
        return { 
          success: false, 
          error: 'Usuário não encontrado. Verifique o email ou cadastre-se.' 
        };
      }

      const hashedPassword = this.hashPassword(password);
      if (user.password !== hashedPassword) {
        return { 
          success: false, 
          error: 'Senha incorreta. Tente novamente.' 
        };
      }

      this.currentUser = {
        email: user.email,
        uid: user.id,
        ...user
      };
      
      localStorage.setItem('userEmail', user.email);
      localStorage.setItem('userUID', user.id);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userData', JSON.stringify(user));
      
      console.log('✅ Login realizado (localStorage):', user.email);
      
      return { 
        success: true, 
        user: this.currentUser 
      };
      
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, error: 'Erro ao fazer login. Tente novamente.' };
    }
  }

  getAllUsers() {
    try {
      const users = localStorage.getItem('venoai_users');
      return users ? JSON.parse(users) : {};
    } catch (error) {
      console.error('Erro ao obter usuários:', error);
      return {};
    }
  }

  // ==================== MÉTODOS PÚBLICOS ====================

  async changePassword(email, currentPassword, newPassword) {
    const validation = this.validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      return { success: false, error: 'A nova senha deve ter pelo menos 6 caracteres.' };
    }

    if (this.useLocalStorage) {
      return this.changePasswordLocal(email, currentPassword, newPassword);
    }

    return this.changePasswordSupabase(email, currentPassword, newPassword);
  }

  async changePasswordSupabase(email, currentPassword, newPassword) {
    try {
      if (!supabase) {
        throw new Error('Supabase não está configurado');
      }

      // Reautentica com a senha atual para confirmar que é o próprio usuário antes de trocar
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) {
        return { success: false, error: 'Senha atual incorreta.' };
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, error: this.getErrorMessage(error.message) };
      }

      console.log('✅ Senha alterada no Supabase:', email);
      return { success: true };
    } catch (error) {
      console.error('Erro ao alterar senha no Supabase:', error);
      return { success: false, error: error.message || 'Erro ao alterar senha. Tente novamente.' };
    }
  }

  changePasswordLocal(email, currentPassword, newPassword) {
    try {
      const users = this.getAllUsers();
      const normalizedEmail = email.toLowerCase().trim();
      const user = users[normalizedEmail];

      if (!user) {
        return { success: false, error: 'Usuário não encontrado.' };
      }

      if (user.password !== this.hashPassword(currentPassword)) {
        return { success: false, error: 'Senha atual incorreta.' };
      }

      user.password = this.hashPassword(newPassword);
      users[normalizedEmail] = user;
      localStorage.setItem('venoai_users', JSON.stringify(users));

      console.log('✅ Senha alterada (localStorage):', normalizedEmail);
      return { success: true };
    } catch (error) {
      console.error('Erro ao alterar senha (localStorage):', error);
      return { success: false, error: 'Erro ao alterar senha. Tente novamente.' };
    }
  }

  async createUser(email, password, userData = {}) {
    if (this.useLocalStorage) {
      return this.createUserLocal(email, password, userData);
    }
    
    return this.createUserSupabase(email, password, userData);
  }

  async login(email, password) {
    if (this.useLocalStorage) {
      return this.loginLocal(email, password);
    }
    
    return this.loginSupabase(email, password);
  }

  async logout() {
    if (this.useLocalStorage) {
      return this.logoutLocal();
    }
    
    return this.logoutSupabase();
  }

  async logoutLocal() {
    try {
      this.currentUser = null;
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userUID');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userData');
      
      console.log('✅ Logout realizado');
      return { success: true };
    } catch (error) {
      console.error('Erro no logout:', error);
      return { success: false, error: 'Erro ao fazer logout' };
    }
  }

  async isLoggedIn() {
    if (this.useLocalStorage) {
      return this.currentUser !== null || localStorage.getItem('isLoggedIn') === 'true';
    }
    
    // Para Supabase, verificar se há sessão ativa
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        return session !== null;
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        return false;
      }
    }
    
    return this.currentUser !== null || localStorage.getItem('isLoggedIn') === 'true';
  }

  getCurrentUser() {
    if (this.currentUser) {
      return this.currentUser;
    }
    
    try {
      const userEmail = localStorage.getItem('userEmail');
      const userUID = localStorage.getItem('userUID');
      if (userEmail && userUID) {
        return {
          email: userEmail,
          uid: userUID
        };
      }
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error);
    }
    
    return null;
  }

  validatePasswordStrength(password) {
    const minLength = 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const score = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
    
    return {
      isValid: password.length >= minLength,
      score: Math.min(score + (password.length >= minLength ? 1 : 0), 5),
      requirements: {
        minLength: password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar
      }
    };
  }

  calculatePasswordScore(password) {
    const validation = this.validatePasswordStrength(password);
    return validation.score;
  }
}

// Criar instância única
const supabaseAuthService = new SupabaseAuthService();

export { supabaseAuthService as AuthService };
export default supabaseAuthService;