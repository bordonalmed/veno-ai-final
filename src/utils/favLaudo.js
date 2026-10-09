// Laudo do Doppler para Fístula Arteriovenosa (FAV) de membro superior, em
// dois modos:
// - Confecção: mapeamento pré-operatório de artérias e veias (calibre,
//   profundidade, perviedade), com os territórios que atendem ao critério de
//   calibre (artéria e veia >= 2,0 mm — diretriz ESVS 2018 de acesso vascular).
// - Avaliação: FAV já confeccionada (fluxo, anastomose, veia de drenagem,
//   estenose, aneurisma, trombo, roubo), com a "regra dos 6" de maturação.

import { noLocal } from "./laudoArterial";

export const MODOS_FAV = ["Confecção", "Avaliação"];
export const CRITERIO_CALIBRE_MM = 2.0;

export const SITIOS_ARTERIAIS = [
  ["braquial", "Artéria braquial (fossa cubital)"],
  ["radial", "Artéria radial (punho)"],
  ["ulnar", "Artéria ulnar (punho)"],
];
export const SITIOS_VENOSOS = [
  ["cefalicaPunho", "Veia cefálica (punho)"],
  ["cefalicaAntebraco", "Veia cefálica (antebraço)"],
  ["cefalicaCotovelo", "Veia cefálica (cotovelo)"],
  ["cefalicaBraco", "Veia cefálica (braço)"],
  ["basilicaAntebraco", "Veia basílica (antebraço)"],
  ["basilicaCotovelo", "Veia basílica (cotovelo)"],
  ["basilicaBraco", "Veia basílica (braço)"],
  ["intermedia", "Veia intermédia do cotovelo"],
  ["braquialVeia", "Veia braquial (braço)"],
  ["axilar", "Veia axilar"],
];
export const NOME_SITIO = Object.fromEntries([...SITIOS_ARTERIAIS, ...SITIOS_VENOSOS]);
export const ehArterial = (sitio) => SITIOS_ARTERIAIS.some(([k]) => k === sitio);

export const paredeArterialOptions = ["Normal", "Calcificação discreta", "Calcificação acentuada"];
export const ondaOptions = ["Trifásico", "Bifásico", "Monofásico"];
export const situacaoVeiaOptions = ["Pérvia", "Trombosada", "Esclerosada / fibrosada", "Não visualizada"];
export const fluxoAxilarOptions = ["Fásico", "Contínuo (não fásico)"];
export const arcoPalmarOptions = ["Completo", "Incompleto"];

export const tipoFavOptions = [
  "Radiocefálica (punho)",
  "Braquiocefálica (cotovelo)",
  "Braquiobasílica (com transposição)",
  "Braquiobasílica via veia intermédia do cotovelo",
  "Braquiobraquial (com transposição)",
  "Prótese em alça no antebraço",
  "Prótese braquioaxilar",
];
export const ehProtese = (tipo) => /^Prótese/.test(tipo || "");
export const statusFavOptions = ["Pérvia", "Ocluída (trombosada)"];
export function localLesaoFavOptions(tipo) {
  if (ehProtese(tipo)) return ["Anastomose arterial", "Corpo da prótese", "Anastomose venosa", "Veia de saída"];
  const base = ["Justa-anastomótica", "Segmento de punção", "Veia de saída"];
  return /cefálica/i.test(tipo || "") ? [...base.slice(0, 2), "Arco da cefálica", base[2]] : base;
}

function sitioPadrao(sitio) {
  if (ehArterial(sitio)) return { diametro: "", parede: "Normal", onda: "Trifásico" };
  if (sitio === "axilar") return { situacao: "Pérvia", fluxo: "Fásico" };
  return { situacao: "Pérvia", diametro: "", profundidade: "" };
}

export function extraPadrao() {
  return {
    modo: "Confecção",
    confeccao: {
      garrote: true,
      arcoPalmar: "",
      sitios: Object.fromEntries([...SITIOS_ARTERIAIS, ...SITIOS_VENOSOS].map(([k]) => [k, sitioPadrao(k)])),
    },
    avaliacao: {
      tipo: "",
      status: "Pérvia",
      fluxoVolume: "",
      arteriaDiametro: "",
      anastomoseDiametro: "",
      anastomosePsv: "",
      veiaDiametro: "",
      veiaProfundidade: "",
      estenose: false,
      estenoseLocal: "",
      estenosePercentual: "",
      estenosePsv: "",
      aneurisma: false,
      aneurismaLocal: "",
      aneurismaDiametro: "",
      pseudoaneurisma: false,
      tromboParcial: false,
      colaterais: false,
      roubo: false,
      hematoma: false,
    },
  };
}

export function normalizarExtra(salvo) {
  const p = extraPadrao();
  if (!salvo) return p;
  return {
    modo: MODOS_FAV.includes(salvo.modo) ? salvo.modo : p.modo,
    confeccao: {
      ...p.confeccao,
      ...salvo.confeccao,
      sitios: Object.fromEntries(Object.entries(p.confeccao.sitios).map(([k, v]) => [k, { ...v, ...salvo.confeccao?.sitios?.[k] }])),
    },
    avaliacao: { ...p.avaliacao, ...salvo.avaliacao },
  };
}

// ---------- helpers ----------
const tem = (v) => v !== undefined && v !== null && String(v).trim() !== "";
const num = (v) => parseFloat(String(v ?? "").replace(",", "."));
const mm = (v) => `${String(v).trim().replace(".", ",")} mm`;
const minuscula = (t) => t.charAt(0).toLowerCase() + t.slice(1);
const membroTexto = (lado) => (lado ? `MEMBRO SUPERIOR ${lado.toUpperCase()}` : "MEMBRO SUPERIOR");

// Veia/artéria com calibre medido que atende ao critério.
export function sitioAdequado(sitio, s) {
  if (!s || !tem(s.diametro)) return null; // não medido
  if (!ehArterial(sitio) && s.situacao !== "Pérvia") return false;
  return num(s.diametro) >= CRITERIO_CALIBRE_MM;
}

// ---------- Confecção ----------
function descreverSitio(sitio, s) {
  const nome = NOME_SITIO[sitio];
  if (ehArterial(sitio)) {
    const p = ["pérvia"];
    if (tem(s.diametro)) p.push(`diâmetro de ${mm(s.diametro)}`);
    p.push(s.parede === "Normal" ? "parede sem calcificações" : minuscula(s.parede));
    p.push(`fluxo ${s.onda.toLowerCase()}`);
    return `${nome}: ${p.join(", ")}.`;
  }
  if (sitio === "axilar") {
    return `${nome}: ${s.situacao === "Pérvia" ? `pérvia, fluxo ${minuscula(s.fluxo)}` : minuscula(s.situacao)}.`;
  }
  const p = [s.situacao === "Pérvia" ? "pérvia, compressível" : minuscula(s.situacao)];
  if (tem(s.diametro)) p.push(`diâmetro de ${mm(s.diametro)}`);
  if (tem(s.profundidade)) p.push(`profundidade de ${mm(s.profundidade)}`);
  return `${nome}: ${p.join(", ")}.`;
}

function territoriosAdequados(sitios) {
  const ok = (k) => sitioAdequado(k, sitios[k]) === true;
  const naoReprova = (k) => sitioAdequado(k, sitios[k]) !== false;
  const t = [];
  if (ok("radial") && ok("cefalicaPunho") && naoReprova("cefalicaAntebraco")) t.push("FAV radiocefálica (punho)");
  if (ok("braquial") && (ok("cefalicaCotovelo") || ok("intermedia")) && naoReprova("cefalicaBraco")) t.push("FAV braquiocefálica (cotovelo)");
  if (ok("braquial") && (ok("basilicaBraco") || ok("basilicaCotovelo"))) t.push("FAV braquiobasílica (com transposição)");
  if (ok("braquial") && ok("intermedia") && (ok("basilicaBraco") || ok("basilicaCotovelo"))) t.push("FAV braquiobasílica via veia intermédia do cotovelo");
  if (ok("braquial") && ok("braquialVeia")) t.push("FAV braquiobraquial (com transposição)");
  return t;
}

function concluirConfeccao(c) {
  const s = c.sitios;
  const linhas = [];
  const medidos = Object.entries(s).some(([k, v]) => tem(v.diametro));
  const territorios = territoriosAdequados(s);
  if (territorios.length) {
    linhas.push(`Vasos com calibre adequado (>= 2,0 mm) para: ${territorios.join(", ")}.`);
  } else if (medidos) {
    linhas.push("Sem território com artéria e veia de calibre adequado (>= 2,0 mm) para FAV autóloga.");
  }
  SITIOS_VENOSOS.forEach(([k, nome]) => {
    const v = s[k];
    if (k !== "axilar" && v.situacao !== "Pérvia") linhas.push(`${nome} ${minuscula(v.situacao)}.`);
    if (k !== "axilar" && v.situacao === "Pérvia" && tem(v.profundidade) && num(v.profundidade) > 6) {
      linhas.push(`${nome} profunda (${mm(v.profundidade)} da pele): pode exigir superficialização.`);
    }
  });
  const ax = s.axilar;
  if (ax.situacao !== "Pérvia") linhas.push(`Veia axilar ${minuscula(ax.situacao)}.`);
  else if (ax.fluxo !== "Fásico") linhas.push("Fluxo contínuo na veia axilar: sugere obstrução venosa central.");
  SITIOS_ARTERIAIS.forEach(([k, nome]) => {
    if (s[k].parede === "Calcificação acentuada") linhas.push(`Calcificação acentuada da ${minuscula(nome)}.`);
    if (s[k].onda === "Monofásico") linhas.push(`Fluxo monofásico na ${minuscula(nome)}.`);
  });
  if (c.arcoPalmar === "Incompleto") linhas.push("Arco palmar incompleto.");
  if (!linhas.length) linhas.push("Artérias e veias do membro superior pérvias.");
  return linhas;
}

function blocoConfeccao(c, lado) {
  const linhas = [`MAPEAMENTO PARA CONFECÇÃO DE FÍSTULA ARTERIOVENOSA - ${membroTexto(lado)}`, "", "Artérias:"];
  SITIOS_ARTERIAIS.forEach(([k]) => linhas.push(descreverSitio(k, c.sitios[k])));
  if (tem(c.arcoPalmar)) linhas.push(`Arco palmar ${c.arcoPalmar.toLowerCase()}.`);
  linhas.push("", c.garrote ? "Veias (medidas com garrote):" : "Veias:");
  SITIOS_VENOSOS.forEach(([k]) => linhas.push(descreverSitio(k, c.sitios[k])));
  return { linhas, conclusao: concluirConfeccao(c) };
}

// ---------- Avaliação ----------
function tipoTexto(tipo) {
  return ehProtese(tipo) ? `FAV com ${minuscula(tipo)}` : `FAV ${minuscula(tipo)}`;
}

function blocoAvaliacao(a, lado) {
  const linhas = [`AVALIAÇÃO DE FÍSTULA ARTERIOVENOSA - ${membroTexto(lado)}`, ""];
  const conclusao = [];
  const tipo = tem(a.tipo) ? tipoTexto(a.tipo) : "FAV";
  const ocluida = a.status !== "Pérvia";
  linhas.push(`${tipo}: ${ocluida ? "ocluída (trombosada), sem fluxo." : "pérvia."}`);
  if (!ocluida) {
    if (tem(a.arteriaDiametro)) linhas.push(`Artéria nutridora com diâmetro de ${mm(a.arteriaDiametro)}.`);
    if (tem(a.fluxoVolume)) linhas.push(`Fluxo volumétrico (artéria braquial): ${String(a.fluxoVolume).trim()} mL/min.`);
    const an = [];
    if (tem(a.anastomoseDiametro)) an.push(`diâmetro de ${mm(a.anastomoseDiametro)}`);
    if (tem(a.anastomosePsv)) an.push(`velocidade de pico sistólico de ${String(a.anastomosePsv).trim()} cm/s`);
    if (an.length) linhas.push(`Anastomose: ${an.join(", ")}.`);
    const ve = [];
    if (tem(a.veiaDiametro)) ve.push(`diâmetro de ${mm(a.veiaDiametro)}`);
    if (tem(a.veiaProfundidade)) ve.push(`profundidade de ${mm(a.veiaProfundidade)}`);
    if (ve.length) linhas.push(`${ehProtese(a.tipo) ? "Prótese" : "Veia de drenagem"} (segmento de punção): ${ve.join(", ")}.`);
  }
  if (a.estenose) {
    let e = "Estenose";
    if (tem(a.estenosePercentual)) e += ` de ${String(a.estenosePercentual).trim()}%`;
    if (tem(a.estenoseLocal)) e += ` ${a.estenoseLocal === "Justa-anastomótica" ? "justa-anastomótica" : noLocal(a.estenoseLocal)}`;
    if (tem(a.estenosePsv)) e += ` (velocidade de pico sistólico de ${String(a.estenosePsv).trim()} cm/s)`;
    linhas.push(`${e}.`);
  }
  if (a.aneurisma) {
    let t = "Dilatação aneurismática";
    if (tem(a.aneurismaLocal)) t += ` ${noLocal(a.aneurismaLocal)}`;
    if (tem(a.aneurismaDiametro)) t += `, com diâmetro de ${mm(a.aneurismaDiametro)}`;
    linhas.push(`${t}.`);
  }
  if (a.pseudoaneurisma) linhas.push("Pseudoaneurisma.");
  if (a.tromboParcial) linhas.push("Trombo parcial (não oclusivo).");
  if (a.colaterais) linhas.push("Veias colaterais / acessórias.");
  if (a.roubo) linhas.push("Fluxo retrógrado na artéria distal à anastomose (sinal de roubo).");
  if (a.hematoma) linhas.push("Coleção / hematoma perianastomótico.");

  // conclusão
  let principal = `${tipo} ${ocluida ? "ocluída (trombosada)" : "pérvia"}`;
  if (!ocluida && tem(a.fluxoVolume)) principal += `, com fluxo de ${String(a.fluxoVolume).trim()} mL/min`;
  conclusao.push(`${principal}.`);
  if (!ocluida && !ehProtese(a.tipo)) {
    const criterios = [
      [tem(a.fluxoVolume), num(a.fluxoVolume) >= 600, "fluxo >= 600 mL/min"],
      [tem(a.veiaDiametro), num(a.veiaDiametro) >= 6, "veia >= 6 mm"],
      [tem(a.veiaProfundidade), num(a.veiaProfundidade) <= 6, "profundidade <= 6 mm"],
    ];
    const medidos = criterios.filter(([m]) => m);
    if (medidos.length === 3 && medidos.every(([, ok]) => ok)) {
      conclusao.push("Critérios de maturação presentes (regra dos 6).");
    } else if (medidos.some(([, ok]) => !ok)) {
      conclusao.push(`Critérios de maturação não atingidos: ${medidos.filter(([, ok]) => !ok).map(([, , t]) => t.replace(">=", "<").replace("<=", ">")).join(", ")}.`);
    }
  }
  if (!ocluida && tem(a.fluxoVolume) && num(a.fluxoVolume) > 2000) conclusao.push("FAV de alto fluxo (> 2.000 mL/min).");
  linhas.slice(3).forEach((l) => {
    if (/^(Estenose|Dilatação|Pseudoaneurisma|Trombo|Veias colaterais|Fluxo retrógrado|Coleção)/.test(l)) conclusao.push(l);
  });
  return { linhas, conclusao };
}

// ---------- Laudo ----------
export const TITULO_EXAME = "DOPPLER PARA FÍSTULA ARTERIOVENOSA";

export function gerarCabecalhoLaudo({ nome, idade, data }) {
  return `PACIENTE: ${nome}${idade ? `, ${idade} anos` : ""}\nDATA: ${data}\n`;
}

export function gerarBlocoExame(extra, lado, observacoes) {
  const e = normalizarExtra(extra);
  const { linhas, conclusao } = e.modo === "Avaliação" ? blocoAvaliacao(e.avaliacao, lado) : blocoConfeccao(e.confeccao, lado);
  let t = `${TITULO_EXAME}\n${linhas.join("\n")}\n`;
  t += "\nCONCLUSÃO\n" + conclusao.join("\n") + "\n";
  if (tem(observacoes)) t += `\nOBSERVAÇÕES\n${observacoes.trim()}\n`;
  return t;
}

export function gerarLaudoCompleto({ nome, idade, data, lado, extra, observacoes }) {
  return gerarCabecalhoLaudo({ nome, idade, data }) + "\n" + gerarBlocoExame(extra, lado, observacoes);
}
