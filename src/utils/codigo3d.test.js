import { codificarExame3D, codificarExameArterial3D, codificarExameMMSS3D, codificarExameFAV3D, decodificarExame3D, linkExame3D } from "./codigo3d";
import { veiasProfundas, profOptions } from "./mmiiVenosoLaudo";

const prof = Object.fromEntries(veiasProfundas.map((v) => [v, profOptions[0]]));
const exame = {
  lado: "Direito",
  profundas: { ...prof, "Veia Poplítea": "não compressível e sem fluxo (sugestivo de trombose)" },
  superficiais: { JSF: "pérvia e incompetente", "Safena Magna": "ausente", JSP: "pérvia e competente", "Safena Parva": "pérvia e incompetente" },
  magna: { inicio: "JSF", inicio_valor: "", fim: "cm_acima_joelho", fim_valor: "8", coxa: "7.8", perna: "5,2", tornozelo: "", restante: "pérvia e incompetente" },
  parva: { inicio: "JSP", inicio_valor: "", fim: "cm_acima_tornozelo", fim_valor: "10.5", restante: "" },
  perfurantes: [{ status: "pérvia e incompetente", segmento: "cm acima do tornozelo", valor: "12" }, { status: "pérvia e competente", segmento: "", valor: "" }],
  varizes: { tracos: [
    { tipo: "Varizes Superficiais", vista: "anterior", pts: [[150, 405], [151, 406], [157, 420], [149, 436], [158, 452]] },
    { tipo: "Tromboflebite Superficial", vista: "posterior", pts: [[150, 100], [150, 500]] },
  ] },
};

it("ida e volta: os achados do membro voltam iguais (sem dados do paciente)", () => {
  const cod = codificarExame3D({ ...exame, nome: "Fulano de Tal", data: "2026-11-12" });
  expect(cod).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(cod).not.toMatch(/Fulano/);
  const d = decodificarExame3D(cod);
  expect(d.lado).toBe("Direito");
  expect(d.profundas["Veia Poplítea"]).toMatch(/trombose/);
  expect(d.superficiais).toEqual(exame.superficiais);
  expect(d.magna).toMatchObject({ inicio: "JSF", fim: "cm_acima_joelho", fim_valor: "8", coxa: "7.8", perna: "5.2", restante: "pérvia e incompetente" });
  expect(d.parva).toMatchObject({ inicio: "JSP", fim: "cm_acima_tornozelo", fim_valor: "10.5", restante: "" });
  expect(d.perfurantes).toEqual([{ status: "pérvia e incompetente", segmento: "cm acima do tornozelo", valor: "12" }]);
  expect(d.varizes.tracos).toHaveLength(2);
  expect(d.varizes.tracos[0]).toMatchObject({ tipo: "Varizes Superficiais", vista: "anterior" });
  expect(d.varizes.tracos[0].pts[0]).toEqual([150, 405]);
  expect(d.varizes.tracos[0].pts[d.varizes.tracos[0].pts.length - 1]).toEqual([158, 452]);
  // salto grande vira passos intermediários e chega no mesmo ponto
  expect(d.varizes.tracos[1]).toMatchObject({ tipo: "Tromboflebite Superficial", vista: "posterior" });
  expect(d.varizes.tracos[1].pts[d.varizes.tracos[1].pts.length - 1]).toEqual([150, 500]);
});

it("link curto o bastante para um QR Code impresso", () => {
  const link = linkExame3D(exame, "https://venoai.xyz");
  expect(link.startsWith("https://venoai.xyz/3d#")).toBe(true);
  expect(link.length).toBeLessThan(400);
});

it("código estragado dá erro (a página mostra aviso)", () => {
  expect(() => decodificarExame3D("xyz")).toThrow();
});

describe("código 3D do Doppler arterial", () => {
  const base = { status: "Pérvia", localizacaoOclusao: "", ateromatose: "Ausente", velocidade: "Normocinético", tipoOnda: "Trifásico", placa: "Ausente", estenosePercentual: "", caracteristicaPlaca: "", localizacaoPlaca: "" };
  const arterias = {
    "Artéria Femoral Comum": { ...base },
    "Artéria Femoral Superficial": { ...base, placa: "Presente", estenosePercentual: "70", localizacaoPlaca: "Terço distal", caracteristicaPlaca: "Calcificada", ateromatose: "Moderada", tipoOnda: "Bifásico", velocidade: "Hipercinético" },
    "Artéria Poplítea": { ...base, status: "Ocluída", localizacaoOclusao: "Terço médio" },
    "Artéria Tibial Anterior": { ...base, status: "Ocluída", localizacaoOclusao: "Total", velocidade: "Hipocinético", tipoOnda: "Monofásico" },
  };

  it("ida e volta mantém os achados de cada artéria", () => {
    const d = decodificarExame3D(codificarExameArterial3D({ lado: "Direito", arterias }));
    expect(d.modo).toBe("arterial");
    expect(d.lado).toBe("Direito");
    for (const [nome, v] of Object.entries(arterias)) expect(d.arterias[nome]).toMatchObject(v);
    expect(d.arterias["Artéria Fibular"]).toBeUndefined();
  });

  it("o link arterial é curto e o venoso continua abrindo", () => {
    const link = linkExame3D({ modo: "arterial", lado: "Esquerdo", arterias }, "https://venoai.xyz");
    expect(link.length).toBeLessThan(120);
    expect(decodificarExame3D(link.split("#")[1]).lado).toBe("Esquerdo");
    const v = decodificarExame3D(linkExame3D({ lado: "Esquerdo", profundas: {}, superficiais: {}, magna: {}, parva: {}, perfurantes: [], varizes: { tracos: [] } }, "x").split("#")[1]);
    expect(v.modo).toBeUndefined();
    expect(v.lado).toBe("Esquerdo");
  });
});

describe("código 3D arterial: stent, aneurisma, dissecção, colaterais, sentido e enxerto", () => {
  it("leva todos os achados do 2D para o 3D", () => {
    const v = {
      status: "Pérvia", localizacaoOclusao: "", ateromatose: "Severa", velocidade: "Hipocinético", tipoOnda: "Amortecido (tardus-parvus)",
      placa: "Presente", estenosePercentual: "85", caracteristicaPlaca: "Mista", localizacaoPlaca: "Terço proximal",
      stent: "Com reestenose", aneurisma: true, aneurismaDiametro: "18.5", aneurismaForma: "Sacular", tromboMural: true,
      disseccao: true, reabitada: true, sentido: "Retrógrado", localizacaoStent: "Terço distal",
    };
    const enxerto = { tipo: "Femorodistal", origem: "Femoral superficial", destino: "Fibular", status: "Com estenose", local: "Anastomose distal" };
    const d = decodificarExame3D(codificarExameArterial3D({ lado: "Esquerdo", arterias: { "Artéria Poplítea": v }, enxerto }));
    expect(d.arterias["Artéria Poplítea"]).toEqual(v);
    expect(d.enxerto).toEqual(enxerto);
  });
});

describe("código 3D do Doppler venoso de MMSS", () => {
  it("leva o estado de cada veia, o fluxo contínuo, a fase do trombo e o cateter", () => {
    const veias = {
      "Veia Jugular Interna": { status: "Pérvia", fluxo: "Contínuo (não fásico)", fase: "", observacao: "" },
      "Veia Subclávia": { status: "Trombose oclusiva", fluxo: "Fásico", fase: "Aguda", observacao: "" },
      "Veia Basílica (braço)": { status: "Trombose parcial (não oclusiva)", fluxo: "Fásico", fase: "Crônica", observacao: "" },
      "Veia Cefálica (antebraço)": { status: "Ausente", fluxo: "Fásico", fase: "", observacao: "" },
    };
    const extra = { cateter: { presente: true, tipo: "PICC", veia: "Veia Basílica (braço)" } };
    const d = decodificarExame3D(codificarExameMMSS3D({ lado: "Direito", veias, extra }));
    expect(d.modo).toBe("mmssVenoso");
    expect(d.lado).toBe("Direito");
    expect(d.veias).toEqual(veias);
    expect(d.extra.cateter).toEqual(extra.cateter);
    expect(linkExame3D({ modo: "mmssVenoso", lado: "Direito", veias, extra }, "https://venoai.xyz").length).toBeLessThan(60);
  });
});

describe("código 3D do Doppler arterial de MMSS", () => {
  it("leva as artérias do membro superior (com o tronco braquiocefálico)", () => {
    const v = { status: "Pérvia", localizacaoOclusao: "", ateromatose: "Discreta", velocidade: "Normocinético", tipoOnda: "Bifásico", placa: "Presente", estenosePercentual: "65", caracteristicaPlaca: "Calcificada", localizacaoPlaca: "Terço proximal", stent: "Pérvio", aneurisma: false, aneurismaDiametro: "", aneurismaForma: "", tromboMural: false, disseccao: false, reabitada: false, sentido: "Anterógrado", localizacaoStent: "Toda a extensão" };
    const arterias = { "Tronco Braquiocefálico": { ...v, placa: "Ausente", estenosePercentual: "", caracteristicaPlaca: "", localizacaoPlaca: "", stent: "Ausente" }, "Artéria Subclávia": v, "Artéria Radial": { ...v, status: "Ocluída", localizacaoOclusao: "Terço distal", placa: "Ausente", estenosePercentual: "", caracteristicaPlaca: "", localizacaoPlaca: "", stent: "Ausente" } };
    const d = decodificarExame3D(linkExame3D({ modo: "mmssArterial", lado: "Direito", arterias }, "x").split("#")[1]);
    expect(d.modo).toBe("mmssArterial");
    expect(d.arterias["Artéria Subclávia"]).toEqual(v);
    expect(d.arterias["Tronco Braquiocefálico"].status).toBe("Pérvia");
    expect(d.arterias["Artéria Radial"].localizacaoOclusao).toBe("Terço distal");
  });
});

describe("código 3D das carótidas e vertebrais", () => {
  const { carotidasPara3D, vasoPadrao } = require("./carotidasLaudo");
  it("os 8 vasos, com estenose, oclusão, stent, dissecção e aneurisma", () => {
    const vasos = {
      ACID: { ...vasoPadrao(), estenose: ">70%", localizacaoEstenose: "terço proximal", tipoPlaca: "calcificada", ateromatose: "moderada" },
      ACIE: { ...vasoPadrao(), status: "ocluída", localizacaoOclusao: "total" },
      ACCD: { ...vasoPadrao(), stent: "com reestenose", disseccao: true },
      AVE: { ...vasoPadrao(), fluxo: "hipocinético", aneurisma: true, aneurismaDiametro: "6" },
    };
    const arterias = carotidasPara3D(vasos);
    expect(arterias.ACID).toMatchObject({ placa: "Presente", estenosePercentual: "80", localizacaoPlaca: "Terço proximal", caracteristicaPlaca: "Calcificada", ateromatose: "Moderada", velocidade: "Normocinético" });
    const d = decodificarExame3D(linkExame3D({ modo: "carotidas", arterias }, "x").split("#")[1]);
    expect(d.modo).toBe("carotidas");
    expect(Object.keys(d.arterias)).toHaveLength(8);
    for (const k of Object.keys(arterias)) expect(d.arterias[k]).toMatchObject({ status: arterias[k].status, placa: arterias[k].placa, estenosePercentual: arterias[k].estenosePercentual, stent: arterias[k].stent, disseccao: arterias[k].disseccao, aneurisma: arterias[k].aneurisma, velocidade: arterias[k].velocidade });
    expect(d.arterias.ACIE.status).toBe("Ocluída");
    expect(d.arterias.AVE.aneurismaDiametro).toBe("6");
  });
});

describe("código 3D da fístula arteriovenosa", () => {
  const { normalizarExtra } = require("./favLaudo");
  it("confecção: calibres, profundidade, parede, onda, situação e fluxo axilar", () => {
    const e = normalizarExtra(null);
    e.confeccao.arcoPalmar = "Incompleto";
    e.confeccao.sitios.radial = { diametro: "2.3", parede: "Calcificação discreta", onda: "Bifásico" };
    e.confeccao.sitios.cefalicaPunho = { situacao: "Pérvia", diametro: "1.8", profundidade: "3.5" };
    e.confeccao.sitios.basilicaBraco = { situacao: "Trombosada", diametro: "", profundidade: "" };
    e.confeccao.sitios.axilar = { situacao: "Pérvia", fluxo: "Contínuo (não fásico)" };
    const d = decodificarExame3D(codificarExameFAV3D({ lado: "Esquerdo", extra: e }));
    expect(d.modo).toBe("fav");
    expect(d.extra.confeccao).toEqual(e.confeccao);
  });
  it("avaliação: tipo, fluxo, medidas e alterações", () => {
    const e = normalizarExtra(null);
    e.modo = "Avaliação";
    Object.assign(e.avaliacao, { tipo: "Braquiocefálica (cotovelo)", status: "Pérvia", fluxoVolume: "1250", arteriaDiametro: "5.2", anastomoseDiametro: "4.1", anastomosePsv: "320", veiaDiametro: "7.5", veiaProfundidade: "4.2", estenose: true, estenoseLocal: "Arco da cefálica", estenosePercentual: "65", estenosePsv: "410", aneurisma: true, aneurismaLocal: "Segmento de punção", aneurismaDiametro: "18", roubo: true, stent: true, stentLocal: "Veia subclávia", stentStatus: "Com reestenose" });
    const d = decodificarExame3D(linkExame3D({ modo: "fav", lado: "Direito", extra: e }, "x").split("#")[1]);
    expect(d.extra.modo).toBe("Avaliação");
    expect(d.extra.avaliacao).toEqual(e.avaliacao);
  });
  it("avaliação: estenose na anastomose", () => {
    const e = normalizarExtra(null);
    e.modo = "Avaliação";
    Object.assign(e.avaliacao, { tipo: "Radiocefálica (punho)", estenose: true, estenoseLocal: "Anastomose", estenosePercentual: "70" });
    const d = decodificarExame3D(codificarExameFAV3D({ lado: "Direito", extra: e }));
    expect(d.extra.avaliacao.estenoseLocal).toBe("Anastomose");
  });
});
