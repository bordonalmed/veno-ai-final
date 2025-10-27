// Firebase Authentication Service
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

class FirebaseAuthService {
  constructor() {
    this.currentUser = null;
    this.setupAuthListener();
  }

  // Configurar listener de mudanças de autenticação
  setupAuthListener() {
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      if (user) {
        console.log('Usuário logado:', user.email);
        // Salvar dados do usuário no localStorage para compatibilidade
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userUID', user.uid);
        localStorage.setItem('isLoggedIn', 'true');
      } else {
        console.log('Usuário deslogado');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userUID');
        localStorage.removeItem('isLoggedIn');
      }
    });
  }

  // Criar novo usuário
  async createUser(email, password, userData = {}) {
    try {
      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Atualizar perfil do usuário
      await updateProfile(user, {
        displayName: userData.nome || email.split('@')[0]
      });

      // Criar documento do usuário no Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        nome: userData.nome || email.split('@')[0],
        dataCadastro: new Date().toISOString(),
        plano: 'trial',
        trialAtivo: true,
        trialInicio: new Date().toISOString(),
        laudosGerados: [],
        ...userData
      });

      console.log('Usuário criado com sucesso:', user.email);
      return { success: true, user: user };
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Fazer login
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Buscar dados do usuário no Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Salvar dados no localStorage para compatibilidade
        localStorage.setItem('userData', JSON.stringify(userData));
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userUID', user.uid);
        localStorage.setItem('isLoggedIn', 'true');
        
        // ⭐ VERIFICAÇÃO AUTOMÁTICA DO PLANO PREMIUM
        // Sincronizar plano do Firebase para localStorage
        if (userData.plano) {
          localStorage.setItem(`plano_${email}`, userData.plano);
          console.log(`✅ Plano sincronizado no login: ${userData.plano} para ${email}`);
          
          // Se for premium, garantir que está marcado
          if (userData.plano === 'premium') {
            localStorage.setItem(`plano_${email}`, 'premium');
            console.log(`👑 Status Premium confirmado no login!`);
          }
          
          // Também salvar no formato legacy para compatibilidade
          if (userData.plano === 'premium') {
            localStorage.setItem('plano_premium', 'true');
            localStorage.setItem(`plano_${email}`, 'premium');
          }
        }
      } else {
        // Se documento não existe, criar com plano trial
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          nome: user.displayName || user.email.split('@')[0],
          dataCadastro: new Date().toISOString(),
          plano: 'trial',
          premium: false,
          trialAtivo: true,
          trialInicio: new Date().toISOString(),
          laudosGerados: []
        });
        
        localStorage.setItem('userData', JSON.stringify({ plano: 'trial' }));
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userUID', user.uid);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem(`plano_${email}`, 'trial');
        
        console.log('✅ Novo documento criado no Firebase para:', user.email);
      }

      console.log('Login realizado com sucesso:', user.email);
      return { success: true, user: user };
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Fazer logout
  async logout() {
    try {
      await signOut(auth);
      console.log('Logout realizado com sucesso');
      return { success: true };
    } catch (error) {
      console.error('Erro no logout:', error);
      return { success: false, error: 'Erro ao fazer logout' };
    }
  }

  // Verificar se usuário está logado
  isLoggedIn() {
    return this.currentUser !== null;
  }

  // Obter usuário atual
  getCurrentUser() {
    return this.currentUser;
  }

  // Obter dados do usuário do Firestore
  async getUserData(uid = null) {
    try {
      const userId = uid || this.currentUser?.uid;
      if (!userId) return null;

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      return null;
    }
  }

  // Atualizar dados do usuário
  async updateUserData(data) {
    try {
      if (!this.currentUser) return { success: false, error: 'Usuário não logado' };

      await updateDoc(doc(db, 'users', this.currentUser.uid), {
        ...data,
        ultimaAtualizacao: new Date().toISOString()
      });

      // Atualizar localStorage
      const currentData = await this.getUserData();
      localStorage.setItem('userData', JSON.stringify({ ...currentData, ...data }));

      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error);
      return { success: false, error: 'Erro ao atualizar dados' };
    }
  }

  // Validar força da senha
  validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const score = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
    
    let strength = 'fraca';
    if (score >= 3 && password.length >= minLength) strength = 'forte';
    else if (score >= 2 && password.length >= minLength) strength = 'média';

    return {
      score: score,
      strength: strength,
      isValid: password.length >= minLength && score >= 2,
      requirements: {
        minLength: password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar
      }
    };
  }

  // Calcular pontuação da senha
  calculatePasswordScore(password) {
    const validation = this.validatePasswordStrength(password);
    return validation.score;
  }

  // Converter códigos de erro do Firebase para mensagens amigáveis
  getErrorMessage(errorCode) {
    const errorMessages = {
      'auth/email-already-in-use': 'Este email já está sendo usado por outra conta.',
      'auth/invalid-email': 'Email inválido.',
      'auth/operation-not-allowed': 'Operação não permitida.',
      'auth/weak-password': 'Senha muito fraca.',
      'auth/user-disabled': 'Esta conta foi desabilitada.',
      'auth/user-not-found': 'Nenhuma conta encontrada com este email.',
      'auth/wrong-password': 'Senha incorreta.',
      'auth/invalid-credential': 'Credenciais inválidas.',
      'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
      'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.'
    };

    return errorMessages[errorCode] || 'Erro desconhecido. Tente novamente.';
  }

  // Verificar se email já existe
  async checkEmailExists(email) {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Erro ao verificar email:', error);
      return false;
    }
  }
}

// Criar instância única do serviço
const firebaseAuthService = new FirebaseAuthService();

export { firebaseAuthService as AuthService };
export default firebaseAuthService;
