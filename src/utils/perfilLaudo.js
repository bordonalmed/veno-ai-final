// Perfil do laudo guardado POR USUÁRIO (conta de login):
//   conta -> 1 profissional (nome, CRM, especialidade, assinatura)
//   profissional -> até MAX_LOCAIS locais de atendimento (clínica, endereço,
//                   telefone, e-mail e logo)
// Ex.: o Dr. José atende na clínica A (logo A) e na clínica B (logo B).
// A estrutura já guarda uma lista de profissionais para o futuro plano para
// clínicas (vários usuários): será só aumentar MAX_MEDICOS.
// Os exames leem o médico + local "em uso" das chaves soltas do navegador
// ("nomeMedico", "logoClinica"...), que são só uma cópia da combinação ativa.

// Limites. O futuro plano para clínicas aumenta MAX_MEDICOS.
export const MAX_MEDICOS = 1;
export const MAX_LOCAIS = 3;

export const CAMPOS_MEDICO = ["nomeMedico", "crm", "especialidade", "assinaturaMedico"];
export const CAMPOS_LOCAL = ["nomeClinica", "enderecoClinica", "telefoneClinica", "emailClinica", "logoClinica"];
export const CAMPOS_PERFIL = [...CAMPOS_MEDICO, ...CAMPOS_LOCAL];

const CHAVE_LEGADA = { especialidade: "especialidadeLaudo" };
const chaveLegada = (campo) => CHAVE_LEGADA[campo] || campo;
const CHAVES_ANTIGAS_PREMIUM = ["configLaudoPremium", "perfilLaudoAtivo"];
const CHAVE_DONO = "perfilLaudoDono";

const vazio = (campos) => Object.fromEntries(campos.map((c) => [c, ""]));
export const localVazio = () => vazio(CAMPOS_LOCAL);
export const medicoVazio = () => ({ ...vazio(CAMPOS_MEDICO), locais: [localVazio()], localAtivo: 0 });
export const perfilVazio = () => vazio(CAMPOS_PERFIL);
const chaveUsuario = (email) => `perfilLaudo:${String(email || "").trim().toLowerCase()}`;
const limitar = (n, max) => Math.min(Math.max(0, parseInt(n, 10) || 0), max - 1);
const temAlgo = (o, campos) => campos.some((c) => String(o?.[c] || "").trim());

// Perfil "achatado" antigo (médico + clínica juntos) -> médico com 1 local.
function medicoDoPerfilAntigo(p) {
  const m = { ...medicoVazio(), ...Object.fromEntries(CAMPOS_MEDICO.map((c) => [c, p?.[c] || ""])) };
  m.locais = [{ ...localVazio(), ...Object.fromEntries(CAMPOS_LOCAL.map((c) => [c, p?.[c] || ""])) }];
  return m;
}

export function normalizarDados(d) {
  let medicos;
  let medicoAtivo;
  if (Array.isArray(d?.medicos)) {
    medicos = d.medicos;
    medicoAtivo = d.medicoAtivo;
  } else if (Array.isArray(d?.perfis)) {
    // versão anterior: { perfis: [perfil achatado], ativo } — perfis vazios saem
    const ativo = limitar(d.ativo, d.perfis.length || 1);
    medicos = d.perfis.map((p, i) => ({ p, i })).filter(({ p, i }) => i === ativo || temAlgo(p, CAMPOS_PERFIL));
    medicoAtivo = Math.max(0, medicos.findIndex(({ i }) => i === ativo));
    medicos = medicos.map(({ p }) => medicoDoPerfilAntigo(p));
  } else {
    medicos = [];
    medicoAtivo = 0;
  }
  // profissionais além do limite (ex.: Premium antigo com 3 médicos) ficam
  // guardados à parte, sem se perder, para o futuro plano para clínicas
  let arquivados = Array.isArray(d?.arquivados) ? d.arquivados : [];
  if (medicos.length > MAX_MEDICOS) {
    const fixoAtivo = limitar(medicoAtivo, medicos.length);
    const ordem = [medicos[fixoAtivo], ...medicos.filter((_, i) => i !== fixoAtivo)];
    arquivados = [...ordem.slice(MAX_MEDICOS), ...arquivados];
    medicos = ordem;
    medicoAtivo = 0;
  }
  medicos = medicos.slice(0, MAX_MEDICOS).map((m) => {
    const locais = (Array.isArray(m?.locais) && m.locais.length ? m.locais : [localVazio()])
      .slice(0, MAX_LOCAIS).map((l) => ({ ...localVazio(), ...l }));
    return { ...medicoVazio(), ...m, locais, localAtivo: limitar(m?.localAtivo, locais.length) };
  });
  if (!medicos.length) medicos = [medicoVazio()];
  return { versao: 2, medicos, medicoAtivo: limitar(medicoAtivo, medicos.length), ...(arquivados.length ? { arquivados } : {}) };
}

// Combinação médico + local, no formato que os exames usam.
export function perfilCombinado(dados, iMedico, iLocal) {
  const d = normalizarDados(dados);
  const m = d.medicos[iMedico ?? d.medicoAtivo] || d.medicos[0];
  const l = m.locais[iLocal ?? m.localAtivo] || m.locais[0];
  return { ...perfilVazio(), ...Object.fromEntries(CAMPOS_MEDICO.map((c) => [c, m[c] || ""])), ...l };
}
export const perfilAtivo = (dados) => perfilCombinado(dados);

// Todas as combinações (para a troca rápida): "Dr. José · Clínica A".
export function opcoesDePerfil(dados) {
  const d = normalizarDados(dados);
  const out = [];
  d.medicos.forEach((m, im) => m.locais.forEach((l, il) => {
    out.push({
      medico: im, local: il,
      ativo: im === d.medicoAtivo && il === m.localAtivo,
      rotulo: `${m.nomeMedico?.trim() || `Médico ${im + 1}`}${l.nomeClinica?.trim() ? ` · ${l.nomeClinica.trim()}` : m.locais.length > 1 ? ` · Local ${il + 1}` : ""}`,
      logo: l.logoClinica,
    });
  }));
  return out;
}

export function selecionarCombinacao(dados, iMedico, iLocal) {
  const d = normalizarDados(dados);
  const medicos = d.medicos.map((m, i) => (i === iMedico ? { ...m, localAtivo: limitar(iLocal, m.locais.length) } : m));
  return { ...d, medicos, medicoAtivo: limitar(iMedico, medicos.length) };
}

function lerChavesLegadas() {
  return Object.fromEntries(CAMPOS_PERFIL.map((c) => [c, localStorage.getItem(chaveLegada(c)) || ""]));
}

function aplicarChavesLegadas(perfil) {
  CAMPOS_PERFIL.forEach((c) => {
    const v = perfil?.[c];
    if (v) localStorage.setItem(chaveLegada(c), v);
    else localStorage.removeItem(chaveLegada(c));
  });
  if (perfil?.especialidade) localStorage.setItem("especialidade", perfil.especialidade);
}

export function carregarDadosPerfil(email) {
  try {
    const salvo = localStorage.getItem(chaveUsuario(email));
    return salvo ? normalizarDados(JSON.parse(salvo)) : null;
  } catch (_) {
    return null;
  }
}

// Grava os perfis do usuário e copia a combinação em uso para as chaves dos
// exames. Não lança erro: devolve { ok: false, erro } com o navegador cheio.
export function salvarDadosPerfil(email, dados) {
  const d = normalizarDados(dados);
  try {
    localStorage.setItem(chaveUsuario(email), JSON.stringify(d));
    aplicarChavesLegadas(perfilAtivo(d));
    localStorage.setItem(CHAVE_DONO, String(email || "").trim().toLowerCase());
    return { ok: true, dados: d };
  } catch (e) {
    const cheio = e && (e.name === "QuotaExceededError" || e.code === 22 || /quota/i.test(e.message || ""));
    return {
      ok: false,
      erro: cheio
        ? "Não foi possível salvar: o espaço do navegador está cheio. Use imagens menores ou remova anexos antigos."
        : "Não foi possível salvar as configurações.",
    };
  }
}

// Ao entrar: carrega os perfis deste usuário. Na primeira vez, adota o que já
// estava salvo no navegador só se não pertencer a outro usuário.
export function ativarPerfilDoUsuario(email) {
  if (!email) return null;
  const emailN = String(email).trim().toLowerCase();
  let dados = carregarDadosPerfil(emailN);
  if (!dados) {
    const dono = localStorage.getItem(CHAVE_DONO);
    if (!dono || dono === emailN) {
      let perfis = [lerChavesLegadas()];
      let ativo = 0;
      try {
        const premium = JSON.parse(localStorage.getItem("configLaudoPremium") || "null");
        if (Array.isArray(premium) && premium.length) {
          perfis = premium;
          ativo = parseInt(localStorage.getItem("perfilLaudoAtivo") || "0", 10) || 0;
        }
      } catch (_) {}
      dados = normalizarDados({ perfis, ativo });
    } else {
      dados = normalizarDados(null);
    }
  }
  salvarDadosPerfil(emailN, dados);
  CHAVES_ANTIGAS_PREMIUM.forEach((k) => localStorage.removeItem(k));
  return dados;
}

// Ao sair: tira o perfil em uso do navegador (fica guardado no registro do usuário).
export function limparPerfilAtivo() {
  CAMPOS_PERFIL.forEach((c) => localStorage.removeItem(chaveLegada(c)));
  localStorage.removeItem("especialidade");
  CHAVES_ANTIGAS_PREMIUM.forEach((k) => localStorage.removeItem(k));
}

// Itens que deixam o laudo personalizado (cartão "Personalize seus laudos").
export const ITENS_ESSENCIAIS = [
  ["nomeMedico", "Nome do médico"],
  ["crm", "CRM"],
  ["nomeClinica", "Nome da clínica"],
  ["logoClinica", "Logo"],
  ["assinaturaMedico", "Assinatura"],
];
export function progressoPerfil(perfil) {
  const tem = (c) => String(perfil?.[c] || "").trim();
  return {
    feitos: ITENS_ESSENCIAIS.filter(([c]) => tem(c)).length,
    total: ITENS_ESSENCIAIS.length,
    faltam: ITENS_ESSENCIAIS.filter(([c]) => !tem(c)).map(([, t]) => t),
  };
}

// Assistente de primeiro acesso: "feito" ou "pulado" por usuário.
const chaveBoasVindas = (email) => `perfilBoasVindas:${String(email || "").trim().toLowerCase()}`;
export const boasVindasPendente = (email) => !!email && !localStorage.getItem(chaveBoasVindas(email));
export const marcarBoasVindas = (email, estado) => { try { localStorage.setItem(chaveBoasVindas(email), estado); } catch (_) {} };
