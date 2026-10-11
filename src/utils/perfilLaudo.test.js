import {
  ativarPerfilDoUsuario, carregarDadosPerfil, salvarDadosPerfil, limparPerfilAtivo, progressoPerfil,
  boasVindasPendente, marcarBoasVindas, normalizarDados, perfilAtivo, opcoesDePerfil, selecionarCombinacao,
  medicoVazio, localVazio, MAX_MEDICOS, MAX_LOCAIS,
} from "./perfilLaudo";

beforeEach(() => localStorage.clear());

function jose() {
  const m = medicoVazio();
  Object.assign(m, { nomeMedico: "Dr. José", crm: "111 PR", assinaturaMedico: "data:SIG-J" });
  m.locais = [
    { ...localVazio(), nomeClinica: "Clínica A", logoClinica: "data:LOGO-A" },
    { ...localVazio(), nomeClinica: "Clínica B", logoClinica: "data:LOGO-B", telefoneClinica: "(16) 3333-3333" },
  ];
  return m;
}

describe("médicos e locais de atendimento", () => {
  it("o mesmo médico atende na clínica A ou B, cada uma com seu logo", () => {
    const maria = { ...medicoVazio(), nomeMedico: "Dra. Maria" };
    let d = normalizarDados({ medicos: [jose(), maria], medicoAtivo: 0 });
    expect(perfilAtivo(d)).toMatchObject({ nomeMedico: "Dr. José", nomeClinica: "Clínica A", logoClinica: "data:LOGO-A", assinaturaMedico: "data:SIG-J" });
    d = selecionarCombinacao(d, 0, 1);
    salvarDadosPerfil("a@x.com", d);
    expect(localStorage.getItem("logoClinica")).toBe("data:LOGO-B");
    expect(localStorage.getItem("telefoneClinica")).toBe("(16) 3333-3333");
    expect(localStorage.getItem("assinaturaMedico")).toBe("data:SIG-J");
    expect(opcoesDePerfil(d).map((o) => o.rotulo)).toEqual(["Dr. José · Clínica A", "Dr. José · Clínica B", "Dra. Maria"]);
    expect(opcoesDePerfil(d).find((o) => o.ativo).rotulo).toBe("Dr. José · Clínica B");
  });

  it("limites: até 3 médicos e 3 locais por médico", () => {
    const muitos = Array.from({ length: 5 }, () => ({ ...medicoVazio(), locais: Array.from({ length: 5 }, localVazio) }));
    const d = normalizarDados({ medicos: muitos, medicoAtivo: 9 });
    expect(d.medicos).toHaveLength(MAX_MEDICOS);
    expect(d.medicos[0].locais).toHaveLength(MAX_LOCAIS);
    expect(d.medicoAtivo).toBe(MAX_MEDICOS - 1);
  });

  it("dados da versão anterior (perfis achatados) viram médicos com 1 local", () => {
    const d = normalizarDados({ perfis: [{ nomeMedico: "Dr. 1", nomeClinica: "C1", logoClinica: "L1" }, { nomeMedico: "" }, { nomeMedico: "Dr. 3" }], ativo: 2 });
    expect(d.medicos.map((m) => m.nomeMedico)).toEqual(["Dr. 1", "Dr. 3"]);
    expect(d.medicos[0].locais[0]).toMatchObject({ nomeClinica: "C1", logoClinica: "L1" });
    expect(perfilAtivo(d).nomeMedico).toBe("Dr. 3");
  });
});

describe("perfil por usuário", () => {
  it("primeiro acesso adota o que já estava no navegador (instalações antigas)", () => {
    localStorage.setItem("nomeMedico", "Dr. A");
    localStorage.setItem("logoClinica", "data:image/png;base64,AAA");
    localStorage.setItem("especialidadeLaudo", "Cirurgia Vascular");
    const d = ativarPerfilDoUsuario("a@x.com");
    expect(perfilAtivo(d)).toMatchObject({ nomeMedico: "Dr. A", logoClinica: "data:image/png;base64,AAA", especialidade: "Cirurgia Vascular" });
    expect(perfilAtivo(carregarDadosPerfil("A@X.com")).nomeMedico).toBe("Dr. A");
  });

  it("outro usuário no mesmo navegador não herda logo/assinatura", () => {
    localStorage.setItem("nomeMedico", "Dr. A");
    localStorage.setItem("assinaturaMedico", "data:image/png;base64,SIG");
    ativarPerfilDoUsuario("a@x.com");
    limparPerfilAtivo();
    expect(localStorage.getItem("assinaturaMedico")).toBeNull();
    ativarPerfilDoUsuario("b@x.com");
    expect(localStorage.getItem("nomeMedico")).toBeNull();
    ativarPerfilDoUsuario("a@x.com");
    expect(localStorage.getItem("assinaturaMedico")).toBe("data:image/png;base64,SIG");
  });

  it("Premium antigo: perfis migram e o ativo vai para as chaves dos exames", () => {
    localStorage.setItem("configLaudoPremium", JSON.stringify([{ nomeMedico: "Dr. 1" }, { nomeMedico: "Dr. 2", crm: "999 PR" }]));
    localStorage.setItem("perfilLaudoAtivo", "1");
    const d = ativarPerfilDoUsuario("p@x.com");
    expect(d.medicos).toHaveLength(2);
    expect(d.medicoAtivo).toBe(1);
    expect(localStorage.getItem("crm")).toBe("999 PR");
    expect(localStorage.getItem("configLaudoPremium")).toBeNull();
  });

  it("salvar com o navegador cheio devolve erro em vez de quebrar", () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { const e = new Error("quota"); e.name = "QuotaExceededError"; throw e; };
    const r = salvarDadosPerfil("a@x.com", normalizarDados(null));
    Storage.prototype.setItem = original;
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/espaço do navegador está cheio/);
  });

  it("campo apagado também some das chaves dos exames", () => {
    const d = normalizarDados(null);
    d.medicos[0].locais[0].logoClinica = "data:x";
    salvarDadosPerfil("a@x.com", d);
    expect(localStorage.getItem("logoClinica")).toBe("data:x");
    d.medicos[0].locais[0].logoClinica = "";
    salvarDadosPerfil("a@x.com", d);
    expect(localStorage.getItem("logoClinica")).toBeNull();
  });

  it("progresso e assistente de boas-vindas", () => {
    expect(progressoPerfil({ nomeMedico: "Dr", crm: "1", logoClinica: "x" })).toMatchObject({ feitos: 3, total: 5, faltam: ["Nome da clínica", "Assinatura"] });
    expect(boasVindasPendente("a@x.com")).toBe(true);
    marcarBoasVindas("a@x.com", "pulado");
    expect(boasVindasPendente("A@x.com")).toBe(false);
  });
});
