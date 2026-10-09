import {
  arteriasPadrao,
  normalizarArterias,
  getConclusaoMembro,
  descreverArteria,
  gerarLaudoCompleto,
  ARTERIAS,
  gerarBlocoMembro,
} from "./mmiiArterialLaudo";

function membro(alteracoes) {
  const a = arteriasPadrao();
  Object.entries(alteracoes).forEach(([nome, campos]) => Object.assign(a[nome], campos));
  return a;
}

describe("conclusão do membro", () => {
  it("exame normal", () => {
    expect(getConclusaoMembro(arteriasPadrao())).toEqual(["Exame compatível com normalidade."]);
  });

  it("só onda monofásica gera conclusão (antes ficava vazia)", () => {
    const c = getConclusaoMembro(membro({ "Artéria Tibial Anterior": { tipoOnda: "Monofásico" } }));
    expect(c).toEqual(["Fluxo monofásico em Artéria Tibial Anterior"]);
  });

  it("só fluxo retrógrado gera conclusão (antes ficava vazia)", () => {
    const c = getConclusaoMembro(membro({ "Artéria Poplítea": { sentido: "Retrógrado" } }));
    expect(c).toEqual(["Fluxo retrógrado em Artéria Poplítea"]);
  });

  it("estenose sem tipo de placa aparece (antes sumia)", () => {
    const a = membro({ "Artéria Femoral Superficial": { placa: "Presente", estenosePercentual: "60", localizacaoPlaca: "Terço médio" } });
    expect(getConclusaoMembro(a)).toEqual(["Estenose de 50-70% em Artéria Femoral Superficial (terço médio)"]);
    expect(descreverArteria("Artéria Femoral Superficial", a["Artéria Femoral Superficial"]))
      .toContain("placa ateromatosa em terço médio determinando estenose de 60%");
  });

  it("placa sem estenose é relatada", () => {
    const a = membro({ "Artéria Femoral Comum": { placa: "Presente", caracteristicaPlaca: "Calcificada" } });
    expect(getConclusaoMembro(a)).toEqual(["Placa ateromatosa em Artéria Femoral Comum"]);
    expect(descreverArteria("Artéria Femoral Comum", a["Artéria Femoral Comum"])).toContain("placa calcificada");
  });

  it("oclusão sem 'Artéria Artéria' e com terço médio", () => {
    const c = getConclusaoMembro(
      membro({ "Artéria Femoral Superficial": { status: "Ocluída", localizacaoOclusao: "Terço médio", ateromatose: "Moderada" } })
    );
    expect(c).toEqual(["Ateromatose.", "Oclusão em Artéria Femoral Superficial (terço médio)"]);
    expect(c.join(" ")).not.toContain("Artéria Artéria");
  });

  it("artéria ocluída mantém a ateromatose na descrição", () => {
    const v = { ...arteriasPadrao()["Artéria Poplítea"], status: "Ocluída", localizacaoOclusao: "Total", ateromatose: "Severa" };
    expect(descreverArteria("Artéria Poplítea", v))
      .toBe("Artéria Poplítea: oclusão total, ausência de fluxo, ateromatose severa.");
  });

  it("achados novos: reabitação, stent, aneurisma, dissecção e enxerto", () => {
    const a = membro({
      "Artéria Tibial Posterior": { tipoOnda: "Amortecido (tardus-parvus)", reabitada: true },
      "Artéria Femoral Superficial": { stent: "Com reestenose" },
      "Artéria Poplítea": { aneurisma: true, aneurismaDiametro: "22" },
      "Artéria Femoral Comum": { disseccao: true },
    });
    const c = getConclusaoMembro(a, { tipo: "Femoropoplíteo acima do joelho", status: "Pérvio" });
    expect(c).toEqual([
      "Fluxo amortecido (tardus-parvus), reabitado por colaterais em Artéria Tibial Posterior",
      "Dissecção em Artéria Femoral Comum",
      "Stent com reestenose em Artéria Femoral Superficial",
      "Aneurisma de Artéria Poplítea (22 mm)",
      "Enxerto femoropoplíteo acima do joelho pérvio",
    ]);
  });
});

describe("enxerto: origem e destino", () => {
  it("femorodistal da femoral superficial para a tibial anterior; femoropoplíteo da femoral superficial", () => {
    expect(getConclusaoMembro(arteriasPadrao(), { tipo: "Femorodistal", origem: "Femoral superficial", destino: "Tibial anterior", status: "Pérvio" }))
      .toEqual(["Enxerto femorodistal (da femoral superficial para a tibial anterior) pérvio"]);
    expect(gerarBlocoMembro("Direito", arteriasPadrao(), { tipo: "Femoropoplíteo abaixo do joelho", origem: "Femoral superficial", status: "Ocluído", local: "Anastomose distal" }))
      .toContain("Enxerto femoropoplíteo abaixo do joelho (da femoral superficial): ocluído na anastomose distal.");
    // cruzado não tem origem/destino; destino só no femorodistal
    expect(getConclusaoMembro(arteriasPadrao(), { tipo: "Fêmoro-femoral cruzado", origem: "Femoral superficial", destino: "Fibular", status: "Pérvio" }))
      .toEqual(["Enxerto fêmoro-femoral cruzado pérvio"]);
  });
});

describe("normalizarArterias (exames salvos antes da mudança)", () => {
  it("converte localização antiga e completa artérias novas", () => {
    const antigas = { "Artéria Poplítea": { status: "Ocluída", localizacaoOclusao: "Medial", velocidade: "Ausência de fluxo" } };
    const n = normalizarArterias(antigas);
    expect(n["Artéria Poplítea"].localizacaoOclusao).toBe("Terço médio");
    expect(Object.keys(n)).toEqual(ARTERIAS);
    expect(n["Artéria Tibial Anterior"].status).toBe("Pérvia");
  });
});

describe("laudo completo", () => {
  it("cabeçalho do paciente uma vez e um bloco por membro, sem título duplicado", () => {
    const t = gerarLaudoCompleto({
      nome: "Fulano", idade: "60", data: "2026-10-07", lado: "Ambos",
      arteriasDireito: arteriasPadrao(), arteriasEsquerdo: arteriasPadrao(), enxertos: {},
    });
    expect(t.startsWith("PACIENTE: Fulano, 60 anos\nDATA: 2026-10-07\n")).toBe(true);
    expect(t).not.toContain("DOPPLER ARTERIAL DE MMII");
    expect(t).toContain("DOPPLER ARTERIAL DE MEMBRO INFERIOR DIREITO");
    expect(t).toContain("DOPPLER ARTERIAL DE MEMBRO INFERIOR ESQUERDO");
    // as linhas não repetem o lado: o título do bloco já diz qual é
    expect(t).toContain("Artéria Femoral Comum: pérvia,");
    expect(t).not.toMatch(/(direita|esquerda):/);
  });
});
