// Laudo do Doppler Arterial de MMSS: mesma lógica do MMII, com o tronco
// braquiocefálico (só no lado direito), as manobras para desfiladeiro torácico
// e o mapeamento pré-fístula arteriovenosa.
import { criarLaudoArterial, preenchido } from "./laudoArterial";

export * from "./laudoArterial";

export const MANOBRAS = [
  "Abdução a 90° com rotação externa",
  "Hiperabdução de Wright",
  "Manobra de Adson",
  "Manobra costoclavicular",
];
export const resultadoManobraOptions = ["Sem alteração", "Redução do fluxo", "Abolição do fluxo"];
export const arteriaManobraOptions = ["Artéria Subclávia", "Artéria Axilar", "Artéria Braquial", "Artéria Radial"];
export const arcoPalmarOptions = ["Completo", "Incompleto"];

export function extraPadrao() {
  return {
    manobras: {
      realizadas: false,
      arteria: "Artéria Radial",
      resultados: Object.fromEntries(MANOBRAS.map((m) => [m, "Sem alteração"])),
    },
    fav: { realizado: false, radialPunho: "", ulnarPunho: "", braquialCotovelo: "", arcoPalmar: "" },
  };
}

// Exames salvos antes desta versão não têm as seções novas.
export function normalizarExtra(salvo) {
  const p = extraPadrao();
  if (!salvo) return p;
  return {
    manobras: {
      ...p.manobras,
      ...salvo.manobras,
      resultados: { ...p.manobras.resultados, ...salvo.manobras?.resultados },
    },
    fav: { ...p.fav, ...salvo.fav },
  };
}

// "Hiperabdução de Wright" -> "hiperabdução de Wright" (mantém nomes próprios).
function minusculaInicial(t) {
  return t.charAt(0).toLowerCase() + t.slice(1);
}

function mm(valor) {
  return `${String(valor).trim().replace(".", ",")} mm`;
}

const MEDIDAS_FAV = [
  ["radialPunho", "Artéria radial no punho"],
  ["ulnarPunho", "Artéria ulnar no punho"],
  ["braquialCotovelo", "Artéria braquial na fossa cubital"],
];

function descreverExtra(extra) {
  const linhas = [];
  const man = extra?.manobras;
  if (man?.realizadas) {
    linhas.push("", `MANOBRAS PARA DESFILADEIRO TORÁCICO (avaliação na ${man.arteria.toLowerCase()})`);
    MANOBRAS.forEach((m) => linhas.push(`${m}: ${(man.resultados[m] || "Sem alteração").toLowerCase()}.`));
  }
  const fav = extra?.fav;
  if (fav?.realizado) {
    linhas.push("", "MAPEAMENTO PRÉ-FÍSTULA ARTERIOVENOSA");
    MEDIDAS_FAV.forEach(([campo, nome]) => {
      if (preenchido(fav[campo])) linhas.push(`${nome}: diâmetro de ${mm(fav[campo])}.`);
    });
    if (preenchido(fav.arcoPalmar)) linhas.push(`Arco palmar ${fav.arcoPalmar.toLowerCase()}.`);
  }
  return linhas;
}

function concluirExtra(extra) {
  const linhas = [];
  let alterado = false;
  const man = extra?.manobras;
  if (man?.realizadas) {
    const positivas = MANOBRAS.filter((m) => man.resultados[m] && man.resultados[m] !== "Sem alteração");
    if (positivas.length) {
      alterado = true;
      const lista = positivas.map((m) => `${minusculaInicial(m)} (${man.resultados[m].toLowerCase()})`).join(", ");
      linhas.push(`Manobras positivas para compressão arterial no desfiladeiro torácico: ${lista}`);
    } else {
      linhas.push("Manobras para desfiladeiro torácico sem alterações.");
    }
  }
  const fav = extra?.fav;
  if (fav?.realizado) {
    const partes = MEDIDAS_FAV.filter(([campo]) => preenchido(fav[campo]))
      .map(([campo, nome]) => `${nome.toLowerCase()} com ${mm(fav[campo])}`);
    if (preenchido(fav.arcoPalmar)) partes.push(`arco palmar ${fav.arcoPalmar.toLowerCase()}`);
    if (partes.length) linhas.push(`Mapeamento pré-FAV: ${partes.join(", ")}.`);
  }
  return { linhas, alterado };
}

const laudo = criarLaudoArterial({
  arterias: [
    "Tronco Braquiocefálico",
    "Artéria Subclávia",
    "Artéria Axilar",
    "Artéria Braquial",
    "Artéria Radial",
    "Artéria Ulnar",
  ],
  membro: "SUPERIOR",
  soDireito: ["Tronco Braquiocefálico"],
  extra: { descrever: descreverExtra, concluir: concluirExtra },
});

export const {
  ARTERIAS,
  arteriasDoLado,
  arteriasPadrao,
  normalizarArterias,
  getConclusaoMembro,
  gerarBlocoMembro,
  gerarLaudoCompleto,
} = laudo;
