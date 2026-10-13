jest.mock("../config/supabase", () => ({ supabase: null, supabaseConfig: { isConfigured: false } }));
const plano = require("./planoService");

const DIA = 24 * 60 * 60 * 1000;
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("userEmail", "a@x.com");
});

describe("teste gratuito", () => {
  it("começa no primeiro laudo, mesmo laudo não conta duas vezes, bloqueia o 6º", async () => {
    expect(plano.statusTeste("a@x.com").status).toBe("nao_iniciado");
    const ouvinte = jest.fn();
    window.addEventListener(plano.EVENTO_LIMITE_PLANO, ouvinte);
    for (let i = 1; i <= 5; i++) expect(await plano.liberarLaudo({ tipoNome: "MMII Arterial", nome: `P${i}`, data: "2026-10-13" })).toBe(true);
    expect(await plano.liberarLaudo({ tipoNome: "MMII Arterial", nome: "p1 ", data: "2026-10-13" })).toBe(true); // mesmo paciente
    expect(plano.statusTeste("a@x.com")).toMatchObject({ status: "expirado", motivo: "laudos" });
    expect(await plano.liberarLaudo({ tipoNome: "MMII Arterial", nome: "P6", data: "2026-10-13" })).toBe(false);
    expect(ouvinte).toHaveBeenCalledTimes(1);
    window.removeEventListener(plano.EVENTO_LIMITE_PLANO, ouvinte);
  });

  it("depois de 7 dias bloqueia tudo", () => {
    const inicio = Date.parse("2026-10-01T10:00:00Z");
    const t = { inicio: new Date(inicio).toISOString(), chaves: ["a"] };
    expect(plano.decidirTeste(t, "a", inicio + 6 * DIA).permitido).toBe(true);
    expect(plano.decidirTeste(t, "a", inicio + 7 * DIA)).toMatchObject({ permitido: false, motivo: "tempo" });
  });

  it("chave ignora acentos, maiúsculas e espaços", () => {
    expect(plano.chaveLaudo({ tipoNome: "Carótidas e Vertebrais", nome: " José  Silva", data: "2026-10-13" }))
      .toBe(plano.chaveLaudo({ tipoNome: "carotidas e vertebrais", nome: "jose silva", data: "2026-10-13" }));
  });
});

describe("Premium", () => {
  it("Premium sempre libera e não conta laudo", async () => {
    localStorage.setItem("plano_a@x.com", "premium");
    for (let i = 0; i < 10; i++) expect(await plano.liberarLaudo({ tipoNome: "X", nome: `P${i}`, data: "d" })).toBe(true);
    expect(plano.statusTeste("a@x.com").status).toBe("nao_iniciado");
  });

  it("marca antiga do navegador vira Premium do usuário logado e some", () => {
    localStorage.setItem("plano_premium", "true");
    plano.migrarPlanoLegado("a@x.com");
    expect(plano.ehPremium("a@x.com")).toBe(true);
    expect(localStorage.getItem("plano_premium")).toBeNull();
  });

  it("marca antiga não passa para outro médico quando ela é de outro usuário Premium", () => {
    localStorage.setItem("plano_premium", "true");
    localStorage.setItem("plano_b@x.com", "premium");
    plano.migrarPlanoLegado("a@x.com");
    expect(plano.ehPremium("a@x.com")).toBe(false);
    expect(plano.ehPremium("b@x.com")).toBe(true);
  });

  it("nunca tira o Premium e zera o teste antigo uma única vez", () => {
    localStorage.setItem("plano_a@x.com", "premium");
    localStorage.setItem("trial_a@x.com", JSON.stringify({ inicio: "2020-01-01T00:00:00Z", laudosGerados: [] }));
    plano.migrarPlanoLegado("a@x.com");
    expect(plano.ehPremium("a@x.com")).toBe(true);
    expect(plano.statusTeste("a@x.com").status).toBe("nao_iniciado");
    localStorage.setItem("trial_a@x.com", JSON.stringify({ inicio: "2020-01-01T00:00:00Z", chaves: [] }));
    plano.migrarPlanoLegado("a@x.com");
    expect(plano.statusTeste("a@x.com").status).toBe("expirado");
  });

  it("link de pagamento leva o e-mail da conta", () => {
    expect(plano.linkPagamento("a+b@x.com")).toBe("https://pay.hotmart.com/S102049895B?email=a%2Bb%40x.com");
  });
});
