// Sincroniza o perfil do laudo (profissional, locais, logos e assinatura) com
// a conta do usuário no Supabase (coluna users.perfil_laudo), para ele
// aparecer em qualquer computador ou celular.
//
// Se a coluna ainda não existir (comando SQL não rodado) ou o Supabase não
// estiver configurado, nada quebra: o perfil continua só no navegador e a
// sincronização começa sozinha quando a coluna passar a existir.
import { supabase, supabaseConfig } from "../config/supabase";
import {
  carregarDadosPerfil, aplicarDadosDaConta, temPerfilParaEnviar, EVENTO_PERFIL_SALVO,
} from "../utils/perfilLaudo";

const COLUNA = "perfil_laudo";
export const EVENTO_PERFIL_NA_CONTA = "perfilLaudoNaConta";
function avisar(ok) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENTO_PERFIL_NA_CONTA, { detail: { ok } }));
}
let indisponivel = false; // coluna não existe: não insistir até recarregar a página
let timer = null;
let iniciado = false;

function colunaInexistente(error) {
  const t = `${error?.code || ""} ${error?.message || ""}`;
  return /42703|PGRST204|perfil_laudo/i.test(t);
}

async function usuarioAtual() {
  if (!supabaseConfig.isConfigured || !supabase || indisponivel) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user || null;
  } catch (_) {
    return null;
  }
}

export async function enviarPerfilParaConta(email) {
  const user = await usuarioAtual();
  if (!user || !email) return { ok: false, motivo: "sem-conta" };
  const dados = carregarDadosPerfil(email);
  if (!dados || !temPerfilParaEnviar(dados)) return { ok: false, motivo: "vazio" };
  const { error } = await supabase
    .from("users")
    .upsert({ id: user.id, email: user.email || email, [COLUNA]: dados }, { onConflict: "id" });
  if (error) {
    if (colunaInexistente(error)) indisponivel = true;
    avisar(false);
    return { ok: false, motivo: error.message };
  }
  avisar(true);
  return { ok: true };
}

// Ao entrar: traz o perfil da conta; se o deste navegador for mais novo (ou a
// conta ainda não tiver perfil), envia o daqui.
export async function sincronizarPerfilComConta(email) {
  const user = await usuarioAtual();
  if (!user || !email) return { ok: false, motivo: "sem-conta" };
  const { data, error } = await supabase.from("users").select(COLUNA).eq("id", user.id).maybeSingle();
  if (error) {
    if (colunaInexistente(error)) indisponivel = true;
    return { ok: false, motivo: error.message };
  }
  const remoto = data?.[COLUNA] || null;
  const trocou = aplicarDadosDaConta(email, remoto);
  if (!trocou) {
    const local = carregarDadosPerfil(email);
    if (local && (!remoto || (local.atualizadoEm || 0) > (Number(remoto.atualizadoEm) || 0))) {
      return enviarPerfilParaConta(email);
    }
  }
  return { ok: true, trouxe: trocou };
}

// Cada alteração do perfil sobe para a conta (1,5 s depois da última).
export function iniciarSincronizacaoPerfil() {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;
  window.addEventListener(EVENTO_PERFIL_SALVO, (e) => {
    const email = e.detail?.email;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const r = await enviarPerfilParaConta(email);
      if (!r.ok && r.motivo !== "vazio") avisar(false);
    }, 1500);
  });
}
