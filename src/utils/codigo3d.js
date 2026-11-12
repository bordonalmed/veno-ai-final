// Código do "exame em 3D" que vai no QR Code do PDF.
// Leva SÓ os achados vasculares de um membro (sem nome, data ou qualquer dado
// do paciente), em bytes compactos -> base64url, depois do "#" do link
// (a parte depois do # não é enviada ao servidor). Nada fica guardado na nuvem.
import { veiasProfundas, profOptions, supOptions, perfurantesSegmentoOptions } from "./mmiiVenosoLaudo";
import { RESTANTE_OPCOES, estadoRestante } from "./vascularMapping";

const VERSAO = 1;
const CAMPOS = ["", "JSF", "joelho", "cm_acima_joelho", "cm_abaixo_joelho", "cm_acima_tornozelo", "tornozelo", "JSP"];
const SUPERF = ["JSF", "Safena Magna", "JSP", "Safena Parva"];
const TIPOS = ["Varizes Superficiais", "Varizes Reticulares", "Microvarizes", "Tromboflebite Superficial"];
const MAX_TRACOS = 60;

const idx = (lista, v) => Math.max(0, lista.indexOf(v));
const byte = (n) => Math.max(0, Math.min(255, Math.round(Number(n) || 0)));
const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const texto = (n, k) => (n ? String(Math.round((n / k) * 10) / 10) : "");

function paraBase64Url(bytes) {
  let s = "";
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function deBase64Url(t) {
  const b = String(t).replace(/-/g, "+").replace(/_/g, "/");
  const s = atob(b + "===".slice((b.length + 3) % 4));
  return Array.from(s, (c) => c.charCodeAt(0));
}

// Traço desenhado: tira pontos colados (<5 px) e quebra saltos grandes, para
// cada passo caber em 1 byte com sinal.
function pontosDoTraco(pts) {
  const out = [];
  (pts || []).forEach((p) => {
    const q = [Math.max(0, Math.min(255, Math.round(p[0]))), Math.max(0, Math.min(65535, Math.round(p[1])))];
    const u = out[out.length - 1];
    if (u && Math.hypot(q[0] - u[0], q[1] - u[1]) < 5) return;
    if (u) {
      const passos = Math.ceil(Math.max(Math.abs(q[0] - u[0]), Math.abs(q[1] - u[1])) / 127);
      for (let i = 1; i < passos; i++) out.push([Math.round(u[0] + ((q[0] - u[0]) * i) / passos), Math.round(u[1] + ((q[1] - u[1]) * i) / passos)]);
    }
    out.push(q);
  });
  return out.slice(0, 255);
}

// exame de UM membro: { lado, profundas, superficiais, magna, parva, perfurantes, varizes }
export function codificarExame3D(ex) {
  const b = [VERSAO, ex.lado === "Direito" ? 1 : 0];
  const prof = ex.profundas || {};
  let a = 0;
  veiasProfundas.forEach((v, i) => { a |= idx(profOptions, prof[v]) << ((i % 4) * 2); if (i % 4 === 3) { b.push(a); a = 0; } });
  const sup = ex.superficiais || {};
  b.push(SUPERF.reduce((acc, v, i) => acc | (idx(supOptions, sup[v]) << (i * 2)), 0));
  for (const [s, com] of [[ex.magna || {}, true], [ex.parva || {}, false]]) {
    b.push(idx(CAMPOS, s.inicio) | (idx(CAMPOS, s.fim) << 3) | (idx(RESTANTE_OPCOES, estadoRestante(s.restante)) << 6));
    b.push(byte(num(s.inicio_valor) * 2), byte(num(s.fim_valor) * 2));
    if (com) b.push(byte(num(s.coxa) * 10), byte(num(s.perna) * 10));
  }
  const perfs = (Array.isArray(ex.perfurantes) ? ex.perfurantes : [])
    .filter((p) => p && p.status === "pérvia e incompetente" && p.segmento).slice(0, 20);
  b.push(perfs.length);
  perfs.forEach((p) => b.push(idx(perfurantesSegmentoOptions, p.segmento), byte(num(p.valor) * 2)));
  const tracos = ((ex.varizes && ex.varizes.tracos) || [])
    .map((t) => ({ t, pts: pontosDoTraco(t.pts) }))
    .filter(({ pts }) => pts.length).slice(0, MAX_TRACOS);
  b.push(tracos.length);
  tracos.forEach(({ t, pts }) => {
    b.push(idx(TIPOS, t.tipo) | (t.vista === "posterior" ? 4 : 0), pts.length, pts[0][0], pts[0][1] >> 8, pts[0][1] & 255);
    for (let i = 1; i < pts.length; i++) b.push((pts[i][0] - pts[i - 1][0]) & 255, (pts[i][1] - pts[i - 1][1]) & 255);
  });
  return paraBase64Url(b);
}

export function decodificarExame3D(codigo) {
  const b = deBase64Url(codigo);
  let i = 0;
  const le = () => { if (i >= b.length) throw new Error("código incompleto"); return b[i++]; };
  const comSinal = (v) => (v > 127 ? v - 256 : v);
  if (le() !== VERSAO) throw new Error("versão desconhecida");
  const lado = le() === 1 ? "Direito" : "Esquerdo";
  const profundas = {};
  let a = 0;
  veiasProfundas.forEach((v, k) => { if (k % 4 === 0) a = le(); profundas[v] = profOptions[(a >> ((k % 4) * 2)) & 3] || profOptions[0]; });
  const s = le();
  const superficiais = Object.fromEntries(SUPERF.map((v, k) => [v, supOptions[(s >> (k * 2)) & 3] || supOptions[0]]));
  const safena = (com) => {
    const c = le();
    const o = { inicio: CAMPOS[c & 7] || "", fim: CAMPOS[(c >> 3) & 7] || "", restante: RESTANTE_OPCOES[(c >> 6) & 3] || "" };
    o.inicio_valor = texto(le(), 2); o.fim_valor = texto(le(), 2);
    if (o.restante === RESTANTE_OPCOES[0]) o.restante = "";
    if (com) { o.coxa = texto(le(), 10); o.perna = texto(le(), 10); o.tornozelo = ""; }
    return o;
  };
  const magna = safena(true), parva = safena(false);
  const perfurantes = [];
  for (let n = le(); n > 0; n--) perfurantes.push({ status: "pérvia e incompetente", segmento: perfurantesSegmentoOptions[le()] || perfurantesSegmentoOptions[0], valor: texto(le(), 2) });
  const tracos = [];
  for (let n = le(); n > 0; n--) {
    const c = le(), qt = le();
    const pts = [[le(), (le() << 8) | le()]];
    for (let k = 1; k < qt; k++) { const u = pts[pts.length - 1]; pts.push([u[0] + comSinal(le()), u[1] + comSinal(le())]); }
    tracos.push({ tipo: TIPOS[c & 3], vista: c & 4 ? "posterior" : "anterior", pts });
  }
  return { lado, profundas, superficiais, magna, parva, perfurantes, varizes: { tracos } };
}

// Link que vai no QR Code (endereço do site em uso + código depois do #).
export function linkExame3D(ex, origem) {
  const base = origem || (typeof window !== "undefined" ? window.location.origin : "https://venoai.xyz");
  return `${base}/3d#${codificarExame3D(ex)}`;
}

// QR Code do exame em 3D no PDF (Configurações > liga/desliga; padrão: ligado)
const CHAVE_QR3D = "qr3dPdf";
export const qr3dLigado = () => { try { return localStorage.getItem(CHAVE_QR3D) !== "nao"; } catch (_) { return true; } };
export const ligarQr3d = (sim) => { try { localStorage.setItem(CHAVE_QR3D, sim ? "sim" : "nao"); } catch (_) {} };
