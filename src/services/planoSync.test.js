const mockRpc = jest.fn();
jest.mock("../config/supabase", () => ({
  supabaseConfig: { isConfigured: true },
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }) },
    rpc: (...a) => mockRpc(...a),
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ error: { message: "x" } }) }) }) }),
  },
}));
const { sincronizarPlano, ehPremium, premiumAte } = require("./planoService");

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("userEmail", "a@x.com");
  mockRpc.mockReset();
});

it("compra aprovada na Hotmart vira Premium neste navegador", async () => {
  mockRpc.mockResolvedValue({ data: { premium: true, premium_ate: null, revogado: false }, error: null });
  const r = await sincronizarPlano("a@x.com");
  expect(r).toMatchObject({ ok: true, premium: true, ativouAgora: true });
  expect(mockRpc).toHaveBeenCalledWith("meu_plano");
});

it("assinatura cancelada: continua Premium e guarda até quando", async () => {
  mockRpc.mockResolvedValue({ data: { premium: true, premium_ate: "2026-11-13T00:00:00Z" }, error: null });
  await sincronizarPlano("a@x.com");
  expect(ehPremium("a@x.com")).toBe(true);
  expect(premiumAte("a@x.com")).toBe("2026-11-13T00:00:00Z");
});

it("reembolso/fim da assinatura (revogado pela Hotmart) tira o Premium", async () => {
  localStorage.setItem("plano_a@x.com", "premium");
  localStorage.setItem("trial_v2_a@x.com", "1");
  mockRpc.mockResolvedValue({ data: { premium: false, revogado: true, trial_comeco: "2026-01-01T00:00:00Z", trial_laudos: [] }, error: null });
  const r = await sincronizarPlano("a@x.com");
  expect(r.premium).toBe(false);
  expect(ehPremium("a@x.com")).toBe(false);
});

it("Premium antigo (sem compra na Hotmart) nunca é retirado", async () => {
  localStorage.setItem("plano_a@x.com", "premium");
  mockRpc.mockResolvedValue({ data: { premium: false, revogado: false }, error: null });
  const r = await sincronizarPlano("a@x.com");
  expect(r.premium).toBe(true);
});

it("conta fora do ar: mantém o que tinha", async () => {
  localStorage.setItem("plano_a@x.com", "premium");
  mockRpc.mockResolvedValue({ data: null, error: { code: "500", message: "fora" } });
  const r = await sincronizarPlano("a@x.com");
  expect(r).toMatchObject({ ok: false, premium: true });
});
