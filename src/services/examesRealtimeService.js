// Serviço de Sincronização para Exames - Usando localStorage (Firebase removido)
// TODO: Migrar para Supabase quando configurado

class ExamesRealtimeService {
  constructor() {
    this.currentUser = null;
    this.unsubscribeListeners = new Map();
    this.loadCurrentUser();
  }

  // Carregar usuário atual do localStorage
  loadCurrentUser() {
    try {
      const userEmail = localStorage.getItem('userEmail');
      const userUID = localStorage.getItem('userUID');
      if (userEmail && userUID) {
        this.currentUser = {
          email: userEmail,
          uid: userUID
        };
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
    }
  }

  // Obter usuário atual
  getCurrentUser() {
    this.loadCurrentUser();
    return this.currentUser;
  }

  // Verificar se usuário está logado
  requireAuth() {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    return user;
  }

  // Assinar mudanças em exames (simula tempo real verificando periodicamente)
  subscribeExames(onChange, onError = null) {
    try {
      const user = this.requireAuth();
      console.log('🔄 ExamesRealtimeService: Iniciando listener para:', user.email);

      // Buscar exames inicialmente
      this.buscarExames().then(result => {
        if (result.success) {
          onChange(result.exames, { hasPendingWrites: false, isOffline: false });
        }
      });

      // Criar intervalo para verificar mudanças periodicamente
      const intervalId = setInterval(() => {
        this.buscarExames().then(result => {
          if (result.success) {
            onChange(result.exames, { hasPendingWrites: false, isOffline: false });
          }
        }).catch(error => {
          if (onError) onError(error);
        });
      }, 5000); // Verificar a cada 5 segundos

      const listenerId = `exames_${user.uid}`;
      this.unsubscribeListeners.set(listenerId, () => {
        clearInterval(intervalId);
      });

      console.log('✅ ExamesRealtimeService: Listener ativo para:', user.email);
      return listenerId;

    } catch (error) {
      console.error('❌ ExamesRealtimeService: Erro ao criar listener:', error);
      if (onError) onError(error);
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

      const storageKey = `exames${dadosExame.tipoNome?.replace(/\s+/g, '') || 'Exame'}`;
      const examesExistentes = JSON.parse(localStorage.getItem(storageKey) || "[]");
      
      const novoExame = {
        ...dadosExame,
        id: Date.now().toString(),
        userId: user.uid,
        userEmail: user.email,
        dataCriacao: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        origem: 'localStorage'
      };
      
      examesExistentes.push(novoExame);
      localStorage.setItem(storageKey, JSON.stringify(examesExistentes));
      
      console.log('✅ ExamesRealtimeService: Exame criado:', novoExame.id);
      return { success: true, id: novoExame.id };

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

      const tiposLaudo = [
        'examesMMIIVenoso',
        'examesMMIIArterial', 
        'examesMMSSVenoso',
        'examesMMSSArterial',
        'examesCarotidasVertebrais'
      ];

      let atualizado = false;

      for (const tipo of tiposLaudo) {
        const exames = JSON.parse(localStorage.getItem(tipo) || "[]");
        const examesAtualizados = exames.map(exame => {
          if (exame.id === exameId && (exame.userId === user.uid || exame.userEmail === user.email)) {
            atualizado = true;
            return {
              ...exame,
              ...dadosAtualizados,
              dataModificacao: new Date().toISOString(),
              modificadoPor: user.uid
            };
          }
          return exame;
        });
        
        if (atualizado) {
          localStorage.setItem(tipo, JSON.stringify(examesAtualizados));
          break;
        }
      }

      if (atualizado) {
        console.log('✅ ExamesRealtimeService: Exame atualizado:', exameId);
        return { success: true };
      } else {
        return { success: false, error: 'Exame não encontrado' };
      }

    } catch (error) {
      console.error('❌ ExamesRealtimeService: Erro ao atualizar exame:', error);
      return { success: false, error: error.message };
    }
  }

  // Excluir exame
  async excluirExame(exameId) {
    try {
      const user = this.requireAuth();
      console.log('🗑️ ExamesRealtimeService: Excluindo exame:', exameId);

      const tiposLaudo = [
        'examesMMIIVenoso',
        'examesMMIIArterial', 
        'examesMMSSVenoso',
        'examesMMSSArterial',
        'examesCarotidasVertebrais'
      ];

      let deletado = false;

      for (const tipo of tiposLaudo) {
        const exames = JSON.parse(localStorage.getItem(tipo) || "[]");
        const examesAtualizados = exames.filter(exame => {
          if (exame.id === exameId && (exame.userId === user.uid || exame.userEmail === user.email)) {
            deletado = true;
            return false;
          }
          return true;
        });
        
        if (deletado) {
          localStorage.setItem(tipo, JSON.stringify(examesAtualizados));
          break;
        }
      }

      if (deletado) {
        console.log('✅ ExamesRealtimeService: Exame excluído:', exameId);
        return { success: true };
      } else {
        return { success: false, error: 'Exame não encontrado' };
      }

    } catch (error) {
      console.error('❌ ExamesRealtimeService: Erro ao excluir exame:', error);
      return { success: false, error: error.message };
    }
  }

  // Excluir exame (soft delete - alternativa)
  async excluirExameSoft(exameId) {
    return this.excluirExame(exameId); // Por enquanto, mesmo comportamento
  }

  // Buscar exames uma única vez
  async buscarExames() {
    try {
      const user = this.requireAuth();
      console.log('🔍 ExamesRealtimeService: Buscando exames...');

      const tiposLaudo = [
        'examesMMIIVenoso',
        'examesMMIIArterial', 
        'examesMMSSVenoso',
        'examesMMSSArterial',
        'examesCarotidasVertebrais'
      ];

      const todosExames = [];
      
      tiposLaudo.forEach(tipo => {
        const exames = JSON.parse(localStorage.getItem(tipo) || "[]");
        exames.forEach(exame => {
          // Filtrar apenas exames do usuário atual e não deletados
          if (!exame.deletedAt && (exame.userId === user.uid || exame.userEmail === user.email)) {
            todosExames.push({
              ...exame,
              tipoNome: exame.tipoNome || 'Exame',
              timestamp: exame.timestamp || exame.dataCriacao,
              criadoEm: exame.timestamp || exame.dataCriacao,
              origem: 'localStorage'
            });
          }
        });
      });

      // Ordenar por data mais recente
      todosExames.sort((a, b) => {
        const dateA = new Date(a.timestamp || a.dataCriacao || 0);
        const dateB = new Date(b.timestamp || b.dataCriacao || 0);
        return dateB - dateA;
      });

      console.log(`✅ ExamesRealtimeService: ${todosExames.length} exames encontrados`);
      return { success: true, exames: todosExames };

    } catch (error) {
      console.error('❌ ExamesRealtimeService: Erro ao buscar exames:', error);
      return { success: false, exames: [], error: error.message };
    }
  }

  // Verificar status de conexão
  getConnectionStatus() {
    return {
      isOnline: navigator.onLine,
      hasPendingWrites: false
    };
  }
}

// Criar instância única do serviço
const examesRealtimeService = new ExamesRealtimeService();

export default examesRealtimeService;