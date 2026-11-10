import React, { useEffect, useRef } from "react";
import "./Mapa3D.css";
import { iniciarMapa3D } from "./motorMapa3D";
import { normalizarVarizesLado } from "../../utils/mmiiVenosoLaudo";

// Visão 3D do Map do MMII Venoso. Monta a perna a partir dos achados do lado
// ativo no momento em que abre; para refletir uma mudança feita no 2D, o
// médico volta ao 2D e toca em 3D de novo (o componente é recriado).
export default function Mapa3D(props) {
  const { lado } = props;
  const raiz = useRef(null);
  // retrato do exame na hora em que o 3D abre
  const retrato = useRef(props);

  useEffect(() => {
    const { lado, profundas, superficiais, magna, parva, perfurantes, varizes } = retrato.current;
    const exame = {
      profundas: profundas || {},
      superficiais: superficiais || {},
      magna: magna || {},
      parva: parva || {},
      perfurantes: Array.isArray(perfurantes) ? perfurantes : [],
      tracos: normalizarVarizesLado(varizes).tracos || [],
    };
    return iniciarMapa3D(raiz.current, exame, lado);
  }, []);

  return (
    <div className="m3d" ref={raiz} data-m3d="raiz">
      <div className="m3d-palco" id="m3d-palco" data-m3d="v3d">
        <canvas className="m3d-gl" data-m3d="gl" aria-label={`Membro inferior ${String(lado || "").toLowerCase()} em 3D gerado a partir do mapa`} />
        <div className="m3d-semgl" data-m3d="semgl" hidden>Este navegador não conseguiu abrir o 3D (WebGL). Tente no Chrome ou no Safari atualizados.</div>
        <div className="m3d-fase" data-m3d="fase" data-tom="normal" hidden>
          <div className="k" data-m3d="faseK" />
          <div className="t" data-m3d="faseT" />
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <button key={i} type="button" className="m3d-rot" data-m3d={`l${i}`} style={{ opacity: 0 }} />
        ))}
        <span className="m3d-rot" data-m3d="rCor" style={{ opacity: 0 }}>↑ coração</span>
        <span className="m3d-rot" data-m3d="rPe" style={{ opacity: 0 }}>↓ pé</span>
        <span className="m3d-rot" data-m3d="rV1" style={{ opacity: 0 }}>válvula</span>
        <span className="m3d-rot" data-m3d="rV2" style={{ opacity: 0 }}>válvula</span>
        <span className="m3d-rot" data-m3d="lSel" style={{ opacity: 0 }} />
        <button type="button" className="m3d-nomes" data-m3d="bNomes" aria-pressed="false">Nomes</button>
        <div className="m3d-leg" data-m3d="leg" />
        <div className="m3d-rolagem" data-m3d="rolagem" role="scrollbar" aria-controls="m3d-palco" aria-orientation="vertical" aria-label="Mover a vista para cima e para baixo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} tabIndex={0}>
          <div className="m3d-polegar" data-m3d="polegar" />
        </div>
        <div className="m3d-doppler" data-m3d="dopBox" data-min="0" hidden>
          <div className="k"><span data-m3d="dopN">Doppler (esquemático)</span><span data-m3d="dopR" /></div>
          <canvas className="m3d-dop" data-m3d="dop" />
        </div>
        <div className="m3d-veu" data-m3d="veu">Gerando 3D</div>
      </div>
      <div className="m3d-controles">
        <div className="m3d-seg" role="group" aria-label="Nível de zoom">
          <button type="button" data-m3d="nPerna" aria-pressed="true">Perna</button>
          <button type="button" data-m3d="nVeia" aria-pressed="false">Veia</button>
          <button type="button" data-m3d="nDentro" aria-pressed="false">Dentro</button>
        </div>
        <button type="button" className="m3d-mini" data-m3d="bCor" aria-pressed="false">Doppler</button>
        <button type="button" className="m3d-mini" data-m3d="bPausa" aria-pressed="false">Pausar</button>
      </div>
      <p className="m3d-nota">
        <b data-m3d="dica" />{" "}
        Ilustração educativa gerada a partir dos achados do mapa. Para atualizar, volte ao 2D, mude o achado e toque em 3D de novo.
      </p>
    </div>
  );
}
