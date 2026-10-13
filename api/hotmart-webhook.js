// Aviso da Hotmart (webhook) → ativa / retira o Premium na conta do VENO.AI.
//
// Configuração (Vercel > Settings > Environment Variables):
//   HOTMART_HOTTOK            token "Hottok" da Hotmart (Ferramentas > Webhook)
//   SUPABASE_SERVICE_ROLE_KEY chave secreta "service_role" do Supabase
//   SUPABASE_URL              (opcional) usa REACT_APP_SUPABASE_URL se faltar
//   HOTMART_PRODUTO_ID        (opcional) só aceita avisos deste produto
//
// Endereço para cadastrar na Hotmart: https://venoai.xyz/api/hotmart-webhook
// Abrir esse endereço no navegador mostra se está tudo configurado.
const crypto = require("crypto");

const ATIVAR = new Set(["PURCHASE_APPROVED", "PURCHASE_COMPLETE"]);
const REVOGAR = new Set(["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK", "PURCHASE_CANCELED"]);
const CANCELAR = new Set(["SUBSCRIPTION_CANCELLATION"]);
// formato antigo (versão 1.0 do webhook)
const STATUS_V1 = {
  approved: "PURCHASE_APPROVED", completed: "PURCHASE_COMPLETE", complete: "PURCHASE_COMPLETE",
  refunded: "PURCHASE_REFUNDED", chargeback: "PURCHASE_CHARGEBACK", canceled: "PURCHASE_CANCELED",
  cancelled: "PURCHASE_CANCELED", delayed: "PURCHASE_DELAYED", expired: "PURCHASE_EXPIRED", protested: "PURCHASE_PROTEST",
};

function acaoDoEvento(evento) {
  if (ATIVAR.has(evento)) return "ativar";
  if (REVOGAR.has(evento)) return "revogar";
  if (CANCELAR.has(evento)) return "cancelar";
  return "registrar"; // atraso, boleto gerado etc.: só guarda no histórico
}

const data = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const d = new Date(typeof v === "string" && /^\d+$/.test(v) ? Number(v) : v);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

function lerEvento(body) {
  if (body && body.event) {
    const d = body.data || {};
    return {
      evento: String(body.event).toUpperCase(),
      email: (d.buyer && d.buyer.email) || (d.subscriber && d.subscriber.email) || (d.user && d.user.email) || null,
      transacao: (d.purchase && d.purchase.transaction) || null,
      quando: data(body.creation_date) || new Date().toISOString(),
      proximaCobranca: data(d.date_next_charge || (d.subscription && d.subscription.date_next_charge) || (d.purchase && d.purchase.date_next_charge)),
      produto: d.product && d.product.id,
      hottok: body.hottok,
    };
  }
  const status = String((body && body.status) || "").toLowerCase();
  return {
    evento: STATUS_V1[status] || status.toUpperCase(),
    email: body && body.email,
    transacao: body && body.transaction,
    quando: new Date().toISOString(),
    proximaCobranca: null,
    produto: body && body.prod,
    hottok: body && body.hottok,
  };
}

function mesmoToken(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
}

function lerCorpo(req) {
  const b = req.body;
  if (b && typeof b === "object") return b;
  if (typeof b === "string" && b) {
    try { return JSON.parse(b); } catch (_) {
      return Object.fromEntries(new URLSearchParams(b));
    }
  }
  return {};
}

async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const HOTTOK = process.env.HOTMART_HOTTOK;

  if (req.method === "GET") {
    return res.status(200).json({
      servico: "VENO.AI — aviso de compras da Hotmart",
      configurado: { supabase_url: !!SUPABASE_URL, chave_servico: !!CHAVE, hottok: !!HOTTOK },
    });
  }
  if (req.method !== "POST") return res.status(405).json({ ok: false, erro: "metodo" });
  if (!SUPABASE_URL || !CHAVE || !HOTTOK) return res.status(500).json({ ok: false, erro: "nao_configurado" });

  const body = lerCorpo(req);
  const ev = lerEvento(body);
  if (!mesmoToken(req.headers["x-hotmart-hottok"] || ev.hottok, HOTTOK)) {
    return res.status(401).json({ ok: false, erro: "token" });
  }
  const produtoEsperado = process.env.HOTMART_PRODUTO_ID;
  if (produtoEsperado && ev.produto && String(ev.produto) !== String(produtoEsperado)) {
    return res.status(200).json({ ok: true, ignorado: "outro_produto" });
  }
  if (!ev.email) return res.status(200).json({ ok: true, ignorado: "sem_email" });

  const acao = acaoDoEvento(ev.evento);
  try {
    const r = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/registrar_evento_hotmart`, {
      method: "POST",
      // chave antiga (JWT "service_role") vai também no Authorization; a nova (sb_secret_...) só no apikey
      headers: CHAVE.startsWith("sb_secret_")
        ? { apikey: CHAVE, "Content-Type": "application/json" }
        : { apikey: CHAVE, Authorization: `Bearer ${CHAVE}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_email: ev.email, p_evento: ev.evento, p_acao: acao, p_premium_ate: ev.proximaCobranca,
        p_quando: ev.quando, p_transacao: ev.transacao, p_dados: null,
      }),
    });
    const resultado = await r.json().catch(() => null);
    if (!r.ok) {
      console.error("Hotmart → Supabase falhou", r.status, resultado);
      return res.status(500).json({ ok: false, erro: "supabase" }); // a Hotmart tenta de novo
    }
    console.log("Hotmart:", ev.evento, acao, resultado);
    return res.status(200).json({ ok: true, evento: ev.evento, acao, resultado });
  } catch (e) {
    console.error("Hotmart → erro", e);
    return res.status(500).json({ ok: false, erro: "excecao" });
  }
}

module.exports = handler;
module.exports.lerEvento = lerEvento;
module.exports.acaoDoEvento = acaoDoEvento;
