// Serviço de Sincronização em Tempo Real para Exames
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

class ExamesRealtimeService {
  constructor() {
    this.currentUser = null;
    this.unsubscribeListeners = new Map(); // Para gerenciar múltiplos listeners
  }

  // Obter usuário atual
  getCurrentUser() {
    return auth.currentUser;
  }

  // Verificar se usuário está logado
  requireAuth() {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    return user;
  }

  // Assinar mudanças em tempo real nos exames do usuário
  subscribeExames(onChange, onError = null) {
    try {
      const user = this.requireAuth();
      console.log('🔄 ExamesRealtimeService: Iniciando listener em tempo real para:', user.email);

      // Query para buscar apenas exames do usuário atual, ordenados por data de criação
      const q = query(
        collection(db, 'laudos'),
        where('userId', '==', user.uid),
        orderBy('dataCriacao', 'desc')
      );

      // Criar listener em tempo real
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          console.log('📡 ExamesRealtimeService: Recebida atualização em tempo real');
          
          const exames = [];
          let hasPendingWrites = false;

          snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Verificar se há escritas pendentes (offline)
            if (doc.metadata.hasPendingWrites) {
              hasPendingWrites = true;
            }

            // Filtrar exames deletados (soft delete)
            if (!data.deletedAt) {
              exames.push({
                id: doc.id,
                ...data,
                // Garantir campos padronizados
                tipoNome: data.tipoNome || 'Exame',
                timestamp: data.dataCriacao || data.timestamp,
                criadoEm: data.dataCriacao || data.timestamp,
                origem: 'firebase-realtime'
              });
            }
          });

          console.log(`✅ ExamesRealtimeService: ${exames.length} exames sincronizados`);
          if (hasPendingWrites) {
            console.log('⏳ ExamesRealtimeService: Há escritas pendentes (offline)');
          }

          // Chamar callback com os dados
          onChange(exames, { hasPendingWrites, isOffline: !navigator.onLine });
        },
        (error) => {
          console.error('❌ ExamesRealtimeService: Erro no listener:', error);
          if (onError) {
            onError(error);
          }
        }
      );

      // Armazenar unsubscribe para poder cancelar depois
      const listenerId = `exames_${user.uid}`;
      this.unsubscribeListeners.set(listenerId, unsubscribe);

      console.log('✅ ExamesRealtimeService: Listener ativo para:', user.email);
      return listenerId;

    } catch (error) {
      console.error('❌ ExamesRealtimeService: Erro ao criar listener:', error);
      throw error;
    }
  }

  // Cancelar listener específico
  unsubscribeExames(listenerId) {
    const unsubscribe = this.unsubscribeListeners.get(listenerId);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribeListeners.delete(listenerId);
      console.log('🔇 ExamesRealtimeService: Listener cancelado:', listenerId);
    }
  }

  // Cancelar todos os listeners
  unsubscribeAll() {
    this.unsubscribeListeners.forEach((unsubscribe, id) => {
      unsubscribe();
      console.log('🔇 ExamesRealtimeService: Listener cancelado:', id);
    });
    this.unsubscribeListeners.clear();
  }

  // Criar novo exame
  async criarExame(dadosExame) {
    try {
      const user = this.requireAuth();
      console.log('📝 ExamesRealtimeService: Criando novo exame...');

      const exameCompleto = {
        ...dadosExame,
        userId: user.uid,
        userEmail: user.email,
        dataCriacao: serverTimestamp(),
        dataModificacao: serverTimestamp(),
        origem: 'firebase-realtime',
        // Hash único para evitar duplicatas
        hashUnico: `${user.uid}_${dadosExame.nome}_${dadosExame.data}_${dadosExame.tipoNome}_${Date.now()}`
      };

      const docRef = await addDoc(collection(db, 'laudos'), exameCompleto);
      
      console.log('✅ ExamesRealtimeService: Exame criado com ID:', docRef.id);
      // NÃO atualizar estado local - o listener em tempo real fará isso
      
      return { success: true, id: docRef.id };

    } catch (error) {
      console.error('❌ ExamesRealtimeService: Erro ao criar exame:', error);
      return { success: false, error: error.message };
    }
  }

  // Atualizar exame existente
  async atualizarExame(exameId, dadosAtualizados) {
    try {
      const user = this.requireAuth();
      console.log('✏️ ExamesRealtimeService: Atualizando exame:', exameId);

      const dadosComTimestamp = {
        ...dadosAtualizados,
        dataModificacao: serverTimestamp(),
        modificadoPor: user.uid
      };

      await updateDoc(doc(db, 'laudos', exameId), dadosComTimestamp);
      
      console.log('✅ ExamesRealtimeService: Exame atualizado:', exameId);
      // NÃO atualizar estado local - o listener em tempo real fará isso
      
      return { success: true };

    } catch (error) {
      console.error('❌ ExamesRealtimeService: Erro ao atualizar exame:', error);
      return { success: false, error: error.message };
    }
  }

  // Excluir exame (hard delete)
  async excluirExame(exameId) {
    try {
      const user = this.requireAuth();
      console.log('🗑️ ExamesRealtimeService: Excluindo exame:', exameId);

      await deleteDoc(doc(db, 'laudos', exameId));
      
      console.log('✅ ExamesRealtimeService: Exame excluído:', exameId);
      // NÃO atualizar estado local - o listener em tempo real fará isso
      
      return { success: true };

    } catch (error) {
      console.error('❌ ExamesRealtimeService: Erro ao excluir exame:', error);
      return { success: false, error: error.message };
    }
  }

  // Excluir exame (soft delete - alternativa)
  async excluirExameSoft(exameId) {
    try {
      const user = this.requireAuth();
      console.log('🗑️ ExamesRealtimeService: Excluindo exame (soft delete):', exameId);

      await updateDoc(doc(db, 'laudos', exameId), {
        deletedAt: serverTimestamp(),
        dataModificacao: serverTimestamp(),
        excluidoPor: user.uid
      });
      
      console.log('✅ ExamesRealtimeService: Exame marcado como excluído:', exameId);
      
      return { success: true };

    } catch (error) {
      console.error('❌ ExamesRealtimeService: Erro ao excluir exame (soft):', error);
      return { success: false, error: error.message };
    }
  }

  // Buscar exames uma única vez (para casos especiais)
  async buscarExames() {
    try {
      const user = this.requireAuth();
      console.log('🔍 ExamesRealtimeService: Buscando exames (one-time)...');

      const q = query(
        collection(db, 'laudos'),
        where('userId', '==', user.uid),
        orderBy('dataCriacao', 'desc')
      );

      const snapshot = await getDocs(q);
      const exames = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.deletedAt) {
          exames.push({
            id: doc.id,
            ...data,
            tipoNome: data.tipoNome || 'Exame',
            timestamp: data.dataCriacao || data.timestamp,
            criadoEm: data.dataCriacao || data.timestamp,
            origem: 'firebase-onetime'
          });
        }
      });

      console.log(`✅ ExamesRealtimeService: ${exames.length} exames encontrados`);
      return { success: true, exames };

    } catch (error) {
      console.error('❌ ExamesRealtimeService: Erro ao buscar exames:', error);
      return { success: false, exames: [], error: error.message };
    }
  }

  // Verificar status de conexão
  getConnectionStatus() {
    return {
      isOnline: navigator.onLine,
      hasPendingWrites: false // Será atualizado pelo listener
    };
  }
}

// Criar instância única do serviço
const examesRealtimeService = new ExamesRealtimeService();

export default examesRealtimeService;
