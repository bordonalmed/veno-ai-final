import { compactarAnexos, prepararExameParaEdicao, anexosDoExameEmEdicao } from "./exameExtras";

it("guarda os anexos sem o arquivo do navegador", async () => {
  const anexos = await compactarAnexos([{ id: 1, name: "a.png", size: 10, thumbnail: "data:image/png;base64,AAAA", file: {} }, { id: 2 }]);
  expect(anexos).toEqual([{ id: 1, name: "a.png", size: 10, thumbnail: "data:image/png;base64,AAAA" }]);
});

it("ao abrir para editar, o exame vai sem fotos e as fotos voltam pela memória uma vez", () => {
  const leve = prepararExameParaEdicao({ nome: "Ana", anexos: [{ id: 1, thumbnail: "x" }], mapaPdf: "pdf" });
  expect(leve).toEqual({ nome: "Ana" });
  expect(anexosDoExameEmEdicao(leve)).toEqual([{ id: 1, thumbnail: "x" }]);
  expect(anexosDoExameEmEdicao(leve)).toEqual([]);
});
