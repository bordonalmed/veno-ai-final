jest.mock("../config/supabase", () => ({ supabase: null, supabaseConfig: { isConfigured: false } }));

const servico = () => require("./examesRealtimeService").default;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("userEmail", "g@x.com");
  localStorage.setItem("userUID", "u1");
  jest.resetModules();
});

const todos = () => JSON.parse(localStorage.getItem("examesAorta") || "[]");

describe("exames salvos", () => {
  it("grava o local do exame (clínica em uso)", async () => {
    localStorage.setItem("nomeClinica", "Haz Ibiporã");
    const s = servico();
    await s.criarExame({ nome: "Ana", data: "2026-10-11", tipoNome: "Aorta e Ilíacas", laudo: "x" });
    expect(todos()[0].localExame).toBe("Haz Ibiporã");
  });

  it("editar e salvar atualiza o mesmo exame (não duplica)", async () => {
    localStorage.setItem("nomeClinica", "Haz Ibiporã");
    const s = servico();
    await s.criarExame({ nome: "Ana", data: "2026-10-11", tipoNome: "Aorta e Ilíacas", laudo: "v1" });
    const salvo = (await s.buscarExames()).exames[0];
    s.iniciarEdicao(salvo);
    localStorage.setItem("nomeClinica", "Clínica Vida");
    const r = await s.criarExame({ nome: "Ana", data: "2026-10-11", tipoNome: "Aorta e Ilíacas", laudo: "v2" });
    expect(r.atualizado).toBe(true);
    expect(todos()).toHaveLength(1);
    expect(todos()[0]).toMatchObject({ laudo: "v2", localExame: "Clínica Vida" });
    // salvar de novo continua atualizando
    await s.criarExame({ nome: "Ana", data: "2026-10-11", tipoNome: "Aorta e Ilíacas", laudo: "v3" });
    expect(todos()).toHaveLength(1);
    expect(todos()[0].laudo).toBe("v3");
  });

  it("depois de editar, outro paciente cria exame novo", async () => {
    const s = servico();
    await s.criarExame({ nome: "Ana", data: "2026-10-11", tipoNome: "Aorta e Ilíacas", laudo: "v1" });
    s.iniciarEdicao((await s.buscarExames()).exames[0]);
    await s.criarExame({ nome: "Bruno", data: "2026-10-11", tipoNome: "Aorta e Ilíacas", laudo: "b" });
    expect(todos()).toHaveLength(2);
    s.encerrarEdicao();
    await s.criarExame({ nome: "Ana", data: "2026-10-11", tipoNome: "Aorta e Ilíacas", laudo: "nova" });
    expect(todos()).toHaveLength(3);
  });
});
