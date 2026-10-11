import { montarMensagem, normalizarTelefone, mascararTelefone, emailValido, MODELO_PADRAO, textoEnvio, temAcessoEnvio } from "./envioLaudo";

describe("envio do laudo", () => {
  it("mensagem padrão: profissional e sem instrução interna", () => {
    const t = montarMensagem(MODELO_PADRAO, { paciente: "MARIA da Silva", tipoNome: "Doppler Venoso de Membros Inferiores", data: "2026-10-11", clinica: "Haz Clínica Médica", medico: "Dr. Gabriel", crm: "12345 PR" });
    expect(t).toBe("Olá, Maria! Segue o laudo do seu exame Doppler venoso de membros inferiores, realizado em 11/10/2026 na Haz Clínica Médica.\n\nDr. Gabriel – CRM 12345 PR");
    expect(t).not.toMatch(/anexo|envie/i);
  });

  it("sem clínica, sem CRM e sem nome não deixa buracos", () => {
    expect(montarMensagem(MODELO_PADRAO, { paciente: "", tipoNome: "Aorta e Ilíacas", data: "2026-10-11" }))
      .toBe("Olá! Segue o laudo do seu exame Doppler de aorta e ilíacas, realizado em 11/10/2026.");
  });

  it("modelo editado pelo médico com variáveis", () => {
    expect(montarMensagem("Prezado(a) {paciente}, laudo de {data} ({clinica}).", { paciente: "João Lima", data: "2026-01-02", clinica: "Vida" }))
      .toBe("Prezado(a) João Lima, laudo de 02/01/2026 (Vida).");
  });

  it("telefone: zero do DDD, código do país e validação", () => {
    expect(normalizarTelefone("(43) 99999-8888")).toMatchObject({ ok: true, numero: "5543999998888" });
    expect(normalizarTelefone("043 99999-8888").numero).toBe("5543999998888");
    expect(normalizarTelefone("+55 43 3333-4444").numero).toBe("554333334444");
    expect(normalizarTelefone("99999").ok).toBe(false);
    expect(normalizarTelefone("").ok).toBe(false);
    expect(mascararTelefone("43999998888")).toBe("(43) 99999-8888");
    expect(mascararTelefone("4333334444")).toBe("(43) 3333-4444");
  });

  it("e-mail e histórico", () => {
    expect(emailValido("a@b.com")).toBe(true);
    expect(emailValido("a@b")).toBe(false);
    expect(textoEnvio({ via: "whatsapp", em: "2026-10-11T17:32:00" })).toMatch(/^Enviado por WhatsApp em 11\/10\/2026 17:32/);
  });

  it("acesso: Premium ou teste ativo/não iniciado (igual em todas as telas)", () => {
    localStorage.clear();
    localStorage.setItem("userEmail", "a@x.com");
    expect(temAcessoEnvio()).toBe(true); // teste ainda não iniciado
    localStorage.setItem("trial_a@x.com", JSON.stringify({ inicio: "2020-01-01T00:00:00Z", laudosGerados: [] }));
    expect(temAcessoEnvio()).toBe(false); // teste vencido
    localStorage.setItem("plano_premium", "true");
    expect(temAcessoEnvio()).toBe(true);
  });
});
