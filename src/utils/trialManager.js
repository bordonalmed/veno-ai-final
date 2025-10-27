// Sistema de controle de trial - 7 dias + 5 laudos
export class TrialManager {
  static iniciarTrial(userEmail) {
    const trialData = {
      inicio: new Date().toISOString(),
      laudosGerados: [],
      status: 'ativo'
    };
    
    localStorage.setItem(`trial_${userEmail}`, JSON.stringify(trialData));
    console.log('🎯 Trial iniciado para:', userEmail);
    return trialData;
  }

  static verificarTrial(userEmail) {
    try {
      const trialData = JSON.parse(localStorage.getItem(`trial_${userEmail}`) || 'null');
      
      if (!trialData || !trialData.inicio) {
        return { status: 'nao_iniciado', diasRestantes: 7, laudosRestantes: 5 };
      }

      const agora = new Date();
      const inicio = new Date(trialData.inicio);
      const diasPassados = Math.floor((agora - inicio) / (1000 * 60 * 60 * 24));
      
      // Garantir que laudosGerados existe e é um array
      const laudosGerados = trialData.laudosGerados || [];
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
    try {
      const trialData = JSON.parse(localStorage.getItem(`trial_${userEmail}`) || 'null');
      
      if (!trialData || !trialData.inicio) {
        console.log('❌ Trial não encontrado para:', userEmail);
        return false;
      }

      const novoLaudo = {
        data: new Date().toISOString(),
        tipo: tipoLaudo
      };

      // Garantir que laudosGerados existe e é um array
      if (!trialData.laudosGerados) {
        trialData.laudosGerados = [];
      }

      trialData.laudosGerados.push(novoLaudo);
      localStorage.setItem(`trial_${userEmail}`, JSON.stringify(trialData));
      
      console.log('📄 Laudo registrado:', novoLaudo);
      console.log('📊 Laudos restantes:', 5 - trialData.laudosGerados.length);
      
      return true;
    } catch (error) {
      console.error('Erro ao registrar laudo:', error);
      return false;
    }
  }

  static verificarLimiteAntesDeGerar(userEmail) {
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
    localStorage.removeItem(`trial_${userEmail}`);
    console.log('🔄 Trial resetado para:', userEmail);
  }

  static async verificarPlanoUsuario(userEmail) {
    // Primeiro verificar localStorage local
    const planoLocal = localStorage.getItem(`plano_${userEmail}`);
    
    // Sempre verificar no Firebase para garantir sincronização
    try {
      const planoFirebase = await this.lerPlanoDoFirebase(userEmail);
      if (planoFirebase) {
        // Se o Firebase tem um plano diferente do local, usar o Firebase
        if (planoLocal !== planoFirebase) {
          console.log('🔄 Plano no Firebase diferente do local, usando Firebase:', planoFirebase);
          return planoFirebase;
        }
      }
    } catch (error) {
      console.warn('Erro ao verificar plano no Firebase:', error);
    }
    
    // Se tem plano local e Firebase concordou (ou não há Firebase), retornar local
    if (planoLocal) {
      return planoLocal;
    }
    
    // Se não tem dados locais, verificar no servidor Netlify
    try {
      const planoServidor = await this.verificarPremiumNoServidor(userEmail);
      if (planoServidor) {
        return planoServidor;
      }
    } catch (error) {
      console.warn('Erro ao verificar plano no servidor:', error);
    }
    
    // Se não encontrou nada, retornar trial
    return 'trial';
  }
  
  // Verificar se usuário é Premium no servidor
  static async verificarPremiumNoServidor(userEmail) {
    try {
      const response = await fetch('https://venoai.xyz/.netlify/functions/verificar-usuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.premium) {
          // Salvar status Premium localmente
          localStorage.setItem(`plano_${userEmail}`, 'premium');
          console.log('✅ Status Premium confirmado no servidor');
          return 'premium';
        }
      }
    } catch (error) {
      console.warn('Erro ao verificar Premium no servidor:', error);
    }
    
    return 'trial'; // Default para trial
  }

  // Salvar plano no Firebase
  static async salvarPlanoNoFirebase(userEmail, plano) {
    try {
      // Importar dinamicamente para evitar dependência circular
      const { db } = await import('../config/firebase');
      const { updateDoc, doc, setDoc, getDoc } = await import('firebase/firestore');
      
      // Obter UID do usuário logado
      const userUID = localStorage.getItem('userUID');
      
      if (!userUID) {
        console.warn('Usuário não autenticado no Firebase. Não é possível salvar plano no Firebase.');
        return;
      }
      
      // Salvar/atualizar usando o UID
      const userRef = doc(db, 'users', userUID);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        // Atualizar documento existente
        await updateDoc(userRef, {
          plano: plano,
          premium: plano === 'premium',
          ultimaAtualizacao: new Date().toISOString()
        });
        console.log('✅ Plano atualizado no Firebase:', plano, 'para:', userEmail);
      } else {
        // Criar novo documento se não existe
        await setDoc(userRef, {
          email: userEmail,
          plano: plano,
          premium: plano === 'premium',
          dataCadastro: new Date().toISOString(),
          ultimaAtualizacao: new Date().toISOString()
        });
        console.log('✅ Plano criado no Firebase:', plano, 'para:', userEmail);
      }
    } catch (error) {
      console.warn('Erro ao salvar plano no Firebase:', error);
      // Não lançar erro para não quebrar o fluxo
    }
  }

  // Ler plano do Firebase
  static async lerPlanoDoFirebase(userEmail) {
    try {
      // Importar dinamicamente para evitar dependência circular
      const { db } = await import('../config/firebase');
      const { getDoc, doc } = await import('firebase/firestore');
      
      // Obter UID do usuário logado
      const userUID = localStorage.getItem('userUID');
      
      if (!userUID) {
        console.warn('Usuário não autenticado no Firebase. Não é possível ler plano do Firebase.');
        return null;
      }
      
      // Buscar documento do usuário usando UID
      const userRef = doc(db, 'users', userUID);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const plano = userData.plano || 'trial';
        
        // Atualizar cache local
        if (plano) {
          localStorage.setItem(`plano_${userEmail}`, plano);
        }
        
        console.log('✅ Plano lido do Firebase:', plano, 'para:', userEmail);
        return plano;
      }
    } catch (error) {
      console.warn('Erro ao ler plano do Firebase:', error);
    }
    
    return null;
  }

  static async definirPlanoUsuario(userEmail, plano) {
    // Salvar localmente
    localStorage.setItem(`plano_${userEmail}`, plano);
    console.log('💎 Plano definido localmente:', plano, 'para:', userEmail);
    
    // Salvar no Firebase (para sincronização entre dispositivos)
    await this.salvarPlanoNoFirebase(userEmail, plano);
  }
}
