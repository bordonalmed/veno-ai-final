// Código do "exame em 3D" que vai no QR Code do PDF.
// Leva SÓ os achados vasculares de um membro (sem nome, data ou qualquer dado
// do paciente), em bytes compactos -> base64url, depois do "#" do link
// (a parte depois do # não é enviada ao servidor). Nada fica guardado na nuvem.
import { veiasProfundas, profOptions, supOptions, perfurantesSegmentoOptions } from "./mmiiVenosoLaudo";
import { RESTANTE_OPCOES, estadoRestante } from "./vascularMapping";
import {
  ARTERIAS, localizacaoOclusaoOptions, velocidadeOptions, localizacaoPlacaOptions,
  tipoOndaOptions, caracteristicaPlacaOptions, ateromatoseOptions, stentOptions, aneurismaFormaOptions,
  enxertoTipoOptions, enxertoOrigemOptions, enxertoDestinoOptions, enxertoStatusOptions, enxertoLocalOptions,
} from "./mmiiArterialLaudo";
import { ARTERIAS as ARTERIAS_MMSS } from "./mmssArterialLaudo";
import { VEIAS as VEIAS_MMSS, statusSuperficialOptions as STATUS_MMSS, faseTromboOptions, cateterTipoOptions } from "./mmssVenosoLaudo";

const VERSAO = 1; // venoso
const VERSAO_ARTERIAL = 3;
const VERSAO_MMSS = 4; // venoso de membro superior
const VERSAO_MMSS_ARTERIAL = 5; // arterial de membro superior (mesmos 6 bytes por artéria)
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

// Doppler arterial de UM membro: { lado, arterias: { "Artéria ...": {...} }, enxerto }
// 6 bytes por artéria (na ordem de ARTERIAS); bit 7 do 1º byte = artéria presente. Depois, 2 bytes do enxerto.
const mais1 = (lista, v) => { const k = lista.indexOf(v); return k < 0 ? 0 : k + 1; };
const deMais1 = (lista, n) => (n ? lista[n - 1] || "" : "");
export function codificarExameArterial3D(ex) {
  const mmss = ex.modo === "mmssArterial";
  const b = [mmss ? VERSAO_MMSS_ARTERIAL : VERSAO_ARTERIAL, ex.lado === "Direito" ? 1 : 0];
  const art = ex.arterias || {};
  (mmss ? ARTERIAS_MMSS : ARTERIAS).forEach((nome) => {
    const v = art[nome];
    if (!v) { b.push(0, 0, 0, 0, 0, 0); return; }
    b.push(128 | (v.status === "Ocluída" ? 1 : 0) | (mais1(localizacaoOclusaoOptions, v.localizacaoOclusao) << 1) | (idx(velocidadeOptions, v.velocidade) << 4) | (v.placa === "Presente" ? 64 : 0));
    b.push(byte(num(v.estenosePercentual)));
    b.push(mais1(localizacaoPlacaOptions, v.localizacaoPlaca) | (idx(tipoOndaOptions, v.tipoOnda) << 2) | (mais1(caracteristicaPlacaOptions, v.caracteristicaPlaca) << 4) | (idx(ateromatoseOptions, v.ateromatose) << 6));
    b.push(idx(stentOptions, v.stent || "Ausente") | (v.aneurisma ? 4 : 0) | (mais1(aneurismaFormaOptions, v.aneurismaForma) << 3) | (v.tromboMural ? 32 : 0) | (v.disseccao ? 64 : 0) | (v.reabitada ? 128 : 0));
    b.push(byte(num(v.aneurismaDiametro) * 2));
    b.push(v.sentido === "Retrógrado" ? 1 : 0);
  });
  const e = ex.enxerto || {};
  b.push(mais1(enxertoTipoOptions, e.tipo) | (mais1(enxertoOrigemOptions, e.origem) << 3) | (mais1(enxertoDestinoOptions, e.destino) << 5));
  b.push(mais1(enxertoStatusOptions, e.status) | (mais1(enxertoLocalOptions, e.local) << 2));
  return paraBase64Url(b);
}

function decodificarArterial(le, mmss = false) {
  const lado = le() === 1 ? "Direito" : "Esquerdo";
  const arterias = {};
  (mmss ? ARTERIAS_MMSS : ARTERIAS).forEach((nome) => {
    const a = le(), pct = le(), c = le(), d = le(), diam = le(), e = le();
    if (!(a & 128)) return;
    const n = (a >> 1) & 7, lp = c & 3, cp = (c >> 4) & 3;
    arterias[nome] = {
      status: a & 1 ? "Ocluída" : "Pérvia",
      localizacaoOclusao: n ? localizacaoOclusaoOptions[n - 1] || "" : "",
      velocidade: velocidadeOptions[(a >> 4) & 3] || velocidadeOptions[0],
      placa: a & 64 ? "Presente" : "Ausente",
      estenosePercentual: pct ? String(pct) : "",
      localizacaoPlaca: lp ? localizacaoPlacaOptions[lp - 1] || "" : "",
      tipoOnda: tipoOndaOptions[(c >> 2) & 3] || tipoOndaOptions[0],
      caracteristicaPlaca: cp ? caracteristicaPlacaOptions[cp - 1] || "" : "",
      ateromatose: ateromatoseOptions[(c >> 6) & 3] || ateromatoseOptions[0],
      stent: stentOptions[d & 3] || "Ausente",
      aneurisma: !!(d & 4),
      aneurismaForma: deMais1(aneurismaFormaOptions, (d >> 3) & 3),
      tromboMural: !!(d & 32),
      disseccao: !!(d & 64),
      reabitada: !!(d & 128),
      aneurismaDiametro: texto(diam, 2),
      sentido: e & 1 ? "Retrógrado" : "Anterógrado",
    };
  });
  const e1 = le(), e2 = le();
  const enxerto = { tipo: deMais1(enxertoTipoOptions, e1 & 7), origem: deMais1(enxertoOrigemOptions, (e1 >> 3) & 3), destino: deMais1(enxertoDestinoOptions, (e1 >> 5) & 3), status: deMais1(enxertoStatusOptions, e2 & 3), local: deMais1(enxertoLocalOptions, (e2 >> 2) & 3) };
  return mmss ? { modo: "mmssArterial", lado, arterias } : { modo: "arterial", lado, arterias, enxerto };
}

// Doppler venoso de MMSS (um membro): { lado, veias: { "Veia ...": { status, fluxo, fase } }, extra: { cateter } }
// 1 byte por veia (na ordem de VEIAS): bits 0-2 = status + 1 (0 = sem a veia), bit 3 = fluxo contínuo, bits 4-5 = fase.
// Depois, 2 bytes do cateter: tipo + 1 e veia + 1.
export function codificarExameMMSS3D(ex) {
  const b = [VERSAO_MMSS, ex.lado === "Direito" ? 1 : 0];
  const vs = ex.veias || {};
  VEIAS_MMSS.forEach((nome) => {
    const v = vs[nome];
    if (!v) { b.push(0); return; }
    b.push((idx(STATUS_MMSS, v.status) + 1) | (v.fluxo === "Contínuo (não fásico)" ? 8 : 0) | (mais1(faseTromboOptions, v.fase) << 4));
  });
  const c = (ex.extra && ex.extra.cateter) || {};
  b.push(c.presente ? mais1(cateterTipoOptions, c.tipo) | 8 : 0, c.presente ? mais1(VEIAS_MMSS, c.veia) : 0);
  return paraBase64Url(b);
}

function decodificarMMSS(le) {
  const lado = le() === 1 ? "Direito" : "Esquerdo";
  const veias = {};
  VEIAS_MMSS.forEach((nome) => {
    const a = le();
    if (!(a & 7)) return;
    veias[nome] = { status: STATUS_MMSS[(a & 7) - 1] || STATUS_MMSS[0], fluxo: a & 8 ? "Contínuo (não fásico)" : "Fásico", fase: deMais1(faseTromboOptions, (a >> 4) & 3), observacao: "" };
  });
  const c1 = le(), c2 = le();
  const cateter = c1 & 8 ? { presente: true, tipo: deMais1(cateterTipoOptions, c1 & 7), veia: deMais1(VEIAS_MMSS, c2) } : { presente: false, tipo: "", veia: "" };
  return { modo: "mmssVenoso", lado, veias, extra: { cateter } };
}

export function decodificarExame3D(codigo) {
  const b = deBase64Url(codigo);
  let i = 0;
  const le = () => { if (i >= b.length) throw new Error("código incompleto"); return b[i++]; };
  const comSinal = (v) => (v > 127 ? v - 256 : v);
  const versao = le();
  if (versao === VERSAO_ARTERIAL) return decodificarArterial(le);
  if (versao === VERSAO_MMSS) return decodificarMMSS(le);
  if (versao === VERSAO_MMSS_ARTERIAL) return decodificarArterial(le, true);
  if (versao !== VERSAO) throw new Error("versão desconhecida");
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
  const cod = ex && (ex.modo === "arterial" || ex.modo === "mmssArterial") ? codificarExameArterial3D(ex) : ex && ex.modo === "mmssVenoso" ? codificarExameMMSS3D(ex) : codificarExame3D(ex);
  return `${base}/3d#${cod}`;
}

// QR Code do exame em 3D no PDF (Configurações > liga/desliga; padrão: ligado)
const CHAVE_QR3D = "qr3dPdf";
export const qr3dLigado = () => { try { return localStorage.getItem(CHAVE_QR3D) !== "nao"; } catch (_) { return true; } };
export const ligarQr3d = (sim) => { try { localStorage.setItem(CHAVE_QR3D, sim ? "sim" : "nao"); } catch (_) {} };
