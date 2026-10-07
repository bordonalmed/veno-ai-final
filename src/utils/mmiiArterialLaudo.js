// Laudo do Doppler Arterial de MMII: opções dos campos, estrutura de dados e
// geração do texto (descrição + conclusão). Fica fora da página para ser
// usado também pelo Mapa Interativo e coberto por testes.

export const ARTERIAS = [
  "Artéria Femoral Comum",
  "Artéria Femoral Profunda",
  "Artéria Femoral Superficial",
  "Artéria Poplítea",
  "Tronco Tibiofibular",
  "Artéria Tibial Anterior",
  "Artéria Fibular",
  "Artéria Tibial Posterior",
  "Artéria Pediosa",
];

export const statusOptions = ["Pérvia", "Ocluída"];
export const localizacaoOclusaoOptions = ["Terço proximal", "Terço médio", "Terço distal", "Total"];
export const localizacaoPlacaOptions = ["Terço proximal", "Terço médio", "Terço distal"];
export const ateromatoseOptions = ["Ausente", "Discreta", "Moderada", "Severa"];
export const velocidadeOptions = ["Normocinético", "Hipercinético", "Hipocinético"];
export const tipoOndaOptions = ["Trifásico", "Bifásico", "Monofásico", "Amortecido (tardus-parvus)"];
export const sentidoOptions = ["Anterógrado", "Retrógrado"];
export const placaOptions = ["Ausente", "Presente"];
export const caracteristicaPlacaOptions = ["Calcificada", "Lipídica", "Mista"];
export const stentOptions = ["Ausente", "Pérvio", "Com reestenose", "Ocluído"];
export const enxertoTipoOptions = [
  "Femoropoplíteo acima do joelho",
  "Femoropoplíteo abaixo do joelho",
  "Femorodistal",
  "Fêmoro-femoral cruzado",
];
export const enxertoStatusOptions = ["Pérvio", "Com estenose", "Ocluído"];

export const estruturaArteria = {
  status: "Pérvia",
  localizacaoOclusao: "",
  ateromatose: "Ausente",
  velocidade: "Normocinético",
  tipoOnda: "Trifásico",
  sentido: "Anterógrado",
  reabitada: false,
  placa: "Ausente",
  estenosePercentual: "",
  caracteristicaPlaca: "",
  localizacaoPlaca: "",
  stent: "Ausente",
  aneurisma: false,
  aneurismaDiametro: "",
  disseccao: false,
  observacao: "",
};

export const enxertoPadrao = { tipo: "", status: "" };

export function arteriasPadrao() {
  return Object.fromEntries(ARTERIAS.map((a) => [a, { ...estruturaArteria }]));
}

// Exames salvos antes desta versão: localização "Proximal/Medial/Distal" e
// sem as artérias/campos novos.
const LOCALIZACAO_ANTIGA = { Proximal: "Terço proximal", Medial: "Terço médio", Distal: "Terço distal" };

export function normalizarArterias(salvas) {
  const out = arteriasPadrao();
  if (!salvas) return out;
  ARTERIAS.forEach((a) => {
    if (!salvas[a]) return;
    const v = { ...estruturaArteria, ...salvas[a] };
    if (LOCALIZACAO_ANTIGA[v.localizacaoOclusao]) v.localizacaoOclusao = LOCALIZACAO_ANTIGA[v.localizacaoOclusao];
    if (v.status === "Ocluída") v.velocidade = "Normocinético";
    out[a] = v;
  });
  return out;
}

const ehMasculino = (nome) => nome.startsWith("Tronco");

function ladoTexto(nome, lado) {
  const m = ehMasculino(nome);
  if (lado === "Direito") return m ? "direito" : "direita";
  return m ? "esquerdo" : "esquerda";
}

export function nomeComLado(nome, lado) {
  return `${nome} ${ladoTexto(nome, lado)}`;
}

function preenchido(v) {
  return v !== undefined && v !== null && String(v).trim() !== "";
}

export function isArteriaNormal(v) {
  return (
    v.status === "Pérvia" &&
    v.ateromatose === "Ausente" &&
    v.velocidade === "Normocinético" &&
    v.tipoOnda === "Trifásico" &&
    v.sentido === "Anterógrado" &&
    !v.reabitada &&
    v.placa === "Ausente" &&
    (v.stent || "Ausente") === "Ausente" &&
    !v.aneurisma &&
    !v.disseccao
  );
}

function textoOclusao(v) {
  if (v.localizacaoOclusao === "Total") return "oclusão total";
  if (preenchido(v.localizacaoOclusao)) return `oclusão em ${v.localizacaoOclusao.toLowerCase()}`;
  return "oclusão";
}

function textoPlaca(v) {
  let t = `placa ${preenchido(v.caracteristicaPlaca) ? v.caracteristicaPlaca.toLowerCase() : "ateromatosa"}`;
  if (preenchido(v.localizacaoPlaca)) t += ` em ${v.localizacaoPlaca.toLowerCase()}`;
  if (preenchido(v.estenosePercentual)) t += ` determinando estenose de ${v.estenosePercentual}%`;
  return t;
}

function textoExtras(v) {
  const partes = [];
  if (v.stent && v.stent !== "Ausente") partes.push(`stent ${v.stent.toLowerCase()}`);
  if (v.aneurisma) {
    partes.push(`dilatação aneurismática${preenchido(v.aneurismaDiametro) ? ` com diâmetro de ${v.aneurismaDiametro} mm` : ""}`);
  }
  if (v.disseccao) partes.push("sinais de dissecção");
  return partes;
}

// Uma linha da descrição, ex.: "Artéria Poplítea direita: pérvia, fluxo normocinético, ..."
export function descreverArteria(nome, v, lado) {
  const masc = ehMasculino(nome);
  const partes = [];
  if (v.status === "Ocluída") {
    partes.push(textoOclusao(v), "ausência de fluxo");
    if (v.ateromatose !== "Ausente") partes.push(`ateromatose ${v.ateromatose.toLowerCase()}`);
  } else {
    partes.push(masc ? "pérvio" : "pérvia");
    if (v.ateromatose !== "Ausente") partes.push(`ateromatose ${v.ateromatose.toLowerCase()}`);
    partes.push(`fluxo ${v.velocidade.toLowerCase()}`);
    partes.push(`padrão ${v.tipoOnda.toLowerCase()}`);
    partes.push(`sentido ${v.sentido.toLowerCase()}`);
    if (v.reabitada) partes.push(masc ? "reabitado por colaterais" : "reabitada por colaterais");
    if (v.placa === "Presente") partes.push(textoPlaca(v));
  }
  partes.push(...textoExtras(v));
  return `${nomeComLado(nome, lado)}: ${partes.join(", ")}.`;
}

export function getDescricaoEstenose(percentual, alvo) {
  const p = parseFloat(percentual);
  if (p < 50) return `Estenose menor que 50% em ${alvo}`;
  if (p <= 70) return `Estenose de 50-70% em ${alvo}`;
  if (p <= 90) return `Estenose maior que 70% em ${alvo}`;
  if (p > 90) return `Estenose crítica maior que 90% em ${alvo}`;
  return `Estenose de ${percentual}% em ${alvo}`;
}

function sufixoLocal(loc) {
  return preenchido(loc) ? ` (${loc.toLowerCase()})` : "";
}

export function getConclusaoMembro(arterias, lado, enxerto) {
  const temEnxerto = enxerto && preenchido(enxerto.tipo);
  const valores = ARTERIAS.map((nome) => [nome, arterias[nome] || estruturaArteria]);
  if (!temEnxerto && valores.every(([, v]) => isArteriaNormal(v))) {
    return ["Exame compatível com normalidade."];
  }

  const linhas = [];
  if (valores.some(([, v]) => v.ateromatose !== "Ausente")) linhas.push("Ateromatose.");

  valores.forEach(([nome, v]) => {
    const alvo = nomeComLado(nome, lado);
    if (v.status === "Ocluída") {
      linhas.push(`Oclusão em ${alvo}${sufixoLocal(v.localizacaoOclusao)}`);
    }
  });

  valores.forEach(([nome, v]) => {
    if (v.status === "Ocluída" || v.placa !== "Presente") return;
    const alvo = nomeComLado(nome, lado);
    if (preenchido(v.estenosePercentual)) {
      linhas.push(getDescricaoEstenose(v.estenosePercentual, alvo) + sufixoLocal(v.localizacaoPlaca));
    } else {
      linhas.push(`Placa ateromatosa em ${alvo}${sufixoLocal(v.localizacaoPlaca)}`);
    }
  });

  valores.forEach(([nome, v]) => {
    if (v.status === "Ocluída") return;
    const partes = [];
    if (v.velocidade !== "Normocinético") partes.push(v.velocidade.toLowerCase());
    if (v.tipoOnda !== "Trifásico") partes.push(v.tipoOnda.toLowerCase());
    if (v.sentido !== "Anterógrado") partes.push(v.sentido.toLowerCase());
    if (v.reabitada) partes.push("reabitado por colaterais");
    if (partes.length) linhas.push(`Fluxo ${partes.join(", ")} em ${nomeComLado(nome, lado)}`);
  });

  valores.forEach(([nome, v]) => {
    const alvo = nomeComLado(nome, lado);
    if (v.stent && v.stent !== "Ausente") linhas.push(`Stent ${v.stent.toLowerCase()} em ${alvo}`);
    if (v.aneurisma) {
      linhas.push(`Aneurisma de ${alvo}${preenchido(v.aneurismaDiametro) ? ` (${v.aneurismaDiametro} mm)` : ""}`);
    }
    if (v.disseccao) linhas.push(`Dissecção em ${alvo}`);
  });

  if (temEnxerto) {
    linhas.push(`Enxerto ${enxerto.tipo.toLowerCase()}${preenchido(enxerto.status) ? ` ${enxerto.status.toLowerCase()}` : ""}`);
  }

  return linhas;
}

export function gerarCabecalhoLaudo({ nome, idade, data }) {
  return `PACIENTE: ${nome}, ${idade} anos\nDATA: ${data}\n`;
}

export function gerarBlocoMembro(lado, arterias, enxerto) {
  let t = `DOPPLER ARTERIAL DE MEMBRO INFERIOR ${lado.toUpperCase()}\n`;
  ARTERIAS.forEach((nome) => {
    const v = arterias[nome] || estruturaArteria;
    t += descreverArteria(nome, v, lado) + "\n";
    if (preenchido(v.observacao)) t += `  ${v.observacao.trim()}\n`;
  });
  if (enxerto && preenchido(enxerto.tipo)) {
    t += `Enxerto ${enxerto.tipo.toLowerCase()}: ${preenchido(enxerto.status) ? enxerto.status.toLowerCase() : "situação não informada"}.\n`;
  }
  t += "\nCONCLUSÃO\n";
  t += getConclusaoMembro(arterias, lado, enxerto).join("\n") + "\n";
  return t;
}

export function ladosDoExame(lado) {
  if (lado === "Ambos") return ["Direito", "Esquerdo"];
  if (lado === "Direito" || lado === "Esquerdo") return [lado];
  return [];
}

export const SEPARADOR_MEMBROS = "=".repeat(80);

export function gerarLaudoCompleto({ nome, idade, data, lado, arteriasDireito, arteriasEsquerdo, enxertos }) {
  const blocos = ladosDoExame(lado).map((l) =>
    gerarBlocoMembro(l, l === "Direito" ? arteriasDireito : arteriasEsquerdo, enxertos?.[l])
  );
  return gerarCabecalhoLaudo({ nome, idade, data }) + "\n" + blocos.join(`\n${SEPARADOR_MEMBROS}\n`);
}
