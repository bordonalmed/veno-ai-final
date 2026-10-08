// Laudo do Doppler Arterial de MMII: artérias do membro inferior e enxertos.
// A geração do texto é compartilhada com o MMSS (laudoArterial.js).
import { criarLaudoArterial, preenchido } from "./laudoArterial";

export * from "./laudoArterial";

export const enxertoTipoOptions = [
  "Femoropoplíteo acima do joelho",
  "Femoropoplíteo abaixo do joelho",
  "Femorodistal",
  "Fêmoro-femoral cruzado",
];
export const enxertoStatusOptions = ["Pérvio", "Com estenose", "Ocluído"];
export const enxertoPadrao = { tipo: "", status: "" };

const laudo = criarLaudoArterial({
  arterias: [
    "Artéria Femoral Comum",
    "Artéria Femoral Profunda",
    "Artéria Femoral Superficial",
    "Artéria Poplítea",
    "Artéria Tibial Anterior",
    "Artéria Fibular",
    "Artéria Tibial Posterior",
  ],
  membro: "INFERIOR",
  extra: {
    descrever: (enxerto) =>
      enxerto && preenchido(enxerto.tipo)
        ? [`Enxerto ${enxerto.tipo.toLowerCase()}: ${preenchido(enxerto.status) ? enxerto.status.toLowerCase() : "situação não informada"}.`]
        : [],
    concluir: (enxerto) =>
      enxerto && preenchido(enxerto.tipo)
        ? {
            linhas: [`Enxerto ${enxerto.tipo.toLowerCase()}${preenchido(enxerto.status) ? ` ${enxerto.status.toLowerCase()}` : ""}`],
            alterado: true,
          }
        : { linhas: [], alterado: false },
  },
});

export const {
  ARTERIAS,
  arteriasDoLado,
  arteriasPadrao,
  normalizarArterias,
  getConclusaoMembro,
  gerarBlocoMembro,
  gerarLaudoCompleto,
} = laudo;
