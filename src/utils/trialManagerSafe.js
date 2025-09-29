// Sistema de controle de trial SEGURO - 7 dias + 5 laudos
import { SyncServiceUnified } from '../services/syncServiceUnified';

export class TrialManagerSafe {
  
  // Verificar se localStorage está disponível
  static isLocalStorageAvailable() {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  static iniciarTrial(userEmail) {
    if (!userEmail || typeof userEmail !== 'string') {
      console.error('Email inválido para iniciar trial');
      return null;
    }

    const trialData = {
      inicio: new Date().toISOString(),
      laudosGerados: [],
      status: 'ativo'
    };
    
    try {
      if (this.isLocalStorageAvailable()) {
        localStorage.setItem(`trial_${userEmail}`, JSON.stringify(trialData));
      }
      
      // Sincronizar com servidor automaticamente
      const localData = {
        plano: 'trial',
        trialStatus: trialData,
        transacao: null
      };
      SyncServiceUnified.syncUserData(userEmail, localData);
      
      console.log('🎯 Trial iniciado para:', userEmail);
      return trialData;
    } catch (error) {
      console.error('Erro ao iniciar trial:', error);
      return trialData; // Retornar dados mesmo se der erro
    }
  }

  static verificarTrial(userEmail) {
    if (!userEmail || typeof userEmail !== 'string') {
      return { status: 'nao_iniciado', diasRestantes: 7, laudosRestantes: 5 };
    }

    try {
      let trialData = null;
      
      // Tentar obter dados locais
      if (this.isLocalStorageAvailable()) {
        const localData = localStorage.getItem(`trial_${userEmail}`);
        if (localData) {
          trialData = JSON.parse(localData);
        }
      }
      
      // Se não tem dados locais, tentar obter do servidor
      if (!trialData) {
        const serverData = SyncServiceUnified.getUserData(userEmail);
        if (serverData && serverData.trialStatus) {
          trialData = serverData.trialStatus;
        }
      }
      
      if (!trialData || !trialData.inicio) {
        return { status: 'nao_iniciado', diasRestantes: 7, laudosRestantes: 5 };
      }

      const agora = new Date();
      const inicio = new Date(trialData.inicio);
      
      // Verificar se a data é válida
      if (isNaN(inicio.getTime())) {
        console.error('Data de início inválida');
        return { status: 'nao_iniciado', diasRestantes: 7, laudosRestantes: 5 };
      }
      
      const diasPassados = Math.floor((agora - inicio) / (1000 * 60 * 60 * 24));
      
      // Garantir que laudosGerados existe e é um array
      const laudosGerados = Array.isArray(trialData.laudosGerados) ? trialData.laudosGerados : [];
      const laudosUsados = laudosGerados.length;

      const diasRestantes = Math.max(0, 7 - diasPassados);
      const laudosRestantes = Math.max(0, 5 - laudosUsados);

      // Verificar se trial expirou
      if (diasPassados >= 7 || laudosUsados >= 5) {
        return { 
          status: 'expirado', 
          diasRestantes: 0, 
          laudosRestantes: 0,
          motivo: diasPassados >= 7 ? 'tempo' : 'laudos'
        };
      }

      return { 
        status: 'ativo', 
        diasRestantes, 
        laudosRestantes,
        trialData
      };
    } catch (error) {
      console.error('Erro ao verificar trial:', error);
      return { status: 'nao_iniciado', diasRestantes: 7, laudosRestantes: 5 };
    }
  }

  static registrarLaudo(userEmail, tipoLaudo) {
    if (!userEmail || typeof userEmail !== 'string') {
      console.error('Email inválido para registrar laudo');
      return false;
    }

    try {
      let trialData = null;
      
      // Tentar obter dados locais
      if (this.isLocalStorageAvailable()) {
        const localData = localStorage.getItem(`trial_${userEmail}`);
        if (localData) {
          trialData = JSON.parse(localData);
        }
      }
      
      if (!trialData || !trialData.inicio) {
        console.log('❌ Trial não encontrado para:', userEmail);
        return false;
      }

      const novoLaudo = {
        data: new Date().toISOString(),
        tipo: tipoLaudo
      };

      // Garantir que laudosGerados existe e é um array
      if (!Array.isArray(trialData.laudosGerados)) {
        trialData.laudosGerados = [];
      }

      trialData.laudosGerados.push(novoLaudo);
      
      // Salvar localmente
      if (this.isLocalStorageAvailable()) {
        localStorage.setItem(`trial_${userEmail}`, JSON.stringify(trialData));
      }
      
      // Sincronizar com servidor automaticamente
      const localData = {
        plano: this.verificarPlanoUsuario(userEmail),
        trialStatus: trialData,
        transacao: localStorage.getItem(`transacao_${userEmail}`)
      };
      SyncServiceUnified.syncUserData(userEmail, localData);
      
      console.log('📄 Laudo registrado:', novoLaudo);
      console.log('📊 Laudos restantes:', 5 - trialData.laudosGerados.length);
      
      return true;
    } catch (error) {
      console.error('Erro ao registrar laudo:', error);
      return false;
    }
  }

  static verificarLimiteAntesDeGerar(userEmail) {
    if (!userEmail || typeof userEmail !== 'string') {
      return { permitido: false, motivo: 'erro', mensagem: 'Email inválido' };
    }

    try {
      const trial = this.verificarTrial(userEmail);
      
      if (trial.status === 'nao_iniciado') {
        // Iniciar trial automaticamente
        this.iniciarTrial(userEmail);
        return { permitido: true, trial: this.verificarTrial(userEmail) };
      }

      if (trial.status === 'expirado') {
        return { 
          permitido: false, 
          motivo: trial.motivo,
          mensagem: trial.motivo === 'tempo' 
            ? 'Seu trial de 7 dias expirou. Upgrade para Premium para continuar!'
            : 'Você atingiu o limite de 5 laudos. Upgrade para Premium para continuar!'
        };
      }

      if (trial.status === 'ativo') {
        return { permitido: true, trial };
      }

      return { permitido: false, motivo: 'erro' };
    } catch (error) {
      console.error('Erro ao verificar limite:', error);
      return { permitido: false, motivo: 'erro', mensagem: 'Erro ao verificar limite de trial' };
    }
  }

  static obterStatusTrial(userEmail) {
    return this.verificarTrial(userEmail);
  }

  static resetarTrial(userEmail) {
    if (!userEmail || typeof userEmail !== 'string') {
      return;
    }

    try {
      if (this.isLocalStorageAvailable()) {
        localStorage.removeItem(`trial_${userEmail}`);
      }
      
      // Remover do servidor também
      const serverData = SyncServiceUnified.getAllSyncData();
      if (serverData[userEmail]) {
        delete serverData[userEmail];
        localStorage.setItem('venoai_sync_data', JSON.stringify(serverData));
      }
      
      console.log('🔄 Trial resetado para:', userEmail);
    } catch (error) {
      console.error('Erro ao resetar trial:', error);
    }
  }

  static verificarPlanoUsuario(userEmail) {
    if (!userEmail || typeof userEmail !== 'string') {
      return 'trial';
    }

    try {
      // Primeiro verificar no servidor
      const serverData = SyncServiceUnified.getUserData(userEmail);
      if (serverData && serverData.plano) {
        // Sincronizar com dados locais
        if (this.isLocalStorageAvailable()) {
          localStorage.setItem(`plano_${userEmail}`, serverData.plano);
        }
        return serverData.plano;
      }
      
      // Se não tem no servidor, usar dados locais
      if (this.isLocalStorageAvailable()) {
        const plano = localStorage.getItem(`plano_${userEmail}`) || 'trial';
        return plano;
      }
      
      return 'trial';
    } catch (error) {
      console.error('Erro ao verificar plano:', error);
      return 'trial';
    }
  }

  static definirPlanoUsuario(userEmail, plano) {
    if (!userEmail || typeof userEmail !== 'string') {
      console.error('Email inválido para definir plano');
      return;
    }

    if (!['trial', 'premium'].includes(plano)) {
      console.error('Plano inválido:', plano);
      return;
    }

    try {
      // Salvar localmente
      if (this.isLocalStorageAvailable()) {
        localStorage.setItem(`plano_${userEmail}`, plano);
      }
      
      // Sincronizar com servidor automaticamente
      const localData = {
        plano: plano,
        trialStatus: this.verificarTrial(userEmail),
        transacao: localStorage.getItem(`transacao_${userEmail}`)
      };
      SyncServiceUnified.syncUserData(userEmail, localData);
      
      console.log('💎 Plano definido:', plano, 'para:', userEmail);
    } catch (error) {
      console.error('Erro ao definir plano:', error);
    }
  }
}
