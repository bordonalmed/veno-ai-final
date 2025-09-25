// Serviço de sincronização SEGURO entre dispositivos
export class SyncServiceSafe {
  
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

  // Obter dados do servidor simulado com proteção
  static getServerData() {
    if (!this.isLocalStorageAvailable()) {
      console.warn('localStorage não disponível');
      return {};
    }

    try {
      const serverData = localStorage.getItem('venoai_server_data');
      if (!serverData) return {};
      
      const parsed = JSON.parse(serverData);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      console.error('Erro ao acessar dados do servidor:', error);
      return {};
    }
  }

  // Salvar dados no servidor simulado com proteção
  static saveServerData(data) {
    if (!this.isLocalStorageAvailable()) {
      console.warn('localStorage não disponível para salvar');
      return false;
    }

    try {
      if (!data || typeof data !== 'object') {
        console.error('Dados inválidos para salvar');
        return false;
      }

      localStorage.setItem('venoai_server_data', JSON.stringify(data));
      console.log('✅ Dados salvos no servidor simulado');
      return true;
    } catch (error) {
      console.error('Erro ao salvar dados no servidor:', error);
      return false;
    }
  }

  // Sincronizar dados do usuário com proteção máxima
  static syncUserData(email, localData) {
    if (!email || typeof email !== 'string') {
      console.error('Email inválido para sincronização');
      return localData || {};
    }

    try {
      console.log('🔄 Sincronizando dados para:', email);
      
      const serverData = this.getServerData();
      
      // Se não existe dados do usuário no servidor, usar dados locais
      if (!serverData[email]) {
        const safeData = this.validateUserData(localData);
        serverData[email] = safeData;
        this.saveServerData(serverData);
        console.log('📤 Dados enviados para o servidor');
        return safeData;
      }
      
      // Se existe no servidor, mesclar dados com validação
      const localSafe = this.validateUserData(localData);
      const serverSafe = this.validateUserData(serverData[email]);
      
      const mergedData = {
        ...localSafe,
        ...serverSafe,
        // Manter dados críticos do servidor se válidos
        plano: serverSafe.plano || localSafe.plano || 'trial',
        trialStatus: serverSafe.trialStatus || localSafe.trialStatus,
        transacao: serverSafe.transacao || localSafe.transacao
      };
      
      // Atualizar servidor com dados mesclados
      serverData[email] = mergedData;
      this.saveServerData(serverData);
      
      console.log('🔄 Dados sincronizados:', mergedData);
      return mergedData;
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return localData || {};
    }
  }

  // Validar dados do usuário
  static validateUserData(data) {
    if (!data || typeof data !== 'object') {
      return {};
    }

    const safe = {};
    
    // Validar plano
    if (data.plano && typeof data.plano === 'string') {
      safe.plano = ['trial', 'premium'].includes(data.plano) ? data.plano : 'trial';
    }
    
    // Validar trialStatus
    if (data.trialStatus && typeof data.trialStatus === 'object') {
      safe.trialStatus = this.validateTrialStatus(data.trialStatus);
    }
    
    // Validar transação
    if (data.transacao && typeof data.transacao === 'string') {
      safe.transacao = data.transacao;
    }
    
    return safe;
  }

  // Validar status do trial
  static validateTrialStatus(trialStatus) {
    if (!trialStatus || typeof trialStatus !== 'object') {
      return { status: 'nao_iniciado', diasRestantes: 7, laudosRestantes: 5 };
    }

    const safe = {
      status: 'nao_iniciado',
      diasRestantes: 7,
      laudosRestantes: 5
    };

    // Validar status
    if (trialStatus.status && typeof trialStatus.status === 'string') {
      safe.status = ['nao_iniciado', 'ativo', 'expirado'].includes(trialStatus.status) 
        ? trialStatus.status 
        : 'nao_iniciado';
    }

    // Validar dias restantes
    if (typeof trialStatus.diasRestantes === 'number' && trialStatus.diasRestantes >= 0) {
      safe.diasRestantes = trialStatus.diasRestantes;
    }

    // Validar laudos restantes
    if (typeof trialStatus.laudosRestantes === 'number' && trialStatus.laudosRestantes >= 0) {
      safe.laudosRestantes = trialStatus.laudosRestantes;
    }

    return safe;
  }

  // Obter dados do usuário do servidor com proteção
  static getUserDataFromServer(email) {
    if (!email || typeof email !== 'string') {
      return null;
    }

    try {
      const serverData = this.getServerData();
      return serverData[email] || null;
    } catch (error) {
      console.error('Erro ao obter dados do servidor:', error);
      return null;
    }
  }

  // Salvar dados do usuário no servidor com proteção
  static saveUserDataToServer(email, data) {
    if (!email || typeof email !== 'string') {
      console.error('Email inválido para salvar');
      return false;
    }

    try {
      const serverData = this.getServerData();
      serverData[email] = this.validateUserData(data);
      return this.saveServerData(serverData);
    } catch (error) {
      console.error('Erro ao salvar dados do usuário:', error);
      return false;
    }
  }

  // Verificar se usuário tem Premium ativo com proteção
  static checkPremiumStatus(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }

    try {
      const serverData = this.getServerData();
      const userData = serverData[email];
      
      if (userData && userData.plano === 'premium') {
        console.log('✅ Usuário tem Premium ativo no servidor');
        return true;
      }
      
      console.log('❌ Usuário não tem Premium ativo no servidor');
      return false;
    } catch (error) {
      console.error('Erro ao verificar Premium:', error);
      return false;
    }
  }

  // Ativar Premium no servidor com proteção
  static activatePremiumOnServer(email, transactionData = null) {
    if (!email || typeof email !== 'string') {
      console.error('Email inválido para ativar Premium');
      return false;
    }

    try {
      const serverData = this.getServerData();
      
      if (!serverData[email]) {
        serverData[email] = {};
      }
      
      serverData[email].plano = 'premium';
      serverData[email].transacao = transactionData;
      serverData[email].dataAtivacao = new Date().toISOString();
      
      const success = this.saveServerData(serverData);
      if (success) {
        console.log('🎉 Premium ativado no servidor para:', email);
      }
      return success;
    } catch (error) {
      console.error('Erro ao ativar Premium:', error);
      return false;
    }
  }

  // Ativar Trial no servidor com proteção
  static activateTrialOnServer(email, trialData) {
    if (!email || typeof email !== 'string') {
      console.error('Email inválido para ativar Trial');
      return false;
    }

    try {
      const serverData = this.getServerData();
      
      if (!serverData[email]) {
        serverData[email] = {};
      }
      
      serverData[email].plano = 'trial';
      serverData[email].trialStatus = this.validateTrialStatus(trialData);
      serverData[email].dataInicioTrial = new Date().toISOString();
      
      const success = this.saveServerData(serverData);
      if (success) {
        console.log('🎯 Trial ativado no servidor para:', email);
      }
      return success;
    } catch (error) {
      console.error('Erro ao ativar Trial:', error);
      return false;
    }
  }
}
