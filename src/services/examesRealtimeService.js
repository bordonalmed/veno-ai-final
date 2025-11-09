// Serviço de Sincronização para Exames - Usando Supabase + localStorage
import { supabase, supabaseConfig } from '../config/supabase';

const STORAGE_KEY_MAP = {
  'MMII Venoso': 'examesMMIIVenoso',
  'MMII Arterial': 'examesMMIIArterial',
  'MMSS Venoso': 'examesMMSSVenoso',
  'MMSS Arterial': 'examesMMSSArterial',
  'Carótidas e Vertebrais': 'examesCarotidasVertebrais',
  'Aorta e Ilíacas': 'examesAorta',
  'Artérias Renais': 'examesRenais',
};

const LEGACY_STORAGE_KEYS = [
  'examesMMIIVenoso',
  'examesMMIIArterial',
  'examesMMSSVenoso',
  'examesMMSSArterial',
  'examesCarotidasVertebrais',
  'examesCarotidas',
  'examesCarótidaseVertebrais',
  'examesAorta',
  'examesAortaeIlíacas',
  'examesRenais',
  'examesArtériasRenais',
];

const STORAGE_KEYS = Array.from(new Set([
  ...Object.values(STORAGE_KEY_MAP),
  ...LEGACY_STORAGE_KEYS,
  'examesLaudo',
]));

function getStorageKey(tipoNome = 'Exame') {
  if (!tipoNome) {
    return 'examesLaudo';
  }

  if (STORAGE_KEY_MAP[tipoNome]) {
    return STORAGE_KEY_MAP[tipoNome];
  }

  const normalized = tipoNome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');

  return normalized ? `exames${normalized}` : 'examesLaudo';
}

class ExamesRealtimeService {
  constructor() {
    this.currentUser = null;
    this.unsubscribeListeners = new Map();
    this.useSupabase = supabaseConfig.isConfigured && supabase !== null;
    this.loadCurrentUser();
    
    if (this.useSupabase) {
      console.log('✅ ExamesRealtimeService: Usando Supabase para sincronização');
    } else {
      console.log('📦 ExamesRealtimeService: Usando localStorage (Supabase não configurado)');
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

      let subscription = null;
      let intervalId = null;

      // Se Supabase configurado, configurar listener em tempo real
      if (this.useSupabase && supabase) {
        try {
          console.log('🔄 Configurando listener em tempo real do Supabase...');
          subscription = supabase
            .channel('laudos_changes')
            .on('postgres_changes', 
              { 
                event: '*', 
                schema: 'public', 
                table: 'laudos',
                filter: `user_id=eq.${user.uid}`
              }, 
              (payload) => {
                console.log('📡 Mudança detectada no Supabase:', payload);
                // Recarregar exames quando houver mudança
                this.buscarExames().then(result => {
                  if (result.success) {
                    onChange(result.exames, { hasPendingWrites: false, isOffline: false });
                  }
                });
              }
            )
            .subscribe();

          console.log('✅ ExamesRealtimeService: Listener em tempo real do Supabase ativo');
        } catch (supabaseErr) {
          console.warn('⚠️ Erro ao configurar listener do Supabase:', supabaseErr);
        }
      }

      // Criar intervalo para verificar mudanças periodicamente (fallback)
      intervalId = setInterval(() => {
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
        if (subscription) {
          subscription.unsubscribe();
        }
        if (intervalId) {
          clearInterval(intervalId);
        }
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

      const localId = Date.now().toString();
      const storageKey = getStorageKey(dadosExame.tipoNome);
      const novoExame = {
        ...dadosExame,
        id: localId,
        localId,
        userId: user.uid,
        userEmail: user.email,
        dataCriacao: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        tipo: storageKey
      };

      // Salvar no Supabase se configurado
      if (this.useSupabase && supabase) {
        try {
          console.log('📝 Salvando exame no Supabase...');
          const { data: supabaseData, error: supabaseError } = await supabase
            .from('laudos')
            .insert({
              user_id: user.uid,
              user_email: user.email,
              tipo_nome: dadosExame.tipoNome || 'Exame',
              nome: dadosExame.nome || dadosExame.paciente || 'Sem nome',
              data: dadosExame.data || new Date().toLocaleDateString('pt-BR'),
              tipo_exame: dadosExame.tipoNome || 'Exame',
              dados: dadosExame, // Salvar todos os dados como JSON
              data_criacao: new Date().toISOString(),
              data_modificacao: new Date().toISOString(),
              origem: 'supabase'
            })
            .select();

          if (supabaseError) {
            console.error('❌ Erro ao salvar exame no Supabase:', supabaseError);
            console.warn('⚠️ Salvando apenas em localStorage como fallback');
          } else {
            console.log('✅ Exame salvo no Supabase:', supabaseData);
            const supabaseId = supabaseData?.[0]?.id;
            if (supabaseId) {
              novoExame.supabaseId = supabaseId;
              novoExame.id = supabaseId;
            }
            novoExame.origem = 'supabase';
          }
        } catch (supabaseErr) {
          console.error('❌ Erro ao conectar com Supabase:', supabaseErr);
          console.warn('⚠️ Salvando apenas em localStorage como fallback');
        }
      }

      // Salvar em localStorage também (para compatibilidade e fallback)
      const examesExistentes = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const indiceExistente = examesExistentes.findIndex(
        (item) =>
          (item.localId && item.localId === localId) ||
          (item.id && item.id === localId)
      );

      if (!novoExame.origem) {
        novoExame.origem = 'localStorage';
      }
      
      if (indiceExistente >= 0) {
        examesExistentes[indiceExistente] = novoExame;
      } else {
        examesExistentes.push(novoExame);
      }
      localStorage.setItem(storageKey, JSON.stringify(examesExistentes));
      
      console.log('✅ ExamesRealtimeService: Exame criado:', novoExame.id);
      return { success: true, id: novoExame.id, supabaseId: novoExame.supabaseId, localId: novoExame.localId };

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

      // Primeiro, encontrar o exame para ver se tem supabaseId
      let exameParaAtualizar = null;
      const tiposLaudo = STORAGE_KEYS;

      for (const tipo of tiposLaudo) {
        const exames = JSON.parse(localStorage.getItem(tipo) || "[]");
        const exame = exames.find(e => e.id === exameId && (e.userId === user.uid || e.userEmail === user.email));
        if (exame) {
          exameParaAtualizar = { ...exame, tipo };
          break;
        }
      }

      // Atualizar no Supabase se tiver supabaseId
      if (exameParaAtualizar && exameParaAtualizar.supabaseId && this.useSupabase && supabase) {
        try {
          console.log('✏️ Atualizando exame no Supabase...');
          const exameAtualizado = {
            ...exameParaAtualizar,
            ...dadosAtualizados,
            dataModificacao: new Date().toISOString()
          };

          const { error: supabaseError } = await supabase
            .from('laudos')
            .update({
              nome: exameAtualizado.nome || exameAtualizado.paciente || 'Sem nome',
              data: exameAtualizado.data || exameAtualizado.dataCriacao,
              tipo_nome: exameAtualizado.tipoNome || exameParaAtualizar.tipoNome,
              dados: exameAtualizado,
              data_modificacao: new Date().toISOString()
            })
            .eq('id', exameParaAtualizar.supabaseId)
            .eq('user_id', user.uid);

          if (supabaseError) {
            console.error('❌ Erro ao atualizar exame no Supabase:', supabaseError);
          } else {
            console.log('✅ Exame atualizado no Supabase');
          }
        } catch (supabaseErr) {
          console.error('❌ Erro ao conectar com Supabase:', supabaseErr);
        }
      }

      // Atualizar no localStorage
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

      if (atualizado || (exameParaAtualizar && exameParaAtualizar.supabaseId)) {
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

      // Primeiro, encontrar o exame para ver se tem supabaseId
      let exameParaDeletar = null;
      const tiposLaudo = STORAGE_KEYS;

      for (const tipo of tiposLaudo) {
        const exames = JSON.parse(localStorage.getItem(tipo) || "[]");
        const exame = exames.find(e => {
          if (!e) return false;
          const matchesId = e.id === exameId || e.localId === exameId || e.supabaseId === exameId;
          return matchesId && (!e.userId || e.userId === user.uid) && (!e.userEmail || e.userEmail === user.email);
        });
        if (exame) {
          exameParaDeletar = exame;
          break;
        }
      }

      // Excluir do Supabase se tiver supabaseId
      let supabaseDeleted = false;

      const supabaseIdToDelete = exameParaDeletar?.supabaseId || exameParaDeletar?.id || exameId;

      if (supabaseIdToDelete && this.useSupabase && supabase) {
        try {
          console.log('🗑️ Excluindo exame do Supabase...');
          let supabaseError = null;

          if (user?.uid) {
            const result = await supabase
              .from('laudos')
              .delete()
              .eq('id', supabaseIdToDelete)
              .eq('user_id', user.uid);

            supabaseError = result.error;

            if (supabaseError) {
              console.warn('⚠️ Não foi possível excluir com filtro por user_id. Tentando sem filtro...', supabaseError);
            } else {
              console.log('✅ Exame excluído do Supabase (com filtro user_id)');
              supabaseDeleted = true;
            }
          }

          if (!user?.uid || supabaseError) {
            const { error: fallbackError } = await supabase
              .from('laudos')
              .delete()
              .eq('id', supabaseIdToDelete);

            if (fallbackError) {
              console.error('❌ Erro ao excluir exame do Supabase:', fallbackError);
            } else {
              console.log('✅ Exame excluído do Supabase (sem filtro user_id)');
              supabaseDeleted = true;
            }
          }
        } catch (supabaseErr) {
          console.error('❌ Erro ao conectar com Supabase:', supabaseErr);
        }
      }

      // Excluir do localStorage
      let deletado = false;
      const possibleKeys = new Set();

      if (exameParaDeletar?.tipo) possibleKeys.add(exameParaDeletar.tipo);
      if (exameParaDeletar?.tipoNome) possibleKeys.add(getStorageKey(exameParaDeletar.tipoNome));
      if (exameParaDeletar?.origem === 'localStorage' && exameParaDeletar?.tipo) possibleKeys.add(exameParaDeletar.tipo);

      tiposLaudo.forEach((key) => possibleKeys.add(key));

      for (const tipo of possibleKeys) {
        const exames = JSON.parse(localStorage.getItem(tipo) || "[]");
        const examesAtualizados = exames.filter(item => {
          if (!item) return false;
          const matchById =
            item.id === exameId ||
            item.localId === exameId ||
            item.supabaseId === exameId ||
            (exameParaDeletar?.supabaseId && (item.id === exameParaDeletar.supabaseId || item.supabaseId === exameParaDeletar.supabaseId)) ||
            (exameParaDeletar?.localId && (item.id === exameParaDeletar.localId || item.localId === exameParaDeletar.localId));

          if (matchById && (!item.userId || item.userId === user.uid) && (!item.userEmail || item.userEmail === user.email)) {
            deletado = true;
            return false;
          }
          return true;
        });

        if (deletado && examesAtualizados.length !== exames.length) {
          localStorage.setItem(tipo, JSON.stringify(examesAtualizados));
        }
      }

      if (deletado || supabaseDeleted) {
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

      const todosExames = [];

      // Buscar do Supabase se configurado
      if (this.useSupabase && supabase) {
        try {
          console.log('🔍 Buscando exames do Supabase...');
          const { data: supabaseExames, error: supabaseError } = await supabase
            .from('laudos')
            .select('*')
            .eq('user_id', user.uid)
            .order('data_criacao', { ascending: false });

          if (supabaseError) {
            console.error('❌ Erro ao buscar exames do Supabase:', supabaseError);
            console.warn('⚠️ Buscando apenas de localStorage como fallback');
          } else if (supabaseExames && supabaseExames.length > 0) {
            console.log(`✅ ${supabaseExames.length} exames encontrados no Supabase`);
            
            // Converter exames do Supabase para o formato esperado
            supabaseExames.forEach(exame => {
              const dadosExame = exame.dados || {};
              const tipoNome = exame.tipo_nome || exame.tipo_exame || dadosExame.tipoNome || dadosExame.tipo || 'Exame';
              const storageKey = getStorageKey(tipoNome);
              const supabaseId = exame.id;
              const localId = dadosExame.localId || dadosExame.id || supabaseId;
              todosExames.push({
                ...dadosExame,
                id: supabaseId || localId,
                localId,
                userId: exame.user_id,
                userEmail: exame.user_email,
                tipoNome,
                tipo: storageKey,
                nome: exame.nome || dadosExame.nome || dadosExame.paciente,
                data: exame.data || dadosExame.data,
                timestamp: exame.data_criacao || exame.data_modificacao,
                criadoEm: exame.data_criacao || exame.data_modificacao,
                origem: 'supabase',
                supabaseId: supabaseId
              });
            });
          }
        } catch (supabaseErr) {
          console.error('❌ Erro ao conectar com Supabase:', supabaseErr);
          console.warn('⚠️ Buscando apenas de localStorage como fallback');
        }
      }

      // Buscar do localStorage também (para exames antigos e fallback)
      const tiposLaudo = STORAGE_KEYS;
      
      tiposLaudo.forEach(tipo => {
        const exames = JSON.parse(localStorage.getItem(tipo) || "[]");
        exames.forEach(exame => {
          if (!exame) return;
          // Filtrar apenas exames do usuário atual e não deletados
          if (!exame.deletedAt && (!exame.userId || exame.userId === user.uid) && (!exame.userEmail || exame.userEmail === user.email)) {
            const supabaseId = exame.supabaseId;
            const localId = exame.localId || exame.id;
            // Evitar duplicatas (se já veio do Supabase)
            const jaExiste = todosExames.some(e => 
              (e.supabaseId && supabaseId && e.supabaseId === supabaseId) ||
              (e.id && supabaseId && e.id === supabaseId) ||
              (e.localId && localId && e.localId === localId)
            );
            
            if (!jaExiste) {
              const tipoNome = exame.tipoNome || exame.tipo || 'Exame';
              const storageKey = exame.tipo || tipo || getStorageKey(tipoNome);
              todosExames.push({
                ...exame,
                id: supabaseId || exame.id || localId,
                localId,
                tipoNome: tipoNome,
                tipo: storageKey,
                timestamp: exame.timestamp || exame.dataCriacao,
                criadoEm: exame.timestamp || exame.dataCriacao,
                origem: exame.origem || 'localStorage',
                supabaseId: supabaseId || exame.supabaseId
              });
            }
          }
        });
      });

      // Ordenar por data mais recente
      todosExames.sort((a, b) => {
        const dateA = new Date(a.timestamp || a.criadoEm || a.dataCriacao || 0);
        const dateB = new Date(b.timestamp || b.criadoEm || b.dataCriacao || 0);
        return dateB - dateA;
      });

      console.log(`✅ ExamesRealtimeService: ${todosExames.length} exames encontrados (Supabase + localStorage)`);
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