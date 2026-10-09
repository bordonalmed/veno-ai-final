// Laudo do Doppler Venoso de MMSS: veias, opções dos campos, estrutura de
// dados e geração do texto (descrição + conclusão). No membro superior não se
// avalia insuficiência/refluxo, por isso não há campo de competência.

export const VEIAS_PROFUNDAS = [
  "Veia Jugular Interna",
  "Veia Subclávia",
  "Veia Axilar",
  "Veias Braquiais",
  "Veias Radiais",
  "Veias Ulnares",
];

export const VEIAS_SUPERFICIAIS = [
  "Veia Cefálica (braço)",
  "Veia Cefálica (antebraço)",
  "Veia Basílica (braço)",
  "Veia Basílica (antebraço)",
  "Veia Intermédia do Cotovelo",
];

export const VEIAS = [...VEIAS_PROFUNDAS, ...VEIAS_SUPERFICIAIS];

// Veias centrais: avaliadas pela fasicidade do fluxo (fluxo contínuo sugere
// obstrução central). A subclávia não é compressível atrás da clavícula.
export const VEIAS_CENTRAIS = ["Veia Jugular Interna", "Veia Subclávia", "Veia Axilar"];
const NAO_COMPRESSIVEIS = ["Veia Subclávia"];

export const statusProfundaOptions = [
  "Pérvia",
  "Trombose oclusiva",
  "Trombose parcial (não oclusiva)",
  "Recanalização parcial",
];
export const statusSuperficialOptions = [...statusProfundaOptions, "Ausente"];
export const fluxoCentralOptions = ["Fásico", "Contínuo (não fásico)"];
export const faseTromboOptions = ["Aguda", "Subaguda", "Crônica"];
export const cateterTipoOptions = ["Cateter venoso central", "PICC", "Cateter de hemodiálise", "Cabo de marca-passo"];

export const estruturaVeia = { status: "Pérvia", fluxo: "Fásico", fase: "", observacao: "" };

export const MEDIDAS_FAV_VENOSO = [
  ["cefalicaPunho", "Veia cefálica no punho"],
  ["cefalicaAntebraco", "Veia cefálica no antebraço"],
  ["cefalicaBraco", "Veia cefálica no braço"],
  ["basilicaBraco", "Veia basílica no braço"],
];

export function extraPadrao() {
  return {
    cateter: { presente: false, tipo: "", veia: "" },
    fav: {
      realizado: false,
      ...Object.fromEntries(MEDIDAS_FAV_VENOSO.map(([c]) => [c, { diametro: "", profundidade: "" }])),
    },
  };
}

export function veiasPadrao() {
  return Object.fromEntries(VEIAS.map((v) => [v, { ...estruturaVeia }]));
}

export function isProfunda(nome) {
  return VEIAS_PROFUNDAS.includes(nome);
}

function preenchido(v) {
  return v !== undefined && v !== null && String(v).trim() !== "";
}

function plural(nome) {
  return nome.startsWith("Veias");
}

// "Veia Cefálica (braço)" -> "veia cefálica (braço)"
function nomeMinusculo(nome) {
  return nome.toLowerCase();
}

function listar(nomes) {
  const n = nomes.map(nomeMinusculo);
  if (n.length <= 1) return n.join("");
  return `${n.slice(0, -1).join(", ")} e ${n[n.length - 1]}`;
}

function mm(valor) {
  return `${String(valor).trim().replace(".", ",")} mm`;
}

// "de aspecto agudo/subagudo/crônico" ("aspecto" é masculino).
const ASPECTO = { Aguda: "agudo", Subaguda: "subagudo", Crônica: "crônico" };
const aspecto = (fase) => (preenchido(fase) ? ` de aspecto ${ASPECTO[fase] || fase.toLowerCase()}` : "");

const ehTrombose = (v) => v.status === "Trombose oclusiva" || v.status === "Trombose parcial (não oclusiva)";

// Uma linha da descrição, ex.: "Veia Axilar: pérvia, compressível, com fluxo fásico."
export function descreverVeia(nome, v) {
  const pl = plural(nome);
  const s = (sing, plur) => (pl ? plur : sing);
  const compressivel = !NAO_COMPRESSIVEIS.includes(nome);
  const central = VEIAS_CENTRAIS.includes(nome);
  const fase = aspecto(v.fase);
  const partes = [];

  if (v.status === "Ausente") {
    partes.push(s("não visualizada", "não visualizadas"));
  } else if (v.status === "Trombose oclusiva") {
    if (compressivel) partes.push(s("não compressível", "não compressíveis"));
    partes.push(`com trombo oclusivo${fase}`, "sem fluxo");
  } else if (v.status === "Trombose parcial (não oclusiva)") {
    if (compressivel) partes.push(s("parcialmente compressível", "parcialmente compressíveis"));
    partes.push(`com trombo não oclusivo${fase} e fluxo residual`);
  } else if (v.status === "Recanalização parcial") {
    if (compressivel) partes.push(s("parcialmente compressível", "parcialmente compressíveis"));
    partes.push("com espessamento parietal e sinais de recanalização parcial");
  } else {
    partes.push(s("pérvia", "pérvias"));
    if (compressivel) partes.push(s("compressível", "compressíveis"));
    if (central) {
      partes.push(v.fluxo === "Contínuo (não fásico)" ? "com fluxo contínuo (não fásico)" : "com fluxo fásico");
    }
  }
  return `${nome}: ${partes.join(", ")}.`;
}

// Agrupa as veias com o mesmo achado numa linha só da conclusão.
function agrupar(nomes, chave) {
  const grupos = new Map();
  nomes.forEach((n) => {
    const k = chave(n);
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(n);
  });
  return grupos;
}

export function getConclusaoMembro(veias, extra) {
  const ex = extra || extraPadrao();
  const val = (n) => veias[n] || estruturaVeia;
  const linhas = [];
  const cateterVeia = ex.cateter?.presente && preenchido(ex.cateter.veia) ? ex.cateter.veia : null;

  [true, false].forEach((profundo) => {
    const lista = VEIAS.filter((n) => isProfunda(n) === profundo);
    const sistema = profundo ? "Trombose venosa profunda" : "Trombose venosa superficial";
    const trombosadas = lista.filter((n) => ehTrombose(val(n)));
    agrupar(trombosadas, (n) => `${val(n).status}|${val(n).fase || ""}`).forEach((nomes, k) => {
      const [status, fase] = k.split("|");
      const tipo = status === "Trombose oclusiva" ? "oclusiva" : "parcial (não oclusiva)";
      const faseTxt = fase ? `,${aspecto(fase)},` : "";
      const cat = cateterVeia && nomes.includes(cateterVeia) ? ", associada a cateter" : "";
      linhas.push(`${sistema} ${tipo}${faseTxt} em ${listar(nomes)}${cat}`);
    });
    const recan = lista.filter((n) => val(n).status === "Recanalização parcial");
    if (recan.length) {
      const prev = profundo ? "trombose venosa profunda" : "trombose venosa superficial";
      linhas.push(`Sinais de ${prev} prévia com recanalização parcial em ${listar(recan)}`);
    }
  });

  const continuo = VEIAS_CENTRAIS.filter((n) => val(n).status === "Pérvia" && val(n).fluxo === "Contínuo (não fásico)");
  if (continuo.length) {
    linhas.push(
      `Fluxo contínuo (não fásico) em ${listar(continuo)}, sugestivo de obstrução venosa central (veia braquiocefálica/veia cava superior)`
    );
  }

  const ausentes = VEIAS_SUPERFICIAIS.filter((n) => val(n).status === "Ausente");
  if (ausentes.length) {
    const a = listar(ausentes);
    linhas.push(`${a.charAt(0).toUpperCase()}${a.slice(1)} não ${ausentes.length > 1 ? "visualizadas" : "visualizada"}`);
  }

  if (ex.cateter?.presente) {
    const tipo = preenchido(ex.cateter.tipo) ? ex.cateter.tipo : "Cateter";
    const onde = cateterVeia ? ` em ${nomeMinusculo(cateterVeia)}` : "";
    const semTrombose = cateterVeia && !ehTrombose(val(cateterVeia)) ? ", sem sinais de trombose associada" : "";
    linhas.push(`${tipo}${onde}${semTrombose}`);
  }

  const resultado = linhas.length ? linhas : ["Exame dentro dos padrões da normalidade."];

  const fav = ex.fav;
  if (fav?.realizado) {
    const partes = MEDIDAS_FAV_VENOSO.filter(([c]) => preenchido(fav[c]?.diametro)).map(
      ([c, nome]) => `${nome.toLowerCase()} com ${mm(fav[c].diametro)}`
    );
    if (partes.length) resultado.push(`Mapeamento venoso pré-FAV: ${partes.join(", ")}.`);
  }
  return resultado;
}

export function descreverExtra(extra) {
  const linhas = [];
  const cat = extra?.cateter;
  if (cat?.presente) {
    linhas.push("", "CATETER");
    const tipo = preenchido(cat.tipo) ? cat.tipo : "Cateter";
    linhas.push(`${tipo}${preenchido(cat.veia) ? ` em ${nomeMinusculo(cat.veia)}` : ""}.`);
  }
  const fav = extra?.fav;
  if (fav?.realizado) {
    linhas.push("", "MAPEAMENTO VENOSO PRÉ-FÍSTULA ARTERIOVENOSA");
    MEDIDAS_FAV_VENOSO.forEach(([c, nome]) => {
      const m = fav[c] || {};
      if (!preenchido(m.diametro) && !preenchido(m.profundidade)) return;
      const partes = [];
      if (preenchido(m.diametro)) partes.push(`diâmetro de ${mm(m.diametro)}`);
      if (preenchido(m.profundidade)) partes.push(`profundidade de ${mm(m.profundidade)} da pele`);
      linhas.push(`${nome}: ${partes.join(", ")}.`);
    });
  }
  return linhas;
}

export function gerarCabecalhoLaudo({ nome, idade, data }) {
  return `PACIENTE: ${nome}, ${idade} anos\nDATA: ${data}\n`;
}

export function gerarBlocoMembro(lado, veias, extra, observacao) {
  let t = `DOPPLER VENOSO DE MEMBRO SUPERIOR ${lado.toUpperCase()}\n\n`;
  t += "Sistema Venoso Profundo:\n";
  VEIAS_PROFUNDAS.forEach((n) => {
    const v = veias[n] || estruturaVeia;
    t += descreverVeia(n, v) + "\n";
    if (preenchido(v.observacao)) t += `  ${v.observacao.trim()}\n`;
  });
  t += "\nSistema Venoso Superficial:\n";
  VEIAS_SUPERFICIAIS.forEach((n) => {
    const v = veias[n] || estruturaVeia;
    t += descreverVeia(n, v) + "\n";
    if (preenchido(v.observacao)) t += `  ${v.observacao.trim()}\n`;
  });
  descreverExtra(extra).forEach((l) => { t += l + "\n"; });
  t += "\nCONCLUSÃO\n";
  t += getConclusaoMembro(veias, extra).join("\n") + "\n";
  if (preenchido(observacao)) t += `\nOBSERVAÇÕES\n${observacao.trim()}\n`;
  return t;
}

export function ladosDoExame(lado) {
  if (lado === "Ambos") return ["Direito", "Esquerdo"];
  if (lado === "Direito" || lado === "Esquerdo") return [lado];
  return [];
}

export const SEPARADOR_MEMBROS = "=".repeat(80);

export function gerarLaudoCompleto({ nome, idade, data, lado, veias, extras, observacoes }) {
  const blocos = ladosDoExame(lado).map((l) =>
    gerarBlocoMembro(l, veias?.[l] || veiasPadrao(), extras?.[l], observacoes?.[l])
  );
  return gerarCabecalhoLaudo({ nome, idade, data }) + "\n" + blocos.join(`\n${SEPARADOR_MEMBROS}\n`);
}

// Exames salvos na versão antiga: texto pronto por veia ("pérvia com fluxo
// contínuo", "não compressível...", "semi compressível...", "ausente") e uma
// só "Veia Cefálica"/"Veia Basílica".
function converterTextoAntigo(texto) {
  const t = String(texto || "").toLowerCase();
  if (t.includes("não compressível")) return { ...estruturaVeia, status: "Trombose oclusiva" };
  if (t.includes("semi compressível")) return { ...estruturaVeia, status: "Recanalização parcial" };
  if (t.startsWith("ausente")) return { ...estruturaVeia, status: "Ausente" };
  return { ...estruturaVeia };
}

// Nome antigo -> nome atual (exames salvos antes da troca).
const NOMES_ANTIGOS = { "Veia Cubital Mediana": "Veia Intermédia do Cotovelo" };
const nomeAtual = (n) => NOMES_ANTIGOS[n] || n;

export function normalizarVeiasLado(exame, lado) {
  const out = veiasPadrao();
  if (exame?.veias?.[lado]) {
    Object.entries(exame.veias[lado]).forEach(([n, v]) => {
      if (out[nomeAtual(n)]) out[nomeAtual(n)] = { ...estruturaVeia, ...v };
    });
    return out;
  }
  const antigas = { ...(exame?.profundas?.[lado] || {}), ...(exame?.superficiais?.[lado] || {}) };
  Object.entries(antigas).forEach(([n, texto]) => {
    const v = converterTextoAntigo(texto);
    if (n === "Veia Cefálica" || n === "Veia Basílica") {
      out[`${n} (braço)`] = { ...v };
      out[`${n} (antebraço)`] = { ...v };
    } else if (out[n]) {
      out[n] = v;
    }
  });
  return out;
}

export function normalizarExtra(salvo) {
  const p = extraPadrao();
  if (!salvo) return p;
  const fav = { ...p.fav, ...salvo.fav };
  MEDIDAS_FAV_VENOSO.forEach(([c]) => { fav[c] = { ...p.fav[c], ...salvo.fav?.[c] }; });
  const cateter = { ...p.cateter, ...salvo.cateter };
  cateter.veia = nomeAtual(cateter.veia);
  return { cateter, fav };
}
