// Laudo do Doppler de Carótidas e Vertebrais. Mesmos achados dos laudos
// arteriais dos membros: oclusão (total ou por terço), estenose com local,
// stent (pérvio / com reestenose / ocluído), dissecção e aneurisma.

export const VASOS_CAROTIDAS = ["ACCD", "ACID", "ACED", "ACCE", "ACIE", "ACEE", "AVD", "AVE"];

export const NOMES_VASOS = {
  ACCD: "Artéria carótida comum direita",
  ACID: "Artéria carótida interna direita",
  ACED: "Artéria carótida externa direita",
  ACCE: "Artéria carótida comum esquerda",
  ACIE: "Artéria carótida interna esquerda",
  ACEE: "Artéria carótida externa esquerda",
  AVD: "Artéria vertebral direita",
  AVE: "Artéria vertebral esquerda",
};

export const statusOptions = ["pérvia", "ocluída"];
export const localizacaoOclusaoOptions = ["total", "terço proximal", "terço médio", "terço distal"];
export const fluxoOptions = ["sem alteração", "hipocinético", "hipercinético"];
export const ateromatoseOptions = ["ausente", "discreta", "moderada", "severa"];
export const estenoseOptions = ["ausente", "<50%", "50% a 70%", ">70%"];
export const localizacaoEstenoseOptions = ["terço proximal", "terço médio", "terço distal"];
export const tipoPlacaOptions = ["lipídica", "calcificada", "mista"];
export const stentOptions = ["pérvio", "com reestenose", "ocluído"];

export function vasoPadrao() {
  return {
    status: "pérvia",
    localizacaoOclusao: "total",
    fluxo: "sem alteração",
    ateromatose: "ausente",
    estenose: "ausente",
    localizacaoEstenose: "",
    tipoPlaca: "",
    stent: "ausente",
    disseccao: false,
    aneurisma: false,
    aneurismaDiametro: "",
    imt: "",
    observacao: "",
  };
}

// Exames salvos antes desta versão: stent era só "presente"/"ausente".
export function normalizarVaso(salvo) {
  const v = { ...vasoPadrao(), ...salvo };
  if (v.stent === "presente") v.stent = "pérvio";
  if (!stentOptions.includes(v.stent)) v.stent = "ausente";
  if (!localizacaoOclusaoOptions.includes(v.localizacaoOclusao)) v.localizacaoOclusao = "total";
  return v;
}

export function normalizarSistema(salvo, chaves) {
  return Object.fromEntries(chaves.map((k) => [k, normalizarVaso(salvo?.[k])]));
}

const tem = (s) => typeof s === "string" && s.trim() !== "";
const temStent = (v) => stentOptions.includes(v.stent);
const temEstenose = (v) => v.estenose && v.estenose !== "ausente";

function textoOclusao(v) {
  return v.localizacaoOclusao && v.localizacaoOclusao !== "total" ? `no ${v.localizacaoOclusao}` : "total";
}

function textoAneurisma(v) {
  return `dilatação aneurismática${tem(v.aneurismaDiametro) ? ` (${String(v.aneurismaDiametro).trim().replace(".", ",")} mm)` : ""}`;
}

function vasoAlterado(v) {
  return v.status !== "pérvia"
    || v.fluxo !== "sem alteração"
    || v.ateromatose !== "ausente"
    || temEstenose(v)
    || temStent(v)
    || v.disseccao
    || v.aneurisma;
}

export function descreverVaso(v, chave) {
  const nome = NOMES_VASOS[chave];
  let texto;
  if (!vasoAlterado(v)) {
    texto = `${nome}: pérvia, fluxo sem alteração.`;
  } else {
    const partes = [];
    if (v.status === "ocluída") {
      partes.push(`ocluída (oclusão ${textoOclusao(v)})`);
    } else {
      partes.push(v.status, `fluxo ${v.fluxo}`);
      if (v.ateromatose !== "ausente") partes.push(`ateromatose ${v.ateromatose}`);
      if (temEstenose(v)) {
        let e = `estenose ${v.estenose}`;
        if (tem(v.localizacaoEstenose)) e += ` no ${v.localizacaoEstenose}`;
        if (tem(v.tipoPlaca)) e += ` com placa ${v.tipoPlaca}`;
        partes.push(e);
      }
    }
    if (temStent(v)) partes.push(`stent ${v.stent}`);
    if (v.disseccao) partes.push("sinais de dissecção");
    if (v.aneurisma) partes.push(textoAneurisma(v));
    texto = `${nome}: ${partes.join(", ")}.`;
  }
  if ((chave === "ACCD" || chave === "ACCE") && tem(v.imt)) {
    texto = texto.replace(/\.$/, `, IMT ${v.imt} mm.`);
  }
  if (tem(v.observacao)) texto += `\nObservação: ${v.observacao.trim()}`;
  return texto;
}

function concluirVaso(v, chave) {
  const nome = NOMES_VASOS[chave].toLowerCase();
  const d = [];
  if (v.status === "ocluída") {
    d.push(v.localizacaoOclusao && v.localizacaoOclusao !== "total"
      ? `Oclusão de ${nome} no ${v.localizacaoOclusao}`
      : `Oclusão total de ${nome}`);
  } else {
    if (temEstenose(v)) {
      let e = `Estenose ${v.estenose} em ${nome}`;
      if (tem(v.localizacaoEstenose)) e += ` (${v.localizacaoEstenose})`;
      if (tem(v.tipoPlaca)) e += ` com placa ${v.tipoPlaca}`;
      d.push(e);
    }
    if (v.ateromatose !== "ausente" && !temEstenose(v)) {
      d.push(v.ateromatose === "discreta" ? "Ateromatose discreta sem repercussão hemodinâmica" : `Ateromatose ${v.ateromatose} em ${nome}`);
    }
    if (v.fluxo !== "sem alteração" && v.ateromatose === "ausente" && !temEstenose(v)) {
      d.push(`Fluxo ${v.fluxo} em ${nome}`);
    }
  }
  if (temStent(v)) d.push(d.length ? `com stent ${v.stent}` : `Stent ${v.stent} em ${nome}`);
  if (v.disseccao) d.push(d.length ? "com sinais de dissecção" : `Dissecção de ${nome}`);
  if (v.aneurisma) d.push(d.length ? `com ${textoAneurisma(v)}` : `Dilatação aneurismática de ${nome}${tem(v.aneurismaDiametro) ? ` (${String(v.aneurismaDiametro).trim().replace(".", ",")} mm)` : ""}`);
  return d.length ? d.join(", ") + "." : null;
}

export function gerarConclusaoCarotidas(vasos) {
  const alterados = VASOS_CAROTIDAS.filter((k) => vasos[k] && vasoAlterado(vasos[k]));
  if (!alterados.length) return "Artérias carótidas e vertebrais pérvias, sem alterações hemodinâmicas.";
  const linhas = [];
  alterados.forEach((k) => {
    const t = concluirVaso(vasos[k], k);
    if (t && !linhas.includes(t)) linhas.push(t);
  });
  return linhas.join("\n");
}

export function montarLaudo({ nome, idade, data, carotidasDireitas, carotidasEsquerdas, vertebrais }) {
  const vasos = { ...carotidasDireitas, ...carotidasEsquerdas, ...vertebrais };
  const linha = (k) => descreverVaso(normalizarVaso(vasos[k]), k) + "\n";
  let r = `PACIENTE: ${nome}\n`;
  if (idade) r += `IDADE: ${idade} anos\n`;
  r += `DATA: ${data}\n`;
  r += `DOPPLER DE CARÓTIDAS E VERTEBRAIS\n\n`;
  r += `**Sistema Carotídeo Direito**\n` + linha("ACCD") + linha("ACID") + linha("ACED") + "\n";
  r += `**Sistema Carotídeo Esquerdo**\n` + linha("ACCE") + linha("ACIE") + linha("ACEE") + "\n";
  r += `**Sistema Vertebral**\n` + linha("AVD") + linha("AVE") + "\n";
  r += `**CONCLUSÃO:**\n`;
  r += gerarConclusaoCarotidas(Object.fromEntries(VASOS_CAROTIDAS.map((k) => [k, normalizarVaso(vasos[k])])));
  return r;
}

// Com estenose, o tipo de placa é obrigatório.
export function validarVasos(todosVasos) {
  for (const [chave, v] of Object.entries(todosVasos)) {
    if (v.status !== "ocluída" && temEstenose(v) && !tem(v.tipoPlaca)) {
      return `Campo "Tipo Placa" é obrigatório para ${chave} quando há estenose!`;
    }
  }
  return null;
}

// Converte o vaso da carótida para o formato do desenho arterial comum
// (ArteriaCurva), para seguir as mesmas cores e símbolos de MMII/MMSS.
const PCT_ESTENOSE = { "<50%": "30", "50% a 70%": "60", ">70%": "80" };
const PRIMEIRA_MAIUSCULA = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
export function paraDesenhoArterial(v) {
  return {
    status: v.status === "ocluída" ? "Ocluída" : "Pérvia",
    localizacaoOclusao: v.localizacaoOclusao === "total" ? "Total" : PRIMEIRA_MAIUSCULA(v.localizacaoOclusao),
    velocidade: v.fluxo === "hipercinético" ? "Hipercinético" : v.fluxo === "hipocinético" ? "Hipocinético" : "Normal",
    ateromatose: PRIMEIRA_MAIUSCULA(v.ateromatose === "ausente" ? "" : v.ateromatose),
    placa: temEstenose(v) ? "Presente" : "Ausente",
    estenosePercentual: PCT_ESTENOSE[v.estenose] || "",
    localizacaoPlaca: PRIMEIRA_MAIUSCULA(v.localizacaoEstenose) || "Terço médio",
    caracteristicaPlaca: PRIMEIRA_MAIUSCULA(v.tipoPlaca),
    stent: v.stent === "pérvio" ? "Pérvio" : v.stent === "com reestenose" ? "Com reestenose" : v.stent === "ocluído" ? "Ocluído" : "Ausente",
    disseccao: !!v.disseccao,
    aneurisma: !!v.aneurisma,
    aneurismaDiametro: v.aneurismaDiametro,
    aneurismaForma: "Fusiforme",
    tipoOnda: "",
  };
}
