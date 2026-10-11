import { sanitizarWinAnsi, quebrarLinha, perfilParaExame, formatarDataDiaMesAno } from "./pdfExameSalvo";
import { normalizarDados, salvarDadosPerfil } from "./perfilLaudo";

describe("PDF de exame salvo", () => {
  it("troca caracteres que a fonte do PDF não tem", () => {
    expect(sanitizarWinAnsi("Estenose ≥ 70% → ok ✓ · ção")).toBe("Estenose >= 70% -> ok  · ção");
  });

  it("quebra linha longa por palavras dentro da largura", () => {
    const medir = (s) => s.length;
    expect(quebrarLinha("aaa bbb ccc ddd", 7, medir)).toEqual(["aaa bbb", "ccc ddd"]);
    expect(quebrarLinha("palavralonga x", 5, medir)).toEqual(["palavralonga", "x"]);
  });

  it("usa o logo do local onde o exame foi feito", () => {
    localStorage.clear();
    const d = normalizarDados(null);
    d.medicos[0].nomeMedico = "Dr. Gabriel";
    d.medicos[0].locais = [
      { nomeClinica: "Haz Ibiporã", logoClinica: "LOGO-HAZ" },
      { nomeClinica: "Clínica Vida", logoClinica: "LOGO-VIDA" },
    ];
    salvarDadosPerfil("g@x.com", d);
    expect(perfilParaExame({ localExame: "Clínica Vida" }, "g@x.com")).toMatchObject({ nomeMedico: "Dr. Gabriel", logoClinica: "LOGO-VIDA" });
    // exame antigo, sem local: usa o local em uso
    expect(perfilParaExame({}, "g@x.com").logoClinica).toBe("LOGO-HAZ");
  });

  it("data no formato brasileiro", () => {
    expect(formatarDataDiaMesAno("2026-10-11")).toBe("11/10/2026");
  });
});
