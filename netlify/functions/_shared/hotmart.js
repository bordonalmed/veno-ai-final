// Aviso de compras da Hotmart (webhook) → ativa / retira o Premium na conta do
// VENO.AI. Usado pelas funções da Netlify hotmart-webhook e hotmartWebhook.
//
// Variáveis de ambiente (Netlify > Site configuration > Environment variables):
//   HOTMART_HOTTOK            token "Hottok" da Hotmart (Ferramentas > Webhook)
//   SUPABASE_SERVICE_ROLE_KEY chave secreta "service_role" do Supabase
//   REACT_APP_SUPABASE_URL    endereço do Supabase (já usado pelo site)
//   HOTMART_PRODUTO_ID        (opcional) só aceita avisos deste produto
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

function lerCorpo(corpo, base64) {
  if (corpo && typeof corpo === "object") return corpo;
  let texto = typeof corpo === "string" ? corpo : "";
  if (base64 && texto) texto = Buffer.from(texto, "base64").toString("utf8");
  if (!texto) return {};
  try { return JSON.parse(texto); } catch (_) {
    return Object.fromEntries(new URLSearchParams(texto));
  }
}

// POST JSON (fetch do Node 18+, ou https para versões antigas)
function postarJson(url, headers, corpo) {
  if (typeof fetch === "function") {
    return fetch(url, { method: "POST", headers, body: corpo }).then(async (r) => ({ ok: r.ok, status: r.status, json: await r.json().catch(() => null) }));
  }
  const https = require("https");
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "POST", headers: { ...headers, "Content-Length": Buffer.byteLength(corpo) } }, (res) => {
      let dados = "";
      res.on("data", (c) => { dados += c; });
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(dados); } catch (_) {}
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json });
      });
    });
    req.on("error", reject);
    req.end(corpo);
  });
}

function configuracao(env = process.env) {
  return {
    url: env.REACT_APP_SUPABASE_URL || env.SUPABASE_URL,
    chave: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY,
    hottok: env.HOTMART_HOTTOK || env.HOTMART_WEBHOOK_SECRET,
    produto: env.HOTMART_PRODUTO_ID,
  };
}

// { method, headers, body, base64 } → { status, json }
async function processarAviso({ method, headers = {}, body, base64 = false }, env = process.env) {
  const cfg = configuracao(env);
  if (method === "GET") {
    return { status: 200, json: {
      servico: "VENO.AI — aviso de compras da Hotmart",
      configurado: { supabase_url: !!cfg.url, chave_servico: !!cfg.chave, hottok: !!cfg.hottok },
    } };
  }
  if (method !== "POST") return { status: 405, json: { ok: false, erro: "metodo" } };
  if (!cfg.url || !cfg.chave || !cfg.hottok) return { status: 500, json: { ok: false, erro: "nao_configurado" } };

  const ev = lerEvento(lerCorpo(body, base64));
  const tokenRecebido = headers["x-hotmart-hottok"] || headers["X-Hotmart-Hottok"] || headers["X-HOTMART-HOTTOK"] || ev.hottok;
  if (!mesmoToken(tokenRecebido, cfg.hottok)) return { status: 401, json: { ok: false, erro: "token" } };
  if (cfg.produto && ev.produto && String(ev.produto) !== String(cfg.produto)) {
    return { status: 200, json: { ok: true, ignorado: "outro_produto" } };
  }
  if (!ev.email) return { status: 200, json: { ok: true, ignorado: "sem_email" } };

  const acao = acaoDoEvento(ev.evento);
  try {
    const r = await postarJson(
      `${cfg.url.replace(/\/$/, "")}/rest/v1/rpc/registrar_evento_hotmart`,
      // chave antiga (JWT "service_role") vai também no Authorization; a nova (sb_secret_...) só no apikey
      cfg.chave.startsWith("sb_secret_")
        ? { apikey: cfg.chave, "Content-Type": "application/json" }
        : { apikey: cfg.chave, Authorization: `Bearer ${cfg.chave}`, "Content-Type": "application/json" },
      JSON.stringify({
        p_email: ev.email, p_evento: ev.evento, p_acao: acao, p_premium_ate: ev.proximaCobranca,
        p_quando: ev.quando, p_transacao: ev.transacao, p_dados: null,
      })
    );
    const resultado = r.json;
    if (!r.ok) {
      console.error("Hotmart → Supabase falhou", r.status, resultado);
      return { status: 500, json: { ok: false, erro: "supabase" } }; // a Hotmart tenta de novo
    }
    console.log("Hotmart:", ev.evento, acao, resultado);
    return { status: 200, json: { ok: true, evento: ev.evento, acao, resultado } };
  } catch (e) {
    console.error("Hotmart → erro", e);
    return { status: 500, json: { ok: false, erro: "excecao" } };
  }
}

// formato das funções da Netlify
async function handlerNetlify(event) {
  const r = await processarAviso({
    method: event.httpMethod, headers: event.headers || {}, body: event.body, base64: event.isBase64Encoded,
  });
  return { statusCode: r.status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(r.json) };
}

module.exports = { processarAviso, handlerNetlify, lerEvento, acaoDoEvento };
