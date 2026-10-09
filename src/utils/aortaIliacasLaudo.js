// Laudo do Doppler de Aorta Abdominal e Artérias Ilíacas. Usa a mesma
// descrição/conclusão das artérias dos membros (laudoArterial.js), com o
// calibre, a forma do aneurisma e o trombo mural, mais endoprótese/enxerto.
// Exame único (sem "lado"): as ilíacas já levam o lado no nome.
import { criarLaudoArterial, descreverArteria, gerarCabecalhoLaudo, preenchido, noLocal } from "./laudoArterial";

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
  "Endoprótese aorto-uni-ilíaca direita",
  "Endoprótese aorto-uni-ilíaca esquerda",
  "Endoprótese ilíaca",
  "Enxerto aorto-bi-ilíaco",
  "Enxerto aorto-bifemoral",
];
export const enxertoAortaStatusOptions = ["Pérvio", "Com estenose", "Ocluído"];
// Onde está a estenose/oclusão do enxerto, conforme o tipo.
const LOCAIS_ENXERTO_BIFURCADO = ["Anastomose proximal", "Corpo do enxerto", "Ramo direito", "Ramo esquerdo", "Anastomose distal direita", "Anastomose distal esquerda"];
export function enxertoAortaLocalOptions(tipo) {
  if (tipo === "Endoprótese aórtica (EVAR)") return ["Corpo principal", "Ramo ilíaco direito", "Ramo ilíaco esquerdo"];
  if (tipo === "Endoprótese aorto-uni-ilíaca direita") return ["Corpo principal", "Ramo ilíaco direito"];
  if (tipo === "Endoprótese aorto-uni-ilíaca esquerda") return ["Corpo principal", "Ramo ilíaco esquerdo"];
  if (tipo === "Endoprótese ilíaca") return ["Ilíaca direita", "Ilíaca esquerda"];
  if (/^Enxerto/.test(tipo || "")) return LOCAIS_ENXERTO_BIFURCADO;
  return [];
}
export const endoleakOptions = ["Ausente", "Tipo I", "Tipo II", "Tipo III", "Tipo IV", "Indeterminado"];

// Enxerto fêmoro-femoral cruzado: à parte, porque costuma acompanhar a
// endoprótese aorto-uni-ilíaca (ou existir sozinho).
export const femoralDoadoraOptions = ["Direita", "Esquerda"];
export const femoroFemoralLocalOptions = ["Anastomose femoral direita", "Corpo do enxerto", "Anastomose femoral esquerda"];

export function extraPadrao() {
  return {
    enxerto: { tipo: "", status: "", local: "", endoleak: "", sacoDiametro: "" },
    femoroFemoral: { presente: false, doadora: "", status: "", local: "" },
  };
}

export function normalizarExtra(salvo) {
  const p = extraPadrao();
  const enxerto = { ...p.enxerto, ...salvo?.enxerto };
  // versão anterior: aorto-uni-ilíaca sem lado era sempre a direita
  if (enxerto.tipo === "Endoprótese aorto-uni-ilíaca") enxerto.tipo = "Endoprótese aorto-uni-ilíaca direita";
  return { enxerto, femoroFemoral: { ...p.femoroFemoral, ...salvo?.femoroFemoral } };
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
  if (sit && enx.status !== "Pérvio" && enxertoAortaLocalOptions(enx.tipo).includes(enx.local)) partes[0] += ` ${noLocal(enx.local)}`;
  if (ehEndoprotese(enx.tipo) && preenchido(enx.endoleak)) {
    partes.push(enx.endoleak === "Ausente" ? "sem sinais de vazamento (endoleak)" : `com vazamento (endoleak) ${enx.endoleak.replace("Tipo", "tipo").replace("Indeterminado", "indeterminado")}`);
  }
  return partes.join(", ");
}

function textoFemoroFemoral(ff) {
  let t = "Enxerto fêmoro-femoral cruzado";
  if (ff.doadora === "Direita") t += " (da femoral direita para a esquerda)";
  if (ff.doadora === "Esquerda") t += " (da femoral esquerda para a direita)";
  if (preenchido(ff.status)) {
    t += ` ${ff.status.toLowerCase()}`;
    if (ff.status !== "Pérvio" && femoroFemoralLocalOptions.includes(ff.local)) t += ` ${noLocal(ff.local)}`;
  }
  return t;
}

function descreverExtra(extra) {
  const enx = extra?.enxerto;
  const ff = extra?.femoroFemoral;
  const temEnx = enx && preenchido(enx.tipo);
  const temFF = ff && ff.presente;
  if (!temEnx && !temFF) return [];
  const linhas = ["", "ENDOPRÓTESE / ENXERTO"];
  if (temEnx) {
    linhas.push(`${textoEnxerto(enx)}.`);
    if (ehEndoprotese(enx.tipo) && preenchido(enx.sacoDiametro)) {
      linhas.push(`Saco aneurismático com diâmetro de ${mm(enx.sacoDiametro)}.`);
    }
  }
  if (temFF) linhas.push(`${textoFemoroFemoral(ff)}.`);
  return linhas;
}

function concluirExtra(extra) {
  const enx = extra?.enxerto;
  const ff = extra?.femoroFemoral;
  const linhas = [];
  if (enx && preenchido(enx.tipo)) {
    let t = textoEnxerto(enx);
    if (ehEndoprotese(enx.tipo) && preenchido(enx.sacoDiametro)) t += ` (saco aneurismático de ${mm(enx.sacoDiametro)})`;
    linhas.push(t);
  }
  if (ff && ff.presente) linhas.push(textoFemoroFemoral(ff));
  return { linhas, alterado: linhas.length > 0 };
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
