import React from "react";
import {
  inputStyle,
  textareaStyle,
  labelStyle,
  cardStyle,
  tituloCardStyle,
  gradeCampos,
  gradeDestaque,
  CampoSelect,
  CampoCheck,
} from "./CamposArteria";
import {
  VEIAS,
  VEIAS_CENTRAIS,
  MEDIDAS_FAV_VENOSO,
  statusProfundaOptions,
  statusSuperficialOptions,
  fluxoCentralOptions,
  faseTromboOptions,
  cateterTipoOptions,
  isProfunda,
} from "../utils/mmssVenosoLaudo";

// Campos do Doppler Venoso de MMSS: uma veia, cateter e mapeamento pré-FAV.

// semMoldura: dentro do Mapa Interativo, que já mostra a caixa com o nome da veia.
export function CamposVeia({ veia, valores, onChange, lado, semMoldura }) {
  const trombose = valores.status === "Trombose oclusiva" || valores.status === "Trombose parcial (não oclusiva)";
  const mostraFluxo = VEIAS_CENTRAIS.includes(veia) && valores.status === "Pérvia";

  function set(campo, valor) {
    const novos = { ...valores, [campo]: valor };
    if (campo === "status") {
      if (!(valor === "Trombose oclusiva" || valor === "Trombose parcial (não oclusiva)")) novos.fase = "";
      if (valor !== "Pérvia") novos.fluxo = "Fásico";
    }
    onChange(novos);
  }

  return (
    <div style={semMoldura ? undefined : cardStyle}>
      {!semMoldura && <div style={tituloCardStyle}>{veia.toUpperCase()} ({lado.toUpperCase()}):</div>}
      <div style={gradeCampos}>
        <CampoSelect
          label="Perviedade:"
          value={valores.status}
          options={isProfunda(veia) ? statusProfundaOptions : statusSuperficialOptions}
          onChange={v => set("status", v)}
        />
        {mostraFluxo && (
          <CampoSelect label="Fluxo:" value={valores.fluxo} options={fluxoCentralOptions} onChange={v => set("fluxo", v)} />
        )}
        {trombose && (
          <CampoSelect label="Fase do trombo:" value={valores.fase} options={faseTromboOptions} placeholder="Não especificar" onChange={v => set("fase", v)} />
        )}
      </div>
      <div>
        <label style={labelStyle}>Observação:</label>
        <textarea
          value={valores.observacao}
          onChange={e => set("observacao", e.target.value)}
          placeholder={`Digite observações para ${veia}...`}
          style={{ ...textareaStyle, minHeight: "clamp(40px, 6vw, 56px)" }}
        />
      </div>
    </div>
  );
}

export function CamposCateter({ lado, cateter, onChange }) {
  return (
    <div style={cardStyle}>
      <div style={tituloCardStyle}>CATETER ({lado.toUpperCase()}):</div>
      <div style={{ marginBottom: cateter.presente ? "clamp(8px, 2vw, 12px)" : 0 }}>
        <CampoCheck
          label="Cateter / cabo presente"
          checked={cateter.presente}
          onChange={v => onChange(v ? { ...cateter, presente: true } : { presente: false, tipo: "", veia: "" })}
        />
      </div>
      {cateter.presente && (
        <div style={gradeDestaque}>
          <CampoSelect label="Tipo:" value={cateter.tipo} options={cateterTipoOptions} placeholder="Selecione" onChange={v => onChange({ ...cateter, tipo: v })} />
          <CampoSelect label="Veia:" value={cateter.veia} options={VEIAS} placeholder="Selecione" onChange={v => onChange({ ...cateter, veia: v })} />
        </div>
      )}
    </div>
  );
}

export function CamposFAVVenoso({ lado, fav, onChange }) {
  const setMedida = (campo, chave, v) => onChange({ ...fav, [campo]: { ...fav[campo], [chave]: v } });
  const input = (campo, chave) => (
    <input
      type="number"
      min="0"
      step="0.1"
      value={fav[campo]?.[chave] || ""}
      onChange={e => setMedida(campo, chave, e.target.value)}
      placeholder="mm"
      style={{ ...inputStyle, width: "100%" }}
    />
  );
  return (
    <div style={cardStyle}>
      <div style={tituloCardStyle}>MAPEAMENTO VENOSO PRÉ-FAV ({lado.toUpperCase()}):</div>
      <div style={{ marginBottom: fav.realizado ? "clamp(8px, 2vw, 12px)" : 0 }}>
        <CampoCheck label="Mapeamento pré-fístula realizado" checked={fav.realizado} onChange={v => onChange({ ...fav, realizado: v })} />
      </div>
      {fav.realizado && (
        <div style={{ ...gradeDestaque, gridTemplateColumns: "1fr" }}>
          {MEDIDAS_FAV_VENOSO.map(([campo, nome]) => (
            <div key={campo}>
              <label style={labelStyle}>{nome}:</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <span style={{ ...labelStyle, fontWeight: 500 }}>Diâmetro (mm)</span>
                  {input(campo, "diametro")}
                </div>
                <div>
                  <span style={{ ...labelStyle, fontWeight: 500 }}>Profundidade (mm)</span>
                  {input(campo, "profundidade")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
