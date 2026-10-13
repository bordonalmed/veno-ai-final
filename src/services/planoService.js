// Plano do usuário (Premium ou teste gratuito) — uma regra só para o app todo.
//
// - Premium vale por usuário (antes havia uma marca para o navegador inteiro,
//   e o segundo médico do mesmo computador herdava o Premium do primeiro).
// - A conta (Supabase) é a fonte: Premium marcado lá vale em qualquer
//   computador. O Premium só é retirado quando a Hotmart avisa (reembolso,
//   chargeback ou fim da assinatura cancelada); Premium antigo continua.
// - Teste gratuito: 7 dias ou 5 laudos, começando no primeiro laudo. Fica
//   registrado na conta (função registrar_laudo_teste do Supabase); sem ela,
//   fica neste navegador. Gerar de novo o laudo do mesmo paciente/exame/data
//   não conta outra vez.
import { supabase, supabaseConfig } from "../config/supabase";

export const DIAS_TESTE = 7;
export const LAUDOS_TESTE = 5;
export const EVENTO_PLANO_ATUALIZADO = "planoAtualizado";
export const EVENTO_LIMITE_PLANO = "limitePlano";
const DIA = 24 * 60 * 60 * 1000;

const emailAtual = () => {
  try { return localStorage.getItem("userEmail") || ""; } catch (_) { return ""; }
};
const chaveTeste = (email) => `trial_${email}`;

function avisar(nome, detail) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(nome, { detail }));
}

export function ehPremium(email = emailAtual()) {
  if (!email) return false;
  try { return localStorage.getItem(`plano_${email}`) === "premium"; } catch (_) { return false; }
}

function marcarPremium(email) {
  try { localStorage.setItem(`plano_${email}`, "premium"); } catch (_) {}
}

// Ajustes de versões antigas, uma vez por usuário:
// - a marca "plano_premium" (do navegador inteiro) passa para o usuário logado,
//   a não ser que ela já pertença a outro usuário Premium deste navegador;
// - o teste gratuito antes não era contado: recomeça no próximo laudo.
export function migrarPlanoLegado(email = emailAtual()) {
  if (!email) return;
  try {
    if (localStorage.getItem("plano_premium") === "true") {
      const outroPremium = Object.keys(localStorage).some(
        (k) => k.startsWith("plano_") && k !== `plano_${email}` && k !== "plano_premium" && localStorage.getItem(k) === "premium"
      );
      if (!outroPremium) marcarPremium(email);
      localStorage.removeItem("plano_premium");
    }
    if (localStorage.getItem(`plano_${email}`) && !ehPremium(email)) localStorage.removeItem(`plano_${email}`);
    if (!localStorage.getItem(`trial_v2_${email}`)) {
      localStorage.removeItem(chaveTeste(email));
      localStorage.removeItem(`trial_usado_${email}`);
      localStorage.setItem(`trial_v2_${email}`, "1");
    }
  } catch (_) {}
}

function lerTeste(email) {
  try { return JSON.parse(localStorage.getItem(chaveTeste(email)) || "null"); } catch (_) { return null; }
}
function gravarTeste(email, teste) {
  try { localStorage.setItem(chaveTeste(email), JSON.stringify(teste)); } catch (_) {}
  avisar(EVENTO_PLANO_ATUALIZADO, { email });
}
const chavesDoTeste = (t) => (Array.isArray(t?.chaves) ? t.chaves : []);

export function statusTeste(email = emailAtual(), agora = Date.now()) {
  const t = lerTeste(email);
  if (!t?.inicio) return { status: "nao_iniciado", diasRestantes: DIAS_TESTE, laudosRestantes: LAUDOS_TESTE };
  const dias = Math.floor((agora - new Date(t.inicio).getTime()) / DIA);
  const diasRestantes = Math.max(0, DIAS_TESTE - dias);
  const laudosRestantes = Math.max(0, LAUDOS_TESTE - chavesDoTeste(t).length);
  if (diasRestantes === 0 || laudosRestantes === 0) {
    return { status: "expirado", diasRestantes, laudosRestantes, motivo: diasRestantes === 0 ? "tempo" : "laudos" };
  }
  return { status: "ativo", diasRestantes, laudosRestantes };
}

// Mesmo laudo = mesmo tipo de exame, paciente e data.
export function chaveLaudo({ tipoNome, nome, data }) {
  const limpar = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
  return [limpar(tipoNome), limpar(nome), String(data || "").trim()].join("|");
}

// Regra do teste (igual à da função do Supabase).
export function decidirTeste(teste, chave, agora = Date.now()) {
  const t = teste?.inicio ? { inicio: teste.inicio, chaves: chavesDoTeste(teste) } : { inicio: new Date(agora).toISOString(), chaves: [] };
  if (agora - new Date(t.inicio).getTime() >= DIAS_TESTE * DIA) return { permitido: false, motivo: "tempo", teste: t };
  if (t.chaves.includes(chave)) return { permitido: true, teste: t };
  if (t.chaves.length >= LAUDOS_TESTE) return { permitido: false, motivo: "laudos", teste: t };
  return { permitido: true, teste: { ...t, chaves: [...t.chaves, chave] } };
}

async function usuarioDaConta() {
  if (!supabaseConfig?.isConfigured || !supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user || null;
  } catch (_) {
    return null;
  }
}

let funcaoIndisponivel = false; // SQL ainda não rodado: usa o navegador
async function registrarNaConta(chave) {
  if (funcaoIndisponivel) return null;
  const user = await usuarioDaConta();
  if (!user) return null;
  try {
    const { data, error } = await supabase.rpc("registrar_laudo_teste", { chave });
    if (error) {
      if (/PGRST202|42883|does not exist|could not find/i.test(`${error.code || ""} ${error.message || ""}`)) funcaoIndisponivel = true;
      return null;
    }
    return data && typeof data === "object" ? data : null;
  } catch (_) {
    return null;
  }
}

// Antes de salvar / gerar PDF / TXT / enviar um laudo. Premium: sempre libera.
// Teste encerrado: avisa (janela "Seu teste terminou") e não libera.
export async function liberarLaudo(info) {
  const email = emailAtual();
  if (!email || ehPremium(email)) return true;
  const chave = chaveLaudo(info || {});
  const r = await registrarNaConta(chave);
  if (r) {
    if (r.premium) { marcarPremium(email); avisar(EVENTO_PLANO_ATUALIZADO, { email }); return true; }
    if (r.trial_comeco) gravarTeste(email, { inicio: r.trial_comeco, chaves: Array.isArray(r.trial_laudos) ? r.trial_laudos : [] });
    if (!r.permitido) avisar(EVENTO_LIMITE_PLANO, { motivo: r.motivo });
    return !!r.permitido;
  }
  const d = decidirTeste(lerTeste(email), chave);
  if (d.permitido) gravarTeste(email, d.teste);
  else avisar(EVENTO_LIMITE_PLANO, { motivo: d.motivo });
  return d.permitido;
}

// Ao entrar / abrir o app: traz o plano da conta (função meu_plano do
// Supabase, que também aplica compras da Hotmart e o fim do período pago).
// Só tira o Premium deste navegador quando a conta diz que ele foi retirado
// por um aviso da Hotmart (reembolso, chargeback, fim da assinatura); Premium
// antigo ou ativado à mão nunca é retirado aqui.
let meuPlanoIndisponivel = false;
async function lerPlanoDaConta(user) {
  if (!meuPlanoIndisponivel) {
    const { data, error } = await supabase.rpc("meu_plano");
    if (!error && data && typeof data === "object") return data;
    if (error && /PGRST202|42883|does not exist|could not find/i.test(`${error.code || ""} ${error.message || ""}`)) meuPlanoIndisponivel = true;
    else if (error) return null;
  }
  let resp = await supabase.from("users").select("premium, plano, trial_comeco, trial_laudos").eq("id", user.id).maybeSingle();
  if (resp.error) resp = await supabase.from("users").select("premium, plano").eq("id", user.id).maybeSingle();
  if (resp.error) return null;
  const c = resp.data || {};
  return { premium: c.premium === true || c.plano === "premium", trial_comeco: c.trial_comeco, trial_laudos: c.trial_laudos };
}

export function premiumAte(email = emailAtual()) {
  try { return localStorage.getItem(`plano_ate_${email}`) || null; } catch (_) { return null; }
}

export async function sincronizarPlano(email = emailAtual()) {
  migrarPlanoLegado(email);
  const user = await usuarioDaConta();
  if (!user || !email) return { ok: false, premium: ehPremium(email) };
  let conta;
  try { conta = await lerPlanoDaConta(user); } catch (_) { conta = null; }
  if (!conta) return { ok: false, premium: ehPremium(email) };
  const eraPremium = ehPremium(email);
  try {
    if (conta.premium) marcarPremium(email);
    else if (conta.revogado) localStorage.removeItem(`plano_${email}`);
    if (conta.premium && conta.premium_ate) localStorage.setItem(`plano_ate_${email}`, conta.premium_ate);
    else localStorage.removeItem(`plano_ate_${email}`);
  } catch (_) {}
  if (!ehPremium(email) && conta.trial_comeco) {
    gravarTeste(email, { inicio: conta.trial_comeco, chaves: Array.isArray(conta.trial_laudos) ? conta.trial_laudos : [] });
  }
  const premium = ehPremium(email);
  avisar(EVENTO_PLANO_ATUALIZADO, { email, premium, ativouAgora: premium && !eraPremium });
  return { ok: true, premium, ativouAgora: premium && !eraPremium };
}

export const LINK_HOTMART = "https://pay.hotmart.com/S102049895B";
// Abre o pagamento já com o e-mail da conta (o Premium é ligado a esse e-mail).
export function linkPagamento(email = emailAtual()) {
  return email ? `${LINK_HOTMART}?email=${encodeURIComponent(email)}` : LINK_HOTMART;
}
