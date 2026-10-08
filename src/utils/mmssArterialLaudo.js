// Laudo do Doppler Arterial de MMSS (mesma lógica do MMII, sem enxerto).
import { criarLaudoArterial } from "./laudoArterial";

export * from "./laudoArterial";

const laudo = criarLaudoArterial({
  arterias: ["Artéria Subclávia", "Artéria Axilar", "Artéria Braquial", "Artéria Radial", "Artéria Ulnar"],
  membro: "SUPERIOR",
});

export const {
  ARTERIAS,
  arteriasPadrao,
  normalizarArterias,
  getConclusaoMembro,
  gerarBlocoMembro,
  gerarLaudoCompleto,
} = laudo;
