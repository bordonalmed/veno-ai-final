// Exames que ficaram só no navegador (a nuvem falhou na hora de salvar) vão
// para o Supabase sozinhos quando a sessão está ativa, sem duplicar.
const nuvem = { linhas: [], sessao: true, falharInsert: false };

jest.mock("../config/supabase", () => {
  const consulta = () => {
    const q = {
      select: () => q,
      eq: () => q,
      order: () => Promise.resolve({ data: nuvem.linhas.slice(), error: null }),
    };
    return q;
  };
  return {
    supabaseConfig: { isConfigured: true },
    supabase: {
      auth: { getSession: () => Promise.resolve({ data: { session: nuvem.sessao ? { user: { id: "u1" } } : null } }) },
      from: () => ({
        ...consulta(),
        insert: (linha) => ({
          select: () => {
            if (nuvem.falharInsert) return Promise.resolve({ data: null, error: { message: "RLS" } });
            const nova = { ...linha, id: `uuid-${nuvem.linhas.length + 1}` };
            nuvem.linhas.push(nova);
            return Promise.resolve({ data: [nova], error: null });
          },
        }),
      }),
    },
  };
});

const servico = () => require("./examesRealtimeService").default;
const locais = () => JSON.parse(localStorage.getItem("examesAorta") || "[]");
const esperar = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("userEmail", "g@x.com");
  localStorage.setItem("userUID", "u1");
  nuvem.linhas = [];
  nuvem.sessao = true;
  nuvem.falharInsert = false;
  jest.resetModules();
});

function exameSoLocal(extra = {}) {
  return { id: "l1", localId: "l1", nome: "Ana", data: "2026-10-30", tipoNome: "Aorta e Ilíacas", laudo: "x", userId: "u1", userEmail: "g@x.com", origem: "localStorage", ...extra };
}

describe("exames só neste aparelho", () => {
  it("vão para a nuvem na próxima busca, uma vez só", async () => {
    localStorage.setItem("examesAorta", JSON.stringify([exameSoLocal()]));
    const s = servico();
    await s.buscarExames();
    await esperar();
    expect(nuvem.linhas).toHaveLength(1);
    expect(nuvem.linhas[0]).toMatchObject({ user_id: "u1", nome: "Ana", tipo_nome: "Aorta e Ilíacas" });
    expect(locais()[0]).toMatchObject({ supabaseId: "uuid-1", origem: "supabase" });
    // buscas seguintes não duplicam
    const r = await s.buscarExames();
    await esperar();
    expect(nuvem.linhas).toHaveLength(1);
    expect(r.exames).toHaveLength(1);
    expect(s.estadoNuvem).toMatchObject({ semSessao: false, pendentes: 0 });
  });

  it("sem sessão na nuvem não envia e avisa", async () => {
    nuvem.sessao = false;
    localStorage.setItem("examesAorta", JSON.stringify([exameSoLocal()]));
    const s = servico();
    await s.buscarExames();
    await esperar();
    expect(nuvem.linhas).toHaveLength(0);
    expect(s.estadoNuvem).toMatchObject({ semSessao: true, pendentes: 1 });
  });

  it("não reenvia o que já está na nuvem (mesmo paciente, data e tipo)", async () => {
    nuvem.linhas.push({ id: "uuid-0", user_id: "u1", nome: "Ana", data: "2026-10-30", tipo_nome: "Aorta e Ilíacas", dados: { localId: "outro" } });
    localStorage.setItem("examesAorta", JSON.stringify([exameSoLocal()]));
    const s = servico();
    await s.buscarExames();
    await esperar();
    expect(nuvem.linhas).toHaveLength(1);
  });

  it("não envia exame de outro usuário nem exame antigo sem dono", async () => {
    localStorage.setItem("examesAorta", JSON.stringify([
      exameSoLocal({ id: "a", localId: "a", userId: "u2", userEmail: "outro@x.com" }),
      { id: "b", localId: "b", nome: "Sem dono", data: "2026-01-01", tipoNome: "Aorta e Ilíacas" },
    ]));
    const s = servico();
    await s.buscarExames();
    await esperar();
    expect(nuvem.linhas).toHaveLength(0);
  });

  it("se a nuvem recusar, o exame continua no aparelho e tenta de novo depois", async () => {
    nuvem.falharInsert = true;
    localStorage.setItem("examesAorta", JSON.stringify([exameSoLocal()]));
    const s = servico();
    await s.buscarExames();
    await esperar();
    expect(locais()[0].supabaseId).toBeUndefined();
    nuvem.falharInsert = false;
    await s.buscarExames();
    await esperar();
    expect(nuvem.linhas).toHaveLength(1);
  });
});
