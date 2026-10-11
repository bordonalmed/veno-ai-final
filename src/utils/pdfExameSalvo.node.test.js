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
