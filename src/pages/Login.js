import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  function handleEntrar(e) {
    e.preventDefault();
    if (!email || !senha) {
      setErro("Preencha todos os campos!");
      return;
    }
    onLogin(email);
    navigate("/home");
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
        <label>Email<br />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 7,
              padding: "10px",
              fontSize: 17,
              marginTop: 3
            }}
            autoFocus
          />
        </label>
        <label>Senha<br />
          <input
            type="password"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 7,
              padding: "10px",
              fontSize: 17,
              marginTop: 3
            }}
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
        >Entrar / Cadastrar</button>
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