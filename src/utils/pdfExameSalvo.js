// PDF de um exame salvo (botão "PDF" em Exames Realizados). Mesmo layout dos
// exames: logo e dados da clínica no topo (do local onde o exame foi feito),
// assinatura e dados do médico no rodapé, e as linhas longas quebradas dentro
// da margem (antes passavam da borda da página).
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { saveAs } from "file-saver";
import { carimbarMarcaVenoAIPdfLib } from "./pdfMarca";
import { carregarDadosPerfil, perfilAtivo, perfilCombinado } from "./perfilLaudo";
import { tamanhoProporcional } from "./pdfCabecalho";

const MM = 72 / 25.4; // pontos por mm
const LARGURA = 595;
const ALTURA = 842;
const ESQ = 15 * MM;
const DIR = 200 * MM;
const RODAPE_TOPO = 40 * MM; // o texto do laudo não desce abaixo disto

export function formatarDataDiaMesAno(val) {
  if (val == null || String(val).trim() === "") return "";
  const s = String(val).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const dma = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (dma) return `${dma[1].padStart(2, "0")}/${dma[2].padStart(2, "0")}/${dma[3]}`;
  return s;
}

// A fonte padrão do PDF (Helvetica/WinAnsi) não tem todos os caracteres;
// um caractere fora dela fazia o PDF inteiro falhar.
const EXTRAS_WINANSI = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
const TROCAS = { "≥": ">=", "≤": "<=", "→": "->", "←": "<-", "✓": "", "✔": "", "×": "x", "−": "-", "\t": " " };
export function sanitizarWinAnsi(texto) {
  return Array.from(String(texto || "")).map((c) => {
    if (TROCAS[c] !== undefined) return TROCAS[c];
    const cod = c.codePointAt(0);
    if ((cod >= 32 && cod <= 126) || (cod >= 160 && cod <= 255) || EXTRAS_WINANSI.includes(c)) return c;
    return "";
  }).join("");
}

// Quebra a linha em pedaços que cabem na largura (por palavras).
export function quebrarLinha(texto, largura, medir) {
  const palavras = String(texto).split(/\s+/).filter(Boolean);
  const linhas = [];
  let atual = "";
  palavras.forEach((p) => {
    const tentativa = atual ? `${atual} ${p}` : p;
    if (medir(tentativa) <= largura || !atual) atual = tentativa;
    else { linhas.push(atual); atual = p; }
  });
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [""];
}

// Perfil para o PDF: o local onde o exame foi feito (se ainda existir no
// perfil), senão o local em uso agora.
export function perfilParaExame(exame, email) {
  const dados = carregarDadosPerfil(email);
  if (!dados) return {};
  const nomeLocal = String(exame?.localExame || "").trim().toLowerCase();
  if (nomeLocal) {
    for (let im = 0; im < dados.medicos.length; im++) {
      const il = dados.medicos[im].locais.findIndex((l) => String(l.nomeClinica || "").trim().toLowerCase() === nomeLocal);
      if (il >= 0) return perfilCombinado(dados, im, il);
    }
  }
  return perfilAtivo(dados);
}

async function embutirImagem(doc, dataUrl) {
  if (!dataUrl) return null;
  try {
    const bytes = Uint8Array.from(atob(dataUrl.split(",")[1] || ""), (c) => c.charCodeAt(0));
    return /^data:image\/jpe?g/i.test(dataUrl) ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
  } catch (_) {
    return null;
  }
}

function linhasDoLaudo(laudo) {
  const todas = String(laudo || "Laudo não disponível").split(/\r?\n/);
  const blocos = [];
  let atual = [];
  todas.forEach((linha) => {
    if (/^=+$/.test(linha.trim())) { if (atual.length) { blocos.push(atual); atual = []; } }
    else atual.push(linha);
  });
  if (atual.length) blocos.push(atual);
  return blocos;
}

const ehCabecalhoRepetido = (t) => /^(PACIENTE|DATA|TIPO|IDADE)\s*:/i.test(t);

export async function montarPDFExame(exame, perfil) {
  const doc = await PDFDocument.create();
  const fonte = await doc.embedFont(StandardFonts.Helvetica);
  const negrito = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await embutirImagem(doc, perfil.logoClinica);
  const assinatura = await embutirImagem(doc, perfil.assinaturaMedico);
  const preto = rgb(0, 0, 0);
  const txt = (pagina, t, x, y, f, tam, alinharDireita = false) => {
    const s = sanitizarWinAnsi(t);
    pagina.drawText(s, { x: alinharDireita ? x - f.widthOfTextAtSize(s, tam) : x, y, font: f, size: tam, color: preto });
  };

  function cabecalho(pagina) {
    let alturaLogo = 0;
    let larguraLogo = 0;
    if (logo) {
      const { w, h } = tamanhoProporcional(logo.width, logo.height, 50 * MM, 20 * MM);
      pagina.drawImage(logo, { x: ESQ, y: ALTURA - 14 * MM - h, width: w, height: h });
      alturaLogo = h;
      larguraLogo = w;
    }
    const linhas = [perfil.nomeClinica, perfil.enderecoClinica, perfil.telefoneClinica && `Tel: ${perfil.telefoneClinica}`, perfil.emailClinica].filter(Boolean);
    const largura = DIR - (logo ? ESQ + larguraLogo + 8 * MM : 70 * MM);
    let y = ALTURA - 14 * MM - 9;
    linhas.forEach((l) => quebrarLinha(sanitizarWinAnsi(l), largura, (s) => negrito.widthOfTextAtSize(s, 9)).forEach((parte) => {
      txt(pagina, parte, DIR, y, negrito, 9, true);
      y -= 4.6 * MM;
    }));
    const fundoTexto = linhas.length ? (ALTURA - 14 * MM) - (y + 4.6 * MM) + 4 : 0;
    const altura = Math.max(alturaLogo, fundoTexto);
    return altura ? ALTURA - 14 * MM - altura - 8 * MM : ALTURA - 20 * MM;
  }

  function rodape(pagina) {
    const yLinha = ALTURA - 280 * MM;
    if (assinatura) {
      const { w, h } = tamanhoProporcional(assinatura.width, assinatura.height, 50 * MM, 15 * MM);
      pagina.drawImage(assinatura, { x: DIR - w, y: yLinha + 3 * MM, width: w, height: h });
    }
    txt(pagina, "Assinatura: ________________", DIR, yLinha, fonte, 8, true);
    let y = yLinha - 5 * MM;
    if (perfil.nomeMedico) { txt(pagina, perfil.nomeMedico, DIR, y, negrito, 8, true); y -= 4 * MM; }
    if (perfil.crm) { txt(pagina, `CRM: ${perfil.crm}`, DIR, y, fonte, 8, true); y -= 4 * MM; }
    if (perfil.especialidade) txt(pagina, perfil.especialidade, DIR, y, fonte, 8, true);
  }

  const alturaLinha = 14;
  const largura = DIR - ESQ;
  const blocos = linhasDoLaudo(exame.laudo);
  blocos.forEach((bloco) => {
    let pagina = doc.addPage([LARGURA, ALTURA]);
    let y = cabecalho(pagina);
    const novaPagina = () => { rodape(pagina); pagina = doc.addPage([LARGURA, ALTURA]); y = cabecalho(pagina); };
    txt(pagina, `PACIENTE: ${exame.nome || "-"}${exame.idade ? `, ${exame.idade} anos` : ""}`, ESQ, y, negrito, 11); y -= alturaLinha;
    txt(pagina, `DATA: ${formatarDataDiaMesAno(exame.data) || "-"}`, ESQ, y, fonte, 11); y -= alturaLinha * 1.3;
    let conclusao = false;
    bloco.forEach((linha) => {
      const t = linha.trim();
      if (!t) { y -= alturaLinha * 0.5; return; }
      if (ehCabecalhoRepetido(t)) return;
      if (/^\**\s*CONCLUS[ÃA]O/i.test(t)) conclusao = true;
      if (/^(OBSERVA|Comentário)/i.test(t)) conclusao = false;
      const titulo = /^(\*\*|DOPPLER|Sistema|CONCLUS|Veias Perfurantes|MAPEAMENTO|AVALIAÇÃO|ENDOPRÓTESE|OBSERVA)/i.test(t);
      const f = titulo || conclusao ? negrito : fonte;
      const limpo = t.replace(/\*\*/g, "");
      quebrarLinha(sanitizarWinAnsi(limpo), largura, (s) => f.widthOfTextAtSize(s, 11)).forEach((parte) => {
        if (y < RODAPE_TOPO) novaPagina();
        txt(pagina, parte, ESQ, y, f, 11);
        y -= alturaLinha;
      });
    });
    rodape(pagina);
  });
  carimbarMarcaVenoAIPdfLib(doc, fonte, rgb);
  return doc.save();
}

export async function gerarPDFExame(exame) {
  try {
    const perfil = perfilParaExame(exame, localStorage.getItem("userEmail") || "");
    const bytes = await montarPDFExame(exame, perfil);
    const data = formatarDataDiaMesAno(exame.data);
    const nomeArquivo = `Laudo_${(exame.nome || "paciente").replace(/\s+/g, "_")}_${data ? data.replace(/\//g, "-") : "sem_data"}.pdf`;
    saveAs(new Blob([bytes], { type: "application/pdf" }), nomeArquivo);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Erro ao gerar PDF. Tente novamente.");
  }
}
