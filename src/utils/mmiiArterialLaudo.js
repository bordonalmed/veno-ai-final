// Laudo do Doppler Arterial de MMII: artérias do membro inferior e enxertos.
// A geração do texto é compartilhada com o MMSS (laudoArterial.js).
import { criarLaudoArterial } from "./laudoArterial";

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
});

export const {
  ARTERIAS,
  arteriasPadrao,
  normalizarArterias,
  getConclusaoMembro,
  gerarBlocoMembro,
  gerarLaudoCompleto,
} = laudo;
