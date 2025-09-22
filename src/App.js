import React, { useState, Component } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import VerificacaoEmail from "./pages/VerificacaoEmail";
import Home from "./pages/Home";
import MMIIVenoso from "./pages/MMIIVenoso";
import MMIIArterial from "./pages/MMIIArterial";
import MMSSVenoso from "./pages/MMSSVenoso";
import MMSSArterial from "./pages/MMSSArterial";
import CarotidasVertebrais from "./pages/CarotidasVertebrais";
import EmConstrucao from "./pages/EmConstrucao";
import Configuracoes from "./pages/Configuracoes";
import ExamesRealizados from "./pages/ExamesRealizados";

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
          <details style={{ marginTop: 20, textAlign: "left", maxWidth: "600px" }}>
            <summary>Detalhes do erro</summary>
            <pre style={{ 
              background: "#000", 
              padding: 10, 
              borderRadius: 5, 
              marginTop: 10,
              fontSize: 12,
              overflow: "auto",
              maxHeight: "300px"
            }}>
              <strong>Erro:</strong> {this.state.error && this.state.error.toString()}
              {this.state.error && this.state.error.stack && (
                <>
                  <br/><br/><strong>Stack:</strong><br/>
                  {this.state.error.stack}
                </>
              )}
              {this.state.errorInfo && (
                <>
                  <br/><br/><strong>Component Stack:</strong><br/>
                  {this.state.errorInfo.componentStack}
                </>
              )}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [logado, setLogado] = useState(!!localStorage.getItem("userEmail"));
  const [emailParaVerificacao, setEmailParaVerificacao] = useState("");
  const navigate = useNavigate();
  
  // Verificar se usuário já está cadastrado
  function isUsuarioCadastrado(email) {
    const usuariosCadastrados = JSON.parse(localStorage.getItem("usuariosCadastrados") || "[]");
    return usuariosCadastrados.includes(email);
  }
  
  // Cadastrar novo usuário
  function cadastrarUsuario(email) {
    const usuariosCadastrados = JSON.parse(localStorage.getItem("usuariosCadastrados") || "[]");
    if (!usuariosCadastrados.includes(email)) {
      usuariosCadastrados.push(email);
      localStorage.setItem("usuariosCadastrados", JSON.stringify(usuariosCadastrados));
      console.log('Usuário cadastrado:', email);
    }
  }
  
  function login(email, senha) {
    console.log('🔍 LOGIN - Tentativa de login para:', email);
    console.log('🔍 LOGIN - Senha:', senha);
    
    // Verificar se usuário já está cadastrado
    const isCadastrado = isUsuarioCadastrado(email);
    console.log('🔍 LOGIN - Usuário cadastrado?', isCadastrado);
    
    if (isCadastrado) {
      console.log('✅ LOGIN - Usuário já cadastrado - login direto');
      // Usuário já cadastrado - login direto
      localStorage.setItem("userEmail", email);
      setLogado(true);
      navigate('/home');
    } else {
      console.log('📧 LOGIN - Novo usuário - precisa verificar email');
      // Novo usuário - precisa verificar email
      setEmailParaVerificacao(email);
      console.log('🔍 LOGIN - Email para verificação definido:', email);
      navigate('/verificar-email');
    }
  }
  
  function verificarEmailCompleto(email) {
    console.log('Verificação completa para email:', email);
    
    // Cadastrar usuário após verificação
    cadastrarUsuario(email);
    
    // Fazer login
    localStorage.setItem("userEmail", email);
    setLogado(true);
    setEmailParaVerificacao("");
    console.log('Usuário logado com sucesso!');
    
    // Navegar para home
    navigate('/home');
  }
  
  function logout() {
    localStorage.removeItem("userEmail");
    setLogado(false);
  }
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login onLogin={login} />} />
        <Route path="/verificar-email" element={
          emailParaVerificacao ? 
            <VerificacaoEmail 
              email={emailParaVerificacao} 
              onVerificacaoCompleta={verificarEmailCompleto} 
            /> : 
            <Navigate to="/login" replace />
        } />
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