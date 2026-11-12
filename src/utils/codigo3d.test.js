import { codificarExame3D, decodificarExame3D, linkExame3D } from "./codigo3d";
import { veiasProfundas, profOptions } from "./mmiiVenosoLaudo";

const prof = Object.fromEntries(veiasProfundas.map((v) => [v, profOptions[0]]));
const exame = {
  lado: "Direito",
  profundas: { ...prof, "Veia Poplítea": "não compressível e sem fluxo (sugestivo de trombose)" },
  superficiais: { JSF: "pérvia e incompetente", "Safena Magna": "ausente", JSP: "pérvia e competente", "Safena Parva": "pérvia e incompetente" },
  magna: { inicio: "JSF", inicio_valor: "", fim: "cm_acima_joelho", fim_valor: "8", coxa: "7.8", perna: "5,2", tornozelo: "", restante: "pérvia e incompetente" },
  parva: { inicio: "JSP", inicio_valor: "", fim: "cm_acima_tornozelo", fim_valor: "10.5", restante: "" },
  perfurantes: [{ status: "pérvia e incompetente", segmento: "cm acima do tornozelo", valor: "12" }, { status: "pérvia e competente", segmento: "", valor: "" }],
  varizes: { tracos: [
    { tipo: "Varizes Superficiais", vista: "anterior", pts: [[150, 405], [151, 406], [157, 420], [149, 436], [158, 452]] },
    { tipo: "Tromboflebite Superficial", vista: "posterior", pts: [[150, 100], [150, 500]] },
  ] },
};

it("ida e volta: os achados do membro voltam iguais (sem dados do paciente)", () => {
  const cod = codificarExame3D({ ...exame, nome: "Fulano de Tal", data: "2026-11-12" });
  expect(cod).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(cod).not.toMatch(/Fulano/);
  const d = decodificarExame3D(cod);
  expect(d.lado).toBe("Direito");
  expect(d.profundas["Veia Poplítea"]).toMatch(/trombose/);
  expect(d.superficiais).toEqual(exame.superficiais);
  expect(d.magna).toMatchObject({ inicio: "JSF", fim: "cm_acima_joelho", fim_valor: "8", coxa: "7.8", perna: "5.2", restante: "pérvia e incompetente" });
  expect(d.parva).toMatchObject({ inicio: "JSP", fim: "cm_acima_tornozelo", fim_valor: "10.5", restante: "" });
  expect(d.perfurantes).toEqual([{ status: "pérvia e incompetente", segmento: "cm acima do tornozelo", valor: "12" }]);
  expect(d.varizes.tracos).toHaveLength(2);
  expect(d.varizes.tracos[0]).toMatchObject({ tipo: "Varizes Superficiais", vista: "anterior" });
  expect(d.varizes.tracos[0].pts[0]).toEqual([150, 405]);
  expect(d.varizes.tracos[0].pts[d.varizes.tracos[0].pts.length - 1]).toEqual([158, 452]);
  // salto grande vira passos intermediários e chega no mesmo ponto
  expect(d.varizes.tracos[1]).toMatchObject({ tipo: "Tromboflebite Superficial", vista: "posterior" });
  expect(d.varizes.tracos[1].pts[d.varizes.tracos[1].pts.length - 1]).toEqual([150, 500]);
});

it("link curto o bastante para um QR Code impresso", () => {
  const link = linkExame3D(exame, "https://venoai.xyz");
  expect(link.startsWith("https://venoai.xyz/3d#")).toBe(true);
  expect(link.length).toBeLessThan(400);
});

it("código estragado dá erro (a página mostra aviso)", () => {
  expect(() => decodificarExame3D("xyz")).toThrow();
});
