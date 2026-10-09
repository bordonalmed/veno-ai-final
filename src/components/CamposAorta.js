import React from "react";
import { cardStyle, tituloCardStyle, gradeCampos, inputStyle, labelStyle, CampoSelect } from "./CamposArteria";
import { enxertoAortaTipoOptions, enxertoAortaStatusOptions, endoleakOptions } from "../utils/aortaIliacasLaudo";

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
          onChange={v => onChange(v ? { ...enxerto, tipo: v } : { tipo: "", status: "", endoleak: "", sacoDiametro: "" })}
        />
        {enxerto.tipo && (
          <CampoSelect label="Situação:" value={enxerto.status} options={enxertoAortaStatusOptions} placeholder="Selecione" onChange={v => onChange({ ...enxerto, status: v })} />
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
