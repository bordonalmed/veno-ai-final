// Serviço de sincronização entre dispositivos
export class SyncService {
  
  // Simular servidor usando localStorage (em produção seria uma API real)
  static getServerData() {
    try {
      const serverData = localStorage.getItem('venoai_server_data');
      if (!serverData) return {};
      return JSON.parse(serverData);
    } catch (error) {
      console.error('Erro ao acessar dados do servidor:', error);
      return {};
    }
  }

  static saveServerData(data) {
    try {
      localStorage.setItem('venoai_server_data', JSON.stringify(data));
      console.log('✅ Dados salvos no servidor simulado');
      return true;
    } catch (error) {
      console.error('Erro ao salvar dados no servidor:', error);
      return false;
    }
  }

  // Sincronizar dados do usuário
  static syncUserData(email, localData) {
    console.log('🔄 Sincronizando dados para:', email);
    
    const serverData = this.getServerData();
    
    // Se não existe dados do usuário no servidor, usar dados locais
    if (!serverData[email]) {
      serverData[email] = localData;
      this.saveServerData(serverData);
      console.log('📤 Dados enviados para o servidor');
      return localData;
    }
    
    // Se existe no servidor, mesclar dados (servidor tem prioridade)
    const mergedData = {
      ...localData,
      ...serverData[email],
      // Manter dados críticos do servidor
      plano: serverData[email].plano || localData.plano,
      trialStatus: serverData[email].trialStatus || localData.trialStatus,
      transacao: serverData[email].transacao || localData.transacao
    };
    
    // Atualizar servidor com dados mesclados
    serverData[email] = mergedData;
    this.saveServerData(serverData);
    
    console.log('🔄 Dados sincronizados:', mergedData);
    return mergedData;
  }

  // Obter dados do usuário do servidor
  static getUserDataFromServer(email) {
    const serverData = this.getServerData();
    return serverData[email] || null;
  }

  // Salvar dados do usuário no servidor
  static saveUserDataToServer(email, data) {
    const serverData = this.getServerData();
    serverData[email] = data;
    this.saveServerData(serverData);
    console.log('💾 Dados salvos no servidor para:', email);
  }

  // Verificar se usuário tem Premium ativo em qualquer dispositivo
  static checkPremiumStatus(email) {
    const serverData = this.getServerData();
    const userData = serverData[email];
    
    if (userData && userData.plano === 'premium') {
      console.log('✅ Usuário tem Premium ativo no servidor');
      return true;
    }
    
    console.log('❌ Usuário não tem Premium ativo no servidor');
    return false;
  }

  // Ativar Premium no servidor
  static activatePremiumOnServer(email, transactionData = null) {
    const serverData = this.getServerData();
    
    if (!serverData[email]) {
      serverData[email] = {};
    }
    
    serverData[email].plano = 'premium';
    serverData[email].transacao = transactionData;
    serverData[email].dataAtivacao = new Date().toISOString();
    
    this.saveServerData(serverData);
    console.log('🎉 Premium ativado no servidor para:', email);
  }

  // Ativar Trial no servidor
  static activateTrialOnServer(email, trialData) {
    const serverData = this.getServerData();
    
    if (!serverData[email]) {
      serverData[email] = {};
    }
    
    serverData[email].plano = 'trial';
    serverData[email].trialStatus = trialData;
    serverData[email].dataInicioTrial = new Date().toISOString();
    
    this.saveServerData(serverData);
    console.log('🎯 Trial ativado no servidor para:', email);
  }
}
