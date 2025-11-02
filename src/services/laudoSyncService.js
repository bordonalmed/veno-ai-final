// Serviço para sincronizar laudos - Usando Supabase + localStorage
import { supabase, supabaseConfig } from '../config/supabase';

class LaudoSyncService {
  constructor() {
    this.currentUser = null;
    this.useSupabase = supabaseConfig.isConfigured && supabase !== null;
    this.loadCurrentUser();
    
    if (this.useSupabase) {
      console.log('✅ LaudoSyncService: Usando Supabase para sincronização');
    } else {
      console.log('📦 LaudoSyncService: Usando localStorage (Supabase não configurado)');
    }
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

  // Salvar laudo no Supabase + localStorage
  async salvarLaudo(laudoData) {
    try {
      console.log('💾 LaudoSyncService: Salvando laudo...', laudoData);
      
      const user = this.getCurrentUser();
      if (!user) {
        console.error('❌ LaudoSyncService: Usuário não logado');
        throw new Error('Usuário não logado');
      }

      const exameId = Date.now().toString();
      const novoExame = {
        ...laudoData,
        id: exameId,
        userId: user.uid,
        userEmail: user.email,
        timestamp: new Date().toISOString(),
        dataCriacao: new Date().toISOString()
      };

      // Salvar no Supabase se configurado
      if (this.useSupabase && supabase) {
        try {
          console.log('💾 Salvando laudo no Supabase...');
          const { data: supabaseData, error: supabaseError } = await supabase
            .from('laudos')
            .insert({
              user_id: user.uid,
              user_email: user.email,
              tipo_nome: laudoData.tipoNome || 'Exame',
              nome: laudoData.nome || laudoData.paciente || 'Sem nome',
              data: laudoData.data || new Date().toLocaleDateString('pt-BR'),
              tipo_exame: laudoData.tipoNome || 'Exame',
              dados: laudoData,
              data_criacao: new Date().toISOString(),
              data_modificacao: new Date().toISOString(),
              origem: 'supabase'
            })
            .select();

          if (supabaseError) {
            console.error('❌ Erro ao salvar laudo no Supabase:', supabaseError);
            console.warn('⚠️ Salvando apenas em localStorage como fallback');
          } else {
            console.log('✅ Laudo salvo no Supabase:', supabaseData);
            novoExame.origem = 'supabase';
            novoExame.supabaseId = supabaseData[0]?.id;
          }
        } catch (supabaseErr) {
          console.error('❌ Erro ao conectar com Supabase:', supabaseErr);
          console.warn('⚠️ Salvando apenas em localStorage como fallback');
        }
      }

      // Salvar em localStorage também (para compatibilidade e fallback)
      const storageKey = `exames${laudoData.tipoNome?.replace(/\s+/g, '') || 'Laudo'}`;
      const examesExistentes = JSON.parse(localStorage.getItem(storageKey) || "[]");
      
      if (!novoExame.origem) {
        novoExame.origem = 'localStorage';
      }
      
      examesExistentes.push(novoExame);
      localStorage.setItem(storageKey, JSON.stringify(examesExistentes));
      
      console.log('✅ LaudoSyncService: Laudo salvo:', storageKey);
      return { success: true, id: exameId };
    } catch (error) {
      console.error('❌ LaudoSyncService: Erro ao salvar laudo:', error);
      return { success: false, error: error.message };
    }
  }

  // Salvar localmente (método legado)
  salvarLocalmente(laudoData) {
    return this.salvarLaudo(laudoData);
  }

  // Buscar laudos do usuário do Supabase + localStorage
  async buscarLaudos() {
    try {
      console.log('🔍 LaudoSyncService: Buscando laudos...');
      
      const user = this.getCurrentUser();
      if (!user) {
        console.log('❌ LaudoSyncService: Usuário não logado');
        return { success: false, laudos: [], error: 'Usuário não logado' };
      }

      const todosLaudos = [];

      // Buscar do Supabase se configurado
      if (this.useSupabase && supabase) {
        try {
          console.log('🔍 Buscando laudos do Supabase...');
          const { data: supabaseLaudos, error: supabaseError } = await supabase
            .from('laudos')
            .select('*')
            .eq('user_id', user.uid)
            .order('data_criacao', { ascending: false });

          if (supabaseError) {
            console.error('❌ Erro ao buscar laudos do Supabase:', supabaseError);
            console.warn('⚠️ Buscando apenas de localStorage como fallback');
          } else if (supabaseLaudos && supabaseLaudos.length > 0) {
            console.log(`✅ ${supabaseLaudos.length} laudos encontrados no Supabase`);
            
            supabaseLaudos.forEach(laudo => {
              const dadosLaudo = laudo.dados || {};
              todosLaudos.push({
                ...dadosLaudo,
                id: laudo.id || Date.now().toString(),
                userId: laudo.user_id,
                userEmail: laudo.user_email,
                tipoNome: laudo.tipo_nome || laudo.tipo_exame || 'Exame',
                nome: laudo.nome || dadosLaudo.nome || dadosLaudo.paciente,
                data: laudo.data || dadosLaudo.data,
                timestamp: laudo.data_criacao || laudo.data_modificacao,
                dataCriacao: laudo.data_criacao || laudo.data_modificacao,
                tipo: 'laudo',
                origem: 'supabase',
                supabaseId: laudo.id
              });
            });
          }
        } catch (supabaseErr) {
          console.error('❌ Erro ao conectar com Supabase:', supabaseErr);
          console.warn('⚠️ Buscando apenas de localStorage como fallback');
        }
      }

      // Buscar do localStorage também (para laudos antigos e fallback)
      const tiposLaudo = [
        'examesMMIIVenoso',
        'examesMMIIArterial', 
        'examesMMSSVenoso',
        'examesMMSSArterial',
        'examesCarotidasVertebrais'
      ];
      
      tiposLaudo.forEach(tipo => {
        const laudos = JSON.parse(localStorage.getItem(tipo) || "[]");
        laudos.forEach(laudo => {
          // Filtrar apenas laudos do usuário atual
          if (laudo.userId === user.uid || laudo.userEmail === user.email) {
            // Evitar duplicatas (se já veio do Supabase)
            const jaExiste = todosLaudos.some(l => 
              (l.supabaseId && laudo.supabaseId && l.supabaseId === laudo.supabaseId) ||
              (l.id === laudo.id && l.origem === 'supabase')
            );
            
            if (!jaExiste) {
              todosLaudos.push({
                ...laudo,
                tipo: laudo.tipo || tipo,
                origem: laudo.origem || 'localStorage'
              });
            }
          }
        });
      });

      // Ordenar por data mais recente
      todosLaudos.sort((a, b) => {
        const dateA = new Date(a.timestamp || a.dataCriacao || 0);
        const dateB = new Date(b.timestamp || b.dataCriacao || 0);
        return dateB - dateA;
      });

      console.log(`✅ LaudoSyncService: ${todosLaudos.length} laudos carregados (Supabase + localStorage)`);
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