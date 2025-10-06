// Script para limpar TODOS os exames salvos
// Execute este script no console do navegador

console.log('🧹 INICIANDO LIMPEZA COMPLETA DOS EXAMES...');

// 1. Limpar localStorage local
const storageKeys = [
  'examesMMIIVenoso',
  'examesMMIIArterial', 
  'examesMMSSVenoso',
  'examesMMSSArterial',
  'examesCarotidasVertebrais',
  'examesCarotidas',
  'examesAorta',
  'examesRenais'
];

let limposLocal = 0;
storageKeys.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(`✅ Removido localStorage: ${key}`);
    limposLocal++;
  }
});

// 2. Limpar outros dados relacionados
const outrosDados = [
  'exameEmEdicao',
  'trial_',
  'transacao_'
];

// Limpar dados de trial (pode ter vários emails)
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('trial_') || key.startsWith('transacao_')) {
    localStorage.removeItem(key);
    console.log(`✅ Removido: ${key}`);
    limposLocal++;
  }
});

console.log(`📊 LIMPEZA LOCAL CONCLUÍDA: ${limposLocal} itens removidos`);

// 3. Função para limpar Firebase (será executada na página)
window.limparFirebase = async function() {
  try {
    console.log('🔥 INICIANDO LIMPEZA DO FIREBASE...');
    
    // Verificar se o Firebase está disponível
    if (typeof window.firebase === 'undefined') {
      console.error('❌ Firebase não está disponível');
      return;
    }
    
    const { getFirestore, collection, getDocs, deleteDoc, doc } = window.firebase.firestore;
    const { getAuth } = window.firebase.auth;
    
    const db = getFirestore();
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.error('❌ Usuário não logado');
      return;
    }
    
    console.log(`👤 Usuário logado: ${user.email}`);
    
    // Buscar todos os laudos do usuário
    const laudosRef = collection(db, 'laudos');
    const q = window.firebase.firestore.query(
      laudosRef,
      window.firebase.firestore.where('userId', '==', user.uid)
    );
    
    const snapshot = await getDocs(q);
    console.log(`📋 Encontrados ${snapshot.size} exames no Firebase`);
    
    if (snapshot.size === 0) {
      console.log('✅ Nenhum exame encontrado no Firebase');
      return;
    }
    
    // Deletar todos os exames
    let deletados = 0;
    for (const docSnapshot of snapshot.docs) {
      try {
        await deleteDoc(doc(db, 'laudos', docSnapshot.id));
        console.log(`🗑️ Deletado: ${docSnapshot.id}`);
        deletados++;
      } catch (error) {
        console.error(`❌ Erro ao deletar ${docSnapshot.id}:`, error);
      }
    }
    
    console.log(`🎉 LIMPEZA FIREBASE CONCLUÍDA: ${deletados} exames deletados`);
    
  } catch (error) {
    console.error('❌ Erro na limpeza do Firebase:', error);
  }
};

console.log('✅ SCRIPT CARREGADO!');
console.log('📋 Para limpar o Firebase, execute: limparFirebase()');
console.log('🔄 Para recarregar a página: location.reload()');
