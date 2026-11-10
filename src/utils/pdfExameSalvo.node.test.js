/**
 * @jest-environment node
 */
import { PDFDocument } from "pdf-lib";
import { montarPDFExame } from "./pdfExameSalvo";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAKCAIAAABJ+IsHAAAAGklEQVR4nGM8wTAwgGmA7B21eNTiUYuHgcUA5LMA3NHto10AAAAASUVORK5CYII=";

it("gera o PDF com logo, assinatura e linhas longas sem quebrar", async () => {
  const longa = "Veia safena magna: pérvia e incompetente, com refluxo desde a junção safenofemoral até o terço médio da perna, diâmetros de 6,2 mm na coxa e 4,1 mm na perna ≥ critério.";
  const laudo = ["DOPPLER VENOSO", ...Array.from({ length: 70 }, () => longa), "", "CONCLUSÃO:", "Insuficiência da safena magna."].join("\n");
  const bytes = await montarPDFExame({ nome: "Ana", data: "2026-10-11", laudo }, { logoClinica: PNG, assinaturaMedico: PNG, nomeClinica: "Haz", nomeMedico: "Dr. Gabriel", crm: "1 PR" });
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBeGreaterThan(1);
});

it("inclui as páginas do mapeamento e os anexos salvos com o exame", async () => {
  const mapa = await PDFDocument.create();
  mapa.addPage([595, 842]); mapa.addPage([595, 842]);
  const mapaPdf = Buffer.from(await mapa.save()).toString("base64");
  const base = { nome: "Ana", data: "2026-10-11", laudo: "DOPPLER VENOSO\nCONCLUSÃO:\nNormal." };
  const so = await PDFDocument.load(await montarPDFExame(base, {}));
  const tudo = await PDFDocument.load(await montarPDFExame({ ...base, mapaPdf, anexos: [{ name: "foto.png", thumbnail: PNG }, { name: "quebrada", thumbnail: "data:image/png;base64,xx" }] }, {}));
  expect(tudo.getPageCount()).toBe(so.getPageCount() + 2 + 1);
});
