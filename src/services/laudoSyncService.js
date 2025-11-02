// Serviço para sincronizar laudos - Usando localStorage (Firebase removido)
// TODO: Migrar para Supabase quando configurado

class LaudoSyncService {
  constructor() {
    this.currentUser = null;
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

  // Salvar laudo no localStorage
  async salvarLaudo(laudoData) {
    try {
      console.log('💾 LaudoSyncService: Salvando laudo localmente...', laudoData);
      
      const user = this.getCurrentUser();
      if (!user) {
        console.error('❌ LaudoSyncService: Usuário não logado');
        throw new Error('Usuário não logado');
      }

      const storageKey = `exames${laudoData.tipoNome?.replace(/\s+/g, '') || 'Laudo'}`;
      const examesExistentes = JSON.parse(localStorage.getItem(storageKey) || "[]");
      
      const novoExame = {
        ...laudoData,
        id: Date.now().toString(),
        userId: user.uid,
        userEmail: user.email,
        timestamp: new Date().toISOString(),
        dataCriacao: new Date().toISOString(),
        origem: 'localStorage'
      };
      
      examesExistentes.push(novoExame);
      localStorage.setItem(storageKey, JSON.stringify(examesExistentes));
      
      console.log('✅ LaudoSyncService: Laudo salvo localmente:', storageKey);
      return { success: true, id: novoExame.id };
    } catch (error) {
      console.error('❌ LaudoSyncService: Erro ao salvar laudo:', error);
      return { success: false, error: error.message };
    }
  }

  // Salvar localmente (método legado)
  salvarLocalmente(laudoData) {
    return this.salvarLaudo(laudoData);
  }

  // Buscar laudos do usuário do localStorage
  async buscarLaudos() {
    try {
      console.log('🔍 LaudoSyncService: Buscando laudos localmente...');
      
      const user = this.getCurrentUser();
      if (!user) {
        console.log('❌ LaudoSyncService: Usuário não logado');
        return { success: false, laudos: [], error: 'Usuário não logado' };
      }

      const tiposLaudo = [
        'examesMMIIVenoso',
        'examesMMIIArterial', 
        'examesMMSSVenoso',
        'examesMMSSArterial',
        'examesCarotidasVertebrais'
      ];

      const todosLaudos = [];
      
      tiposLaudo.forEach(tipo => {
        const laudos = JSON.parse(localStorage.getItem(tipo) || "[]");
        laudos.forEach(laudo => {
          // Filtrar apenas laudos do usuário atual
          if (laudo.userId === user.uid || laudo.userEmail === user.email) {
            todosLaudos.push({
              ...laudo,
              tipo: tipo,
              origem: 'localStorage'
            });
          }
        });
      });

      // Ordenar por data mais recente
      todosLaudos.sort((a, b) => {
        const dateA = new Date(a.timestamp || a.dataCriacao || 0);
        const dateB = new Date(b.timestamp || b.dataCriacao || 0);
        return dateB - dateA;
      });

      console.log('✅ LaudoSyncService: Laudos carregados localmente:', todosLaudos.length);
      return { success: true, laudos: todosLaudos };
    } catch (error) {
      console.error('❌ LaudoSyncService: Erro ao buscar laudos:', error);
      return { success: false, laudos: [], error: error.message };
    }
  }

  // Buscar laudos locais (método legado)
  buscarLaudosLocais() {
    return this.buscarLaudos();
  }

  // Deletar laudo do localStorage
  async deletarLaudo(laudoId) {
    try {
      console.log('🗑️ LaudoSyncService: Deletando laudo:', laudoId);
      
      const user = this.getCurrentUser();
      if (!user) {
        throw new Error('Usuário não logado');
      }

      const tiposLaudo = [
        'examesMMIIVenoso',
        'examesMMIIArterial', 
        'examesMMSSVenoso',
        'examesMMSSArterial',
        'examesCarotidasVertebrais'
      ];

      let deletado = false;

      for (const tipo of tiposLaudo) {
        const laudos = JSON.parse(localStorage.getItem(tipo) || "[]");
        const laudosAtualizados = laudos.filter(laudo => {
          if (laudo.id === laudoId && (laudo.userId === user.uid || laudo.userEmail === user.email)) {
            deletado = true;
            return false;
          }
          return true;
        });
        
        if (deletado) {
          localStorage.setItem(tipo, JSON.stringify(laudosAtualizados));
          break;
        }
      }

      if (deletado) {
        console.log('✅ LaudoSyncService: Laudo deletado:', laudoId);
        return { success: true, message: 'Laudo deletado com sucesso' };
      } else {
        return { success: false, error: 'Laudo não encontrado' };
      }
    } catch (error) {
      console.error('❌ LaudoSyncService: Erro ao deletar laudo:', error);
      return { success: false, error: error.message };
    }
  }

  // Sincronizar laudos locais (método legado - não faz nada agora)
  async sincronizarLaudosLocais() {
    console.log('📝 LaudoSyncService: Sincronização não necessária com localStorage');
    return { success: true, sincronizados: 0 };
  }
}

// Criar instância única do serviço
const laudoSyncService = new LaudoSyncService();

export default laudoSyncService;