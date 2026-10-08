import {
  arteriasPadrao,
  normalizarArterias,
  getConclusaoMembro,
  descreverArteria,
  gerarLaudoCompleto,
  ARTERIAS,
  extraPadrao,
  normalizarExtra,
  gerarBlocoMembro,
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

describe("MMSS: tronco braquiocefálico, desfiladeiro e pré-FAV", () => {
  it("tronco braquiocefálico só no lado direito", () => {
    const a = arteriasPadrao();
    expect(gerarBlocoMembro("Direito", a)).toContain("Tronco Braquiocefálico: pérvio,");
    expect(gerarBlocoMembro("Esquerdo", a)).not.toContain("Tronco Braquiocefálico");
    // alteração no tronco não vaza para a conclusão do lado esquerdo
    const t = membro({ "Tronco Braquiocefálico": { placa: "Presente", estenosePercentual: "80" } });
    expect(getConclusaoMembro(t, undefined, "Direito")).toEqual(["Estenose maior que 70% em Tronco Braquiocefálico"]);
    expect(getConclusaoMembro(t, undefined, "Esquerdo")).toEqual(["Exame compatível com normalidade."]);
  });

  it("manobras positivas entram na descrição e na conclusão", () => {
    const extra = extraPadrao();
    extra.manobras.realizadas = true;
    extra.manobras.resultados["Abdução a 90° com rotação externa"] = "Abolição do fluxo";
    extra.manobras.resultados["Hiperabdução de Wright"] = "Redução do fluxo";
    const t = gerarBlocoMembro("Esquerdo", arteriasPadrao(), extra);
    expect(t).toContain("MANOBRAS PARA DESFILADEIRO TORÁCICO (avaliação na artéria radial)");
    expect(t).toContain("Abdução a 90° com rotação externa: abolição do fluxo.");
    expect(t).toContain("Manobra de Adson: sem alteração.");
    expect(getConclusaoMembro(arteriasPadrao(), extra, "Esquerdo")).toEqual([
      "Manobras positivas para compressão arterial no desfiladeiro torácico: abdução a 90° com rotação externa (abolição do fluxo), hiperabdução de Wright (redução do fluxo)",
    ]);
  });

  it("manobras negativas mantêm a normalidade", () => {
    const extra = extraPadrao();
    extra.manobras.realizadas = true;
    expect(getConclusaoMembro(arteriasPadrao(), extra, "Direito")).toEqual([
      "Exame compatível com normalidade.",
      "Manobras para desfiladeiro torácico sem alterações.",
    ]);
  });

  it("mapeamento pré-FAV com diâmetros e arco palmar", () => {
    const extra = extraPadrao();
    extra.fav = { realizado: true, radialPunho: "2.3", ulnarPunho: "", braquialCotovelo: "4.1", arcoPalmar: "Completo" };
    const t = gerarBlocoMembro("Esquerdo", arteriasPadrao(), extra);
    expect(t).toContain("MAPEAMENTO PRÉ-FÍSTULA ARTERIOVENOSA");
    expect(t).toContain("Artéria radial no punho: diâmetro de 2,3 mm.");
    expect(t).not.toContain("ulnar no punho");
    expect(t).toContain("Arco palmar completo.");
    expect(getConclusaoMembro(arteriasPadrao(), extra, "Esquerdo")).toEqual([
      "Exame compatível com normalidade.",
      "Mapeamento pré-FAV: artéria radial no punho com 2,3 mm, artéria braquial na fossa cubital com 4,1 mm, arco palmar completo.",
    ]);
  });

  it("seções desmarcadas não aparecem; exames antigos ganham padrão", () => {
    const t = gerarBlocoMembro("Direito", arteriasPadrao(), extraPadrao());
    expect(t).not.toMatch(/MANOBRAS|PRÉ-FÍSTULA/);
    expect(normalizarExtra(undefined)).toEqual(extraPadrao());
    expect(normalizarExtra({ fav: { realizado: true, radialPunho: "2" } }).fav.radialPunho).toBe("2");
  });
});
