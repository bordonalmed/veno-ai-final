// Perfil do laudo (médico, clínica, logo e assinatura) guardado POR USUÁRIO.
// Antes ficava em chaves soltas do navegador ("logoClinica", "crm"...), que
// passavam de um usuário para outro no mesmo computador. Agora cada e-mail tem
// o seu registro; as chaves soltas continuam existindo só como cópia do perfil
// ativo, porque é delas que os exames leem na hora de gerar o PDF.

export const CAMPOS_PERFIL = [
  "nomeMedico", "crm", "especialidade",
  "nomeClinica", "enderecoClinica", "telefoneClinica", "emailClinica",
  "logoClinica", "assinaturaMedico",
];
export const MAX_PERFIS = 3; // Premium: até 3 médicos

// campo do perfil -> chave usada pelos exames
const CHAVE_LEGADA = { especialidade: "especialidadeLaudo" };
const chaveLegada = (campo) => CHAVE_LEGADA[campo] || campo;
const CHAVES_ANTIGAS_PREMIUM = ["configLaudoPremium", "perfilLaudoAtivo"];
const CHAVE_DONO = "perfilLaudoDono";

export const perfilVazio = () => Object.fromEntries(CAMPOS_PERFIL.map((c) => [c, ""]));
const chaveUsuario = (email) => `perfilLaudo:${String(email || "").trim().toLowerCase()}`;

function normalizarDados(d) {
  const perfis = Array.from({ length: MAX_PERFIS }, (_, i) => ({ ...perfilVazio(), ...(d?.perfis?.[i] || {}) }));
  const ativo = Math.min(Math.max(0, parseInt(d?.ativo, 10) || 0), MAX_PERFIS - 1);
  return { perfis, ativo };
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
  // compatibilidade: algumas telas ainda leem "especialidade"
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

// Grava o perfil do usuário e atualiza as chaves que os exames leem.
// Não lança erro: devolve { ok: false, erro } quando o navegador está cheio.
export function salvarDadosPerfil(email, dados) {
  const d = normalizarDados(dados);
  try {
    localStorage.setItem(chaveUsuario(email), JSON.stringify(d));
    aplicarChavesLegadas(d.perfis[d.ativo]);
    localStorage.setItem(CHAVE_DONO, String(email || "").trim().toLowerCase());
    return { ok: true };
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

// Ao entrar: carrega o perfil deste usuário. Na primeira vez, adota o que já
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

// Ao sair: tira o perfil ativo do navegador (fica guardado no registro do usuário).
export function limparPerfilAtivo() {
  CAMPOS_PERFIL.forEach((c) => localStorage.removeItem(chaveLegada(c)));
  localStorage.removeItem("especialidade");
  CHAVES_ANTIGAS_PREMIUM.forEach((k) => localStorage.removeItem(k));
}

// Itens que deixam o laudo personalizado (cartão "Complete seu perfil").
export const ITENS_ESSENCIAIS = [
  ["nomeMedico", "Nome do médico"],
  ["crm", "CRM"],
  ["nomeClinica", "Nome da clínica"],
  ["logoClinica", "Logo"],
  ["assinaturaMedico", "Assinatura"],
];
export function progressoPerfil(perfil) {
  const feitos = ITENS_ESSENCIAIS.filter(([c]) => String(perfil?.[c] || "").trim());
  return { feitos: feitos.length, total: ITENS_ESSENCIAIS.length, faltam: ITENS_ESSENCIAIS.filter(([c]) => !String(perfil?.[c] || "").trim()).map(([, t]) => t) };
}

// Assistente de primeiro acesso: "feito" ou "pulado" por usuário.
const chaveBoasVindas = (email) => `perfilBoasVindas:${String(email || "").trim().toLowerCase()}`;
export const boasVindasPendente = (email) => !!email && !localStorage.getItem(chaveBoasVindas(email));
export const marcarBoasVindas = (email, estado) => { try { localStorage.setItem(chaveBoasVindas(email), estado); } catch (_) {} };
