// Firebase Configuration - STUB (Firebase removido temporariamente)
// Este arquivo existe apenas para manter compatibilidade com imports existentes
// Todos os serviços foram adaptados para usar localStorage

// Stub objects que simulam Firebase mas não fazem nada
export const auth = {
  currentUser: null,
  onAuthStateChanged: (callback) => {
    // Retornar usuário do localStorage se existir
    try {
      const userEmail = localStorage.getItem('userEmail');
      const userUID = localStorage.getItem('userUID');
      if (userEmail && userUID) {
        const user = {
          email: userEmail,
          uid: userUID,
          getIdToken: async () => '',
          getIdTokenResult: async () => ({ claims: {} })
        };
        callback(user);
        return () => {};
      } else {
        callback(null);
        return () => {};
      }
    } catch (error) {
      callback(null);
      return () => {};
    }
  }
};

// Stub do Firestore
export const db = {
  collection: () => ({
    where: () => ({ orderBy: () => ({}) }),
    addDoc: async () => ({ id: Date.now().toString() }),
    doc: () => ({
      updateDoc: async () => {},
      deleteDoc: async () => {},
      getDoc: async () => ({ exists: () => false, data: () => null })
    })
  })
};

// Stub do serverTimestamp
export const serverTimestampNow = () => new Date().toISOString();

// Aviso no console
if (typeof window !== 'undefined') {
  console.warn('⚠️ Firebase está desabilitado. Sistema usando localStorage.');
  console.log('📝 Para habilitar Firebase novamente, descomente as importações em src/config/firebase.js');
}

export default { auth, db };