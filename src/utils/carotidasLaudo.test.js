import {
  vasoPadrao,
  normalizarVaso,
  descreverVaso,
  gerarConclusaoCarotidas,
  montarLaudo,
  validarVasos,
  paraDesenhoArterial,
  VASOS_CAROTIDAS,
} from "./carotidasLaudo";

function vasos(alt = {}) {
  const v = Object.fromEntries(VASOS_CAROTIDAS.map((k) => [k, vasoPadrao()]));
  Object.entries(alt).forEach(([k, c]) => Object.assign(v[k], c));
  return v;
}

function laudo(alt) {
  const v = vasos(alt);
  return montarLaudo({
    nome: "Fulano", idade: "70", data: "2026-10-09",
    carotidasDireitas: { ACCD: v.ACCD, ACID: v.ACID, ACED: v.ACED },
    carotidasEsquerdas: { ACCE: v.ACCE, ACIE: v.ACIE, ACEE: v.ACEE },
    vertebrais: { AVD: v.AVD, AVE: v.AVE },
  });
}

describe("Carótidas e vertebrais: laudo", () => {
  it("exame normal", () => {
    const t = laudo();
    expect(t).toContain("**Sistema Carotídeo Direito**\nArtéria carótida comum direita: pérvia, fluxo sem alteração.\n");
    expect(t).toContain("**CONCLUSÃO:**\nArtérias carótidas e vertebrais pérvias, sem alterações hemodinâmicas.");
  });

  it("oclusão total ou por terço", () => {
    const t = laudo({ ACID: { status: "ocluída" }, AVE: { status: "ocluída", localizacaoOclusao: "terço proximal" } });
    expect(t).toContain("Artéria carótida interna direita: ocluída (oclusão total).");
    expect(t).toContain("Artéria vertebral esquerda: ocluída (oclusão no terço proximal).");
    expect(gerarConclusaoCarotidas(vasos({ ACID: { status: "ocluída" }, AVE: { status: "ocluída", localizacaoOclusao: "terço proximal" } })))
      .toBe("Oclusão total de artéria carótida interna direita.\nOclusão de artéria vertebral esquerda no terço proximal.");
  });

  it("estenose com local e tipo de placa", () => {
    const v = vasos({ ACIE: { estenose: "50% a 70%", localizacaoEstenose: "terço proximal", tipoPlaca: "mista", ateromatose: "moderada" } });
    expect(descreverVaso(v.ACIE, "ACIE"))
      .toBe("Artéria carótida interna esquerda: pérvia, fluxo sem alteração, ateromatose moderada, estenose 50% a 70% no terço proximal com placa mista.");
    expect(gerarConclusaoCarotidas(v)).toBe("Estenose 50% a 70% em artéria carótida interna esquerda (terço proximal) com placa mista.");
  });

  it("stent pérvio / com reestenose / ocluído, dissecção e aneurisma", () => {
    const v = vasos({
      ACID: { stent: "com reestenose" },
      ACCE: { disseccao: true },
      ACCD: { aneurisma: true, aneurismaDiametro: "12.5", imt: "0.9" },
    });
    expect(descreverVaso(v.ACID, "ACID")).toBe("Artéria carótida interna direita: pérvia, fluxo sem alteração, stent com reestenose.");
    expect(descreverVaso(v.ACCD, "ACCD")).toBe("Artéria carótida comum direita: pérvia, fluxo sem alteração, dilatação aneurismática (12,5 mm), IMT 0.9 mm.");
    expect(gerarConclusaoCarotidas(v)).toBe([
      "Dilatação aneurismática de artéria carótida comum direita (12,5 mm).",
      "Stent com reestenose em artéria carótida interna direita.",
      "Dissecção de artéria carótida comum esquerda.",
    ].join("\n"));
  });

  it("exame antigo: stent 'presente' vira pérvio e ganha os campos novos", () => {
    const n = normalizarVaso({ status: "pérvia", fluxo: "sem alteração", ateromatose: "ausente", estenose: "ausente", tipoPlaca: "", stent: "presente", observacao: "" });
    expect(n.stent).toBe("pérvio");
    expect(n.localizacaoOclusao).toBe("total");
    expect(n.disseccao).toBe(false);
  });

  it("tipo de placa obrigatório com estenose (não em vaso ocluído)", () => {
    expect(validarVasos(vasos({ ACID: { estenose: ">70%" } }))).toMatch(/ACID/);
    expect(validarVasos(vasos({ ACID: { estenose: ">70%", status: "ocluída" } }))).toBeNull();
  });

  it("convertido para o desenho arterial comum", () => {
    const d = paraDesenhoArterial({ ...vasoPadrao(), estenose: ">70%", localizacaoEstenose: "terço distal", tipoPlaca: "calcificada", stent: "ocluído", status: "ocluída", localizacaoOclusao: "terço médio" });
    expect(d).toMatchObject({ status: "Ocluída", localizacaoOclusao: "Terço médio", placa: "Presente", estenosePercentual: "80", localizacaoPlaca: "Terço distal", caracteristicaPlaca: "Calcificada", stent: "Ocluído" });
  });
});
