import React from "react";
import { cardStyle, tituloCardStyle, gradeCampos, gradeDestaque, inputStyle, labelStyle, CampoSelect, CampoCheck } from "./CamposArteria";
import { enxertoAortaTipoOptions, enxertoAortaStatusOptions, enxertoAortaLocalOptions, endoleakOptions, femoralDoadoraOptions, femoroFemoralLocalOptions } from "../utils/aortaIliacasLaudo";

// Endoprótese (EVAR) ou enxerto aórtico: tipo, situação e, na endoprótese,
// vazamento (endoleak) e diâmetro do saco aneurismático.
export function CamposEnxertoAorta({ enxerto, onChange }) {
  const endo = /^Endoprótese/.test(enxerto.tipo || "");
  return (
    <div style={cardStyle}>
      <div style={tituloCardStyle}>ENDOPRÓTESE / ENXERTO:</div>
      <div style={gradeCampos}>
        <CampoSelect
          label="Tipo:"
          value={enxerto.tipo}
          options={enxertoAortaTipoOptions}
          placeholder="Nenhum"
          onChange={v => onChange(v ? { ...enxerto, tipo: v, local: enxertoAortaLocalOptions(v).includes(enxerto.local) ? enxerto.local : "" } : { tipo: "", status: "", local: "", endoleak: "", sacoDiametro: "" })}
        />
        {enxerto.tipo && (
          <CampoSelect label="Situação:" value={enxerto.status} options={enxertoAortaStatusOptions} placeholder="Selecione" onChange={v => onChange({ ...enxerto, status: v, local: v === "Pérvio" ? "" : enxerto.local })} />
        )}
        {enxerto.tipo && (enxerto.status === "Com estenose" || enxerto.status === "Ocluído") && (
          <CampoSelect label="Local da lesão:" value={enxerto.local} options={enxertoAortaLocalOptions(enxerto.tipo)} placeholder="Selecione" onChange={v => onChange({ ...enxerto, local: v })} />
        )}
        {endo && (
          <CampoSelect label="Vazamento (endoleak):" value={enxerto.endoleak} options={endoleakOptions} placeholder="Selecione" onChange={v => onChange({ ...enxerto, endoleak: v })} />
        )}
        {endo && (
          <div>
            <label style={labelStyle}>Saco aneurismático (mm):</label>
            <input type="number" min="0" step="0.1" value={enxerto.sacoDiametro || ""} onChange={e => onChange({ ...enxerto, sacoDiametro: e.target.value })} placeholder="mm" style={inputStyle} />
          </div>
        )}
      </div>
    </div>
  );
}

// Enxerto fêmoro-femoral cruzado (sozinho ou com a endoprótese aorto-uni-ilíaca).
export function CamposFemoroFemoral({ femoroFemoral, onChange }) {
  const ff = femoroFemoral || { presente: false, doadora: "", status: "", local: "" };
  const set = (campo, v) => onChange({ ...ff, [campo]: v });
  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: ff.presente ? 'clamp(8px, 2vw, 12px)' : 0 }}>
        <CampoCheck label="Enxerto fêmoro-femoral cruzado" checked={ff.presente}
          onChange={v => onChange(v ? { ...ff, presente: true, status: ff.status || "Pérvio" } : { presente: false, doadora: "", status: "", local: "" })} />
      </div>
      {ff.presente && (
        <div style={gradeDestaque}>
          <CampoSelect label="Femoral doadora:" value={ff.doadora} options={femoralDoadoraOptions} placeholder="Selecione" onChange={v => set("doadora", v)} />
          <CampoSelect label="Situação:" value={ff.status} options={enxertoAortaStatusOptions} onChange={v => onChange({ ...ff, status: v, local: v === "Pérvio" ? "" : ff.local })} />
          {ff.status && ff.status !== "Pérvio" && (
            <CampoSelect label="Local da lesão:" value={ff.local} options={femoroFemoralLocalOptions} placeholder="Selecione" onChange={v => set("local", v)} />
          )}
        </div>
      )}
    </div>
  );
}
