import {
  arteriasPadrao,
  extraPadrao,
  getConclusaoMembro,
  gerarLaudoCompleto,
  descreverArteria,
  normalizarArterias,
  ARTERIAS,
} from "./aortaIliacasLaudo";

function exame(alt) {
  const a = arteriasPadrao();
  Object.entries(alt).forEach(([n, c]) => Object.assign(a[n], c));
  return a;
}

describe("Aorta e ilíacas: laudo", () => {
  it("exame normal com título e as duas seções", () => {
    const t = gerarLaudoCompleto({ nome: "Fulano", idade: "70", data: "2026-10-09", arterias: arteriasPadrao(), extra: extraPadrao() });
    expect(t.startsWith("PACIENTE: Fulano, 70 anos\nDATA: 2026-10-09\n")).toBe(true);
    expect(t).toContain("DOPPLER DE AORTA ABDOMINAL E ARTÉRIAS ILÍACAS");
    expect(t).toContain("Aorta abdominal:\nAorta Suprarrenal: pérvia,");
    expect(t).toContain("Artérias ilíacas:\nArtéria Ilíaca Comum Direita: pérvia,");
    expect(t).toContain("CONCLUSÃO\nExame compatível com normalidade.");
    expect(t).not.toMatch(/MEMBRO/);
  });

  it("calibre aparece logo depois da perviedade, com vírgula", () => {
    const v = { ...arteriasPadrao()["Aorta Infrarrenal"], diametro: "18.5" };
    expect(descreverArteria("Aorta Infrarrenal", v)).toMatch(/^Aorta Infrarrenal: pérvia, calibre de 18,5 mm, fluxo/);
  });

  it("aneurisma fusiforme com diâmetro e trombo mural", () => {
    const a = exame({ "Aorta Infrarrenal": { aneurisma: true, aneurismaForma: "Fusiforme", aneurismaDiametro: "52", tromboMural: true } });
    expect(descreverArteria("Aorta Infrarrenal", a["Aorta Infrarrenal"]))
      .toContain("dilatação aneurismática fusiforme com diâmetro de 52 mm, com trombo mural");
    expect(getConclusaoMembro(a, extraPadrao())).toEqual(["Aneurisma fusiforme de Aorta Infrarrenal (52 mm), com trombo mural"]);
  });

  it("estenose e oclusão de ilíacas", () => {
    const a = exame({
      "Artéria Ilíaca Comum Esquerda": { placa: "Presente", estenosePercentual: "75", localizacaoPlaca: "Terço proximal" },
      "Artéria Ilíaca Externa Direita": { status: "Ocluída", localizacaoOclusao: "Total" },
    });
    expect(getConclusaoMembro(a, extraPadrao())).toEqual([
      "Oclusão em Artéria Ilíaca Externa Direita (total)",
      "Estenose maior que 70% em Artéria Ilíaca Comum Esquerda (terço proximal)",
    ]);
  });

  it("endoprótese: feminino, endoleak e saco aneurismático", () => {
    const ex = { enxerto: { tipo: "Endoprótese aórtica (EVAR)", status: "Pérvio", endoleak: "Tipo II", sacoDiametro: "58" } };
    const t = gerarLaudoCompleto({ nome: "A", idade: "75", data: "2026-10-09", arterias: arteriasPadrao(), extra: ex });
    expect(t).toContain("ENDOPRÓTESE / ENXERTO\nEndoprótese aórtica (EVAR) pérvia, com vazamento (endoleak) tipo II.");
    expect(t).toContain("Saco aneurismático com diâmetro de 58 mm.");
    expect(getConclusaoMembro(arteriasPadrao(), ex)).toEqual([
      "Endoprótese aórtica (EVAR) pérvia, com vazamento (endoleak) tipo II (saco aneurismático de 58 mm)",
    ]);
  });

  it("enxerto convencional (masculino) sem endoleak", () => {
    const ex = { enxerto: { tipo: "Enxerto aorto-bifemoral", status: "Pérvio", endoleak: "Tipo I", sacoDiametro: "" } };
    expect(getConclusaoMembro(arteriasPadrao(), ex)).toEqual(["Enxerto aorto-bifemoral pérvio"]);
  });

  it("local da estenose/oclusão do enxerto", () => {
    const ex = { enxerto: { tipo: "Enxerto aorto-bifemoral", status: "Ocluído", local: "Ramo esquerdo" } };
    expect(getConclusaoMembro(arteriasPadrao(), ex)).toEqual(["Enxerto aorto-bifemoral ocluído em ramo esquerdo"]);
    const evar = { enxerto: { tipo: "Endoprótese aórtica (EVAR)", status: "Com estenose", local: "Ramo ilíaco direito", endoleak: "Ausente" } };
    expect(getConclusaoMembro(arteriasPadrao(), evar)).toEqual([
      "Endoprótese aórtica (EVAR) com estenose em ramo ilíaco direito, sem sinais de vazamento (endoleak)",
    ]);
    // pérvio ignora local que tenha ficado salvo
    expect(getConclusaoMembro(arteriasPadrao(), { enxerto: { tipo: "Enxerto aorto-bi-ilíaco", status: "Pérvio", local: "Ramo direito" } }))
      .toEqual(["Enxerto aorto-bi-ilíaco pérvio"]);
  });

  it("exame salvo antigo ganha os campos novos", () => {
    const n = normalizarArterias({ "Aorta Infrarrenal": { status: "Ocluída", localizacaoOclusao: "Medial" } });
    expect(Object.keys(n)).toEqual(ARTERIAS);
    expect(n["Aorta Infrarrenal"].localizacaoOclusao).toBe("Terço médio");
    expect(n["Aorta Suprarrenal"].diametro).toBe("");
  });
});
