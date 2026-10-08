import {
  arteriasPadrao,
  normalizarArterias,
  getConclusaoMembro,
  descreverArteria,
  gerarLaudoCompleto,
  ARTERIAS,
} from "./mmssArterialLaudo";

function membro(alteracoes) {
  const a = arteriasPadrao();
  Object.entries(alteracoes).forEach(([nome, campos]) => Object.assign(a[nome], campos));
  return a;
}

describe("MMSS: conclusão do membro", () => {
  it("exame normal", () => {
    expect(getConclusaoMembro(arteriasPadrao())).toEqual(["Exame compatível com normalidade."]);
  });

  it("subclávia com fluxo retrógrado gera conclusão (antes ficava vazia)", () => {
    expect(getConclusaoMembro(membro({ "Artéria Subclávia": { sentido: "Retrógrado" } })))
      .toEqual(["Fluxo retrógrado em Artéria Subclávia"]);
  });

  it("radial monofásica gera conclusão (antes ficava vazia)", () => {
    expect(getConclusaoMembro(membro({ "Artéria Radial": { tipoOnda: "Monofásico" } })))
      .toEqual(["Fluxo monofásico em Artéria Radial"]);
  });

  it("estenose de 60% sem tipo de placa aparece (antes sumia)", () => {
    const a = membro({ "Artéria Subclávia": { placa: "Presente", estenosePercentual: "60" } });
    expect(getConclusaoMembro(a)).toEqual(["Estenose de 50-70% em Artéria Subclávia"]);
    expect(descreverArteria("Artéria Subclávia", a["Artéria Subclávia"])).toContain("determinando estenose de 60%");
  });

  it("oclusão sem 'Artéria Artéria' e sem lado", () => {
    const c = getConclusaoMembro(membro({ "Artéria Subclávia": { status: "Ocluída", localizacaoOclusao: "Terço médio" } }));
    expect(c).toEqual(["Oclusão em Artéria Subclávia (terço médio)"]);
    expect(c.join(" ")).not.toMatch(/Artéria Artéria|direita|esquerda/);
  });
});

describe("MMSS: dados antigos e laudo completo", () => {
  it("converte 'Medial' para 'Terço médio'", () => {
    const n = normalizarArterias({ "Artéria Axilar": { status: "Ocluída", localizacaoOclusao: "Medial" } });
    expect(n["Artéria Axilar"].localizacaoOclusao).toBe("Terço médio");
    expect(Object.keys(n)).toEqual(ARTERIAS);
  });

  it("título de membro superior, sem 'DOPPLER ARTERIAL DE MMSS' duplicado", () => {
    const t = gerarLaudoCompleto({
      nome: "Fulana", idade: "50", data: "2026-10-08", lado: "Ambos",
      arteriasDireito: arteriasPadrao(), arteriasEsquerdo: arteriasPadrao(),
    });
    expect(t.startsWith("PACIENTE: Fulana, 50 anos\nDATA: 2026-10-08\n")).toBe(true);
    expect(t).not.toContain("DOPPLER ARTERIAL DE MMSS");
    expect(t).toContain("DOPPLER ARTERIAL DE MEMBRO SUPERIOR DIREITO");
    expect(t).toContain("DOPPLER ARTERIAL DE MEMBRO SUPERIOR ESQUERDO");
    expect(t).toContain("Artéria Subclávia: pérvia,");
    expect(t).not.toContain("INFERIOR");
  });
});
