// Sistema de controle de trial - 7 dias + 5 laudos
import { SyncService } from '../services/syncService';

export class TrialManager {
  static iniciarTrial(userEmail) {
    const trialData = {
      inicio: new Date().toISOString(),
      laudosGerados: [],
      status: 'ativo'
    };
    
    // Salvar localmente
    localStorage.setItem(`trial_${userEmail}`, JSON.stringify(trialData));
    
    // Sincronizar com servidor
    SyncService.activateTrialOnServer(userEmail, trialData);
    
    console.log('🎯 Trial iniciado para:', userEmail);
    return trialData;
  }

  static verificarTrial(userEmail) {
    const trialData = JSON.parse(localStorage.getItem(`trial_${userEmail}`) || 'null');
    
    if (!trialData) {
      return { status: 'nao_iniciado', diasRestantes: 7, laudosRestantes: 5 };
    }

    const agora = new Date();
    const inicio = new Date(trialData.inicio);
    const diasPassados = Math.floor((agora - inicio) / (1000 * 60 * 60 * 24));
    const laudosUsados = trialData.laudosGerados.length;

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
  }

  static registrarLaudo(userEmail, tipoLaudo) {
    const trialData = JSON.parse(localStorage.getItem(`trial_${userEmail}`) || 'null');
    
    if (!trialData) {
      console.log('❌ Trial não encontrado para:', userEmail);
      return false;
    }

    const novoLaudo = {
      data: new Date().toISOString(),
      tipo: tipoLaudo
    };

    trialData.laudosGerados.push(novoLaudo);
    localStorage.setItem(`trial_${userEmail}`, JSON.stringify(trialData));
    
    console.log('📄 Laudo registrado:', novoLaudo);
    console.log('📊 Laudos restantes:', 5 - trialData.laudosGerados.length);
    
    return true;
  }

  static verificarLimiteAntesDeGerar(userEmail) {
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
  }

  static obterStatusTrial(userEmail) {
    return this.verificarTrial(userEmail);
  }

  static resetarTrial(userEmail) {
    localStorage.removeItem(`trial_${userEmail}`);
    console.log('🔄 Trial resetado para:', userEmail);
  }

  static verificarPlanoUsuario(userEmail) {
    try {
      // Primeiro verificar no servidor
      const serverData = SyncService.getUserDataFromServer(userEmail);
      if (serverData && serverData.plano) {
        // Sincronizar com dados locais
        localStorage.setItem(`plano_${userEmail}`, serverData.plano);
        return serverData.plano;
      }
    } catch (error) {
      console.error('Erro ao verificar plano no servidor:', error);
    }
    
    // Se não tem no servidor, usar dados locais
    const plano = localStorage.getItem(`plano_${userEmail}`) || 'trial';
    return plano;
  }

  static definirPlanoUsuario(userEmail, plano) {
    // Salvar localmente
    localStorage.setItem(`plano_${userEmail}`, plano);
    
    // Sincronizar com servidor
    if (plano === 'premium') {
      SyncService.activatePremiumOnServer(userEmail);
    } else if (plano === 'trial') {
      const trialData = this.verificarTrial(userEmail);
      SyncService.activateTrialOnServer(userEmail, trialData);
    }
    
    console.log('💎 Plano definido:', plano, 'para:', userEmail);
  }
}
