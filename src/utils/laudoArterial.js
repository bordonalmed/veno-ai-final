// Laudo do Doppler Arterial (membros inferiores e superiores): opções dos
// campos, estrutura de dados e geração do texto (descrição + conclusão).
// A lista de artérias e o nome do membro vêm de cada exame
// (mmiiArterialLaudo.js / mmssArterialLaudo.js) via criarLaudoArterial.

export const statusOptions = ["Pérvia", "Ocluída"];
export const localizacaoOclusaoOptions = ["Terço proximal", "Terço médio", "Terço distal", "Total"];
export const localizacaoPlacaOptions = ["Terço proximal", "Terço médio", "Terço distal"];
export const ateromatoseOptions = ["Ausente", "Discreta", "Moderada", "Severa"];
export const velocidadeOptions = ["Normocinético", "Hipercinético", "Hipocinético"];
export const tipoOndaOptions = ["Trifásico", "Bifásico", "Monofásico", "Amortecido (tardus-parvus)"];
export const sentidoOptions = ["Anterógrado", "Retrógrado"];
export const placaOptions = ["Ausente", "Presente"];
export const caracteristicaPlacaOptions = ["Calcificada", "Lipídica", "Mista"];
export const aneurismaFormaOptions = ["Fusiforme", "Sacular"];
export const stentOptions = ["Ausente", "Pérvio", "Com reestenose", "Ocluído"];

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
  // usados na aorta/ilíacas (calibre medido, forma do aneurisma, trombo mural)
  diametro: "",
  aneurismaForma: "",
  tromboMural: false,
  disseccao: false,
  observacao: "",
};

// Exames salvos antes desta versão usavam "Proximal/Medial/Distal".
const LOCALIZACAO_ANTIGA = { Proximal: "Terço proximal", Medial: "Terço médio", Distal: "Terço distal" };

// "Anastomose distal" -> "na anastomose distal"; "Ramo direito" -> "no ramo direito".
export function noLocal(local) {
  const l = String(local).trim();
  const fem = /^(anastomose|ilíaca|veia|artéria|origem|bifurcação)/i.test(l);
  return `${fem ? "na" : "no"} ${l.charAt(0).toLowerCase()}${l.slice(1)}`;
}

export function preenchido(v) {
  return v !== undefined && v !== null && String(v).trim() !== "";
}

// "22" -> "22 mm", "2.5" -> "2,5 mm"
function mm(valor) {
  return `${String(valor).trim().replace(".", ",")} mm`;
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
    partes.push(
      `dilatação aneurismática${preenchido(v.aneurismaForma) ? ` ${v.aneurismaForma.toLowerCase()}` : ""}` +
      `${preenchido(v.aneurismaDiametro) ? ` com diâmetro de ${mm(v.aneurismaDiametro)}` : ""}` +
      `${v.tromboMural ? ", com trombo mural" : ""}`
    );
  }
  if (v.disseccao) partes.push("sinais de dissecção");
  return partes;
}

// Uma linha da descrição, ex.: "Artéria Poplítea: pérvia, fluxo normocinético, ...".
// "Tronco Braquiocefálico" é masculino: "pérvio".
// Sem o lado: o título do bloco ("...MEMBRO INFERIOR DIREITO") já diz qual é.
export function descreverArteria(nome, v) {
  const partes = [];
  if (v.status === "Ocluída") {
    partes.push(textoOclusao(v), "ausência de fluxo");
    if (v.ateromatose !== "Ausente") partes.push(`ateromatose ${v.ateromatose.toLowerCase()}`);
  } else {
    partes.push(/^Tronco/.test(nome) ? "pérvio" : "pérvia");
    if (v.ateromatose !== "Ausente") partes.push(`ateromatose ${v.ateromatose.toLowerCase()}`);
    partes.push(`fluxo ${v.velocidade.toLowerCase()}`);
    partes.push(`padrão ${v.tipoOnda.toLowerCase()}`);
    partes.push(`sentido ${v.sentido.toLowerCase()}`);
    if (v.reabitada) partes.push("reabitada por colaterais");
    if (v.placa === "Presente") partes.push(textoPlaca(v));
  }
  // calibre medido (aorta/ilíacas) logo depois da perviedade
  if (preenchido(v.diametro)) partes.splice(1, 0, `calibre de ${mm(v.diametro)}`);
  partes.push(...textoExtras(v));
  return `${nome}: ${partes.join(", ")}.`;
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

export function gerarCabecalhoLaudo({ nome, idade, data }) {
  return `PACIENTE: ${nome}, ${idade} anos\nDATA: ${data}\n`;
}

export function ladosDoExame(lado) {
  if (lado === "Ambos") return ["Direito", "Esquerdo"];
  if (lado === "Direito" || lado === "Esquerdo") return [lado];
  return [];
}

export const SEPARADOR_MEMBROS = "=".repeat(80);

// Opções de cada exame:
// - arterias: nomes na ordem do laudo;
// - membro: "INFERIOR" ou "SUPERIOR";
// - soDireito: artérias que só existem no lado direito (tronco braquiocefálico);
// - extra: seções além das artérias (enxerto no MMII, manobras e FAV no MMSS).
//   descrever(extra) -> linhas antes da conclusão;
//   concluir(extra) -> { linhas, alterado }: linhas no fim da conclusão;
//   "alterado" impede o "Exame compatível com normalidade.".
export function criarLaudoArterial({ arterias: ARTERIAS, membro, soDireito = [], extra = {} }) {
  const descreverExtra = extra.descrever || (() => []);
  const concluirExtra = extra.concluir || (() => ({ linhas: [], alterado: false }));

  function arteriasDoLado(lado) {
    return lado === "Esquerdo" ? ARTERIAS.filter((a) => !soDireito.includes(a)) : ARTERIAS;
  }

  function arteriasPadrao() {
    return Object.fromEntries(ARTERIAS.map((a) => [a, { ...estruturaArteria }]));
  }

  function normalizarArterias(salvas) {
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

  function getConclusaoMembro(arterias, extraMembro, lado) {
    const ex = concluirExtra(extraMembro);
    const valores = arteriasDoLado(lado).map((nome) => [nome, arterias[nome] || estruturaArteria]);
    if (!ex.alterado && valores.every(([, v]) => isArteriaNormal(v))) {
      return ["Exame compatível com normalidade.", ...ex.linhas];
    }

    const linhas = [];
    if (valores.some(([, v]) => v.ateromatose !== "Ausente")) linhas.push("Ateromatose.");

    valores.forEach(([nome, v]) => {
      if (v.status === "Ocluída") {
        linhas.push(`Oclusão em ${nome}${sufixoLocal(v.localizacaoOclusao)}`);
      }
    });

    valores.forEach(([nome, v]) => {
      if (v.status === "Ocluída" || v.placa !== "Presente") return;
      if (preenchido(v.estenosePercentual)) {
        linhas.push(getDescricaoEstenose(v.estenosePercentual, nome) + sufixoLocal(v.localizacaoPlaca));
      } else {
        linhas.push(`Placa ateromatosa em ${nome}${sufixoLocal(v.localizacaoPlaca)}`);
      }
    });

    valores.forEach(([nome, v]) => {
      if (v.status === "Ocluída") return;
      const partes = [];
      if (v.velocidade !== "Normocinético") partes.push(v.velocidade.toLowerCase());
      if (v.tipoOnda !== "Trifásico") partes.push(v.tipoOnda.toLowerCase());
      if (v.sentido !== "Anterógrado") partes.push(v.sentido.toLowerCase());
      if (v.reabitada) partes.push("reabitado por colaterais");
      if (partes.length) linhas.push(`Fluxo ${partes.join(", ")} em ${nome}`);
    });

    valores.forEach(([nome, v]) => {
      if (v.stent && v.stent !== "Ausente") linhas.push(`Stent ${v.stent.toLowerCase()} em ${nome}`);
      if (v.aneurisma) {
        linhas.push(
          `Aneurisma ${preenchido(v.aneurismaForma) ? `${v.aneurismaForma.toLowerCase()} ` : ""}de ${nome}` +
          `${preenchido(v.aneurismaDiametro) ? ` (${mm(v.aneurismaDiametro)})` : ""}${v.tromboMural ? ", com trombo mural" : ""}`
        );
      }
      if (v.disseccao) linhas.push(`Dissecção em ${nome}`);
    });

    return [...linhas, ...ex.linhas];
  }

  function gerarBlocoMembro(lado, arterias, extraMembro) {
    let t = `DOPPLER ARTERIAL DE MEMBRO ${membro} ${lado.toUpperCase()}\n`;
    arteriasDoLado(lado).forEach((nome) => {
      const v = arterias[nome] || estruturaArteria;
      t += descreverArteria(nome, v) + "\n";
      if (preenchido(v.observacao)) t += `  ${v.observacao.trim()}\n`;
    });
    descreverExtra(extraMembro).forEach((linha) => { t += linha + "\n"; });
    t += "\nCONCLUSÃO\n";
    t += getConclusaoMembro(arterias, extraMembro, lado).join("\n") + "\n";
    return t;
  }

  // "extras" por lado ({ Direito, Esquerdo }); "enxertos" é o nome usado pelo MMII.
  function gerarLaudoCompleto({ nome, idade, data, lado, arteriasDireito, arteriasEsquerdo, extras, enxertos }) {
    const porLado = extras || enxertos;
    const blocos = ladosDoExame(lado).map((l) =>
      gerarBlocoMembro(l, l === "Direito" ? arteriasDireito : arteriasEsquerdo, porLado?.[l])
    );
    return gerarCabecalhoLaudo({ nome, idade, data }) + "\n" + blocos.join(`\n${SEPARADOR_MEMBROS}\n`);
  }

  return {
    ARTERIAS,
    arteriasDoLado,
    arteriasPadrao,
    normalizarArterias,
    getConclusaoMembro,
    gerarBlocoMembro,
    gerarLaudoCompleto,
  };
}
