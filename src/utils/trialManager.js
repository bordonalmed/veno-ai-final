// Sistema de controle de trial - 7 dias + 5 laudos
export class TrialManager {
  static iniciarTrial(userEmail) {
    // CRÍTICO: Verificar se já teve um trial antes
    // Se já teve trial que expirou, NÃO permitir reiniciar
    const trialAnterior = localStorage.getItem(`trial_${userEmail}`);
    
    if (trialAnterior) {
      try {
        const dadosAnteriores = JSON.parse(trialAnterior);
        const agora = new Date();
        const inicioAnterior = new Date(dadosAnteriores.inicio);
        const diasPassados = Math.floor((agora - inicioAnterior) / (1000 * 60 * 60 * 24));
        
        // Se passou mais de 7 dias OU já usou todos os laudos, NÃO permitir novo trial
        if (diasPassados >= 7 || (dadosAnteriores.laudosGerados && dadosAnteriores.laudosGerados.length >= 5)) {
          console.warn('❌ Trial não pode ser reiniciado. Usuário já usou trial completo:', userEmail);
          throw new Error('Trial já foi usado completamente. Upgrade para Premium.');
        }
      } catch (error) {
        console.warn('⚠️ Erro ao verificar trial anterior:', error);
        // Se der erro, não permitir iniciar (mais seguro)
        if (error.message.includes('Trial já foi usado')) {
          throw error;
        }
      }
    }
    
    // Se chegou aqui, pode iniciar o trial
    const trialData = {
      inicio: new Date().toISOString(),
      laudosGerados: [],
      status: 'ativo',
      unico: true // Marca que trial foi usado
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
        // Verificar se já teve trial antes (mesmo que não esteja no localStorage)
        // Se sim, NÃO permitir iniciar novo trial
        const trialUsado = localStorage.getItem(`trial_usado_${userEmail}`);
        if (trialUsado === 'true') {
          console.warn('❌ Trial já foi usado anteriormente por este usuário');
          return { 
            permitido: false, 
            motivo: 'trial_ja_usado',
            mensagem: 'Você já usou seu período de trial. Upgrade para Premium para continuar!'
          };
        }
        
        // Iniciar trial automaticamente
        this.iniciarTrial(userEmail);
        // Marcar que trial foi usado
        localStorage.setItem(`trial_usado_${userEmail}`, 'true');
        return { permitido: true, trial: this.verificarTrial(userEmail) };
      }

      if (trial.status === 'expirado') {
        // Marcar que trial foi usado/usado completamente
        localStorage.setItem(`trial_usado_${userEmail}`, 'true');
        
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
      
      // Se o erro é sobre trial já usado, retornar mensagem apropriada
      if (error.message && error.message.includes('Trial já foi usado')) {
        return { 
          permitido: false, 
          motivo: 'trial_ja_usado',
          mensagem: 'Você já usou seu período de trial. Upgrade para Premium para continuar!'
        };
      }
      
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
    // Verificar localStorage local primeiro
    const planoLocal = localStorage.getItem(`plano_${userEmail}`);
    
    // Se tem plano local, retornar
    if (planoLocal) {
      return planoLocal;
    }
    
    // Se não tem dados locais, verificar no servidor Netlify
    try {
      const planoServidor = await this.verificarPremiumNoServidor(userEmail);
      if (planoServidor && planoServidor !== 'trial') {
        return planoServidor;
      }
    } catch (error) {
      console.warn('Erro ao verificar plano no servidor:', error);
    }
    
    // Se não encontrou nada, retornar trial (padrão)
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

  // Salvar plano no Supabase (se configurado) ou localStorage
  static async salvarPlanoNoFirebase(userEmail, plano) {
    // Método mantido para compatibilidade, mas agora usa localStorage/Supabase
    try {
      localStorage.setItem(`plano_${userEmail}`, plano);
      if (plano === 'premium') {
        localStorage.setItem('plano_premium', 'true');
      }
      console.log('✅ Plano salvo:', plano, 'para:', userEmail);
      
      // TODO: Salvar no Supabase quando configurado
      // Por enquanto, apenas localStorage
      
    } catch (error) {
      console.warn('Erro ao salvar plano:', error);
    }
  }

  // Ler plano do localStorage
  static async lerPlanoDoFirebase(userEmail) {
    // Método mantido para compatibilidade, mas agora usa apenas localStorage
    try {
      const plano = localStorage.getItem(`plano_${userEmail}`) || 'trial';
      // Não logar toda vez (era muito verboso)
      return plano;
    } catch (error) {
      console.warn('Erro ao ler plano:', error);
      return 'trial';
    }
  }

  static async definirPlanoUsuario(userEmail, plano) {
    // Salvar localmente
    localStorage.setItem(`plano_${userEmail}`, plano);
    console.log('💎 Plano definido localmente:', plano, 'para:', userEmail);
    
    // Firebase removido - apenas localStorage por enquanto
  }
}
