import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSave, FiUser, FiFileText, FiSettings, FiShield, FiCreditCard, FiMessageCircle, FiDatabase, FiUpload, FiTrash2 } from "react-icons/fi";
import { TrialManager } from "../utils/trialManager";

export default function Configuracoes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("personalizacao");
  
  // Estados para personalização do laudo
  const [configLaudo, setConfigLaudo] = useState({
    nomeMedico: localStorage.getItem("nomeMedico") || "",
    crm: localStorage.getItem("crm") || "",
    especialidade: localStorage.getItem("especialidadeLaudo") || "",
    nomeClinica: localStorage.getItem("nomeClinica") || "",
    enderecoClinica: localStorage.getItem("enderecoClinica") || "",
    telefoneClinica: localStorage.getItem("telefoneClinica") || "",
    emailClinica: localStorage.getItem("emailClinica") || "",
    modeloConclusao: localStorage.getItem("modeloConclusao") || "Padrão",
    logoClinica: localStorage.getItem("logoClinica") || "",
    assinaturaMedico: localStorage.getItem("assinaturaMedico") || ""
  });

  console.log("=== CARREGAMENTO INICIAL ===");
  console.log("Especialidade carregada:", localStorage.getItem("especialidade"));
  console.log("configLaudo inicial:", configLaudo);

  // Estados para dados do usuário
  const clinicasSalvas = JSON.parse(localStorage.getItem("clinicasCadastradas") || "[]");
  const clinicaAtiva = parseInt(localStorage.getItem("clinicaAtiva") || "0", 10);
  const [dadosUsuario, setDadosUsuario] = useState({
    email: localStorage.getItem("userEmail") || "",
    nomeCompleto: localStorage.getItem("nomeCompleto") || "",
    especialidade: localStorage.getItem("especialidade") || "",
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: "",
    notificacoes: localStorage.getItem("notificacoes") === "true",
    senhaExames: localStorage.getItem("senhaExames") === "true",
    clinicas: clinicasSalvas.length ? clinicasSalvas : [
      { nomeClinica: "", dadosContato: "" },
      { nomeClinica: "", dadosContato: "" },
      { nomeClinica: "", dadosContato: "" }
    ],
    clinicaAtiva: clinicaAtiva
  });

  // Estados para integrações
  const [integracoes, setIntegracoes] = useState({
    whatsapp: localStorage.getItem("whatsapp") === "true",
    numeroWhatsapp: localStorage.getItem("numeroWhatsapp") || "",
    prontuarioEletronico: localStorage.getItem("prontuarioEletronico") === "true"
  });

  // Estados para plano
  const [plano, setPlano] = useState({
    tipo: localStorage.getItem("tipoPlano") || "Gratuito",
    status: localStorage.getItem("statusPlano") || "Ativo",
    dataVencimento: localStorage.getItem("dataVencimento") || "",
    cartao: localStorage.getItem("cartao") || ""
  });

  const [mensagem, setMensagem] = useState("");

  // Função para fazer upload de logo
  function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        setMensagem("Por favor, selecione apenas arquivos de imagem!");
        setTimeout(() => setMensagem(""), 3000);
        return;
      }

      // Verificar tamanho do arquivo (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setMensagem("A imagem deve ter no máximo 2MB!");
        setTimeout(() => setMensagem(""), 3000);
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        const logoData = e.target.result;
        setConfigLaudo(prev => ({...prev, logoClinica: logoData}));
        localStorage.setItem("logoClinica", logoData);
        setMensagem("Logo carregado com sucesso!");
        setTimeout(() => setMensagem(""), 3000);
      };
      reader.readAsDataURL(file);
    }
  }

  // Função para remover logo
  function removerLogo() {
    setConfigLaudo(prev => ({...prev, logoClinica: ""}));
    localStorage.removeItem("logoClinica");
    setMensagem("Logo removido com sucesso!");
    setTimeout(() => setMensagem(""), 3000);
  }

  // Função para fazer upload da assinatura
  function handleAssinaturaUpload(event) {
    const file = event.target.files[0];
    if (file) {
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        setMensagem("Por favor, selecione apenas arquivos de imagem!");
        setTimeout(() => setMensagem(""), 3000);
        return;
      }

      // Verificar tamanho do arquivo (máximo 1MB)
      if (file.size > 1 * 1024 * 1024) {
        setMensagem("A assinatura deve ter no máximo 1MB!");
        setTimeout(() => setMensagem(""), 3000);
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        const assinaturaData = e.target.result;
        setConfigLaudo(prev => ({...prev, assinaturaMedico: assinaturaData}));
        localStorage.setItem("assinaturaMedico", assinaturaData);
        setMensagem("Assinatura carregada com sucesso!");
        setTimeout(() => setMensagem(""), 3000);
      };
      reader.readAsDataURL(file);
    }
  }

  // Função para remover assinatura
  function removerAssinatura() {
    setConfigLaudo(prev => ({...prev, assinaturaMedico: ""}));
    localStorage.removeItem("assinaturaMedico");
    setMensagem("Assinatura removida com sucesso!");
    setTimeout(() => setMensagem(""), 3000);
  }

  // Salvar configurações
  function salvarConfiguracoes() {
    console.log("=== SALVANDO CONFIGURAÇÕES ===");
    console.log("configLaudo antes de salvar:", configLaudo);
    
    // Salvar personalização do laudo
    Object.keys(configLaudo).forEach(key => {
      if (key === "especialidade") {
        localStorage.setItem("especialidadeLaudo", configLaudo.especialidade);
        localStorage.setItem("especialidade", configLaudo.especialidade);
        console.log(`Salvando especialidadeLaudo: ${configLaudo.especialidade}`);
      } else {
        localStorage.setItem(key, configLaudo[key]);
        console.log(`Salvando ${key}:`, configLaudo[key]);
      }
    });

    // Salvar dados do usuário
    Object.keys(dadosUsuario).forEach(key => {
      if (key !== "senhaAtual" && key !== "novaSenha" && key !== "confirmarSenha") {
        if (key === "clinicas") {
          localStorage.setItem("clinicasCadastradas", JSON.stringify(dadosUsuario.clinicas));
        } else if (key === "clinicaAtiva") {
          localStorage.setItem("clinicaAtiva", dadosUsuario.clinicaAtiva);
        } else {
          localStorage.setItem(key, dadosUsuario[key]);
        }
        console.log(`Salvando dadosUsuario.${key}:`, dadosUsuario[key]);
      }
    });

    // Salvar integrações
    Object.keys(integracoes).forEach(key => {
      localStorage.setItem(key, integracoes[key]);
    });

    // Salvar plano
    Object.keys(plano).forEach(key => {
      localStorage.setItem(key, plano[key]);
    });

    // Verificar se foi salvo
    const especialidadeSalva = localStorage.getItem("especialidade");
    console.log("Especialidade salva no localStorage:", especialidadeSalva);

    setMensagem("Configurações salvas com sucesso!");
    setTimeout(() => setMensagem(""), 3000);
  }

  // Alterar senha
  function alterarSenha() {
    if (dadosUsuario.novaSenha !== dadosUsuario.confirmarSenha) {
      setMensagem("As senhas não coincidem!");
      return;
    }
    if (dadosUsuario.novaSenha.length < 6) {
      setMensagem("A nova senha deve ter pelo menos 6 caracteres!");
      return;
    }
    
    // Aqui você implementaria a lógica de alteração de senha
    localStorage.setItem("senha", dadosUsuario.novaSenha);
    setDadosUsuario(prev => ({
      ...prev,
      senhaAtual: "",
      novaSenha: "",
      confirmarSenha: ""
    }));
    setMensagem("Senha alterada com sucesso!");
    setTimeout(() => setMensagem(""), 3000);
  }

  const tabs = [
    { id: "personalizacao", label: "Personalização", icon: <FiFileText /> },
    { id: "usuario", label: "Dados do Usuário", icon: <FiUser /> },
    { id: "integracoes", label: "Integrações", icon: <FiDatabase /> },
    { id: "plano", label: "Plano", icon: <FiCreditCard /> }
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(120deg,#101824 0%,#1c2740 100%)",
      color: "#fff",
      fontFamily: "Segoe UI, Inter, Arial, sans-serif",
      padding: 20
    }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        marginBottom: 30,
        gap: 20
      }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: "#232f4e", 
            color: "#0eb8d0", 
            border: "2px solid #0eb8d0",
            borderRadius: 8, 
            fontSize: 16, 
            padding: "8px 16px", 
            fontWeight: 600, 
            cursor: "pointer",
            display: "flex", 
            alignItems: "center", 
            gap: 8
          }}
        >
          <FiArrowLeft size={18}/> Voltar
        </button>
        
        <h1 style={{ 
          fontSize: 28, 
          fontWeight: 800, 
          color: "#0eb8d0",
          margin: 0
        }}>
          ⚙️ Configurações
        </h1>
      </div>

      {/* Mensagem de feedback */}
      {mensagem && (
        <div style={{
          background: mensagem.includes("sucesso") ? "#11b581" : "#e74c3c",
          color: "#fff",
          padding: "12px 20px",
          borderRadius: 8,
          marginBottom: 20,
          textAlign: "center",
          fontWeight: 600
        }}>
          {mensagem}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: 10,
        marginBottom: 30,
        flexWrap: "wrap"
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? "#0eb8d0" : "#242d43",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px 20px",
              cursor: "pointer",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s"
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo das Tabs */}
      <div style={{
        background: "#242d43",
        borderRadius: 12,
        padding: 30,
        maxWidth: 800,
        margin: "0 auto"
      }}>
        {/* Personalização do Laudo */}
        {activeTab === "personalizacao" && (
          <div>
            <h3 style={{ color: "#0eb8d0", marginBottom: 20, fontSize: 20 }}>
              🎨 Personalização do Laudo
            </h3>
            
            <div style={{ display: "grid", gap: 20 }}>
              {/* Upload de Logo */}
              <div style={{
                background: "#1a2332",
                padding: 20,
                borderRadius: 8,
                border: "2px dashed #0eb8d033"
              }}>
                <h4 style={{ color: "#0eb8d0", marginBottom: 15 }}>🏥 Logo da Clínica/Médico</h4>
                <p style={{ marginBottom: 15, color: "#ccc", fontSize: 14 }}>
                  O logo aparecerá no topo centralizado dos laudos em PDF. Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 2MB.
                </p>
                
                {configLaudo.logoClinica ? (
                  <div style={{ textAlign: "center" }}>
                    <img 
                      src={configLaudo.logoClinica} 
                      alt="Logo da clínica" 
                      style={{
                        maxWidth: "200px",
                        maxHeight: "100px",
                        objectFit: "contain",
                        marginBottom: 15,
                        borderRadius: 8,
                        border: "2px solid #0eb8d0"
                      }}
                    />
                    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                      <label style={{
                        background: "#0eb8d0",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 16px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}>
                        <FiUpload size={16} /> Alterar Logo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          style={{ display: "none" }}
                        />
                      </label>
                      <button
                        onClick={removerLogo}
                        style={{
                          background: "#e74c3c",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "8px 16px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}
                      >
                        <FiTrash2 size={16} /> Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <label style={{
                    background: "#0eb8d0",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "12px 20px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    justifyContent: "center",
                    width: "fit-content"
                  }}>
                    <FiUpload size={18} /> Fazer Upload do Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                )}
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Nome do Médico:
                </label>
                <input
                  type="text"
                  value={configLaudo.nomeMedico}
                  onChange={(e) => setConfigLaudo(prev => ({...prev, nomeMedico: e.target.value}))}
                  placeholder="Dr. João Silva"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "none",
                    fontSize: 14
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  CRM:
                </label>
                <input
                  type="text"
                  value={configLaudo.crm}
                  onChange={(e) => setConfigLaudo(prev => ({...prev, crm: e.target.value}))}
                  placeholder="12345 SP"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "none",
                    fontSize: 14
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Especialidade:
                </label>
                <input
                  type="text"
                  value={configLaudo.especialidade}
                  onChange={(e) => setConfigLaudo(prev => ({...prev, especialidade: e.target.value}))}
                  placeholder="Angiologia e Cirurgia Vascular"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "none",
                    fontSize: 14
                  }}
                />
              </div>

              {/* Upload de Assinatura */}
              <div style={{
                background: "#1a2332",
                padding: 20,
                borderRadius: 8,
                border: "2px dashed #0eb8d033"
              }}>
                <h4 style={{ color: "#0eb8d0", marginBottom: 15 }}>✍️ Assinatura do Médico</h4>
                <p style={{ marginBottom: 15, color: "#ccc", fontSize: 14 }}>
                  A assinatura aparecerá centralizada no final dos laudos em PDF, abaixo da conclusão. Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 1MB.
                </p>
                
                {configLaudo.assinaturaMedico ? (
                  <div style={{ textAlign: "center" }}>
                    <img 
                      src={configLaudo.assinaturaMedico} 
                      alt="Assinatura do médico" 
                      style={{
                        maxWidth: "200px",
                        maxHeight: "80px",
                        objectFit: "contain",
                        marginBottom: 15,
                        borderRadius: 8,
                        border: "2px solid #0eb8d0"
                      }}
                    />
                    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                      <label style={{
                        background: "#0eb8d0",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 16px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}>
                        <FiUpload size={16} /> Alterar Assinatura
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAssinaturaUpload}
                          style={{ display: "none" }}
                        />
                      </label>
                      <button
                        onClick={removerAssinatura}
                        style={{
                          background: "#e74c3c",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "8px 16px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}
                      >
                        <FiTrash2 size={16} /> Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <label style={{
                    background: "#0eb8d0",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "12px 20px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    justifyContent: "center",
                    width: "fit-content"
                  }}>
                    <FiUpload size={18} /> Fazer Upload da Assinatura
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAssinaturaUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                )}
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Nome da Clínica:
                </label>
                <input
                  type="text"
                  value={configLaudo.nomeClinica}
                  onChange={(e) => setConfigLaudo(prev => ({...prev, nomeClinica: e.target.value}))}
                  placeholder="Clínica Vascular São Paulo"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "none",
                    fontSize: 14
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Endereço da Clínica:
                </label>
                <input
                  type="text"
                  value={configLaudo.enderecoClinica}
                  onChange={(e) => setConfigLaudo(prev => ({...prev, enderecoClinica: e.target.value}))}
                  placeholder="Rua das Flores, 123 - Centro"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "none",
                    fontSize: 14
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Telefone da Clínica:
                </label>
                <input
                  type="text"
                  value={configLaudo.telefoneClinica}
                  onChange={(e) => setConfigLaudo(prev => ({...prev, telefoneClinica: e.target.value}))}
                  placeholder="(11) 99999-9999"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "none",
                    fontSize: 14
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Email da Clínica:
                </label>
                <input
                  type="email"
                  value={configLaudo.emailClinica}
                  onChange={(e) => setConfigLaudo(prev => ({...prev, emailClinica: e.target.value}))}
                  placeholder="contato@clinica.com"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "none",
                    fontSize: 14
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Modelo de Conclusão:
                </label>
                <select
                  value={configLaudo.modeloConclusao}
                  onChange={(e) => setConfigLaudo(prev => ({...prev, modeloConclusao: e.target.value}))}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "none",
                    fontSize: 14
                  }}
                >
                  <option value="Padrão">Padrão</option>
                  <option value="Detalhado">Detalhado</option>
                  <option value="Simplificado">Simplificado</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Dados do Usuário */}
        {activeTab === "usuario" && (
          <div>
            <h3 style={{ color: "#0eb8d0", marginBottom: 20, fontSize: 20 }}>
              👤 Dados do Usuário
            </h3>
            
            <div style={{ display: "grid", gap: 20 }}>
              {/* Perfis de Clínica/Contato */}
              <div style={{ border: "1px solid #0eb8d033", borderRadius: 8, padding: 16, background: "#1a2332" }}>
                <h4 style={{ color: "#0eb8d0", marginBottom: 10 }}>Perfis de Clínica/Contato</h4>
                {dadosUsuario.clinicas.map((clinica, idx) => (
                  <div key={idx} style={{ marginBottom: 18, padding: 10, background: dadosUsuario.clinicaAtiva === idx ? "#0eb8d022" : "#222", borderRadius: 6 }}>
                    <label style={{ fontWeight: 600, color: "#0eb8d0" }}>
                      <input
                        type="radio"
                        name="clinicaAtiva"
                        checked={dadosUsuario.clinicaAtiva === idx}
                        onChange={() => {
                          setDadosUsuario(prev => ({ ...prev, clinicaAtiva: idx }));
                          localStorage.setItem("clinicaAtiva", idx);
                        }}
                        style={{ marginRight: 8 }}
                      />
                      Perfil {idx + 1} {dadosUsuario.clinicaAtiva === idx && "(Ativo)"}
                    </label>
                    <div style={{ marginTop: 8 }}>
                      <input
                        type="text"
                        placeholder="Nome da Clínica"
                        value={clinica.nomeClinica}
                        onChange={e => {
                          const novas = [...dadosUsuario.clinicas];
                          novas[idx].nomeClinica = e.target.value;
                          setDadosUsuario(prev => ({ ...prev, clinicas: novas }));
                        }}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 5, border: "none", fontSize: 14, marginBottom: 6 }}
                      />
                      <textarea
                        placeholder="Dados de contato (endereço, telefone, e-mail, etc)"
                        value={clinica.dadosContato}
                        onChange={e => {
                          const novas = [...dadosUsuario.clinicas];
                          novas[idx].dadosContato = e.target.value;
                          setDadosUsuario(prev => ({ ...prev, clinicas: novas }));
                        }}
                        rows={2}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 5, border: "none", fontSize: 13, resize: "vertical" }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Email:
                </label>
                <input
                  type="email"
                  value={dadosUsuario.email}
                  onChange={(e) => setDadosUsuario(prev => ({...prev, email: e.target.value}))}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "none",
                    fontSize: 14
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Nome Completo:
                </label>
                <input
                  type="text"
                  value={dadosUsuario.nomeCompleto}
                  onChange={(e) => setDadosUsuario(prev => ({...prev, nomeCompleto: e.target.value}))}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "none",
                    fontSize: 14
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Especialidade:
                </label>
                <input
                  type="text"
                  value={dadosUsuario.especialidade}
                  onChange={(e) => setDadosUsuario(prev => ({...prev, especialidade: e.target.value}))}
                  placeholder="Angiologia e Cirurgia Vascular"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "none",
                    fontSize: 14
                  }}
                />
              </div>

              <div style={{ borderTop: "1px solid #444", paddingTop: 20 }}>
                <h4 style={{ color: "#0eb8d0", marginBottom: 15 }}>Alterar Senha</h4>
                
                <div style={{ display: "grid", gap: 15 }}>
                  <div>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                      Nova Senha:
                    </label>
                    <input
                      type="password"
                      value={dadosUsuario.novaSenha}
                      onChange={(e) => setDadosUsuario(prev => ({...prev, novaSenha: e.target.value}))}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 6,
                        border: "none",
                        fontSize: 14
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                      Confirmar Nova Senha:
                    </label>
                    <input
                      type="password"
                      value={dadosUsuario.confirmarSenha}
                      onChange={(e) => setDadosUsuario(prev => ({...prev, confirmarSenha: e.target.value}))}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 6,
                        border: "none",
                        fontSize: 14
                      }}
                    />
                  </div>

                  <button
                    onClick={alterarSenha}
                    style={{
                      background: "#11b581",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "10px 20px",
                      fontWeight: 600,
                      cursor: "pointer",
                      alignSelf: "start"
                    }}
                  >
                    Alterar Senha
                  </button>
                </div>
              </div>

              <div style={{ borderTop: "1px solid #444", paddingTop: 20 }}>
                <h4 style={{ color: "#0eb8d0", marginBottom: 15 }}>Preferências</h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={dadosUsuario.notificacoes}
                      onChange={(e) => setDadosUsuario(prev => ({...prev, notificacoes: e.target.checked}))}
                      style={{ transform: "scale(1.2)" }}
                    />
                    <span>Receber notificações de atualizações</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={dadosUsuario.senhaExames}
                      onChange={(e) => setDadosUsuario(prev => ({...prev, senhaExames: e.target.checked}))}
                      style={{ transform: "scale(1.2)" }}
                    />
                    <span>Exigir senha para acessar exames salvos</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Integrações */}
        {activeTab === "integracoes" && (
          <div>
            <h3 style={{ color: "#0eb8d0", marginBottom: 20, fontSize: 20 }}>
              🔗 Integrações
            </h3>
            
            <div style={{ display: "grid", gap: 20 }}>
              <div style={{
                background: "#1a2332",
                padding: 20,
                borderRadius: 8,
                border: "1px solid #0eb8d033"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 15 }}>
                  <FiMessageCircle size={24} color="#25D366" />
                  <h4 style={{ margin: 0, color: "#0eb8d0" }}>WhatsApp</h4>
                </div>
                
                <p style={{ marginBottom: 15, color: "#ccc" }}>
                  Envie laudos diretamente para os pacientes via WhatsApp
                </p>
                
                <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 15, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={integracoes.whatsapp}
                    onChange={(e) => setIntegracoes(prev => ({...prev, whatsapp: e.target.checked}))}
                    style={{ transform: "scale(1.2)" }}
                  />
                  <span>Ativar integração com WhatsApp</span>
                </label>

                {integracoes.whatsapp && (
                  <div>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                      Número do WhatsApp:
                    </label>
                    <input
                      type="text"
                      value={integracoes.numeroWhatsapp}
                      onChange={(e) => setIntegracoes(prev => ({...prev, numeroWhatsapp: e.target.value}))}
                      placeholder="+55 11 99999-9999"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 6,
                        border: "none",
                        fontSize: 14
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{
                background: "#1a2332",
                padding: 20,
                borderRadius: 8,
                border: "1px solid #0eb8d033"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 15 }}>
                  <FiDatabase size={24} color="#0eb8d0" />
                  <h4 style={{ margin: 0, color: "#0eb8d0" }}>Prontuário Eletrônico</h4>
                </div>
                
                <p style={{ marginBottom: 15, color: "#ccc" }}>
                  Integração com sistemas de prontuário eletrônico (em desenvolvimento)
                </p>
                
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={integracoes.prontuarioEletronico}
                    onChange={(e) => setIntegracoes(prev => ({...prev, prontuarioEletronico: e.target.checked}))}
                    style={{ transform: "scale(1.2)" }}
                    disabled
                  />
                  <span style={{ opacity: 0.6 }}>Ativar integração com PACS (em breve)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Plano */}
        {activeTab === "plano" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ color: "#0eb8d0", fontSize: 20, margin: 0 }}>
                💳 Plano e Assinatura
              </h3>
              <button
                onClick={() => navigate('/home')}
                style={{
                  background: "#1a2332",
                  color: "#0eb8d0",
                  border: "1px solid #0eb8d0",
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 14
                }}
              >
                <FiArrowLeft size={16} />
                Voltar ao Menu
              </button>
            </div>
            
            <div style={{ display: "grid", gap: 20 }}>
              <div style={{
                background: "#1a2332",
                padding: 20,
                borderRadius: 8,
                border: "1px solid #0eb8d033"
              }}>
                <h4 style={{ color: "#0eb8d0", marginBottom: 15 }}>Plano Atual</h4>
                
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Tipo:</span>
                    <span style={{ fontWeight: 600, color: "#0eb8d0" }}>{plano.tipo}</span>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Status:</span>
                    <span style={{ 
                      fontWeight: 600, 
                      color: plano.status === "Ativo" ? "#11b581" : "#e74c3c" 
                    }}>
                      {plano.status}
                    </span>
                  </div>
                  
                  {plano.dataVencimento && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Vencimento:</span>
                      <span>{plano.dataVencimento}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                background: "#1a2332",
                padding: 20,
                borderRadius: 8,
                border: "1px solid #0eb8d033"
              }}>
                <h4 style={{ color: "#0eb8d0", marginBottom: 15 }}>Gerenciar Plano</h4>
                
                <div style={{ display: "grid", gap: 15 }}>
                  <button
                    style={{
                      background: "#0eb8d0",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "12px 20px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Atualizar Plano
                  </button>
                  
                  <button
                    style={{
                      background: "#11b581",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "12px 20px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Ver Recibos
                  </button>
                  
                  <button
                    style={{
                      background: "#ff9500",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "12px 20px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Adicionar Cartão
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botão Salvar */}
      <div style={{ textAlign: "center", marginTop: 30 }}>
        <button
          onClick={salvarConfiguracoes}
          style={{
            background: "#0eb8d0",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "12px 30px",
            fontWeight: 600,
            fontSize: 16,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8
          }}
        >
          <FiSave size={18} /> Salvar Configurações
        </button>
        
        <button
          onClick={() => {
            const especialidade = localStorage.getItem("especialidade");
            const nomeMedico = localStorage.getItem("nomeMedico");
            const crm = localStorage.getItem("crm");
            alert(`Dados salvos:\nNome: ${nomeMedico}\nEspecialidade: ${especialidade}\nCRM: ${crm}`);
          }}
          style={{
            background: "#ff6b35",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            marginLeft: 10
          }}
        >
          🔍 Testar Dados
        </button>
        
        <button
          onClick={() => {
            const userEmail = localStorage.getItem("userEmail");
            if (!userEmail) {
              alert("❌ Nenhum usuário logado!");
              return;
            }
            
            try {
              // Importar serviços
              const { SyncService } = require('../services/syncService');
              const { TrialManager } = require('../utils/trialManager');
              
              // Ativar Premium no servidor
              SyncService.activatePremiumOnServer(userEmail, {
                transactionId: `SYNC_TEST_${Date.now()}`,
                dataAtivacao: new Date().toISOString(),
                status: 'active'
              });
              
              // Ativar Premium localmente
              TrialManager.definirPlanoUsuario(userEmail, 'premium');
              
              alert(`✅ Premium ativado com sincronização para: ${userEmail}\n\nAgora teste em outro dispositivo!`);
            } catch (error) {
              console.error('Erro ao ativar Premium:', error);
              alert('❌ Erro ao ativar Premium. Verifique o console.');
            }
          }}
          style={{
            background: "#11b581",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            marginLeft: 10
          }}
        >
          🔄 Testar Sincronização Premium
        </button>
      </div>
    </div>
  );
} 