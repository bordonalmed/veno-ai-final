import React, { useMemo } from "react";
import Mapa3D from "./Mapa3D";
import { decodificarExame3D } from "../../utils/codigo3d";

// Um exame em 3D a partir do código do QR (o que vem depois do "#" no link):
// usado na página do paciente e na vitrine (exames de exemplo).
// demo: só para olhar (como o paciente), mas com o Doppler do nível Artéria.
export function lerExame3D(codigo) {
  try { return decodificarExame3D(decodeURIComponent(String(codigo || ""))); } catch (_) { return null; }
}

export default function Exame3D({ exame: exameDado, codigo, nota, demo }) {
  const exame = useMemo(() => exameDado || lerExame3D(codigo), [exameDado, codigo]);
  if (!exame) return null;
  const p = { nota, demo };
  switch (exame.modo) {
    case "aorta": return <Mapa3D modo="aorta" arterias={exame.arterias} extra={exame.extra} {...p} />;
    case "carotidas": return <Mapa3D modo="carotidas" arterias={exame.arterias} {...p} />;
    case "fav": return <Mapa3D modo="fav" lado={exame.lado} extra={exame.extra} {...p} />;
    case "mmssVenoso": return <Mapa3D modo="mmssVenoso" lado={exame.lado} veias={exame.veias} extra={exame.extra} {...p} />;
    case "mmssArterial": return <Mapa3D modo="mmssArterial" lado={exame.lado} arterias={exame.arterias} {...p} />;
    case "arterial": return <Mapa3D modo="arterial" lado={exame.lado} arterias={exame.arterias} enxerto={exame.enxerto} {...p} />;
    default:
      return (
        <Mapa3D lado={exame.lado} profundas={exame.profundas} superficiais={exame.superficiais}
          magna={exame.magna} parva={exame.parva} perfurantes={exame.perfurantes} varizes={exame.varizes} {...p} />
      );
  }
}
