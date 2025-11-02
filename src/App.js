import React, { useState, Component, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Landing from "./pages/LandingNew";
import Login from "./pages/Login";
import Home from "./pages/Home";
import MMIIVenoso from "./pages/MMIIVenoso";
import MMIIArterial from "./pages/MMIIArterial";
import MMSSVenoso from "./pages/MMSSVenoso";
import MMSSArterial from "./pages/MMSSArterial";
import CarotidasVertebrais from "./pages/CarotidasVertebrais";
import EmConstrucao from "./pages/EmConstrucao";
import Configuracoes from "./pages/Configuracoes";
import ExamesRealizados from "./pages/ExamesRealizados";
import Planos from "./pages/Planos";
import ConfirmacaoPagamento from "./pages/ConfirmacaoPagamento";
// Usar Supabase em vez de Firebase
import { AuthService } from "./services/supabaseAuthService";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          background: "linear-gradient(120deg,#101824 0%,#1c2740 100%)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          textAlign: "center"
        }}>
          <h1>Erro na aplicação</h1>
          <p>Ocorreu um erro inesperado. Por favor, recarregue a página.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: "#0eb8d0",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px 24px",
              fontSize: 16,
              cursor: "pointer",
              marginTop: 20
            }}
          >
            Recarregar Página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [logado, setLogado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();
  
  // Verificar se usuário está logado ao carregar a página
  useEffect(() => {
    const verificarLogin = () => {
      try {
        const userEmail = localStorage.getItem('userEmail');
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const userUID = localStorage.getItem('userUID');
        
        console.log('Verificando login:', { userEmail, isLoggedIn, userUID });
        
        if (userEmail && isLoggedIn === 'true' && userUID) {
          setLogado(true);
          console.log('Usuário logado detectado:', userEmail);
        } else {
          setLogado(false);
          console.log('Usuário não logado');
        }
      } catch (error) {
        console.error('Erro ao verificar login:', error);
        setLogado(false);
      } finally {
        setCarregando(false);
      }
    };

    verificarLogin();
  }, []);
  
  // Se ainda está carregando, mostrar loading
  if (carregando) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(120deg,#101824 0%,#1c2740 100%)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Segoe UI, Inter, Arial, sans-serif"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 50,
            height: 50,
            border: "3px solid #0eb8d0",
            borderTop: "3px solid transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px auto"
          }}></div>
          <p>Carregando...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  const cadastrarUsuario = async (email, senha) => {
    try {
      console.log('Iniciando cadastro para:', email);
      
      // Usar o novo sistema de autenticação (Supabase ou localStorage)
      const result = await AuthService.createUser(email, senha, {
        plano: 'trial',
        premium: false,
        trialStatus: {
          inicio: new Date().toISOString(),
          laudosGerados: [],
          status: 'active'
        }
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log('Usuário cadastrado com sucesso:', result.user.email);
      alert('🎉 Cadastro realizado com sucesso!\n\nBem-vindo ao VenoAI!\n\nVocê tem 7 dias de trial gratuito para testar todos os recursos.');
      
      // Salvar dados no localStorage
      localStorage.setItem("userEmail", result.user.email);
      localStorage.setItem("userUID", result.user.uid || result.user.id);
      localStorage.setItem("isLoggedIn", "true");
      
      // Navegar para home
      setLogado(true);
      navigate('/home');
      
    } catch (error) {
      console.error('Erro no cadastro:', error);
      throw error; // Re-throw para ser capturado pelo componente Login
    }
  };

  // Sistema inteligente de login
  async function login(email, senha) {
    try {
      console.log('🔐 Verificando usuário:', email);
      
      // Usar o novo sistema de autenticação (Supabase ou localStorage)
      const result = await AuthService.login(email, senha);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log('✅ Login realizado com sucesso:', result.user.email);
      
      // Salvar dados no localStorage
      localStorage.setItem("userEmail", result.user.email);
      localStorage.setItem("userUID", result.user.uid || result.user.id);
      localStorage.setItem("isLoggedIn", "true");
      
      // Verificar e sincronizar status Premium no servidor (verifica Hotmart também)
      try {
        const { TrialManager } = await import('./utils/trialManager');
        
        // Verificar Premium no servidor (inclui verificação Hotmart)
        const planoServidor = await TrialManager.verificarPremiumNoServidor(result.user.email);
        
        // Se servidor retornou premium, garantir que está salvo localmente
        if (planoServidor === 'premium') {
          localStorage.setItem(`plano_${result.user.email}`, 'premium');
          localStorage.setItem('plano_premium', 'true');
          console.log('✅ Premium confirmado e sincronizado do servidor/Hotmart');
        }
        
        console.log('✅ Status Premium verificado e sincronizado');
      } catch (error) {
        console.warn('Erro ao verificar Premium:', error);
      }
      
      // Marcar como logado
      setLogado(true);
      
      // Mostrar mensagem de boas-vindas
      alert(`👋 Bem-vindo de volta!\n\nLogin realizado com sucesso!`);
      
      navigate('/home');
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
      throw error; // Re-throw para ser capturado pelo componente Login
    }
  }
  
  function logout() {
    // Usar o novo sistema de autenticação
    AuthService.logout();
    
    // Limpar dados antigos para compatibilidade
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userPassword");
    localStorage.removeItem("userPlano");
    localStorage.removeItem("userPremium");
    
    setLogado(false);
    navigate('/');
  }
  
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login onLogin={login} onCadastrar={cadastrarUsuario} />} />
        <Route path="/home" element={logado ? <Home onLogout={logout}/> : <Navigate to="/login" />} />
        <Route path="/mmii-venoso" element={logado ? <MMIIVenoso /> : <Navigate to="/login" />} />
        <Route path="/mmii-arterial" element={logado ? <MMIIArterial /> : <Navigate to="/login" />} />
        <Route path="/mmss-venoso" element={logado ? <MMSSVenoso /> : <Navigate to="/login" />} />
        <Route path="/mmss-arterial" element={logado ? <MMSSArterial /> : <Navigate to="/login" />} />
        <Route path="/carotidas-vertebrais" element={logado ? <CarotidasVertebrais /> : <Navigate to="/login" />} />
        <Route path="/aorta-iliacas" element={logado ? <EmConstrucao /> : <Navigate to="/login" />} />
        <Route path="/arterias-renais" element={logado ? <EmConstrucao /> : <Navigate to="/login" />} />
        <Route path="/exames-realizados" element={logado ? <ExamesRealizados /> : <Navigate to="/login" />} />
        <Route path="/configuracoes" element={logado ? <Configuracoes /> : <Navigate to="/login" />} />
        <Route path="/planos" element={<Planos />} />
        <Route path="/confirmacao-pagamento" element={<ConfirmacaoPagamento />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
} 