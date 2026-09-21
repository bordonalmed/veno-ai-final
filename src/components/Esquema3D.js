import React, { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { LANDMARK_MAGNA, LANDMARK_PARVA, CORES, piorCorProfundo } from "../utils/vascularMapping";
import {
  pxToY,
  legCrossSectionXZ,
  buildVeinCurvePoints,
  pontoNaPerna,
  segmentosPorPx,
  VEIN_ANGLE,
  VEIN_DEPTH,
  LEG_PX_RANGE,
} from "../utils/vascularMapping3D";

const supOptions = [
  "pérvia e competente",
  "pérvia e incompetente",
  "não compressível e sem fluxo (trombose)",
  "ausente",
];
const profOptions = [
  "pérvia e competente",
  "pérvia e incompetente",
  "não compressível e sem fluxo (sugestivo de trombose)",
  "semi compressível, sugestivo de recanalização parcial",
];
const inicioMagnaOptions = [
  ["", "Selecione"],
  ["JSF", "JSF"],
  ["joelho", "joelho"],
  ["cm_acima_joelho", "cm acima do joelho"],
  ["cm_abaixo_joelho", "cm abaixo do joelho"],
  ["cm_acima_tornozelo", "cm acima do tornozelo"],
];
const terminoMagnaOptions = [
  ["", "Selecione"],
  ["joelho", "joelho"],
  ["cm_acima_joelho", "cm acima do joelho"],
  ["cm_abaixo_joelho", "cm abaixo do joelho"],
  ["cm_acima_tornozelo", "cm acima do tornozelo"],
  ["tornozelo", "tornozelo"],
];
const inicioParvaOptions = [
  ["", "Selecione"],
  ["JSP", "JSP"],
  ["joelho", "joelho"],
  ["cm_abaixo_joelho", "cm abaixo do joelho"],
];
const terminoParvaOptions = [
  ["", "Selecione"],
  ["cm_acima_tornozelo", "cm acima do tornozelo"],
  ["tornozelo", "tornozelo"],
];

// Malha da perna com contorno anatômico de verdade: cada "anel" segue
// legCrossSectionXZ (que já tem largura/profundidade próprias e os relevos
// de batata da perna, joelho, canela, maléolos e calcanhar), em vez do
// círculo perfeito de um lathe comum.
function buildLegGeometry() {
  const segments = 56;
  const pxs = [];
  for (let px = LEG_PX_RANGE[0]; px <= LEG_PX_RANGE[1]; px += 4) pxs.push(px);
  const ringCount = pxs.length;
  const vertsPerRing = segments + 1;

  const positions = [];
  for (let i = 0; i < ringCount; i++) {
    const px = pxs[i];
    const y = pxToY(px);
    for (let j = 0; j <= segments; j++) {
      const thetaDeg = (j / segments) * 360;
      const [x, z] = legCrossSectionXZ(px, thetaDeg);
      positions.push(x, y, z);
    }
  }

  const indices = [];
  for (let i = 0; i < ringCount - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * vertsPerRing + j;
      const b = i * vertsPerRing + j + 1;
      const c = (i + 1) * vertsPerRing + j;
      const d = (i + 1) * vertsPerRing + j + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  // Tampas (coxa cortada em cima, ponta do pé embaixo) pra não ficar oco.
  const topCenter = positions.length / 3;
  positions.push(0, pxToY(pxs[0]), 0);
  for (let j = 0; j < segments; j++) {
    indices.push(topCenter, j, j + 1);
  }
  const bottomCenter = positions.length / 3;
  const lastRingStart = (ringCount - 1) * vertsPerRing;
  positions.push(0, pxToY(pxs[ringCount - 1]), 0);
  for (let j = 0; j < segments; j++) {
    indices.push(bottomCenter, lastRingStart + j + 1, lastRingStart + j);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function LegMesh() {
  const geometry = useMemo(() => buildLegGeometry(), []);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#e8b28a"
        transparent
        opacity={0.22}
        roughness={0.85}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function VeinTube({ pxA, pxB, theta, depthFrac, radius, color, tracejado, onClick, onHover, active }) {
  const geometry = useMemo(() => {
    const pts = buildVeinCurvePoints(pxA, pxB, theta, depthFrac).map((p) => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, Math.max(8, pts.length * 2), radius, 8, false);
  }, [pxA, pxB, theta, depthFrac, radius]);

  return (
    <mesh
      geometry={geometry}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        onHover(false);
        document.body.style.cursor = "auto";
      }}
    >
      <meshStandardMaterial
        color={color}
        transparent={!!tracejado}
        opacity={tracejado ? 0.55 : 1}
        emissive={active ? color : "#000000"}
        emissiveIntensity={active ? 0.55 : 0}
        roughness={0.35}
      />
    </mesh>
  );
}

function JunctionDot({ px, theta, depthFrac, color, onClick, onHover, active }) {
  const [x, y, z] = pontoNaPerna(px, theta, depthFrac);
  return (
    <mesh
      position={[x, y, z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHover(false);
        document.body.style.cursor = "auto";
      }}
    >
      <sphereGeometry args={[0.09, 16, 16]} />
      <meshStandardMaterial color={color} emissive={active ? color : "#000000"} emissiveIntensity={active ? 0.6 : 0} />
    </mesh>
  );
}

function CenaVeias({ superficiais, magna, parva, profundas, onHoverVeia, veiaAtiva, onClicarVeia }) {
  const magnaSegs = segmentosPorPx({
    landmark: LANDMARK_MAGNA,
    status: superficiais["Safena Magna"],
    ini: magna.inicio,
    fim: magna.fim,
    iniVal: magna.inicio_valor,
    fimVal: magna.fim_valor,
  });
  const parvaSegs = segmentosPorPx({
    landmark: LANDMARK_PARVA,
    status: superficiais["Safena Parva"],
    ini: parva.inicio,
    fim: parva.fim,
    iniVal: parva.inicio_valor,
    fimVal: parva.fim_valor,
  });
  const corFemoral = piorCorProfundo([
    profundas["Veia Femoral Comum"],
    profundas["Veia Femoral Superficial"],
    profundas["Veia Femoral Profunda"],
  ]);
  const corCalf = piorCorProfundo([
    profundas["Veia Poplítea"],
    profundas["Veias Tibiais posteriores"],
    profundas["Veias Tibiais anteriores"],
    profundas["Veias Gastrocnêmicas"],
    profundas["Veias Soleares"],
  ]);
  const jsfColor = magnaSegs[0].color;
  const jspColor = parvaSegs[0].color;

  return (
    <group>
      <LegMesh />

      {magnaSegs.map((s, i) => (
        <VeinTube
          key={`magna-${i}`}
          pxA={s.pxA}
          pxB={s.pxB}
          theta={VEIN_ANGLE.magna}
          depthFrac={VEIN_DEPTH.magna}
          radius={0.09}
          color={s.color}
          tracejado={s.tracejado}
          active={veiaAtiva === "magna"}
          onHover={(h) => onHoverVeia(h ? "magna" : null)}
          onClick={() => onClicarVeia("magna")}
        />
      ))}
      <JunctionDot
        px={LANDMARK_MAGNA.top}
        theta={VEIN_ANGLE.magna}
        depthFrac={VEIN_DEPTH.magna}
        color={jsfColor}
        active={veiaAtiva === "jsf"}
        onHover={(h) => onHoverVeia(h ? "jsf" : null)}
        onClick={() => onClicarVeia("jsf")}
      />

      {parvaSegs.map((s, i) => (
        <VeinTube
          key={`parva-${i}`}
          pxA={s.pxA}
          pxB={s.pxB}
          theta={VEIN_ANGLE.parva}
          depthFrac={VEIN_DEPTH.parva}
          radius={0.08}
          color={s.color}
          tracejado={s.tracejado}
          active={veiaAtiva === "parva"}
          onHover={(h) => onHoverVeia(h ? "parva" : null)}
          onClick={() => onClicarVeia("parva")}
        />
      ))}
      <JunctionDot
        px={LANDMARK_PARVA.top}
        theta={VEIN_ANGLE.parva}
        depthFrac={VEIN_DEPTH.parva}
        color={jspColor}
        active={veiaAtiva === "jsp"}
        onHover={(h) => onHoverVeia(h ? "jsp" : null)}
        onClick={() => onClicarVeia("jsp")}
      />

      <VeinTube
        pxA={LANDMARK_MAGNA.top}
        pxB={LANDMARK_MAGNA.joelho}
        theta={VEIN_ANGLE.femoral}
        depthFrac={VEIN_DEPTH.femoral}
        radius={0.1}
        color={corFemoral}
        active={veiaAtiva === "femoral"}
        onHover={(h) => onHoverVeia(h ? "femoral" : null)}
        onClick={() => onClicarVeia("femoral")}
      />
      <VeinTube
        pxA={LANDMARK_MAGNA.joelho - 25}
        pxB={LANDMARK_MAGNA.tornozelo}
        theta={VEIN_ANGLE.calf}
        depthFrac={VEIN_DEPTH.calf}
        radius={0.095}
        color={corCalf}
        active={veiaAtiva === "calf"}
        onHover={(h) => onHoverVeia(h ? "calf" : null)}
        onClick={() => onClicarVeia("calf")}
      />
    </group>
  );
}

const rotuloVeia = {
  jsf: "JSF (junção safeno-femoral)",
  magna: "Safena Magna",
  jsp: "JSP (junção safeno-poplítea)",
  parva: "Safena Parva",
  femoral: "Veias Femorais (comum / superficial / profunda)",
  calf: "Veias do joelho e perna (poplítea, tibiais, gastrocnêmicas, soleares)",
};

function PainelEdicao({ veia, superficiais, magna, parva, profundas, onSuperficiais, onMagna, onParva, onProfundas, onFechar }) {
  if (!veia) return null;

  const linhaSelect = (label, value, options, onChange) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 8 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#1c3d5a" }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #c8d3da", fontSize: 13 }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );

  const linhaCampoInicioFim = (label, valores, options, campo, onChangeValores) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 8 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#1c3d5a" }}>{label}</label>
      <div style={{ display: "flex", gap: 6 }}>
        <select
          value={valores[campo] || ""}
          onChange={(e) => onChangeValores({ ...valores, [campo]: e.target.value, [`${campo}_valor`]: "" })}
          style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #c8d3da", fontSize: 13 }}
        >
          {options.map(([val, txt]) => (
            <option key={val} value={val}>
              {txt}
            </option>
          ))}
        </select>
        {valores[campo] && valores[campo].indexOf("cm_") === 0 && (
          <input
            type="number"
            min={0}
            step={0.1}
            placeholder="cm"
            value={valores[`${campo}_valor`] || ""}
            onChange={(e) => onChangeValores({ ...valores, [`${campo}_valor`]: e.target.value })}
            style={{ width: 60, padding: "6px 8px", borderRadius: 6, border: "1px solid #c8d3da", fontSize: 13 }}
          />
        )}
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        width: 260,
        maxWidth: "calc(100% - 24px)",
        background: "#fff",
        borderRadius: 10,
        padding: 14,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        maxHeight: "calc(100% - 24px)",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1c3d5a" }}>{rotuloVeia[veia]}</div>
        <button
          onClick={onFechar}
          style={{ background: "transparent", border: "none", fontSize: 16, cursor: "pointer", color: "#8fa0ad", lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {veia === "jsf" &&
        linhaSelect("Status", superficiais["JSF"], supOptions, (v) => onSuperficiais({ ...superficiais, JSF: v }))}

      {veia === "jsp" &&
        linhaSelect("Status", superficiais["JSP"], supOptions, (v) => onSuperficiais({ ...superficiais, JSP: v }))}

      {veia === "magna" && (
        <>
          {linhaSelect("Safena Magna", superficiais["Safena Magna"], supOptions, (v) =>
            onSuperficiais({ ...superficiais, "Safena Magna": v })
          )}
          {superficiais["Safena Magna"] === "pérvia e incompetente" && (
            <>
              {linhaCampoInicioFim("Início", magna, inicioMagnaOptions, "inicio", onMagna)}
              {linhaCampoInicioFim("Término", magna, terminoMagnaOptions, "fim", onMagna)}
            </>
          )}
        </>
      )}

      {veia === "parva" && (
        <>
          {linhaSelect("Safena Parva", superficiais["Safena Parva"], supOptions, (v) =>
            onSuperficiais({ ...superficiais, "Safena Parva": v })
          )}
          {superficiais["Safena Parva"] === "pérvia e incompetente" && (
            <>
              {linhaCampoInicioFim("Início", parva, inicioParvaOptions, "inicio", onParva)}
              {linhaCampoInicioFim("Término", parva, terminoParvaOptions, "fim", onParva)}
            </>
          )}
        </>
      )}

      {veia === "femoral" && (
        <>
          {linhaSelect("Veia Femoral Comum", profundas["Veia Femoral Comum"], profOptions, (v) =>
            onProfundas({ ...profundas, "Veia Femoral Comum": v })
          )}
          {linhaSelect("Veia Femoral Superficial", profundas["Veia Femoral Superficial"], profOptions, (v) =>
            onProfundas({ ...profundas, "Veia Femoral Superficial": v })
          )}
          {linhaSelect("Veia Femoral Profunda", profundas["Veia Femoral Profunda"], profOptions, (v) =>
            onProfundas({ ...profundas, "Veia Femoral Profunda": v })
          )}
        </>
      )}

      {veia === "calf" && (
        <>
          {linhaSelect("Veia Poplítea", profundas["Veia Poplítea"], profOptions, (v) =>
            onProfundas({ ...profundas, "Veia Poplítea": v })
          )}
          {linhaSelect("Veias Tibiais posteriores", profundas["Veias Tibiais posteriores"], profOptions, (v) =>
            onProfundas({ ...profundas, "Veias Tibiais posteriores": v })
          )}
          {linhaSelect("Veias Tibiais anteriores", profundas["Veias Tibiais anteriores"], profOptions, (v) =>
            onProfundas({ ...profundas, "Veias Tibiais anteriores": v })
          )}
          {linhaSelect("Veias Gastrocnêmicas", profundas["Veias Gastrocnêmicas"], profOptions, (v) =>
            onProfundas({ ...profundas, "Veias Gastrocnêmicas": v })
          )}
          {linhaSelect("Veias Soleares", profundas["Veias Soleares"], profOptions, (v) =>
            onProfundas({ ...profundas, "Veias Soleares": v })
          )}
        </>
      )}
    </div>
  );
}

export default function Esquema3D({
  aberto,
  onFechar,
  lado,
  ladoAtivo,
  onTrocarLado,
  superficiais,
  magna,
  parva,
  profundas,
  onSuperficiais,
  onMagna,
  onParva,
  onProfundas,
}) {
  const [veiaAtiva, setVeiaAtiva] = useState(null);
  const [veiaHover, setVeiaHover] = useState(null);

  if (!aberto) return null;

  const semLado = !lado;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8, 14, 22, 0.78)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(12px, 3vw, 32px)",
      }}
      onClick={onFechar}
    >
      <div
        style={{
          background: "#0f1622",
          borderRadius: 14,
          width: "min(900px, 100%)",
          height: "min(720px, 92vh)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            background: "#18243a",
            color: "#fff",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            Esquema 3D {lado ? `— Membro Inferior ${ladoAtivo}` : ""}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {lado === "Ambos" && (
              <div style={{ display: "flex", gap: 4 }}>
                {["Direito", "Esquerdo"].map((op) => (
                  <button
                    key={op}
                    onClick={() => {
                      setVeiaAtiva(null);
                      onTrocarLado(op);
                    }}
                    style={{
                      background: ladoAtivo === op ? "#0eb8d0" : "transparent",
                      color: "#fff",
                      border: "1px solid #0eb8d0",
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {op}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={onFechar}
              style={{ background: "transparent", border: "1px solid #4a5a6c", color: "#fff", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}
            >
              Fechar
            </button>
          </div>
        </div>

        <div style={{ position: "relative", flex: 1 }}>
          {semLado ? (
            <div style={{ padding: 24, color: "#c8d3da", fontSize: 14 }}>
              Selecione o lado (Direito, Esquerdo ou Ambos) no topo do formulário antes de abrir o esquema 3D.
            </div>
          ) : (
            <>
              <Canvas camera={{ position: [4.2, 2.6, 5.2], fov: 42 }} onPointerMissed={() => setVeiaAtiva(null)}>
                <ambientLight intensity={0.7} />
                <directionalLight position={[3, 5, 4]} intensity={0.9} />
                <directionalLight position={[-3, 2, -4]} intensity={0.35} />
                <CenaVeias
                  superficiais={superficiais}
                  magna={magna}
                  parva={parva}
                  profundas={profundas}
                  veiaAtiva={veiaAtiva || veiaHover}
                  onHoverVeia={setVeiaHover}
                  onClicarVeia={setVeiaAtiva}
                />
                <OrbitControls enablePan={false} minDistance={2} maxDistance={10} target={[0, 2.5, 0]} />
              </Canvas>
              <PainelEdicao
                veia={veiaAtiva}
                superficiais={superficiais}
                magna={magna}
                parva={parva}
                profundas={profundas}
                onSuperficiais={onSuperficiais}
                onMagna={onMagna}
                onParva={onParva}
                onProfundas={onProfundas}
                onFechar={() => setVeiaAtiva(null)}
              />
              {!veiaAtiva && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 12,
                    left: 12,
                    color: "#c8d3da",
                    fontSize: 12,
                    background: "rgba(0,0,0,0.35)",
                    padding: "6px 10px",
                    borderRadius: 6,
                  }}
                >
                  Arraste para girar • Clique numa veia para editar o achado
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
