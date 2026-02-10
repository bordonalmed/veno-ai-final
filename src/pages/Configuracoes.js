import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSave, FiUser, FiFileText, FiSettings, FiShield, FiCreditCard, FiMessageCircle, FiDatabase, FiUpload, FiTrash2, FiMail } from "react-icons/fi";
import { TrialManager } from "../utils/trialManager";

const CONFIG_LAUDO_PREMIUM_KEY = "configLaudoPremium";
const PERFIL_LAUDO_ATIVO_KEY = "perfilLaudoAtivo";
const MAX_PERFIS_PREMIUM = 3;

function getConfigLaudoDefault() {
  return {
    nomeMedico: localStorage.getItem("nomeMedico") || "",
    crm: localStorage.getItem("crm") || "",
    especialidade: localStorage.getItem("especialidadeLaudo") || "",
    nomeClinica: localStorage.getItem("nomeClinica") || "",
    enderecoClinica: localStorage.getItem("enderecoClinica") || "",
    telefoneClinica: localStorage.getItem("telefoneClinica") || "",
    emailClinica: localStorage.getItem("emailClinica") || "",
    logoClinica: localStorage.getItem("logoClinica") || "",
    assinaturaMedico: localStorage.getItem("assinaturaMedico") || ""
  };
}

function isUsuarioPremium() {
  const userEmail = localStorage.getItem("userEmail") || "";
  return (
    localStorage.getItem("plano_premium") === "true" ||
    localStorage.getItem(`plano_${userEmail}`) === "premium"
  );
}

function temAcessoPremium() {
  // Retorna true se for Premium OU se trial estiver ativo (7 dias com acesso igual ao Premium)
  const userEmail = localStorage.getItem("userEmail") || "";
  if (isUsuarioPremium()) return true;
  const trial = TrialManager.verificarTrial(userEmail);
  return trial.status === "ativo";
}

function aplicarPerfilAosLegacyKeys(perfil) {
  if (!perfil) return;
  const map = {
    nomeMedico: "nomeMedico",
    crm: "crm",
    especialidade: "especialidadeLaudo",
    nomeClinica: "nomeClinica",
    enderecoClinica: "enderecoClinica",
    telefoneClinica: "telefoneClinica",
    emailClinica: "emailClinica",
    logoClinica: "logoClinica",
    assinaturaMedico: "assinaturaMedico"
  };
  Object.entries(map).forEach(([keyPerfil, keyStorage]) => {
    const v = perfil[keyPerfil];
    if (v != null && v !== undefined) {
      localStorage.setItem(keyStorage, v);
      if (keyStorage === "especialidadeLaudo") localStorage.setItem("especialidade", v);
    }
  });
}

export default function Configuracoes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("personalizacao");
  const [isPremium] = useState(() => isUsuarioPremium());
  const temAcesso = temAcessoPremium(); // Premium OU trial ativo

  const defaultSingle = getConfigLaudoDefault();
  const defaultPerfis = () => {
    try {
      const saved = localStorage.getItem(CONFIG_LAUDO_PREMIUM_KEY);
      if (saved) {
        const arr = JSON.parse(saved);
        while (arr.length < MAX_PERFIS_PREMIUM) arr.push({ ...getConfigLaudoDefault() });
        return arr.slice(0, MAX_PERFIS_PREMIUM);
      }
    } catch (_) {}
    return Array(MAX_PERFIS_PREMIUM).fill(null).map(() => ({ ...getConfigLaudoDefault() }));
  };

  const [configLaudo, setConfigLaudo] = useState(defaultSingle);
  const [configLaudoPerfis, setConfigLaudoPerfis] = useState(defaultPerfis);
  const [perfilLaudoAtivo, setPerfilLaudoAtivo] = useState(() => {
    const n = parseInt(localStorage.getItem(PERFIL_LAUDO_ATIVO_KEY) || "0", 10);
    return Math.min(Math.max(0, n), MAX_PERFIS_PREMIUM - 1);
  });

  const currentConfig = isPremium ? (configLaudoPerfis[perfilLaudoAtivo] || getConfigLaudoDefault()) : configLaudo;
  const setCurrentConfig = (updater) => {
    if (isPremium) {
      setConfigLaudoPerfis(prev => {
        const p = prev.slice();
        const current = p[perfilLaudoAtivo] || {};
        p[perfilLaudoAtivo] = typeof updater === "function" ? updater(current) : { ...current, ...updater };
        return p;
      });
    } else {
      setConfigLaudo(typeof updater === "function" ? updater(configLaudo) : { ...configLaudo, ...updater });
    }
  };

  useEffect(() => {
    if (isPremium && configLaudoPerfis[perfilLaudoAtivo])
      aplicarPerfilAosLegacyKeys(configLaudoPerfis[perfilLaudoAtivo]);
  }, [isPremium, perfilLaudoAtivo]);

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
    envioEmail: localStorage.getItem("envioEmail") === "true",
    emailRemetente: localStorage.getItem("emailRemetente") || "",
    prontuarioEletronico: localStorage.getItem("prontuarioEletronico") === "true"
  });

  // Estados para plano (exibição baseada em isPremium)
  const tipoPlanoExibicao = isPremium ? "Premium" : "Gratuito";
  const statusPlanoExibicao = "Ativo";
  const HOTMART_CHECKOUT_URL = "https://pay.hotmart.com/S102049895B";

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
        setCurrentConfig(prev => ({ ...prev, logoClinica: logoData }));
        if (!isPremium) localStorage.setItem("logoClinica", logoData);
        setMensagem("Logo carregado com sucesso!");
        setTimeout(() => setMensagem(""), 3000);
      };
      reader.readAsDataURL(file);
    }
  }

  function removerLogo() {
    setCurrentConfig(prev => ({ ...prev, logoClinica: "" }));
    if (!isPremium) localStorage.removeItem("logoClinica");
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
        setCurrentConfig(prev => ({ ...prev, assinaturaMedico: assinaturaData }));
        if (!isPremium) localStorage.setItem("assinaturaMedico", assinaturaData);
        setMensagem("Assinatura carregada com sucesso!");
        setTimeout(() => setMensagem(""), 3000);
      };
      reader.readAsDataURL(file);
    }
  }

  function removerAssinatura() {
    setCurrentConfig(prev => ({ ...prev, assinaturaMedico: "" }));
    if (!isPremium) localStorage.removeItem("assinaturaMedico");
    setMensagem("Assinatura removida com sucesso!");
    setTimeout(() => setMensagem(""), 3000);
  }

  function salvarConfiguracoes() {
    console.log("=== SALVANDO CONFIGURAÇÕES ===");

    if (isPremium) {
      localStorage.setItem(CONFIG_LAUDO_PREMIUM_KEY, JSON.stringify(configLaudoPerfis));
      localStorage.setItem(PERFIL_LAUDO_ATIVO_KEY, String(perfilLaudoAtivo));
      aplicarPerfilAosLegacyKeys(configLaudoPerfis[perfilLaudoAtivo]);
    } else {
      Object.keys(configLaudo).forEach(key => {
        if (key === "especialidade") {
          localStorage.setItem("especialidadeLaudo", configLaudo.especialidade);
          localStorage.setItem("especialidade", configLaudo.especialidade);
        } else {
          localStorage.setItem(key, configLaudo[key]);
        }
      });
    }

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

    // Verificar se foi salvo
    const especialidadeSalva = localStorage.getItem("especialidade");
    console.log("Especialidade salva no localStorage:", especialidadeSalva);

    setMensagem("Perfil salvo");
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

            {isPremium && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ color: "#aaa", fontSize: 14, marginBottom: 12 }}>
                  💎 Premium: cadastre até 3 usuários (cada um com logo, nome, CRM, especialidade, assinatura e dados da clínica). O perfil ativo é usado nos laudos.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[0, 1, 2].map(i => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setPerfilLaudoAtivo(i);
                        localStorage.setItem(PERFIL_LAUDO_ATIVO_KEY, String(i));
                        aplicarPerfilAosLegacyKeys(configLaudoPerfis[i]);
                      }}
                      style={{
                        background: perfilLaudoAtivo === i ? "#0eb8d0" : "#1a2332",
                        color: "#fff",
                        border: perfilLaudoAtivo === i ? "2px solid #0eb8d0" : "1px solid #444",
                        borderRadius: 8,
                        padding: "10px 18px",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Perfil {i + 1} {perfilLaudoAtivo === i && "(ativo)"}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                
                {currentConfig.logoClinica ? (
                  <div style={{ textAlign: "center" }}>
                    <img 
                      src={currentConfig.logoClinica} 
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
                  value={currentConfig.nomeMedico || ""}
                  onChange={(e) => setCurrentConfig(prev => ({ ...prev, nomeMedico: e.target.value }))}
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
                  value={currentConfig.crm || ""}
                  onChange={(e) => setCurrentConfig(prev => ({ ...prev, crm: e.target.value }))}
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
                  value={currentConfig.especialidade || ""}
                  onChange={(e) => setCurrentConfig(prev => ({ ...prev, especialidade: e.target.value }))}
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
                
                {currentConfig.assinaturaMedico ? (
                  <div style={{ textAlign: "center" }}>
                    <img 
                      src={currentConfig.assinaturaMedico} 
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
                  value={currentConfig.nomeClinica || ""}
                  onChange={(e) => setCurrentConfig(prev => ({ ...prev, nomeClinica: e.target.value }))}
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
                  value={currentConfig.enderecoClinica || ""}
                  onChange={(e) => setCurrentConfig(prev => ({ ...prev, enderecoClinica: e.target.value }))}
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
                  value={currentConfig.telefoneClinica || ""}
                  onChange={(e) => setCurrentConfig(prev => ({ ...prev, telefoneClinica: e.target.value }))}
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
                  value={currentConfig.emailClinica || ""}
                  onChange={(e) => setCurrentConfig(prev => ({ ...prev, emailClinica: e.target.value }))}
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
            {!temAcesso ? (
              <div style={{
                background: "#1a2332",
                padding: 40,
                borderRadius: 12,
                border: "1px solid #0eb8d033",
                textAlign: "center"
              }}>
                <p style={{ fontSize: 18, color: "#0eb8d0", fontWeight: 600, marginBottom: 8 }}>
                  Trial Expirado
                </p>
                <p style={{ color: "#aaa", fontSize: 14 }}>
                  Seu período de trial de 7 dias expirou. Faça upgrade para Premium para continuar usando as integrações (WhatsApp e envio por e-mail).
                </p>
              </div>
            ) : (
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
                
                <p style={{ marginBottom: 10, color: "#ccc" }}>
                  Ative o envio de exames por WhatsApp. Após ativar e clicar em &quot;Salvar Configurações&quot;, o botão verde WhatsApp ficará visível em Exames Realizados. Apenas exames salvos podem ser enviados, e somente em formato PDF (por segurança).
                </p>
                <p style={{ marginBottom: 15, fontSize: 13, color: "#999" }}>
                  <strong>Como usar:</strong> Marque &quot;Ativar integração com WhatsApp&quot;, informe o número (seu ou da clínica) e salve. Gere o PDF do exame (botão 🖨️ PDF) e use o botão WhatsApp para enviar o laudo em PDF ao paciente.
                </p>
                
                <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 15, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={integracoes.whatsapp}
                    onChange={(e) => setIntegracoes(prev => ({...prev, whatsapp: e.target.checked}))}
                    style={{ transform: "scale(1.2)" }}
                  />
                  <span>Ativar envio de exames via WhatsApp</span>
                </label>

                {integracoes.whatsapp && (
                  <div>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                      Número do WhatsApp (seu ou da clínica) para enviar ao paciente:
                    </label>
                    <input
                      type="text"
                      value={integracoes.numeroWhatsapp}
                      onChange={(e) => setIntegracoes(prev => ({...prev, numeroWhatsapp: e.target.value}))}
                      placeholder="+55 11 99999-9999 ou 11999999999"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 6,
                        border: "none",
                        fontSize: 14,
                        marginBottom: 12
                      }}
                    />
                    {integracoes.numeroWhatsapp.trim() && (() => {
                      const digits = integracoes.numeroWhatsapp.replace(/\D/g, "");
                      const withCountry = digits.startsWith("55") ? digits : (digits.length <= 11 ? "55" + digits : digits);
                      const waNumber = withCountry || "55";
                      return (
                      <a
                        href={`https://wa.me/${waNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          background: "#25D366",
                          color: "#fff",
                          padding: "10px 18px",
                          borderRadius: 8,
                          fontWeight: 600,
                          textDecoration: "none",
                          fontSize: 14
                        }}
                      >
                        <FiMessageCircle size={20} /> Abrir conversa no WhatsApp
                      </a>
                    ); })()}
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
                  <FiMail size={24} color="#0eb8d0" />
                  <h4 style={{ margin: 0, color: "#0eb8d0" }}>Envio por E-mail</h4>
                </div>
                <p style={{ marginBottom: 10, color: "#ccc" }}>
                  Ative o envio de exames por e-mail. Após ativar e clicar em &quot;Salvar Configurações&quot;, o botão azul E-mail ficará visível em Exames Realizados. Apenas exames salvos podem ser enviados, e somente em formato PDF (por segurança).
                </p>
                <p style={{ marginBottom: 15, fontSize: 13, color: "#999" }}>
                  <strong>Como usar:</strong> Marque &quot;Ativar envio de exames via e-mail&quot;, opcionalmente informe seu e-mail (ou da clínica) e salve. Gere o PDF do exame (botão 🖨️ PDF) e use o botão E-mail para enviar o laudo em PDF ao paciente.
                </p>
                <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 15, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={integracoes.envioEmail}
                    onChange={(e) => setIntegracoes(prev => ({ ...prev, envioEmail: e.target.checked }))}
                    style={{ transform: "scale(1.2)" }}
                  />
                  <span>Ativar envio de exames via e-mail</span>
                </label>
                {integracoes.envioEmail && (
                  <div>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                      Seu e-mail ou da clínica (remetente):
                    </label>
                    <input
                      type="email"
                      value={integracoes.emailRemetente}
                      onChange={(e) => setIntegracoes(prev => ({ ...prev, emailRemetente: e.target.value }))}
                      placeholder="ex: contato@clinica.com.br"
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
            )}
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
                    <span style={{ fontWeight: 600, color: "#0eb8d0" }}>{tipoPlanoExibicao}</span>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Status:</span>
                    <span style={{ fontWeight: 600, color: "#11b581" }}>
                      {statusPlanoExibicao}
                    </span>
                  </div>
                  
                  {!isPremium && (
                    <p style={{ margin: "12px 0 0", fontSize: 13, color: "#e6d68a" }}>
                      O plano gratuito tem validade de 7 dias.
                    </p>
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
                  {!isPremium ? (
                    <button
                      onClick={() => {
                        if (window.confirm(
                          "Deseja ser redirecionado para a página de pagamento Hotmart para assinar o plano Premium?\n\nApós o pagamento, seu plano será ativado."
                        )) {
                          window.open(HOTMART_CHECKOUT_URL, "_blank");
                          navigate("/confirmacao-pagamento");
                        }
                      }}
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
                      Assinar Premium (Hotmart)
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate("/home")}
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
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mensagem de feedback - logo acima dos botões */}
      {mensagem && (
        <div style={{
          background: (mensagem.includes("sucesso") || mensagem.includes("salvo")) ? "#11b581" : "#e74c3c",
          color: "#fff",
          padding: "12px 20px",
          borderRadius: 8,
          marginTop: 30,
          marginBottom: 16,
          textAlign: "center",
          fontWeight: 600
        }}>
          {mensagem}
        </div>
      )}

      {/* Botão Salvar */}
      <div style={{ textAlign: "center", marginTop: mensagem ? 0 : 30 }}>
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
            const especialidade = localStorage.getItem("especialidade") || localStorage.getItem("especialidadeLaudo") || "";
            const nomeMedico = localStorage.getItem("nomeMedico") || "";
            const crm = localStorage.getItem("crm") || "";
            const nomeClinica = localStorage.getItem("nomeClinica") || "";
            setMensagem(`Dados salvos: Nome: ${nomeMedico || "(vazio)"} | CRM: ${crm || "(vazio)"} | Especialidade: ${especialidade || "(vazio)"} | Clínica: ${nomeClinica || "(vazio)"}`);
            setTimeout(() => setMensagem(""), 5000);
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
      </div>
    </div>
  );
} 