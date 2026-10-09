import React from "react";
import { CampoSelect, CampoCheck, gradeCampos, gradeDestaque, inputStyle, labelStyle } from "./CamposArteria";
import {
  ehArterial,
  paredeArterialOptions,
  ondaOptions,
  situacaoVeiaOptions,
  fluxoAxilarOptions,
  arcoPalmarOptions,
  tipoFavOptions,
  statusFavOptions,
  localLesaoFavOptions,
  ehProtese,
} from "../utils/favLaudo";

// Campos do exame de Fístula Arteriovenosa (confecção e avaliação), usados
// no formulário e no VENO.AI Map.

function Medida({ label, value, onChange, unidade = "mm", step = "0.1" }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type="number" min="0" step={step} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={unidade} style={inputStyle} />
    </div>
  );
}

// Um ponto de medida do mapeamento pré-operatório.
export function CamposSitioFAV({ sitio, valores, onChange }) {
  const set = (campo, v) => onChange({ ...valores, [campo]: v });
  if (ehArterial(sitio)) {
    return (
      <div style={gradeCampos}>
        <Medida label="Diâmetro (mm):" value={valores.diametro} onChange={(v) => set("diametro", v)} />
        <CampoSelect label="Parede:" value={valores.parede} options={paredeArterialOptions} onChange={(v) => set("parede", v)} />
        <CampoSelect label="Fluxo:" value={valores.onda} options={ondaOptions} onChange={(v) => set("onda", v)} />
      </div>
    );
  }
  if (sitio === "axilar") {
    return (
      <div style={gradeCampos}>
        <CampoSelect label="Situação:" value={valores.situacao} options={situacaoVeiaOptions.slice(0, 2)} onChange={(v) => set("situacao", v)} />
        {valores.situacao === "Pérvia" && (
          <CampoSelect label="Fluxo:" value={valores.fluxo} options={fluxoAxilarOptions} onChange={(v) => set("fluxo", v)} />
        )}
      </div>
    );
  }
  return (
    <div style={gradeCampos}>
      <CampoSelect label="Situação:" value={valores.situacao} options={situacaoVeiaOptions} onChange={(v) => set("situacao", v)} />
      {valores.situacao === "Pérvia" && (
        <>
          <Medida label="Diâmetro (mm):" value={valores.diametro} onChange={(v) => set("diametro", v)} />
          <Medida label="Profundidade (mm):" value={valores.profundidade} onChange={(v) => set("profundidade", v)} />
        </>
      )}
    </div>
  );
}

// Opções gerais do mapeamento: garrote e arco palmar.
export function CamposConfeccaoGeral({ confeccao, onChange }) {
  return (
    <div style={{ ...gradeCampos, alignItems: "end" }}>
      <div style={{ paddingBottom: 8 }}>
        <CampoCheck label="Veias medidas com garrote" checked={confeccao.garrote} onChange={(v) => onChange({ ...confeccao, garrote: v })} />
      </div>
      <CampoSelect label="Arco palmar (Allen ao Doppler):" value={confeccao.arcoPalmar} options={arcoPalmarOptions} placeholder="Não avaliado" onChange={(v) => onChange({ ...confeccao, arcoPalmar: v })} />
    </div>
  );
}

// FAV já confeccionada.
export function CamposAvaliacaoFAV({ avaliacao, onChange }) {
  const a = avaliacao;
  const set = (campo, v) => onChange({ ...a, [campo]: v });
  const locais = localLesaoFavOptions(a.tipo);
  const pervia = a.status === "Pérvia";
  return (
    <div>
      <div style={gradeCampos}>
        <CampoSelect label="Tipo de FAV:" value={a.tipo} options={tipoFavOptions} placeholder="Selecione"
          onChange={(v) => onChange({ ...a, tipo: v, estenoseLocal: localLesaoFavOptions(v).includes(a.estenoseLocal) ? a.estenoseLocal : "", aneurismaLocal: localLesaoFavOptions(v).includes(a.aneurismaLocal) ? a.aneurismaLocal : "" })} />
        <CampoSelect label="Situação:" value={a.status} options={statusFavOptions} onChange={(v) => set("status", v)} />
        {pervia && (
          <>
            <Medida label="Fluxo volumétrico (mL/min):" value={a.fluxoVolume} onChange={(v) => set("fluxoVolume", v)} unidade="mL/min" step="10" />
            <Medida label="Artéria nutridora (mm):" value={a.arteriaDiametro} onChange={(v) => set("arteriaDiametro", v)} />
            <Medida label="Anastomose (mm):" value={a.anastomoseDiametro} onChange={(v) => set("anastomoseDiametro", v)} />
            <Medida label="VPS na anastomose (cm/s):" value={a.anastomosePsv} onChange={(v) => set("anastomosePsv", v)} unidade="cm/s" step="1" />
            <Medida label={ehProtese(a.tipo) ? "Prótese - diâmetro (mm):" : "Veia de drenagem (mm):"} value={a.veiaDiametro} onChange={(v) => set("veiaDiametro", v)} />
            <Medida label="Profundidade (mm):" value={a.veiaProfundidade} onChange={(v) => set("veiaProfundidade", v)} />
          </>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(10px, 2.5vw, 18px)", marginBottom: "clamp(8px, 2vw, 12px)" }}>
        <CampoCheck label="Estenose" checked={a.estenose} onChange={(v) => set("estenose", v)} />
        <CampoCheck label="Aneurisma" checked={a.aneurisma} onChange={(v) => set("aneurisma", v)} />
        <CampoCheck label="Pseudoaneurisma" checked={a.pseudoaneurisma} onChange={(v) => set("pseudoaneurisma", v)} />
        <CampoCheck label="Trombo parcial" checked={a.tromboParcial} onChange={(v) => set("tromboParcial", v)} />
        <CampoCheck label="Colaterais" checked={a.colaterais} onChange={(v) => set("colaterais", v)} />
        <CampoCheck label="Roubo (fluxo retrógrado distal)" checked={a.roubo} onChange={(v) => set("roubo", v)} />
        <CampoCheck label="Hematoma / coleção" checked={a.hematoma} onChange={(v) => set("hematoma", v)} />
      </div>

      {a.estenose && (
        <div style={gradeDestaque}>
          <CampoSelect label="Local da estenose:" value={a.estenoseLocal} options={locais} placeholder="Selecione" onChange={(v) => set("estenoseLocal", v)} />
          <Medida label="% de estenose:" value={a.estenosePercentual} onChange={(v) => set("estenosePercentual", v)} unidade="%" step="1" />
          <Medida label="VPS na estenose (cm/s):" value={a.estenosePsv} onChange={(v) => set("estenosePsv", v)} unidade="cm/s" step="1" />
        </div>
      )}
      {a.aneurisma && (
        <div style={gradeDestaque}>
          <CampoSelect label="Local do aneurisma:" value={a.aneurismaLocal} options={locais} placeholder="Selecione" onChange={(v) => set("aneurismaLocal", v)} />
          <Medida label="Diâmetro (mm):" value={a.aneurismaDiametro} onChange={(v) => set("aneurismaDiametro", v)} />
        </div>
      )}
    </div>
  );
}
