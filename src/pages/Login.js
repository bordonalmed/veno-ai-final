import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [erroEmail, setErroEmail] = useState("");
  const navigate = useNavigate();

  // Função para validar email com formato rigoroso mas flexível
  function validarEmail(email) {
    // Regex rigorosa para validação de formato de email
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(email)) {
      return "Formato de email inválido!";
    }

    // Verificar se o domínio tem pelo menos 2 caracteres após o ponto
    const dominio = email.split('@')[1];
    if (!dominio || dominio.split('.').length < 2) {
      return "Domínio de email inválido!";
    }

    // Verificar se a parte após o último ponto tem pelo menos 2 caracteres
    const extensao = dominio.split('.').pop();
    if (extensao.length < 2) {
      return "Extensão do domínio deve ter pelo menos 2 caracteres!";
    }

    // Verificar se o domínio não contém caracteres inválidos
    if (!/^[a-zA-Z0-9.-]+$/.test(dominio)) {
      return "Domínio contém caracteres inválidos!";
    }

    // Verificar se não há pontos consecutivos
    if (dominio.includes('..')) {
      return "Domínio não pode ter pontos consecutivos!";
    }

    // Verificar se não começa ou termina com ponto ou hífen
    if (dominio.startsWith('.') || dominio.endsWith('.') || 
        dominio.startsWith('-') || dominio.endsWith('-')) {
      return "Domínio não pode começar ou terminar com ponto ou hífen!";
    }

    return null; // Email válido
  }

  function handleEntrar(e) {
    e.preventDefault();
    
    console.log('Tentativa de login - Email:', email, 'Senha:', senha);
    
    if (!email || !senha) {
      setErro("Preencha todos os campos!");
      return;
    }

    // Validar email
    const erroEmail = validarEmail(email);
    if (erroEmail) {
      setErro(erroEmail);
      return;
    }

    // Validar senha (mínimo 6 caracteres)
    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres!");
      return;
    }

    console.log('Chamando onLogin com:', email, senha);
    onLogin(email, senha);
    // A navegação será feita pelo App.js baseada no status do usuário
  }

  // Função para validar email em tempo real
  function handleEmailChange(e) {
    const novoEmail = e.target.value;
    setEmail(novoEmail);
    
    // Limpa erro quando está digitando
    if (erroEmail) {
      setErroEmail("");
    }
  }

  // Função para validar quando o usuário sai do campo
  function handleEmailBlur(e) {
    const email = e.target.value;
    if (email && email.includes('@')) {
      const erro = validarEmail(email);
      setErroEmail(erro || "");
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(120deg,#101824 0%,#1c2740 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <form
        style={{
          background: "#181e34",
          borderRadius: 16,
          padding: "32px 38px",
          boxShadow: "0 2px 14px #00e0ff25",
          minWidth: 310,
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          gap: 14
        }}
        onSubmit={handleEntrar}
      >
        <h2 style={{ textAlign: "center", fontWeight: 800, fontSize: 24, marginBottom: 8 }}>Entrar / Cadastrar</h2>
        <p style={{ 
          textAlign: "center", 
          fontSize: 14, 
          color: "#ccc", 
          marginBottom: 20,
          lineHeight: "1.4"
        }}>
          <strong>Primeiro acesso:</strong> Será enviado um código de verificação por email<br/>
          <strong>Usuário cadastrado:</strong> Acesso direto ao sistema
        </p>
        <label>Email<br />
          <input
            type="email"
            value={email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            style={{
              width: "100%",
              border: erroEmail ? "2px solid #f66" : "1px solid #ddd",
              borderRadius: 7,
              padding: "10px",
              fontSize: 17,
              marginTop: 3,
              backgroundColor: erroEmail ? "#ff666620" : "#fff",
              color: "#333"
            }}
            autoFocus
            placeholder="exemplo@gmail.com"
          />
          {erroEmail && <div style={{ color: "#f66", fontSize: 14, marginTop: 4 }}>{erroEmail}</div>}
        </label>
        <label>Senha<br />
          <input
            type="password"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            style={{
              width: "100%",
              border: "1px solid #ddd",
              borderRadius: 7,
              padding: "10px",
              fontSize: 17,
              marginTop: 3,
              backgroundColor: "#fff",
              color: "#333"
            }}
            placeholder="Mínimo 6 caracteres"
          />
        </label>
        {erro && <div style={{ color: "#f66", fontWeight: 700 }}>{erro}</div>}
        <button
          type="submit"
          style={{
            marginTop: 8,
            background: "#0eb8d0",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "13px 0",
            fontWeight: 600,
            fontSize: 18,
            boxShadow: "0 2px 8px #00e0ff30",
            cursor: "pointer"
          }}
        >
          Entrar / Cadastrar
        </button>
        <button
          type="button"
          style={{
            marginTop: 8,
            background: "#232f4e",
            color: "#0eb8d0",
            border: "none",
            borderRadius: 8,
            padding: "10px 0",
            fontWeight: 600,
            fontSize: 17,
            cursor: "pointer"
          }}
          onClick={() => navigate("/")}
        >Voltar à página inicial</button>
      </form>
    </div>
  );
} 