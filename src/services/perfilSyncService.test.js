import { normalizarDados, salvarDadosPerfil, carregarDadosPerfil, perfilAtivo } from "../utils/perfilLaudo";

const estado = { remoto: null, erroSelect: null, erroUpsert: null, upserts: [] };
jest.mock("../config/supabase", () => ({
  supabaseConfig: { isConfigured: true },
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: "uid-1", email: "g@x.com" } } } }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: estado.remoto ? { perfil_laudo: estado.remoto } : null, error: estado.erroSelect }) }) }),
      upsert: async (linha) => { estado.upserts.push(linha); return { error: estado.erroUpsert }; },
    }),
  },
}));

function perfilCom(nome, clinica, quando) {
  const d = normalizarDados(null);
  d.medicos[0].nomeMedico = nome;
  d.medicos[0].locais[0].nomeClinica = clinica;
  d.atualizadoEm = quando;
  return d;
}

beforeEach(() => {
  localStorage.clear();
  Object.assign(estado, { remoto: null, erroSelect: null, erroUpsert: null, upserts: [] });
  jest.resetModules();
});

const servico = () => require("./perfilSyncService");

describe("perfil do laudo na conta (Supabase)", () => {
  it("computador novo: traz o perfil da conta", async () => {
    estado.remoto = perfilCom("Dr. Gabriel", "Haz", 1000);
    const r = await servico().sincronizarPerfilComConta("g@x.com");
    expect(r).toMatchObject({ ok: true, trouxe: true });
    expect(perfilAtivo(carregarDadosPerfil("g@x.com"))).toMatchObject({ nomeMedico: "Dr. Gabriel", nomeClinica: "Haz" });
    expect(localStorage.getItem("nomeClinica")).toBe("Haz");
    expect(estado.upserts).toHaveLength(0);
  });

  it("perfil deste navegador mais novo: envia para a conta", async () => {
    estado.remoto = perfilCom("Dr. Gabriel", "Antiga", 1000);
    salvarDadosPerfil("g@x.com", perfilCom("Dr. Gabriel", "Nova", 0)); // marca agora
    const r = await servico().sincronizarPerfilComConta("g@x.com");
    expect(r.ok).toBe(true);
    expect(estado.upserts).toHaveLength(1);
    expect(estado.upserts[0]).toMatchObject({ id: "uid-1", email: "g@x.com" });
    expect(perfilAtivo(estado.upserts[0].perfil_laudo).nomeClinica).toBe("Nova");
  });

  it("conta sem perfil: sobe o que já existe no navegador; perfil vazio não sobe", async () => {
    await servico().sincronizarPerfilComConta("g@x.com");
    expect(estado.upserts).toHaveLength(0);
    salvarDadosPerfil("g@x.com", perfilCom("Dr. Gabriel", "Haz", 0), { tocar: false });
    await servico().sincronizarPerfilComConta("g@x.com");
    expect(estado.upserts).toHaveLength(1);
  });

  it("coluna ainda não criada no Supabase: não quebra e para de tentar", async () => {
    estado.erroSelect = { code: "42703", message: 'column users.perfil_laudo does not exist' };
    salvarDadosPerfil("g@x.com", perfilCom("Dr. Gabriel", "Haz", 0));
    const s = servico();
    const r = await s.sincronizarPerfilComConta("g@x.com");
    expect(r.ok).toBe(false);
    expect(await s.enviarPerfilParaConta("g@x.com")).toMatchObject({ ok: false, motivo: "sem-conta" });
    expect(perfilAtivo(carregarDadosPerfil("g@x.com")).nomeClinica).toBe("Haz"); // segue funcionando local
  });
});
