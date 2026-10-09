import { extraPadrao, normalizarExtra, gerarLaudoCompleto, gerarBlocoExame, sitioAdequado, localLesaoFavOptions, localStentFavOptions } from "./favLaudo";

function confeccao(sitios, outros = {}) {
  const e = extraPadrao();
  Object.entries(sitios).forEach(([k, v]) => Object.assign(e.confeccao.sitios[k], v));
  Object.assign(e.confeccao, outros);
  return e;
}

function avaliacao(campos) {
  const e = extraPadrao();
  e.modo = "Avaliação";
  Object.assign(e.avaliacao, campos);
  return e;
}

describe("FAV: confecção (mapeamento pré-operatório)", () => {
  it("cabeçalho, título, membro e todos os vasos", () => {
    const t = gerarLaudoCompleto({ nome: "Fulano", idade: "60", data: "2026-10-09", lado: "Esquerdo", extra: extraPadrao() });
    expect(t.startsWith("PACIENTE: Fulano, 60 anos\nDATA: 2026-10-09\n")).toBe(true);
    expect(t).toContain("DOPPLER PARA FÍSTULA ARTERIOVENOSA\nMAPEAMENTO PARA CONFECÇÃO DE FÍSTULA ARTERIOVENOSA - MEMBRO SUPERIOR ESQUERDO");
    expect(t).toContain("Artéria radial (punho): pérvia, parede sem calcificações, fluxo trifásico.");
    expect(t).toContain("Veias (medidas com garrote):\nVeia cefálica (punho): pérvia, compressível.");
    expect(t).toContain("Veia axilar: pérvia, fluxo fásico.");
    expect(t).toContain("CONCLUSÃO\nArtérias e veias do membro superior pérvias.");
  });

  it("territórios com calibre adequado (>= 2,0 mm)", () => {
    const e = confeccao({
      radial: { diametro: "2.2" }, braquial: { diametro: "4.1" },
      cefalicaPunho: { diametro: "2.6", profundidade: "2" }, cefalicaCotovelo: { diametro: "3.5" },
      basilicaBraco: { diametro: "4", profundidade: "9" },
    });
    const t = gerarBlocoExame(e, "Direito");
    expect(t).toContain("Veia cefálica (punho): pérvia, compressível, diâmetro de 2,6 mm, profundidade de 2 mm.");
    expect(t).toContain("Vasos com calibre adequado (>= 2,0 mm) para: FAV radiocefálica (punho), FAV braquiocefálica (cotovelo), FAV braquiobasílica (com transposição).");
    expect(t).toContain("Veia basílica (braço) profunda (9 mm da pele): pode exigir superficialização.");
  });

  it("braquiobasílica via intermédia e braquiobraquial", () => {
    const e = confeccao({ braquial: { diametro: "4" }, intermedia: { diametro: "3" }, basilicaBraco: { diametro: "4.5" }, braquialVeia: { diametro: "3.2" } });
    const t = gerarBlocoExame(e, "Direito");
    expect(t).toContain("Veia braquial (braço): pérvia, compressível, diâmetro de 3,2 mm.");
    expect(t).toContain("FAV braquiocefálica (cotovelo), FAV braquiobasílica (com transposição), FAV braquiobasílica via veia intermédia do cotovelo, FAV braquiobraquial (com transposição).");
    const av = extraPadrao();
    av.modo = "Avaliação";
    Object.assign(av.avaliacao, { tipo: "Braquiobraquial (com transposição)" });
    expect(gerarBlocoExame(av, "Direito")).toContain("FAV braquiobraquial (com transposição): pérvia.");
  });

  it("veia fina ou trombosada não serve; fluxo contínuo na axilar", () => {
    const e = confeccao({
      radial: { diametro: "2.5" }, cefalicaPunho: { diametro: "1.6" },
      cefalicaAntebraco: { situacao: "Trombosada" }, axilar: { fluxo: "Contínuo (não fásico)" },
    }, { arcoPalmar: "Incompleto" });
    const t = gerarBlocoExame(e, "Direito");
    expect(t).toContain("Sem território com artéria e veia de calibre adequado (>= 2,0 mm) para FAV autóloga.");
    expect(t).toContain("Veia cefálica (antebraço) trombosada.");
    expect(t).toContain("Fluxo contínuo na veia axilar: sugere obstrução venosa central.");
    expect(t).toContain("Arco palmar incompleto.");
    expect(sitioAdequado("cefalicaPunho", e.confeccao.sitios.cefalicaPunho)).toBe(false);
    expect(sitioAdequado("basilicaBraco", e.confeccao.sitios.basilicaBraco)).toBeNull();
  });
});

describe("FAV: ambos os membros", () => {
  it("um bloco por membro, cada um com a sua conclusão, observação no fim", () => {
    const d = confeccao({ radial: { diametro: "2.4" }, cefalicaPunho: { diametro: "2.9" } });
    const e = avaliacao({ tipo: "Braquiocefálica (cotovelo)", fluxoVolume: "900" });
    const t = gerarLaudoCompleto({ nome: "A", idade: "60", data: "2026-10-09", lado: "Ambos", extras: { Direito: d, Esquerdo: e }, observacoes: "Obs." });
    expect(t.match(/DOPPLER PARA FÍSTULA ARTERIOVENOSA/g)).toHaveLength(1);
    expect(t).toContain("MAPEAMENTO PARA CONFECÇÃO DE FÍSTULA ARTERIOVENOSA - MEMBRO SUPERIOR DIREITO");
    expect(t).toContain("CONCLUSÃO - MEMBRO SUPERIOR DIREITO\nVasos com calibre adequado (>= 2,0 mm) para: FAV radiocefálica (punho).");
    expect(t).toContain("AVALIAÇÃO DE FÍSTULA ARTERIOVENOSA - MEMBRO SUPERIOR ESQUERDO");
    expect(t).toContain("CONCLUSÃO - MEMBRO SUPERIOR ESQUERDO\nFAV braquiocefálica (cotovelo) pérvia, com fluxo de 900 mL/min.");
    expect(t.trim().endsWith("OBSERVAÇÕES\nObs.")).toBe(true);
  });
});

describe("FAV: avaliação de fístula existente", () => {
  it("pérvia e madura (regra dos 6)", () => {
    const t = gerarBlocoExame(avaliacao({
      tipo: "Radiocefálica (punho)", fluxoVolume: "850", veiaDiametro: "6.5", veiaProfundidade: "4",
      anastomoseDiametro: "4", anastomosePsv: "320",
    }), "Esquerdo");
    expect(t).toContain("AVALIAÇÃO DE FÍSTULA ARTERIOVENOSA - MEMBRO SUPERIOR ESQUERDO");
    expect(t).toContain("FAV radiocefálica (punho): pérvia.");
    expect(t).toContain("Fluxo volumétrico (artéria braquial): 850 mL/min.");
    expect(t).toContain("Anastomose: diâmetro de 4 mm, velocidade de pico sistólico de 320 cm/s.");
    expect(t).toContain("CONCLUSÃO\nFAV radiocefálica (punho) pérvia, com fluxo de 850 mL/min.\nCritérios de maturação presentes (regra dos 6).");
  });

  it("imatura, com estenose justa-anastomótica e aneurisma", () => {
    const t = gerarBlocoExame(avaliacao({
      tipo: "Braquiocefálica (cotovelo)", fluxoVolume: "420", veiaDiametro: "4.5", veiaProfundidade: "7",
      estenose: true, estenoseLocal: "Justa-anastomótica", estenosePercentual: "60", estenosePsv: "480",
      aneurisma: true, aneurismaLocal: "Segmento de punção", aneurismaDiametro: "18", roubo: true,
    }), "Direito");
    expect(t).toContain("Critérios de maturação não atingidos: fluxo < 600 mL/min, veia < 6 mm, profundidade > 6 mm.");
    expect(t).toContain("Estenose de 60% justa-anastomótica (velocidade de pico sistólico de 480 cm/s).");
    expect(t).toContain("Dilatação aneurismática no segmento de punção, com diâmetro de 18 mm.");
    expect(t).toMatch(/CONCLUSÃO[\s\S]*Fluxo retrógrado na artéria distal à anastomose \(sinal de roubo\)\./);
  });

  it("stent na veia subclávia e estenose central", () => {
    const t = gerarBlocoExame(avaliacao({
      tipo: "Braquiocefálica (cotovelo)", stent: true, stentLocal: "Veia subclávia", stentStatus: "Com reestenose",
      estenose: true, estenoseLocal: "Veia braquiocefálica", estenosePercentual: "70",
    }), "Esquerdo");
    expect(t).toContain("Estenose de 70% na veia braquiocefálica.");
    expect(t).toContain("Stent com reestenose na veia subclávia.");
    expect(t).toMatch(/CONCLUSÃO[\s\S]*Stent com reestenose na veia subclávia\./);
    expect(localStentFavOptions("Radiocefálica (punho)")[0]).toBe("Veia subclávia");
  });

  it("prótese ocluída e opções de local por tipo", () => {
    const t = gerarBlocoExame(avaliacao({ tipo: "Prótese braquioaxilar", status: "Ocluída (trombosada)", fluxoVolume: "900" }), "Direito");
    expect(t).toContain("FAV com prótese braquioaxilar: ocluída (trombosada), sem fluxo.");
    expect(t).toContain("CONCLUSÃO\nFAV com prótese braquioaxilar ocluída (trombosada).");
    expect(t).not.toContain("900");
    expect(localLesaoFavOptions("Prótese em alça no antebraço")).toContain("Anastomose venosa");
    expect(localLesaoFavOptions("Radiocefálica (punho)")).toContain("Arco da cefálica");
    expect(localLesaoFavOptions("Braquiobasílica (com transposição)")).not.toContain("Arco da cefálica");
  });

  it("dados salvos incompletos ganham o padrão", () => {
    const n = normalizarExtra({ modo: "Avaliação", avaliacao: { tipo: "Radiocefálica (punho)" }, confeccao: { sitios: { radial: { diametro: "2" } } } });
    expect(n.avaliacao.status).toBe("Pérvia");
    expect(n.confeccao.sitios.radial).toEqual({ diametro: "2", parede: "Normal", onda: "Trifásico" });
    expect(n.confeccao.sitios.axilar.fluxo).toBe("Fásico");
  });
});
