import React from "react";
import {
  tipoOndaOptions,
  resistenciaOptions,
  ascensaoOptions,
  sentidoOptions,
} from "../utils/laudoArterial";
import { labelStyle, selectStyle, CampoCheck } from "./CamposArteria";

// Bloco "Onda espectral" (consenso SVM/SVU 2020): sentido, fase, resistência,
// ascensão sistólica e modificadores, com um desenho esquemático da onda que
// acompanha as escolhas e atalhos dos padrões mais comuns.

export const PADROES_ONDA = [
  {
    nome: "Normal",
    dica: "multifásica, anterógrada",
    valores: { tipoOnda: "Multifásico", resistencia: "", ascensao: "Rápida", sentido: "Anterógrado", staccato: false, alargamentoEspectral: false },
  },
  {
    nome: "Pós-estenótica",
    dica: "antigo tardus-parvus",
    valores: { tipoOnda: "Monofásico", resistencia: "Baixa", ascensao: "Prolongada", sentido: "Anterógrado", staccato: false, alargamentoEspectral: false },
  },
  {
    nome: "Pré-oclusiva",
    dica: "staccato",
    valores: { tipoOnda: "Monofásico", resistencia: "Alta", ascensao: "Rápida", sentido: "Anterógrado", staccato: true, alargamentoEspectral: false },
  },
  {
    nome: "Hiperemia",
    dica: "baixa resistência",
    valores: { tipoOnda: "Monofásico", resistencia: "Baixa", ascensao: "Rápida", sentido: "Anterógrado", staccato: false, alargamentoEspectral: false },
  },
  {
    nome: "Retrógrada",
    dica: "fluxo invertido",
    valores: { sentido: "Retrógrado" },
  },
  {
    nome: "Bidirecional",
    dica: "vai e vem",
    valores: { sentido: "Bidirecional" },
  },
];

const DICAS = {
  tipoOnda: {
    "Multifásico": "cruza a linha de base (antes: tri/bifásica)",
    "Monofásico": "não cruza a linha de base",
  },
  resistencia: {
    "": "não informada (não sai no laudo)",
    "Alta": "pouco/nenhum fluxo na diástole — normal no membro em repouso",
    "Intermediária": "fluxo diastólico reduzido",
    "Baixa": "fluxo para frente contínuo na diástole",
  },
  ascensao: {
    "Rápida": "subida sistólica normal",
    "Prolongada": "subida lenta — obstrução antes do ponto",
  },
  sentido: {
    "Anterógrado": "sentido normal, para a periferia",
    "Retrógrado": "invertido em todo o ciclo",
    "Bidirecional": "vai e vem no mesmo ciclo",
  },
};

// Amplitude normalizada da onda ao longo de um ciclo (t de 0 a 1).
function amostraOnda(v, t) {
  const staccato = !!v.staccato;
  const mono = v.tipoOnda === "Monofásico";
  const res = v.resistencia || "Alta";
  const inicio = 0.06;
  const subida = v.ascensao === "Prolongada" ? 0.2 : staccato ? 0.025 : 0.05;
  const pico = staccato ? 0.45 : v.ascensao === "Prolongada" ? 0.62 : 1;
  const queda = staccato ? 0.04 : v.ascensao === "Prolongada" ? 0.22 : 0.12;
  const diast = mono ? (res === "Baixa" ? 0.32 : res === "Intermediária" ? 0.15 : 0) : 0;
  const tp = inicio + subida;
  const tv = tp + queda;
  let y;
  if (t < inicio) y = diast * 0.8;
  else if (t < tp) y = diast * 0.8 + (pico - diast * 0.8) * Math.sin((Math.PI / 2) * ((t - inicio) / subida));
  else if (t < tv) {
    const alvo = mono ? diast : -0.28;
    y = alvo + (pico - alvo) * (0.5 + 0.5 * Math.cos(Math.PI * ((t - tp) / queda)));
  } else if (!mono) {
    // inversão protodiastólica e pequena onda anterógrada: onda multifásica
    const u = t - tv;
    if (u < 0.1) y = -0.28 + 0.4 * Math.sin((Math.PI / 2) * (u / 0.1));
    else if (u < 0.22) y = 0.12 * (1 - (u - 0.1) / 0.12);
    else y = 0;
  } else {
    y = diast - (diast * 0.2) * ((t - tv) / (1 - tv)); // diástole caindo devagar
  }
  if (v.sentido === "Retrógrado") return -y;
  if (v.sentido === "Bidirecional") return t < tv ? y : -Math.max(0.35, Math.abs(y)) * Math.sin(Math.PI * Math.min(1, (t - tv) / 0.35));
  return y;
}

export function DesenhoOnda({ valores, largura = 220, altura = 72 }) {
  const v = valores || {};
  const meio = altura * 0.55;
  const escala = altura * 0.42;
  const pts = [];
  const ciclos = 2;
  const n = 160;
  for (let i = 0; i <= n; i++) {
    const tg = (i / n) * ciclos;
    const y = amostraOnda(v, tg - Math.floor(tg));
    pts.push([8 + (i / n) * (largura - 16), meio - y * escala]);
  }
  const contorno = "M " + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ");
  const preenchido = `${contorno} L ${pts[pts.length - 1][0].toFixed(1)},${meio} L ${pts[0][0].toFixed(1)},${meio} Z`;
  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} width="100%" style={{ maxWidth: largura, display: "block", background: "#0f1a24", borderRadius: 8 }} aria-label="Desenho esquemático da onda">
      {/* linha de base (fluxo zero) */}
      <line x1={4} y1={meio} x2={largura - 4} y2={meio} stroke="#5c7080" strokeWidth={1} strokeDasharray="3 3" />
      {/* "janela" espectral: limpa normalmente, preenchida no alargamento espectral */}
      <path d={preenchido} fill={v.alargamentoEspectral ? "#7fd6e6" : "#7fd6e6"} opacity={v.alargamentoEspectral ? 0.75 : 0.18} />
      <path d={contorno} fill="none" stroke="#e8f7fb" strokeWidth={1.6} />
      <text x={largura - 6} y={meio - 3} fill="#8aa0ae" fontSize="8" textAnchor="end" fontFamily="sans-serif">linha de base</text>
    </svg>
  );
}

function Seletor({ label, campo, valores, options, set, comVazio }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select value={valores[campo] ?? ""} onChange={(e) => set(campo, e.target.value)} style={selectStyle}>
        {comVazio && <option value="">Não informada</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <div style={{ fontSize: 11, color: "#7a8c99", marginTop: 3, lineHeight: 1.3 }}>{DICAS[campo]?.[valores[campo] ?? ""]}</div>
    </div>
  );
}

export function OndaEspectral({ valores, onChange }) {
  const set = (campo, v) => onChange({ ...valores, [campo]: v });
  const aplicar = (p) => onChange({ ...valores, ...p.valores });
  const ativo = (p) => Object.entries(p.valores).every(([k, val]) => (valores[k] ?? "") === val);
  return (
    <div style={{ border: "1px solid rgba(14,184,208,0.35)", background: "rgba(14,184,208,0.06)", borderRadius: 10, padding: 10, marginBottom: 10 }}>
      <div style={{ ...labelStyle, fontSize: 12, marginBottom: 6 }}>ONDA ESPECTRAL</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {PADROES_ONDA.map((p) => (
          <button
            key={p.nome}
            type="button"
            title={p.dica}
            onClick={() => aplicar(p)}
            style={{
              border: "1px solid #0eb8d0", borderRadius: 14, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: ativo(p) ? "#0eb8d0" : "transparent", color: ativo(p) ? "#fff" : "#0eb8d0",
            }}
          >{p.nome}<span style={{ fontWeight: 400, opacity: 0.8 }}> · {p.dica}</span></button>
        ))}
      </div>
      <div style={{ marginBottom: 8 }}><DesenhoOnda valores={valores} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px 12px" }}>
        <Seletor label="Sentido:" campo="sentido" valores={valores} options={sentidoOptions} set={set} />
        <Seletor label="Fase:" campo="tipoOnda" valores={valores} options={tipoOndaOptions} set={set} />
        <Seletor label="Resistência:" campo="resistencia" valores={valores} options={resistenciaOptions} set={set} comVazio />
        <Seletor label="Ascensão sistólica:" campo="ascensao" valores={valores} options={ascensaoOptions} set={set} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 8 }}>
        <span style={{ ...labelStyle, marginBottom: 0 }}>Modificadores:</span>
        <CampoCheck label="Staccato" checked={valores.staccato} onChange={(v) => set("staccato", v)} />
        <CampoCheck label="Alargamento espectral" checked={valores.alargamentoEspectral} onChange={(v) => set("alargamentoEspectral", v)} />
      </div>
    </div>
  );
}
