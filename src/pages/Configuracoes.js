import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft, FiUser, FiFileText, FiCreditCard, FiSend, FiMessageCircle, FiCheckCircle, FiRotateCcw,
  FiAlertTriangle, FiLoader, FiLock, FiBriefcase, FiImage, FiEdit3, FiExternalLink, FiPlus,
} from "react-icons/fi";
import { FaGem } from "react-icons/fa";
import { TrialManager } from "../utils/trialManager";
import { AuthService } from "../services/supabaseAuthService";
import { EVENTO_PERFIL_NA_CONTA } from "../services/perfilSyncService";
import { ehPremium, linkPagamento, premiumAte } from "../services/planoService";
import { lerModeloMensagem, salvarModeloMensagem, montarMensagem, MODELO_PADRAO, VARIAVEIS_MENSAGEM } from "../utils/envioLaudo";
import {
  ativarPerfilDoUsuario, carregarDadosPerfil, salvarDadosPerfil, normalizarDados, perfilAtivo, progressoPerfil, EVENTO_PERFIL_ATUALIZADO,
  medicoVazio, localVazio, MAX_MEDICOS, MAX_LOCAIS,
} from "../utils/perfilLaudo";
import {
  TEMA, Card, CampoTexto, grade2, botao, UploadImagem, CampoAssinatura, PreviaLaudo, ESPECIALIDADES,
} from "../components/perfil/PerfilCampos";

const HOTMART_ASSINATURAS_URL = "https://consumer.hotmart.com";

const SECOES = [
  { id: "perfil", label: "Perfil do laudo", icon: <FiFileText /> },
  { id: "conta", label: "Conta", icon: <FiUser /> },
  { id: "envio", label: "Envio de laudos", icon: <FiSend /> },
  { id: "plano", label: "Plano", icon: <FiCreditCard /> },
];

function useLargura() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const f = () => setW(window.innerWidth);
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  return w;
}

// Abas de médicos / locais, com o botão de adicionar no fim.
function Abas({ itens, ativo, onEscolher, onAdicionar, rotuloAdicionar }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {itens.map((t, i) => (
        <button key={i} type="button" onClick={() => onEscolher(i)}
          style={{ ...botao(TEMA.destaque, ativo !== i), padding: "7px 13px", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {t}{ativo === i ? " ✓" : ""}
        </button>
      ))}
      {onAdicionar && (
        <button type="button" onClick={onAdicionar} style={{ ...botao(TEMA.suave, true), padding: "7px 13px", borderStyle: "dashed" }}><FiPlus /> {rotuloAdicionar}</button>
      )}
    </div>
  );
}

export default function Configuracoes() {
  const navigate = useNavigate();
  const largura = useLargura();
  const larga = largura >= 980;
  const email = localStorage.getItem("userEmail") || "";
  const isPremium = ehPremium(email);
  const trial = TrialManager.verificarTrial(email);
  const temAcesso = isPremium || trial.status === "ativo" || trial.status === "nao_iniciado";

  const [secao, setSecao] = useState(() => (new URLSearchParams(window.location.search).get("secao") || "perfil"));
  const [dados, setDados] = useState(() => carregarDadosPerfil(email) || ativarPerfilDoUsuario(email) || normalizarDados(null));
  const [remover, setRemover] = useState(null); // { tipo: "medico"|"local", indice }
  const [nomeCompleto, setNomeCompleto] = useState(() => localStorage.getItem("nomeCompleto") || "");
  const [modelo, setModelo] = useState(lerModeloMensagem);
  const campoModelo = useRef(null);
  const [status, setStatus] = useState({ tipo: "ok", texto: "Tudo salvo" });
  const [senha, setSenha] = useState({ atual: "", nova: "", confirmar: "", msg: "", ok: false, enviando: false });
  const [confirmarAssinatura, setConfirmarAssinatura] = useState(false);
  const primeira = useRef(true);

  // médico e local em uso (são os que saem nos laudos)
  const iMedico = dados.medicoAtivo;
  const medico = dados.medicos[iMedico];
  const iLocal = medico.localAtivo;
  const local = medico.locais[iLocal];
  const perfil = perfilAtivo(dados);
  const mudarMedico = (fn) => setDados((d) => ({ ...d, medicos: d.medicos.map((m, i) => (i === d.medicoAtivo ? fn(m) : m)) }));
  const setMedicoCampo = (campo) => (valor) => mudarMedico((m) => ({ ...m, [campo]: valor }));
  const setLocalCampo = (campo) => (valor) => mudarMedico((m) => ({ ...m, locais: m.locais.map((l, i) => (i === m.localAtivo ? { ...l, [campo]: valor } : l)) }));
  const escolherMedico = (i) => setDados((d) => ({ ...d, medicoAtivo: i }));
  const escolherLocal = (i) => mudarMedico((m) => ({ ...m, localAtivo: i }));
  const adicionarMedico = () => setDados((d) => ({ ...d, medicos: [...d.medicos, medicoVazio()], medicoAtivo: d.medicos.length }));
  const adicionarLocal = () => mudarMedico((m) => ({ ...m, locais: [...m.locais, localVazio()], localAtivo: m.locais.length }));
  function confirmarRemocao() {
    if (remover?.tipo === "medico") {
      setDados((d) => ({ ...d, medicos: d.medicos.filter((_, i) => i !== remover.indice), medicoAtivo: 0 }));
    } else if (remover?.tipo === "local") {
      mudarMedico((m) => ({ ...m, locais: m.locais.filter((_, i) => i !== remover.indice), localAtivo: 0 }));
    }
    setRemover(null);
  }

  // Depois de salvar: confirma se foi para a conta (qualquer computador) ou
  // ficou só neste navegador (Supabase sem a coluna perfil_laudo).
  useEffect(() => {
    const f = (e) => setStatus((s) => (s.tipo === "erro" ? s : e.detail?.ok
      ? { tipo: "ok", texto: "Salvo na sua conta" }
      : { tipo: "ok", texto: "Salvo neste navegador" }));
    window.addEventListener(EVENTO_PERFIL_NA_CONTA, f);
    return () => window.removeEventListener(EVENTO_PERFIL_NA_CONTA, f);
  }, []);

  // Perfil chegou da conta (outro computador): mostra sem salvar de novo.
  useEffect(() => {
    const atualizar = () => {
      const d = carregarDadosPerfil(email);
      if (d) { primeira.current = true; setDados(d); }
    };
    window.addEventListener(EVENTO_PERFIL_ATUALIZADO, atualizar);
    return () => window.removeEventListener(EVENTO_PERFIL_ATUALIZADO, atualizar);
  }, [email]);

  // Salvamento automático: meio segundo depois da última alteração.
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return undefined; }
    setStatus({ tipo: "salvando", texto: "Salvando..." });
    const t = setTimeout(() => {
      const r = salvarDadosPerfil(email, dados);
      try {
        localStorage.setItem("nomeCompleto", nomeCompleto);
        salvarModeloMensagem(modelo);
      } catch (_) {}
      setStatus(r.ok ? { tipo: "ok", texto: "Salvo" } : { tipo: "erro", texto: r.erro });
    }, 500);
    return () => clearTimeout(t);
  }, [dados, nomeCompleto, modelo, email]);

  async function alterarSenha() {
    if (!senha.atual) return setSenha((s) => ({ ...s, msg: "Informe a senha atual.", ok: false }));
    if (senha.nova.length < 6) return setSenha((s) => ({ ...s, msg: "A nova senha deve ter pelo menos 6 caracteres.", ok: false }));
    if (senha.nova !== senha.confirmar) return setSenha((s) => ({ ...s, msg: "A confirmação não confere com a nova senha.", ok: false }));
    setSenha((s) => ({ ...s, enviando: true, msg: "" }));
    const r = await AuthService.changePassword(email, senha.atual, senha.nova);
    setSenha(r.success
      ? { atual: "", nova: "", confirmar: "", msg: "Senha alterada com sucesso.", ok: true, enviando: false }
      : (s) => ({ ...s, enviando: false, ok: false, msg: r.error || "Não foi possível alterar a senha." }));
  }

  const progresso = progressoPerfil(perfil);

  // ---------- seções ----------
  const secaoPerfil = (
    <div style={{ display: "grid", gridTemplateColumns: larga ? "minmax(0, 1fr) 330px" : "1fr", gap: 18, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: "rgba(14,184,208,0.08)", border: `1px solid rgba(14,184,208,0.25)`, borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ flex: "1 1 200px" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: TEMA.texto }}>
              Em uso nos laudos: {perfil.nomeMedico?.trim() || "médico sem nome"}{perfil.nomeClinica?.trim() ? ` · ${perfil.nomeClinica.trim()}` : ""}
            </div>
            <div style={{ fontSize: 12, color: TEMA.suave }}>{progresso.feitos === progresso.total ? "Laudo personalizado." : `Perfil ${progresso.feitos} de ${progresso.total} itens.`}</div>
            <div style={{ fontSize: 12, color: TEMA.suave }}>{progresso.faltam.length ? `Falta: ${progresso.faltam.join(", ")}` : "Logo, assinatura e dados aparecem em todos os laudos em PDF."}</div>
          </div>
          <div style={{ flex: "1 1 140px", height: 8, background: "#25324a", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${(progresso.feitos / progresso.total) * 100}%`, height: "100%", background: progresso.feitos === progresso.total ? TEMA.ok : TEMA.destaque }} />
          </div>
        </div>

        <Card titulo="Profissional" icone={<FiUser />} descricao="Nome, CRM, especialidade e assinatura que saem em todos os laudos.">
          {MAX_MEDICOS > 1 && (
            <Abas
              itens={dados.medicos.map((m, i) => m.nomeMedico?.trim() || `Médico ${i + 1}`)}
              ativo={iMedico}
              onEscolher={escolherMedico}
              onAdicionar={dados.medicos.length < MAX_MEDICOS ? adicionarMedico : null}
              rotuloAdicionar="Adicionar médico"
            />
          )}
          <div style={{ ...grade2, marginTop: MAX_MEDICOS > 1 ? 14 : 0 }}>
            <CampoTexto label="Nome que aparece no laudo" value={medico.nomeMedico} onChange={setMedicoCampo("nomeMedico")} placeholder="Dr. João Silva" />
            <CampoTexto label="CRM / UF" value={medico.crm} onChange={setMedicoCampo("crm")} placeholder="12345 PR" />
            <CampoTexto label="Especialidade" value={medico.especialidade} onChange={setMedicoCampo("especialidade")} placeholder="Angiologia e Cirurgia Vascular" lista={ESPECIALIDADES} />
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: TEMA.suave, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><FiEdit3 /> Assinatura (rodapé do laudo) — envie uma foto ou assine na tela</div>
            <CampoAssinatura valor={medico.assinaturaMedico} onChange={setMedicoCampo("assinaturaMedico")} />
          </div>
          {dados.medicos.length > 1 && (
            <button type="button" style={{ ...botao(TEMA.erro, true), marginTop: 14 }} onClick={() => setRemover({ tipo: "medico", indice: iMedico })}>
              Remover {medico.nomeMedico?.trim() || `Médico ${iMedico + 1}`}
            </button>
          )}
        </Card>

        <Card titulo="Locais de atendimento" icone={<FiBriefcase />}
          descricao={temAcesso
            ? `Até ${MAX_LOCAIS} locais, cada um com a sua clínica e o seu logo. O local selecionado é o que sai no laudo (dá para trocar no menu e em cada exame).`
            : `No Premium: até ${MAX_LOCAIS} locais, cada um com a sua clínica e o seu logo.`}>
          <Abas
            itens={medico.locais.map((l, i) => l.nomeClinica?.trim() || `Local ${i + 1}`)}
            ativo={iLocal}
            onEscolher={escolherLocal}
            onAdicionar={temAcesso && medico.locais.length < MAX_LOCAIS ? adicionarLocal : null}
            rotuloAdicionar="Adicionar local"
          />
          <div style={{ ...grade2, marginTop: 14 }}>
            <CampoTexto label="Nome da clínica" value={local.nomeClinica} onChange={setLocalCampo("nomeClinica")} placeholder="Clínica Vascular" />
            <CampoTexto label="Telefone" value={local.telefoneClinica} onChange={setLocalCampo("telefoneClinica")} placeholder="(43) 99999-9999" type="tel" />
            <CampoTexto label="Endereço" value={local.enderecoClinica} onChange={setLocalCampo("enderecoClinica")} placeholder="Rua, número - bairro - cidade/UF" />
            <CampoTexto label="E-mail" value={local.emailClinica} onChange={setLocalCampo("emailClinica")} placeholder="contato@clinica.com.br" type="email" />
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: TEMA.suave, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><FiImage /> Logo deste local — bordas vazias são cortadas e a imagem é reduzida automaticamente</div>
            <UploadImagem valor={local.logoClinica} onChange={setLocalCampo("logoClinica")} rotulo="Logo" maxW={800} maxH={400} />
          </div>
          {medico.locais.length > 1 && (
            <button type="button" style={{ ...botao(TEMA.erro, true), marginTop: 14 }} onClick={() => setRemover({ tipo: "local", indice: iLocal })}>
              Remover {local.nomeClinica?.trim() || `Local ${iLocal + 1}`}
            </button>
          )}
        </Card>
      </div>

      <div style={{ position: larga ? "sticky" : "static", top: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEMA.suave, alignSelf: larga ? "flex-start" : "center" }}>Prévia do laudo em PDF</div>
        <PreviaLaudo perfil={perfil} largura={larga ? 330 : Math.min(330, largura - 48)} />
      </div>
    </div>
  );

  const secaoConta = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      <Card titulo="Dados da conta" icone={<FiUser />}>
        <div style={grade2}>
          <CampoTexto label="Nome completo" value={nomeCompleto} onChange={setNomeCompleto} />
          <CampoTexto label="E-mail de acesso" value={email} readOnly dica="O e-mail é o seu login e não pode ser alterado aqui." />
        </div>
      </Card>
      <Card titulo="Alterar senha" icone={<FiLock />}>
        <div style={grade2}>
          <CampoTexto label="Senha atual" type="password" value={senha.atual} onChange={(v) => setSenha((s) => ({ ...s, atual: v }))} />
          <CampoTexto label="Nova senha" type="password" value={senha.nova} onChange={(v) => setSenha((s) => ({ ...s, nova: v }))} dica="Mínimo de 6 caracteres." />
          <CampoTexto label="Confirmar nova senha" type="password" value={senha.confirmar} onChange={(v) => setSenha((s) => ({ ...s, confirmar: v }))} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
          <button type="button" style={botao(TEMA.ok)} onClick={alterarSenha} disabled={senha.enviando}>{senha.enviando ? "Alterando..." : "Alterar senha"}</button>
          {senha.msg && <span style={{ fontSize: 13, color: senha.ok ? TEMA.ok : TEMA.erro }}>{senha.msg}</span>}
        </div>
      </Card>
    </div>
  );

  // Coloca a variável onde está o cursor na mensagem.
  function inserirVariavel(v) {
    const el = campoModelo.current;
    const ini = el ? el.selectionStart : modelo.length;
    const fim = el ? el.selectionEnd : modelo.length;
    setModelo(modelo.slice(0, ini) + v + modelo.slice(fim));
    setTimeout(() => { if (el) { el.focus(); el.selectionStart = el.selectionEnd = ini + v.length; } }, 0);
  }
  const previaMensagem = montarMensagem(modelo, {
    paciente: "Maria da Silva", tipoNome: "Doppler Venoso de Membros Inferiores", data: new Date().toISOString().slice(0, 10),
    clinica: perfil.nomeClinica, medico: perfil.nomeMedico, crm: perfil.crm,
  });
  const secaoEnvio = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      {!temAcesso && (
        <Card titulo="Disponível no Premium" icone={<FaGem />} descricao="Seu período de teste terminou. Assine o Premium para enviar laudos por WhatsApp e e-mail." />
      )}
      <Card titulo="Como enviar" icone={<FiSend />} descricao='Use o botão verde "Enviar laudo" no fim do exame ou "Enviar" em Exames Realizados.'>
        <ul style={{ margin: 0, paddingLeft: 18, color: TEMA.texto, fontSize: 13.5, lineHeight: 1.7 }}>
          <li>Clique em <strong>Enviar laudo</strong>, escolha <strong>WhatsApp</strong> ou <strong>E-mail</strong> e preencha o contato do paciente.</li>
          <li>A conversa abre com a mensagem pronta e o PDF do laudo é baixado para você anexar.</li>
          <li>O telefone/e-mail do paciente e a data do envio ficam guardados no exame.</li>
        </ul>
      </Card>
      <Card titulo="Mensagem para o paciente" icone={<FiMessageCircle />} descricao="Texto que acompanha o laudo. As palavras entre chaves são trocadas pelos dados do exame.">
        <textarea ref={campoModelo} value={modelo} onChange={(e) => setModelo(e.target.value)} rows={5}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #2f6f86", background: "#f7fbff", color: "#16202c", fontSize: 14, fontFamily: "inherit", resize: "vertical" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {VARIAVEIS_MENSAGEM.map(([v, d]) => (
            <button key={v} type="button" title={d} onClick={() => inserirVariavel(v)}
              style={{ background: "rgba(14,184,208,0.12)", color: TEMA.destaque, border: `1px solid ${TEMA.destaque}55`, borderRadius: 14, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>
              {d}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: TEMA.suave, margin: "14px 0 5px" }}>Prévia</div>
        <div style={{ whiteSpace: "pre-wrap", background: "#0f1a14", border: "1px solid #25D36655", borderRadius: 10, padding: "10px 12px", color: TEMA.texto, fontSize: 13.5, lineHeight: 1.5 }}>{previaMensagem}</div>
        {modelo.trim() !== MODELO_PADRAO.trim() && (
          <button type="button" onClick={() => setModelo(MODELO_PADRAO)} style={{ ...botao(TEMA.suave, true), marginTop: 12 }}><FiRotateCcw /> Restaurar mensagem padrão</button>
        )}
      </Card>
      <p style={{ fontSize: 12.5, color: TEMA.suave, margin: 0 }}>Integração com prontuário eletrônico / PACS: em breve.</p>
    </div>
  );

  let planoTitulo, planoTexto, planoCor;
  if (isPremium) {
    const ate = premiumAte(email);
    planoTitulo = "Premium"; planoCor = TEMA.ok;
    planoTexto = ate
      ? `Assinatura cancelada: o Premium continua até ${new Date(ate).toLocaleDateString("pt-BR")}.`
      : "Laudos ilimitados, até 3 locais de atendimento e envio por WhatsApp/e-mail.";
  } else if (trial.status === "ativo") {
    planoTitulo = "Teste gratuito";
    planoTexto = `Restam ${trial.diasRestantes} ${trial.diasRestantes === 1 ? "dia" : "dias"} e ${trial.laudosRestantes} ${trial.laudosRestantes === 1 ? "laudo" : "laudos"}.`;
    planoCor = TEMA.destaque;
  } else if (trial.status === "nao_iniciado") {
    planoTitulo = "Teste gratuito"; planoTexto = "Começa no primeiro laudo: 7 dias ou 5 laudos."; planoCor = TEMA.destaque;
  } else {
    planoTitulo = "Teste encerrado"; planoTexto = "Assine o Premium para continuar gerando laudos."; planoCor = "#e6b04a";
  }
  const secaoPlano = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      <Card titulo="Plano atual" icone={<FiCreditCard />}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ background: planoCor, color: "#0d1520", fontWeight: 800, borderRadius: 999, padding: "5px 14px", fontSize: 13.5 }}>{planoTitulo}</span>
          <span style={{ color: TEMA.texto, fontSize: 14 }}>{planoTexto}</span>
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {isPremium ? (
            <a href={HOTMART_ASSINATURAS_URL} target="_blank" rel="noopener noreferrer" style={{ ...botao(TEMA.destaque, true), textDecoration: "none" }}>
              <FiExternalLink /> Gerenciar assinatura na Hotmart
            </a>
          ) : (
            <button type="button" style={botao(TEMA.ok)} onClick={() => setConfirmarAssinatura(true)}><FaGem /> Assinar Premium</button>
          )}
        </div>
      </Card>
    </div>
  );

  const conteudo = { perfil: secaoPerfil, conta: secaoConta, envio: secaoEnvio, plano: secaoPlano }[secao];

  const corStatus = status.tipo === "erro" ? TEMA.erro : status.tipo === "salvando" ? TEMA.suave : TEMA.ok;
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(120deg,#101824 0%,#1c2740 100%)", color: TEMA.texto, fontFamily: "Segoe UI, Inter, Arial, sans-serif", padding: "clamp(12px, 3vw, 28px)", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button type="button" onClick={() => navigate("/home")} style={{ ...botao(TEMA.destaque, true), padding: "8px 12px" }} title="Voltar ao menu"><FiArrowLeft /> Menu</button>
            <div>
              <h1 style={{ margin: 0, fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 800 }}>Configurações</h1>
              <div style={{ fontSize: 12.5, color: TEMA.suave }}>As alterações são salvas automaticamente</div>
            </div>
          </div>
          <span role="status" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: corStatus, background: "#172133", border: `1px solid ${TEMA.borda}`, borderRadius: 999, padding: "6px 12px", maxWidth: 520 }}>
            {status.tipo === "erro" ? <FiAlertTriangle /> : status.tipo === "salvando" ? <FiLoader /> : <FiCheckCircle />} {status.texto}
          </span>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: larga ? "210px minmax(0, 1fr)" : "1fr", gap: 18, alignItems: "start" }}>
          <nav style={{ display: "flex", flexDirection: larga ? "column" : "row", gap: 6, overflowX: larga ? "visible" : "auto", position: larga ? "sticky" : "static", top: 16, paddingBottom: larga ? 0 : 4 }}>
            {SECOES.map((s) => {
              const ativo = secao === s.id;
              return (
                <button key={s.id} type="button" onClick={() => setSecao(s.id)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, cursor: "pointer", whiteSpace: "nowrap",
                  border: `1px solid ${ativo ? TEMA.destaque : "transparent"}`, background: ativo ? "rgba(14,184,208,0.14)" : "transparent",
                  color: ativo ? TEMA.destaque : TEMA.texto, fontWeight: ativo ? 700 : 500, fontSize: 14, textAlign: "left",
                }}>
                  {s.icon} {s.label}
                </button>
              );
            })}
          </nav>
          <main>{conteudo}</main>
        </div>
      </div>

      {remover && (
        <div onClick={() => setRemover(null)} style={{ position: "fixed", inset: 0, background: "rgba(8,14,22,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1002, padding: 15 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#151b26", border: "1px solid #2a3441", borderRadius: 10, padding: 22, width: "100%", maxWidth: 420 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 17, display: "flex", alignItems: "center", gap: 8 }}><FiAlertTriangle color={TEMA.erro} /> {remover.tipo === "medico" ? "Remover médico?" : "Remover local?"}</h3>
            <p style={{ color: "#aab6c2", fontSize: 14, marginBottom: 20 }}>
              {remover.tipo === "medico" ? "O médico, a assinatura e os locais dele serão apagados." : "O local, com a clínica e o logo, será apagado."} Os laudos já salvos não mudam.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" style={botao("#38445e")} onClick={() => setRemover(null)}>Cancelar</button>
              <button type="button" style={botao(TEMA.erro)} onClick={confirmarRemocao}>Remover</button>
            </div>
          </div>
        </div>
      )}

      {confirmarAssinatura && (
        <div onClick={() => setConfirmarAssinatura(false)} style={{ position: "fixed", inset: 0, background: "rgba(8,14,22,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1002, padding: 15 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#151b26", border: "1px solid #2a3441", borderRadius: 10, padding: 22, width: "100%", maxWidth: 420 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 17 }}>Assinar Premium</h3>
            <p style={{ color: "#aab6c2", fontSize: 14, marginBottom: 20 }}>Você será levado para a página de pagamento da Hotmart. Após o pagamento, o plano é ativado.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" style={botao("#38445e")} onClick={() => setConfirmarAssinatura(false)}>Cancelar</button>
              <button type="button" style={botao(TEMA.ok)} onClick={() => { setConfirmarAssinatura(false); window.open(linkPagamento(email), "_blank", "noopener,noreferrer"); navigate("/confirmacao-pagamento"); }}>Continuar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
