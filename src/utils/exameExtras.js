// O que vai junto com o exame salvo, além do laudo: os anexos (fotos) e as
// páginas do mapeamento. Assim o PDF gerado em Exames Realizados sai igual ao
// da tela do exame, e ao reabrir o exame para editar os anexos voltam.

const LADO_MAX = 1600; // px do maior lado da foto guardada
const QUALIDADE = 0.82;
const PEQUENO = 450 * 1024; // abaixo disto a foto é guardada como veio

function carregarImagem(src) {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") { resolve(null); return; }
    const img = new Image();
    const desiste = setTimeout(() => resolve(null), 8000);
    img.onload = () => { clearTimeout(desiste); resolve(img); };
    img.onerror = () => { clearTimeout(desiste); resolve(null); };
    img.src = src;
  });
}

// Reduz a foto (JPEG, até 1600 px) para caber no exame salvo sem pesar.
async function compactarFoto(dataUrl) {
  if (!dataUrl || !/^data:image\//i.test(dataUrl)) return dataUrl;
  if (dataUrl.length * 0.75 < PEQUENO) return dataUrl;
  const img = await carregarImagem(dataUrl);
  if (!img || !img.width || !img.height) return dataUrl;
  try {
    const k = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    const g = c.getContext("2d");
    if (!g) return dataUrl;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    const jpg = c.toDataURL("image/jpeg", QUALIDADE);
    return jpg && jpg.length < dataUrl.length ? jpg : dataUrl;
  } catch (_) {
    return dataUrl;
  }
}

// Anexos no formato que dá para guardar (sem o File do navegador).
export async function compactarAnexos(anexos) {
  const lista = Array.isArray(anexos) ? anexos : [];
  const out = [];
  for (const a of lista) {
    if (!a || !a.thumbnail) continue;
    out.push({ id: a.id, name: a.name || "anexo", size: a.size || 0, thumbnail: await compactarFoto(a.thumbnail) });
  }
  return out;
}

// Gera só as páginas do mapeamento (a mesma função que monta o mapa no PDF
// da tela) e devolve o PDF em base64, ou null se não houver mapa.
export async function gerarMapaPdfBase64(adicionarMapa) {
  if (typeof adicionarMapa !== "function") return null;
  try {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    await adicionarMapa(doc);
    if (doc.getNumberOfPages() <= 1) return null;
    doc.deletePage(1); // a página em branco com que o jsPDF começa
    const uri = doc.output("datauristring");
    return uri.slice(uri.indexOf(",") + 1) || null;
  } catch (e) {
    console.error("Erro ao gerar o mapeamento para salvar:", e);
    return null;
  }
}

// Campos extras do exame salvo: anexos e mapeamento.
export async function extrasParaSalvar(anexos, adicionarMapa) {
  const [anexosSalvos, mapaPdf] = await Promise.all([compactarAnexos(anexos), gerarMapaPdfBase64(adicionarMapa)]);
  return { anexos: anexosSalvos, mapaPdf };
}

// Ao abrir um exame salvo para editar: o exame vai pelo localStorage, mas as
// fotos podem não caber lá; elas passam por aqui, na memória da página.
let anexosEmEdicao = null;
export function prepararExameParaEdicao(exame) {
  const { anexos, mapaPdf, ...resto } = exame || {};
  anexosEmEdicao = Array.isArray(anexos) && anexos.length ? anexos : null;
  return resto;
}
export function anexosDoExameEmEdicao(exame) {
  const doExame = exame && Array.isArray(exame.anexos) && exame.anexos.length ? exame.anexos : null;
  const daMemoria = anexosEmEdicao;
  anexosEmEdicao = null;
  return doExame || daMemoria || [];
}
