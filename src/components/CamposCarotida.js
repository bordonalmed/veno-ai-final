import React from "react";
import { CampoSelect, CampoCheck, gradeCampos, gradeDestaque, inputStyle, labelStyle, textareaStyle } from "./CamposArteria";
import {
  statusOptions,
  localizacaoOclusaoOptions,
  fluxoOptions,
  ateromatoseOptions,
  estenoseOptions,
  localizacaoEstenoseOptions,
  tipoPlacaOptions,
  stentOptions,
} from "../utils/carotidasLaudo";

// Campos de um vaso cervical (carótidas e vertebrais), no mesmo formato dos
// laudos arteriais de MMII/MMSS. Usado no formulário e no VENO.AI Map.
export default function CamposCarotida({ valores, onChange, comIMT }) {
  const v = valores;
  const ocluida = v.status === "ocluída";
  const comEstenose = v.estenose && v.estenose !== "ausente";
  const temStent = stentOptions.includes(v.stent);

  function set(campo, valor) {
    let novos = { ...v, [campo]: valor };
    if (campo === "status") {
      novos = { ...novos, localizacaoOclusao: "total", fluxo: "sem alteração", estenose: "ausente", localizacaoEstenose: "", tipoPlaca: "" };
      if (valor === "ocluída") novos.ateromatose = "ausente";
    }
    if (campo === "estenose" && valor === "ausente") {
      novos.localizacaoEstenose = "";
      novos.tipoPlaca = "";
    }
    if (campo === "aneurisma" && !valor) novos.aneurismaDiametro = "";
    onChange(novos);
  }

  return (
    <div>
      <div style={gradeCampos}>
        <CampoSelect label="Perviedade:" value={v.status} options={statusOptions} onChange={(x) => set("status", x)} />
        {ocluida && (
          <CampoSelect label="Localização da oclusão:" value={v.localizacaoOclusao} options={localizacaoOclusaoOptions} onChange={(x) => set("localizacaoOclusao", x)} />
        )}
        {!ocluida && (
          <>
            <CampoSelect label="Fluxo:" value={v.fluxo} options={fluxoOptions} onChange={(x) => set("fluxo", x)} />
            <CampoSelect label="Ateromatose:" value={v.ateromatose} options={ateromatoseOptions} onChange={(x) => set("ateromatose", x)} />
            <CampoSelect label="Estenose:" value={v.estenose} options={estenoseOptions} onChange={(x) => set("estenose", x)} />
          </>
        )}
        {comIMT && (
          <div>
            <label style={labelStyle}>IMT (mm):</label>
            <input type="text" inputMode="decimal" value={v.imt || ""} onChange={(e) => set("imt", e.target.value)} placeholder="mm" style={inputStyle} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(10px, 2.5vw, 18px)", marginBottom: "clamp(8px, 2vw, 12px)" }}>
        <CampoCheck label="Stent" checked={temStent} onChange={(x) => set("stent", x ? "pérvio" : "ausente")} />
        <CampoCheck label="Aneurisma" checked={v.aneurisma} onChange={(x) => set("aneurisma", x)} />
        <CampoCheck label="Dissecção" checked={v.disseccao} onChange={(x) => set("disseccao", x)} />
      </div>

      {!ocluida && comEstenose && (
        <div style={gradeDestaque}>
          <CampoSelect label="Local da estenose:" value={v.localizacaoEstenose} options={localizacaoEstenoseOptions} placeholder="Selecione" onChange={(x) => set("localizacaoEstenose", x)} />
          <CampoSelect label="Tipo de placa:" value={v.tipoPlaca} options={tipoPlacaOptions} placeholder="Selecione" onChange={(x) => set("tipoPlaca", x)} />
        </div>
      )}

      {temStent && (
        <div style={gradeDestaque}>
          <CampoSelect label="Situação do stent:" value={v.stent} options={stentOptions} onChange={(x) => set("stent", x)} />
        </div>
      )}

      {v.aneurisma && (
        <div style={gradeDestaque}>
          <div>
            <label style={labelStyle}>Diâmetro do aneurisma (mm):</label>
            <input type="number" min="0" step="0.1" value={v.aneurismaDiametro || ""} onChange={(e) => set("aneurismaDiametro", e.target.value)} placeholder="mm" style={inputStyle} />
          </div>
        </div>
      )}

      <div>
        <label style={labelStyle}>Observação:</label>
        <textarea value={v.observacao || ""} onChange={(e) => set("observacao", e.target.value)} placeholder="Anotações livres..." style={textareaStyle} />
      </div>
    </div>
  );
}
