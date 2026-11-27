import React, { useEffect, useRef } from "react";
import "./Mapa3D.css";
import { iniciarMapa3D } from "./motorMapa3D";
import { normalizarVarizesLado } from "../../utils/mmiiVenosoLaudo";

// Visão 3D do Map do MMII Venoso. Monta a perna a partir dos achados do lado
// ativo. Com onSelecionar / onTracosChange (Map do exame), dá para tocar numa
// veia e alterar o achado no mesmo painel do 2D, e desenhar varizes direto na
// pele (ferramenta = caneta da barra de desenho); a perna se refaz na hora,
// sem mexer na câmera. Sem eles (página do paciente), o 3D só mostra.
// modo="arterial" (Doppler arterial): a mesma perna com a árvore arterial (arterias / enxerto do lado).
// modo="mmssVenoso" (Doppler venoso de membro superior): o braço, com veias (veias / extra do lado).
// modo="aorta" (Doppler de aorta abdominal e ilíacas): o abdome, com as 9 artérias, a endoprótese / enxerto e o fêmoro-femoral (extra).
// modo="carotidas" (Doppler de carótidas e vertebrais): cabeça e pescoço, as 8 artérias (arterias já no formato arterial, ver carotidasPara3D).
function montarExame({ modo, arterias, enxerto, veias, extra, profundas, superficiais, magna, parva, perfurantes, varizes }) {
  if (modo === "carotidas") return { arterias: arterias || {} };
  if (modo === "aorta") return { arterias: arterias || {}, extra: extra || null };
  if (modo === "arterial" || modo === "mmssArterial") return { arterias: arterias || {}, enxerto: enxerto || null };
  if (modo === "mmssVenoso") return { veias: veias || {}, extra: extra || null };
  if (modo === "fav") return { extra: extra || null };
  return {
    profundas: profundas || {},
    superficiais: superficiais || {},
    magna: magna || {},
    parva: parva || {},
    perfurantes: Array.isArray(perfurantes) ? perfurantes : [],
    tracos: normalizarVarizesLado(varizes).tracos || [],
  };
}

export default function Mapa3D(props) {
  const { lado, nota, modo, arterias, enxerto, veias, extra, profundas, superficiais, magna, parva, perfurantes, varizes, ferramenta } = props;
  const carot = modo === "carotidas", aorta = modo === "aorta", tronco = carot || aorta, arterial = aorta || modo === "arterial" || modo === "mmssArterial" || modo === "fav" || carot, braco = modo === "mmssVenoso" || modo === "mmssArterial" || modo === "fav";
  const raiz = useRef(null);
  const motor = useRef(null);
  const ultimas = useRef(props);
  ultimas.current = props;

  useEffect(() => {
    const p = ultimas.current;
    const editavel = typeof p.onSelecionar === "function" || typeof p.onTracosChange === "function";
    const opcoes = editavel ? {
      aoSelecionar: (chave) => { if (typeof ultimas.current.onSelecionar === "function") ultimas.current.onSelecionar(chave.tipo, chave.key); },
      aoDesenhar: (traco) => {
        const atual = normalizarVarizesLado(ultimas.current.varizes).tracos || [];
        if (typeof ultimas.current.onTracosChange === "function") ultimas.current.onTracosChange([...atual, traco]);
      },
      aoApagar: (i) => {
        const atual = normalizarVarizesLado(ultimas.current.varizes).tracos || [];
        if (typeof ultimas.current.onTracosChange === "function") ultimas.current.onTracosChange(atual.filter((_, j) => j !== i));
      },
    } : {};
    opcoes.modo = ["arterial", "mmssVenoso", "mmssArterial", "fav", "carotidas", "aorta"].includes(p.modo) ? p.modo : "venoso";
    opcoes.paciente = !editavel;
    const parar = iniciarMapa3D(raiz.current, montarExame(p), p.lado, opcoes);
    motor.current = parar;
    return () => { motor.current = null; parar(); };
  }, []);

  // achado ou traço mudou: refaz a perna sem recriar o 3D
  const ultimoExame = useRef(null);
  useEffect(() => {
    const ex = montarExame({ modo, arterias, enxerto, veias, extra, profundas, superficiais, magna, parva, perfurantes, varizes });
    const chave = JSON.stringify(ex);
    if (ultimoExame.current === null) { ultimoExame.current = chave; return; }
    if (chave === ultimoExame.current) return;
    ultimoExame.current = chave;
    if (motor.current && motor.current.atualizar) motor.current.atualizar(ex);
  }, [modo, arterias, enxerto, veias, extra, profundas, superficiais, magna, parva, perfurantes, varizes]);

  useEffect(() => {
    if (motor.current && motor.current.caneta) motor.current.caneta(ferramenta || null);
  }, [ferramenta]);

  return (
    <div className="m3d" ref={raiz} data-m3d="raiz">
      <div className="m3d-palco" id="m3d-palco" data-m3d="v3d">
        <canvas className="m3d-gl" data-m3d="gl" aria-label={aorta ? "Abdome em 3D com a aorta e as ilíacas, gerado a partir do mapa" : carot ? "Pescoço em 3D com as carótidas e vertebrais, gerado a partir do mapa" : `Membro ${braco ? "superior" : "inferior"} ${String(lado || "").toLowerCase()} em 3D gerado a partir do mapa${arterial ? " arterial" : ""}`} />
        <div className="m3d-semgl" data-m3d="semgl" hidden>Este navegador não conseguiu abrir o 3D (WebGL). Tente no Chrome ou no Safari atualizados.</div>
        <div className="m3d-fase" data-m3d="fase" data-tom="normal" hidden>
          <div className="k" data-m3d="faseK" />
          <div className="t" data-m3d="faseT" />
        </div>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <button key={i} type="button" className="m3d-rot" data-m3d={`l${i}`} style={{ opacity: 0 }} />
        ))}
        <span className="m3d-rot" data-m3d="rCor" style={{ opacity: 0 }}>↑ coração</span>
        <span className="m3d-rot" data-m3d="rPe" style={{ opacity: 0 }}>↓ pé</span>
        <span className="m3d-rot" data-m3d="rV1" style={{ opacity: 0 }}>válvula</span>
        <span className="m3d-rot" data-m3d="rV2" style={{ opacity: 0 }}>válvula</span>
        <span className="m3d-rot" data-m3d="lSel" style={{ opacity: 0 }} />
        <div className="m3d-topo">
          <button type="button" className="m3d-ico" data-m3d="bPausa" aria-pressed="false" aria-label="Pausar animação" />
          <button type="button" className="m3d-ico" data-m3d="bTela" aria-pressed="false" aria-label="Tela cheia" />
          <button type="button" className="m3d-nomes" data-m3d="bNomes" aria-pressed="false">Nomes</button>
        </div>
        <div className="m3d-faces" data-m3d="faces" role="group" aria-label="Girar a perna para uma vista">
          {(tronco ? [["A", "A", "Vista anterior"], ["P", "P", "Vista posterior"], ["M", "LD", "Lateral direita"], ["L", "LE", "Lateral esquerda"]] : [["A", "A", "Vista anterior"], ["M", "M", "Vista medial"], ["P", "P", "Vista posterior"], ["L", "L", "Vista lateral"]]).map(([k, rot, nome]) => (
            <button key={k} type="button" data-m3d={`f${k}`} aria-pressed="false" className={rot.length > 1 ? "dupla" : undefined} aria-label={nome} title={nome}>{rot}</button>
          ))}
        </div>
        <div className="m3d-leg" data-m3d="leg" />
        <label className="m3d-pele" data-m3d="pele">
          <span>Superficial</span>
          <input type="range" min="0" max="100" defaultValue={arterial ? 65 : 50} data-m3d="peleR" aria-label={arterial ? "Da pele (superficial) às artérias (profundo)" : "Do superficial (pele e varizes) ao profundo (veias profundas)"} />
          <span>Profundo</span>
        </label>
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
          <button type="button" data-m3d="nPerna" aria-pressed="true">{aorta ? "Abdome" : carot ? "Pescoço" : braco ? "Braço" : "Perna"}</button>
          <button type="button" data-m3d="nVeia" aria-pressed="false">{modo === "fav" ? "Vaso" : arterial ? "Artéria" : "Veia"}</button>
          <button type="button" data-m3d="nDentro" aria-pressed="false">Dentro</button>
        </div>
        <button type="button" className="m3d-mini" data-m3d="bCor" aria-pressed="false">{arterial ? "Por fora" : "Doppler"}</button>
      </div>
      <p className="m3d-nota">
        <b data-m3d="dica" />{" "}
        {nota || "Ilustração educativa gerada a partir dos achados do mapa."}
      </p>
    </div>
  );
}
