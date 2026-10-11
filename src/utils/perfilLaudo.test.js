import {
  ativarPerfilDoUsuario, carregarDadosPerfil, salvarDadosPerfil, limparPerfilAtivo, progressoPerfil, perfilVazio,
  boasVindasPendente, marcarBoasVindas,
} from "./perfilLaudo";

beforeEach(() => localStorage.clear());

describe("perfil do laudo por usuário", () => {
  it("primeiro acesso adota o que já estava no navegador (instalações antigas)", () => {
    localStorage.setItem("nomeMedico", "Dr. A");
    localStorage.setItem("logoClinica", "data:image/png;base64,AAA");
    localStorage.setItem("especialidadeLaudo", "Cirurgia Vascular");
    const d = ativarPerfilDoUsuario("a@x.com");
    expect(d.perfis[0]).toMatchObject({ nomeMedico: "Dr. A", logoClinica: "data:image/png;base64,AAA", especialidade: "Cirurgia Vascular" });
    expect(carregarDadosPerfil("A@X.com").perfis[0].nomeMedico).toBe("Dr. A");
  });

  it("outro usuário no mesmo navegador não herda logo/assinatura", () => {
    localStorage.setItem("nomeMedico", "Dr. A");
    localStorage.setItem("assinaturaMedico", "data:image/png;base64,SIG");
    ativarPerfilDoUsuario("a@x.com");
    limparPerfilAtivo();
    expect(localStorage.getItem("assinaturaMedico")).toBeNull();
    ativarPerfilDoUsuario("b@x.com");
    expect(localStorage.getItem("nomeMedico")).toBeNull();
    expect(localStorage.getItem("assinaturaMedico")).toBeNull();
    // e o A recupera o dele ao voltar
    ativarPerfilDoUsuario("a@x.com");
    expect(localStorage.getItem("nomeMedico")).toBe("Dr. A");
    expect(localStorage.getItem("assinaturaMedico")).toBe("data:image/png;base64,SIG");
  });

  it("Premium: perfis antigos migram e o ativo vai para as chaves dos exames", () => {
    localStorage.setItem("configLaudoPremium", JSON.stringify([{ nomeMedico: "Dr. 1" }, { nomeMedico: "Dr. 2", crm: "999 PR" }]));
    localStorage.setItem("perfilLaudoAtivo", "1");
    const d = ativarPerfilDoUsuario("p@x.com");
    expect(d.ativo).toBe(1);
    expect(d.perfis).toHaveLength(3);
    expect(localStorage.getItem("crm")).toBe("999 PR");
    expect(localStorage.getItem("configLaudoPremium")).toBeNull();
  });

  it("salvar com o navegador cheio devolve erro em vez de quebrar", () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { const e = new Error("quota"); e.name = "QuotaExceededError"; throw e; };
    const r = salvarDadosPerfil("a@x.com", { perfis: [perfilVazio()], ativo: 0 });
    Storage.prototype.setItem = original;
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/espaço do navegador está cheio/);
  });

  it("campo apagado também some das chaves dos exames", () => {
    salvarDadosPerfil("a@x.com", { perfis: [{ ...perfilVazio(), logoClinica: "data:x" }], ativo: 0 });
    expect(localStorage.getItem("logoClinica")).toBe("data:x");
    salvarDadosPerfil("a@x.com", { perfis: [perfilVazio()], ativo: 0 });
    expect(localStorage.getItem("logoClinica")).toBeNull();
  });

  it("progresso e assistente de boas-vindas", () => {
    expect(progressoPerfil({ nomeMedico: "Dr", crm: "1", logoClinica: "x" })).toMatchObject({ feitos: 3, total: 5, faltam: ["Nome da clínica", "Assinatura"] });
    expect(boasVindasPendente("a@x.com")).toBe(true);
    marcarBoasVindas("a@x.com", "pulado");
    expect(boasVindasPendente("A@x.com")).toBe(false);
  });
});
