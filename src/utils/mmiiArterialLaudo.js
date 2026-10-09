// Laudo do Doppler Arterial de MMII: artérias do membro inferior e enxertos.
// A geração do texto é compartilhada com o MMSS (laudoArterial.js).
import { criarLaudoArterial, preenchido, noLocal } from "./laudoArterial";

export * from "./laudoArterial";

export const enxertoTipoOptions = [
  "Femoropoplíteo acima do joelho",
  "Femoropoplíteo abaixo do joelho",
  "Femorodistal",
  "Fêmoro-femoral cruzado",
];
export const enxertoStatusOptions = ["Pérvio", "Com estenose", "Ocluído"];
// Onde está a lesão do enxerto (estenose ou oclusão).
export const enxertoLocalOptions = ["Anastomose proximal", "Corpo do enxerto", "Anastomose distal"];
// Origem (femoral comum ou superficial) e, no femorodistal, a artéria de destino.
export const enxertoOrigemOptions = ["Femoral comum", "Femoral superficial"];
export const enxertoDestinoOptions = ["Tibial anterior", "Tibial posterior", "Fibular"];
export const enxertoPadrao = { tipo: "", origem: "", destino: "", status: "", local: "" };
export const enxertoTemOrigem = (tipo) => preenchido(tipo) && tipo !== "Fêmoro-femoral cruzado";

// "Enxerto femorodistal (da femoral superficial para a tibial anterior)"
export function nomeEnxerto(enx) {
  const partes = [];
  if (enxertoTemOrigem(enx.tipo) && preenchido(enx.origem)) partes.push(`da ${enx.origem.toLowerCase()}`);
  if (enx.tipo === "Femorodistal" && preenchido(enx.destino)) partes.push(`para a ${enx.destino.toLowerCase()}`);
  return `Enxerto ${enx.tipo.toLowerCase()}${partes.length ? ` (${partes.join(" ")})` : ""}`;
}

const comLocal = (enx) => (preenchido(enx.local) && enx.status !== "Pérvio" ? ` ${noLocal(enx.local)}` : "");

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
        ? [`${nomeEnxerto(enxerto)}: ${preenchido(enxerto.status) ? enxerto.status.toLowerCase() + comLocal(enxerto) : "situação não informada"}.`]
        : [],
    concluir: (enxerto) =>
      enxerto && preenchido(enxerto.tipo)
        ? {
            linhas: [`${nomeEnxerto(enxerto)}${preenchido(enxerto.status) ? ` ${enxerto.status.toLowerCase()}${comLocal(enxerto)}` : ""}`],
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
