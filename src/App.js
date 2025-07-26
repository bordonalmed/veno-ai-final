import React, { useState, Component } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Home from "./pages/Home";
import MMIIVenoso from "./pages/MMIIVenoso";
import MMSSVenoso from "./pages/MMSSVenoso";
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

export default function App() {
  const [logado, setLogado] = useState(!!localStorage.getItem("userEmail"));
  function login(email) {
    localStorage.setItem("userEmail", email);
    setLogado(true);
  }
  function logout() {
    localStorage.removeItem("userEmail");
    setLogado(false);
  }
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login onLogin={login} />} />
        <Route path="/home" element={logado ? <Home onLogout={logout}/> : <Navigate to="/login" />} />
        <Route path="/mmii-venoso" element={logado ? <MMIIVenoso /> : <Navigate to="/login" />} />
        <Route path="/mmii-arterial" element={logado ? <EmConstrucao /> : <Navigate to="/login" />} />
        <Route path="/mmss-venoso" element={logado ? <MMSSVenoso /> : <Navigate to="/login" />} />
        <Route path="/mmss-arterial" element={logado ? <EmConstrucao /> : <Navigate to="/login" />} />
        <Route path="/carotidas-vertebrais" element={logado ? <EmConstrucao /> : <Navigate to="/login" />} />
        <Route path="/aorta-iliacas" element={logado ? <EmConstrucao /> : <Navigate to="/login" />} />
        <Route path="/arterias-renais" element={logado ? <EmConstrucao /> : <Navigate to="/login" />} />
        <Route path="/exames-realizados" element={logado ? <ExamesRealizados /> : <Navigate to="/login" />} />
        <Route path="/configuracoes" element={logado ? <Configuracoes /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
} 