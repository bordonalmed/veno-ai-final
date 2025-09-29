import React, { useState, Component } from "react";
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
import { AuthService } from "./services/authService";

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
  const navigate = useNavigate();
  
  const cadastrarUsuario = async (email, senha) => {
    try {
      console.log('Iniciando cadastro para:', email);
      
      // Usar o novo sistema de autenticação
      const { user, profile } = AuthService.createUser(email, senha, {
        plano: 'trial',
        premium: false,
        trialStatus: {
          inicio: new Date().toISOString(),
          laudosGerados: [],
          status: 'active'
        }
      });
      
      console.log('Usuário cadastrado com sucesso:', user.email);
      alert('🎉 Cadastro realizado com sucesso!\n\nBem-vindo ao VenoAI!\n\nVocê tem 7 dias de trial gratuito para testar todos os recursos.');
      
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
      
      // Usar o novo sistema de autenticação
      const { user, profile, session } = AuthService.login(email, senha);
      
      console.log('✅ Login realizado com sucesso:', user.email);
      
      // Salvar dados no localStorage para compatibilidade com sistema antigo
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userPlano", profile.plano);
      localStorage.setItem("userPremium", profile.premium.toString());
      
      // Marcar como logado
      setLogado(true);
      
      // Mostrar mensagem baseada no status
      if (profile.premium) {
        alert(`🎉 Bem-vindo de volta!\n\nSeu plano Premium está ativo!\n\nAcesso completo liberado!`);
      } else {
        alert(`👋 Bem-vindo!\n\nVocê está no Trial Gratuito.\n\n7 dias para testar todos os recursos!`);
      }
      
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