// Testes de regressão do laudo do MMII Venoso — cobrem os cenários que já
// causaram bug real nesta sessão (varizes não persistindo, extensão do
// "ausente" não aparecendo, etc.) para pegar quebras futuras automaticamente.
import { veiasProfundas, veiasSuperficiais, profOptions, supOptions, montarLaudo } from "./mmiiVenosoLaudo";

function estadoBase() {
  return {
    profundas: Object.fromEntries(veiasProfundas.map((v) => [v, profOptions[0]])),
    superficiais: Object.fromEntries(veiasSuperficiais.map((v) => [v, supOptions[0]])),
    magna: { coxa: "", perna: "", tornozelo: "", inicio: "", inicio_valor: "", fim: "", fim_valor: "" },
    parva: { proximal: "", distal: "", inicio: "", inicio_valor: "", fim: "", fim_valor: "" },
    perfurantes: [{ status: "pérvia e competente", segmento: "", valor: "" }],
    observacoes: "",
    varizes: { coxa: "", perna: "", tornozelo: "", pe: "" },
  };
}

function montarUmLado(overrides = {}) {
  const base = estadoBase();
  const estado = { ...base, ...overrides };
  return montarLaudo({
    nome: "Paciente Teste",
    data: "2026-01-01",
    lado: "Direito",
    profundas: { Direito: estado.profundas },
    superficiais: { Direito: estado.superficiais },
    magna: { Direito: estado.magna },
    parva: { Direito: estado.parva },
    jsfDiametro: { Direito: "" },
    jspDiametro: { Direito: "" },
    observacoes: { Direito: estado.observacoes },
    perfurantes: { Direito: estado.perfurantes },
    varizes: { Direito: estado.varizes },
  });
}

describe("montarLaudo — sem nenhum achado", () => {
  it("gera a conclusão padrão de ausência de refluxo", () => {
    const laudo = montarUmLado();
    expect(laudo).toContain("Ausência de refluxo venoso nos territórios estudados.");
  });
});

describe("montarLaudo — Safena Magna ausente com extensão (bug relatado pelo usuário)", () => {
  it("imprime o segmento ausente de JSF até tornozelo no corpo do laudo", () => {
    const laudo = montarUmLado({
      superficiais: { ...estadoBase().superficiais, "Safena Magna": "ausente" },
      magna: { ...estadoBase().magna, inicio: "JSF", fim: "tornozelo" },
    });
    expect(laudo).toContain("Segmento ausente: de JSF até tornozelo");
    expect(laudo).toContain("Ausência total da safena magna");
  });

  it("Safena Parva ausente segue a mesma lógica (rótulo JSP)", () => {
    const laudo = montarUmLado({
      superficiais: { ...estadoBase().superficiais, "Safena Parva": "ausente" },
      parva: { ...estadoBase().parva, inicio: "JSP", fim: "tornozelo" },
    });
    expect(laudo).toContain("Segmento ausente: de JSP até tornozelo");
    expect(laudo).toContain("Ausência total da safena parva");
  });
});

describe("montarLaudo — varizes por região (bug: não persistia/recarregava)", () => {
  it("agrupa tipos diferentes em regiões diferentes, no corpo e na conclusão", () => {
    const laudo = montarUmLado({
      varizes: { coxa: "Varizes Superficiais", perna: "Varizes Reticulares", tornozelo: "", pe: "Microvarizes" },
    });
    expect(laudo).toContain("Varizes Superficiais em Coxa.");
    expect(laudo).toContain("Varizes Reticulares em Perna.");
    expect(laudo).toContain("Microvarizes em Pé.");
    // conclusão repete as mesmas linhas
    const conclusaoIdx = laudo.indexOf("CONCLUSÃO:");
    const conclusao = laudo.slice(conclusaoIdx);
    expect(conclusao).toContain("Varizes Superficiais em Coxa.");
    expect(conclusao).toContain("Microvarizes em Pé.");
  });

  it("agrupa a mesma região junto quando o tipo é igual", () => {
    const laudo = montarUmLado({
      varizes: { coxa: "Microvarizes", perna: "Microvarizes", tornozelo: "", pe: "" },
    });
    expect(laudo).toContain("Microvarizes em Coxa, Perna.");
  });

  it("aceita o formato antigo {tipo, localizacao} (exames salvos antes da migração)", () => {
    const laudo = montarUmLado({
      varizes: { tipo: "Varizes Reticulares", localizacao: ["coxa", "tornozelo"] },
    });
    expect(laudo).toContain("Varizes Reticulares em Coxa, Tornozelo.");
  });

  it("sem nenhuma variz marcada, não imprime nada sobre varizes", () => {
    const laudo = montarUmLado();
    expect(laudo).not.toContain("Varizes");
  });
});

describe("montarLaudo — veias perfurantes", () => {
  it("perfurante incompetente com segmento e distância aparece no corpo e na conclusão", () => {
    const laudo = montarUmLado({
      perfurantes: [{ status: "pérvia e incompetente", segmento: "cm acima do joelho", valor: "5" }],
    });
    expect(laudo).toContain("- pérvia e incompetente (5 cm acima do joelho)");
    expect(laudo).toContain("Insuficiência de veia perfurante");
  });

  it("mais de uma perfurante incompetente vira plural na conclusão", () => {
    const laudo = montarUmLado({
      perfurantes: [
        { status: "pérvia e incompetente", segmento: "cm acima do joelho", valor: "5" },
        { status: "pérvia e incompetente", segmento: "cm abaixo do joelho", valor: "3" },
      ],
    });
    expect(laudo).toContain("Insuficiência de veias perfurantes");
  });
});

describe("montarLaudo — lado 'Ambos'", () => {
  it("gera dois blocos separados, um por lado, com cabeçalho e achados independentes", () => {
    const baseDireito = estadoBase();
    const baseEsquerdo = estadoBase();
    const laudo = montarLaudo({
      nome: "Paciente Ambos",
      data: "2026-01-01",
      lado: "Ambos",
      profundas: { Direito: baseDireito.profundas, Esquerdo: baseEsquerdo.profundas },
      superficiais: {
        Direito: { ...baseDireito.superficiais, "Safena Magna": "pérvia e incompetente" },
        Esquerdo: baseEsquerdo.superficiais,
      },
      magna: {
        Direito: { ...baseDireito.magna, inicio: "JSF", fim: "tornozelo" },
        Esquerdo: baseEsquerdo.magna,
      },
      parva: { Direito: baseDireito.parva, Esquerdo: baseEsquerdo.parva },
      jsfDiametro: { Direito: "", Esquerdo: "" },
      jspDiametro: { Direito: "", Esquerdo: "" },
      observacoes: { Direito: "", Esquerdo: "" },
      perfurantes: { Direito: baseDireito.perfurantes, Esquerdo: baseEsquerdo.perfurantes },
      varizes: { Direito: baseDireito.varizes, Esquerdo: { ...baseEsquerdo.varizes, coxa: "Microvarizes" } },
    });
    const blocos = laudo.split("=".repeat(80));
    expect(blocos).toHaveLength(2);
    expect(blocos[0]).toContain("MEMBRO INFERIOR DIREITO");
    expect(blocos[0]).toContain("Insuficiência total da safena magna");
    expect(blocos[1]).toContain("MEMBRO INFERIOR ESQUERDO");
    expect(blocos[1]).toContain("Microvarizes em Coxa.");
    // achado do Direito não vaza pro bloco do Esquerdo
    expect(blocos[1]).not.toContain("Insuficiência total da safena magna");
  });
});
