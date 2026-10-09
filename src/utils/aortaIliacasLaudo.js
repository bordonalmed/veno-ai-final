// Laudo do Doppler de Aorta Abdominal e Artérias Ilíacas. Usa a mesma
// descrição/conclusão das artérias dos membros (laudoArterial.js), com o
// calibre, a forma do aneurisma e o trombo mural, mais endoprótese/enxerto.
// Exame único (sem "lado"): as ilíacas já levam o lado no nome.
import { criarLaudoArterial, descreverArteria, gerarCabecalhoLaudo, preenchido } from "./laudoArterial";

export * from "./laudoArterial";

export const SEGMENTOS_AORTA = ["Aorta Suprarrenal", "Aorta Justarrenal", "Aorta Infrarrenal"];
export const ILIACAS = [
  "Artéria Ilíaca Comum Direita",
  "Artéria Ilíaca Externa Direita",
  "Artéria Ilíaca Interna Direita",
  "Artéria Ilíaca Comum Esquerda",
  "Artéria Ilíaca Externa Esquerda",
  "Artéria Ilíaca Interna Esquerda",
];

export const enxertoAortaTipoOptions = [
  "Endoprótese aórtica (EVAR)",
  "Endoprótese aorto-uni-ilíaca",
  "Endoprótese ilíaca",
  "Enxerto aorto-bi-ilíaco",
  "Enxerto aorto-bifemoral",
];
export const enxertoAortaStatusOptions = ["Pérvio", "Com estenose", "Ocluído"];
export const endoleakOptions = ["Ausente", "Tipo I", "Tipo II", "Tipo III", "Tipo IV", "Indeterminado"];

export function extraPadrao() {
  return { enxerto: { tipo: "", status: "", endoleak: "", sacoDiametro: "" } };
}

export function normalizarExtra(salvo) {
  const p = extraPadrao();
  return { enxerto: { ...p.enxerto, ...salvo?.enxerto } };
}

const ehEndoprotese = (tipo) => /^Endoprótese/.test(tipo || "");

function mm(valor) {
  return `${String(valor).trim().replace(".", ",")} mm`;
}

// "Pérvio" -> "pérvia" quando é endoprótese (feminino).
function situacao(enx) {
  if (!preenchido(enx.status)) return "";
  const s = enx.status.toLowerCase();
  if (!ehEndoprotese(enx.tipo)) return s;
  return s === "pérvio" ? "pérvia" : s === "ocluído" ? "ocluída" : s;
}

function textoEnxerto(enx) {
  const partes = [enx.tipo];
  const sit = situacao(enx);
  if (sit) partes[0] += ` ${sit}`;
  if (ehEndoprotese(enx.tipo) && preenchido(enx.endoleak)) {
    partes.push(enx.endoleak === "Ausente" ? "sem sinais de vazamento (endoleak)" : `com vazamento (endoleak) ${enx.endoleak.replace("Tipo", "tipo").replace("Indeterminado", "indeterminado")}`);
  }
  return partes.join(", ");
}

function descreverExtra(extra) {
  const enx = extra?.enxerto;
  if (!enx || !preenchido(enx.tipo)) return [];
  const linhas = ["", "ENDOPRÓTESE / ENXERTO", `${textoEnxerto(enx)}.`];
  if (ehEndoprotese(enx.tipo) && preenchido(enx.sacoDiametro)) {
    linhas.push(`Saco aneurismático com diâmetro de ${mm(enx.sacoDiametro)}.`);
  }
  return linhas;
}

function concluirExtra(extra) {
  const enx = extra?.enxerto;
  if (!enx || !preenchido(enx.tipo)) return { linhas: [], alterado: false };
  let t = textoEnxerto(enx);
  if (ehEndoprotese(enx.tipo) && preenchido(enx.sacoDiametro)) t += ` (saco aneurismático de ${mm(enx.sacoDiametro)})`;
  return { linhas: [t], alterado: true };
}

const laudo = criarLaudoArterial({
  arterias: [...SEGMENTOS_AORTA, ...ILIACAS],
  membro: "",
  extra: { descrever: descreverExtra, concluir: concluirExtra },
});

export const { ARTERIAS, arteriasPadrao, normalizarArterias, getConclusaoMembro } = laudo;

export const TITULO_EXAME = "DOPPLER DE AORTA ABDOMINAL E ARTÉRIAS ILÍACAS";

function linhas(nomes, arterias) {
  return nomes.map((n) => {
    const v = arterias[n] || arteriasPadrao()[n];
    let t = descreverArteria(n, v) + "\n";
    if (preenchido(v.observacao)) t += `  ${v.observacao.trim()}\n`;
    return t;
  }).join("");
}

export function gerarBlocoExame(arterias, extra, observacoes) {
  let t = `${TITULO_EXAME}\n\n`;
  t += "Aorta abdominal:\n" + linhas(SEGMENTOS_AORTA, arterias);
  t += "\nArtérias ilíacas:\n" + linhas(ILIACAS, arterias);
  descreverExtra(extra).forEach((l) => { t += l + "\n"; });
  t += "\nCONCLUSÃO\n";
  t += getConclusaoMembro(arterias, extra).join("\n") + "\n";
  if (preenchido(observacoes)) t += `\nOBSERVAÇÕES\n${observacoes.trim()}\n`;
  return t;
}

export function gerarLaudoCompleto({ nome, idade, data, arterias, extra, observacoes }) {
  return gerarCabecalhoLaudo({ nome, idade, data }) + "\n" + gerarBlocoExame(arterias, extra, observacoes);
}
