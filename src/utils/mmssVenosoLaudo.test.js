import {
  veiasPadrao,
  extraPadrao,
  descreverVeia,
  getConclusaoMembro,
  gerarLaudoCompleto,
  normalizarVeiasLado,
  estruturaVeia,
  normalizarExtra,
} from "./mmssVenosoLaudo";

function membro(alt) {
  const v = veiasPadrao();
  Object.entries(alt).forEach(([n, c]) => Object.assign(v[n], c));
  return v;
}

describe("MMSS venoso: descrição", () => {
  it("normal: fluxo fásico nas centrais, subclávia sem compressibilidade", () => {
    expect(descreverVeia("Veia Subclávia", estruturaVeia)).toBe("Veia Subclávia: pérvia, com fluxo fásico.");
    expect(descreverVeia("Veia Axilar", estruturaVeia)).toBe("Veia Axilar: pérvia, compressível, com fluxo fásico.");
    expect(descreverVeia("Veia Cefálica (braço)", estruturaVeia)).toBe("Veia Cefálica (braço): pérvia, compressível.");
  });

  it("concordância no plural", () => {
    expect(descreverVeia("Veias Braquiais", estruturaVeia)).toBe("Veias Braquiais: pérvias, compressíveis.");
    expect(descreverVeia("Veias Radiais", { ...estruturaVeia, status: "Trombose oclusiva", fase: "Aguda" }))
      .toBe("Veias Radiais: não compressíveis, com trombo oclusivo de aspecto agudo, sem fluxo.");
  });

  it("subclávia trombosada não fala em compressibilidade", () => {
    expect(descreverVeia("Veia Subclávia", { ...estruturaVeia, status: "Trombose parcial (não oclusiva)", fase: "Crônica" }))
      .toBe("Veia Subclávia: com trombo não oclusivo de aspecto crônico e fluxo residual.");
  });
});

describe("MMSS venoso: conclusão", () => {
  it("normal", () => {
    expect(getConclusaoMembro(veiasPadrao())).toEqual(["Exame dentro dos padrões da normalidade."]);
  });

  it("TVP diz onde e agrupa veias com o mesmo achado", () => {
    const v = membro({
      "Veia Subclávia": { status: "Trombose oclusiva", fase: "Aguda" },
      "Veia Axilar": { status: "Trombose oclusiva", fase: "Aguda" },
    });
    expect(getConclusaoMembro(v)).toEqual(["Trombose venosa profunda oclusiva, de aspecto agudo, em veia subclávia e veia axilar"]);
  });

  it("trombose superficial associada a cateter", () => {
    const v = membro({ "Veia Basílica (braço)": { status: "Trombose parcial (não oclusiva)" } });
    const ex = extraPadrao();
    ex.cateter = { presente: true, tipo: "PICC", veia: "Veia Basílica (braço)" };
    expect(getConclusaoMembro(v, ex)).toEqual([
      "Trombose venosa superficial parcial (não oclusiva) em veia basílica (braço), associada a cateter",
      "PICC em veia basílica (braço)",
    ]);
  });

  it("cateter sem trombose", () => {
    const ex = extraPadrao();
    ex.cateter = { presente: true, tipo: "Cateter venoso central", veia: "Veia Jugular Interna" };
    expect(getConclusaoMembro(veiasPadrao(), ex)).toEqual([
      "Cateter venoso central em veia jugular interna, sem sinais de trombose associada",
    ]);
  });

  it("fluxo contínuo sugere obstrução central; recanalização e ausente aparecem", () => {
    const v = membro({
      "Veia Subclávia": { fluxo: "Contínuo (não fásico)" },
      "Veias Braquiais": { status: "Recanalização parcial" },
      "Veia Cefálica (antebraço)": { status: "Ausente" },
    });
    expect(getConclusaoMembro(v)).toEqual([
      "Sinais de trombose venosa profunda prévia com recanalização parcial em veias braquiais",
      "Fluxo contínuo (não fásico) em veia subclávia, sugestivo de obstrução venosa central (veia braquiocefálica/veia cava superior)",
      "Veia cefálica (antebraço) não visualizada",
    ]);
  });

  it("nunca fala em insuficiência", () => {
    const v = membro({ "Veia Axilar": { status: "Trombose oclusiva" } });
    expect(getConclusaoMembro(v).join(" ")).not.toMatch(/insufici|refluxo|incompet/i);
  });

  it("pré-FAV venoso na descrição e conclusão", () => {
    const ex = extraPadrao();
    ex.fav.realizado = true;
    ex.fav.cefalicaPunho = { diametro: "2.5", profundidade: "3" };
    ex.fav.cefalicaBraco = { diametro: "3.1", profundidade: "" };
    const t = gerarLaudoCompleto({ nome: "A", idade: "60", data: "2026-10-08", lado: "Direito", veias: { Direito: veiasPadrao() }, extras: { Direito: ex } });
    expect(t).toContain("Veia cefálica no punho: diâmetro de 2,5 mm, profundidade de 3 mm da pele.");
    expect(t).toContain("Exame dentro dos padrões da normalidade.\nMapeamento venoso pré-FAV: veia cefálica no punho com 2,5 mm, veia cefálica no braço com 3,1 mm.");
  });
});

describe("MMSS venoso: laudo e dados antigos", () => {
  it("cabeçalho com idade, um bloco por membro, observações", () => {
    const t = gerarLaudoCompleto({
      nome: "Fulana", idade: "45", data: "2026-10-08", lado: "Ambos",
      veias: { Direito: veiasPadrao(), Esquerdo: veiasPadrao() }, observacoes: { Esquerdo: "Edema discreto." },
    });
    expect(t.startsWith("PACIENTE: Fulana, 45 anos\nDATA: 2026-10-08\n")).toBe(true);
    expect(t).toContain("DOPPLER VENOSO DE MEMBRO SUPERIOR DIREITO");
    expect(t).toContain("DOPPLER VENOSO DE MEMBRO SUPERIOR ESQUERDO");
    expect(t).toContain("OBSERVAÇÕES\nEdema discreto.");
    expect(t.match(/PACIENTE:/g)).toHaveLength(1);
  });

  it("converte exame salvo no formato antigo", () => {
    const antigo = {
      profundas: { Direito: { "Veia Subclávia": "não compressível e sem fluxo (sugestivo de trombose)", "Veia Axilar": "pérvia com fluxo contínuo" } },
      superficiais: { Direito: { "Veia Cefálica": "semi compressível, sugestivo de recanalização parcial", "Veia Basílica": "ausente" } },
    };
    const v = normalizarVeiasLado(antigo, "Direito");
    expect(v["Veia Subclávia"].status).toBe("Trombose oclusiva");
    expect(v["Veia Axilar"]).toEqual(estruturaVeia); // "contínuo" antigo era o normal
    expect(v["Veia Cefálica (braço)"].status).toBe("Recanalização parcial");
    expect(v["Veia Cefálica (antebraço)"].status).toBe("Recanalização parcial");
    expect(v["Veia Basílica (antebraço)"].status).toBe("Ausente");
  });
});

describe("MMSS venoso: veia intermédia do cotovelo", () => {
  it("exame salvo com 'Veia Cubital Mediana' passa para o nome atual (achado e cateter)", () => {
    const antigo = { veias: { Direito: { "Veia Cubital Mediana": { status: "Trombose oclusiva" } } } };
    const v = normalizarVeiasLado(antigo, "Direito");
    expect(v["Veia Intermédia do Cotovelo"].status).toBe("Trombose oclusiva");
    expect(v["Veia Cubital Mediana"]).toBeUndefined();
    expect(normalizarExtra({ cateter: { presente: true, tipo: "PICC", veia: "Veia Cubital Mediana" } }).cateter.veia).toBe("Veia Intermédia do Cotovelo");
    expect(descreverVeia("Veia Intermédia do Cotovelo", estruturaVeia)).toBe("Veia Intermédia do Cotovelo: pérvia, compressível.");
  });
});
