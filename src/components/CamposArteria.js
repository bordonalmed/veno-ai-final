import React from "react";
import {
  statusOptions,
  localizacaoOclusaoOptions,
  localizacaoPlacaOptions,
  ateromatoseOptions,
  velocidadeOptions,
  tipoOndaOptions,
  sentidoOptions,
  placaOptions,
  caracteristicaPlacaOptions,
  stentOptions,
  enxertoTipoOptions,
  enxertoStatusOptions,
} from "../utils/mmiiArterialLaudo";

// Campos de uma artéria do Doppler Arterial (MMII e MMSS) e do enxerto (só MMII),
// usados no formulário das páginas e no Mapa Interativo.

const inputStyle = {
  background: "#f7fbff",
  border: "1.5px solid #0eb8d0",
  borderRadius: "clamp(5px, 1vw, 7px)",
  padding: "clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 12px)",
  fontSize: "clamp(13px, 2.5vw, 15px)",
  color: "#222",
  outline: "none",
  fontFamily: "inherit",
  fontWeight: 500,
  width: "clamp(140px, 25vw, 180px)",
  minWidth: 0
};

const selectStyle = {
  background: "#f7fbff",
  border: "1.5px solid #0eb8d0",
  borderRadius: "clamp(5px, 1vw, 7px)",
  padding: "clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 12px)",
  fontSize: "clamp(13px, 2.5vw, 15px)",
  color: "#222",
  outline: "none",
  fontFamily: "inherit",
  fontWeight: 500,
  width: "clamp(140px, 25vw, 180px)",
  minWidth: 0
};


const textareaStyle = {
  background: "#f7fbff",
  border: "1.5px solid #0eb8d0",
  borderRadius: "clamp(5px, 1vw, 7px)",
  padding: "clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 12px)",
  fontSize: "clamp(13px, 2.5vw, 15px)",
  color: "#222",
  outline: "none",
  fontFamily: "inherit",
  fontWeight: 500,
  width: "100%",
  minWidth: 0,
  resize: "vertical",
  minHeight: "clamp(60px, 8vw, 80px)"
};

const labelStyle = {
  fontSize: 'clamp(10px, 2vw, 12px)',
  marginBottom: '3px',
  display: 'block',
  color: '#0eb8d0',
  fontWeight: 600
};

const cardStyle = {
  marginBottom: 'clamp(16px, 3vw, 20px)',
  padding: 'clamp(12px, 2.5vw, 16px)',
  background: 'rgba(0,0,0,0.10)',
  borderRadius: 'clamp(8px, 1.5vw, 12px)',
  boxShadow: '0 2px 16px 0 #0002'
};

const tituloCardStyle = {
  fontWeight: 700,
  fontSize: 'clamp(13px, 2.5vw, 15px)',
  color: '#0eb8d0',
  marginBottom: 'clamp(8px, 2vw, 12px)'
};

const gradeCampos = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 'clamp(8px, 2vw, 12px)',
  marginBottom: 'clamp(8px, 2vw, 12px)'
};

const gradeDestaque = {
  ...gradeCampos,
  padding: 'clamp(8px, 2vw, 12px)',
  background: 'rgba(14, 184, 208, 0.1)',
  borderRadius: 'clamp(4px, 1vw, 6px)',
  border: '1px solid rgba(14, 184, 208, 0.3)'
};

function CampoSelect({ label, value, options, onChange, placeholder }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select value={value || ""} onChange={e => onChange(e.target.value)} style={selectStyle}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function CampoCheck({ label, checked, onChange }) {
  return (
    <label style={{ ...labelStyle, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 0 }}>
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function CamposArteria({ arteria, valores, onChange, lado }) {
  const isOcluida = valores.status === "Ocluída";

  function set(field, value) {
    let novos = { ...valores, [field]: value };
    // Trocar a perviedade zera os campos que só fazem sentido no outro estado
    // (a ateromatose, stent, aneurisma e dissecção valem nos dois e ficam).
    if (field === "status") {
      novos = {
        ...novos,
        localizacaoOclusao: "",
        velocidade: "Normocinético",
        tipoOnda: "Trifásico",
        sentido: "Anterógrado",
        reabitada: false,
        placa: "Ausente",
        estenosePercentual: "",
        caracteristicaPlaca: "",
        localizacaoPlaca: ""
      };
    }
    if (field === "placa" && value === "Ausente") {
      novos.estenosePercentual = "";
      novos.caracteristicaPlaca = "";
      novos.localizacaoPlaca = "";
    }
    if (field === "aneurisma" && !value) novos.aneurismaDiametro = "";
    onChange(novos);
  }

  return (
    <div style={cardStyle}>
      <div style={tituloCardStyle}>{arteria.toUpperCase()} ({lado.toUpperCase()}):</div>

      <div style={gradeCampos}>
        <CampoSelect label="Perviedade:" value={valores.status} options={statusOptions} onChange={v => set('status', v)} />
        {isOcluida && (
          <CampoSelect label="Localização da oclusão:" value={valores.localizacaoOclusao} options={localizacaoOclusaoOptions} placeholder="Selecione" onChange={v => set('localizacaoOclusao', v)} />
        )}
        <CampoSelect label="Ateromatose:" value={valores.ateromatose} options={ateromatoseOptions} onChange={v => set('ateromatose', v)} />
        {!isOcluida && (
          <>
            <CampoSelect label="Velocidade:" value={valores.velocidade} options={velocidadeOptions} onChange={v => set('velocidade', v)} />
            <CampoSelect label="Tipo de Onda:" value={valores.tipoOnda} options={tipoOndaOptions} onChange={v => set('tipoOnda', v)} />
            <CampoSelect label="Sentido:" value={valores.sentido} options={sentidoOptions} onChange={v => set('sentido', v)} />
            <CampoSelect label="Placa:" value={valores.placa} options={placaOptions} onChange={v => set('placa', v)} />
          </>
        )}
        <CampoSelect label="Stent:" value={valores.stent} options={stentOptions} onChange={v => set('stent', v)} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(10px, 2.5vw, 18px)', marginBottom: 'clamp(8px, 2vw, 12px)' }}>
        {!isOcluida && <CampoCheck label="Reabitada por colaterais" checked={valores.reabitada} onChange={v => set('reabitada', v)} />}
        <CampoCheck label="Aneurisma" checked={valores.aneurisma} onChange={v => set('aneurisma', v)} />
        <CampoCheck label="Dissecção" checked={valores.disseccao} onChange={v => set('disseccao', v)} />
      </div>

      {!isOcluida && valores.placa === "Presente" && (
        <div style={gradeDestaque}>
          <div>
            <label style={labelStyle}>% Estenose:</label>
            <input
              type="number"
              min="0"
              max="100"
              value={valores.estenosePercentual}
              onChange={e => set('estenosePercentual', e.target.value)}
              placeholder="%"
              style={inputStyle}
            />
          </div>
          <CampoSelect label="Característica da Placa:" value={valores.caracteristicaPlaca} options={caracteristicaPlacaOptions} placeholder="Selecione" onChange={v => set('caracteristicaPlaca', v)} />
          <CampoSelect label="Localização da Placa:" value={valores.localizacaoPlaca} options={localizacaoPlacaOptions} placeholder="Selecione" onChange={v => set('localizacaoPlaca', v)} />
        </div>
      )}

      {valores.aneurisma && (
        <div style={gradeDestaque}>
          <div>
            <label style={labelStyle}>Diâmetro do aneurisma (mm):</label>
            <input
              type="number"
              min="0"
              value={valores.aneurismaDiametro}
              onChange={e => set('aneurismaDiametro', e.target.value)}
              placeholder="mm"
              style={inputStyle}
            />
          </div>
        </div>
      )}

      <div>
        <label style={labelStyle}>Observação:</label>
        <textarea
          value={valores.observacao}
          onChange={e => set('observacao', e.target.value)}
          placeholder={`Digite observações para ${arteria}...`}
          style={textareaStyle}
        />
      </div>
    </div>
  );
}

export function CamposEnxerto({ lado, enxerto, onChange }) {
  return (
    <div style={cardStyle}>
      <div style={tituloCardStyle}>ENXERTO / PONTE ({lado.toUpperCase()}):</div>
      <div style={gradeCampos}>
        <CampoSelect
          label="Tipo:"
          value={enxerto.tipo}
          options={enxertoTipoOptions}
          placeholder="Nenhum"
          onChange={v => onChange({ tipo: v, status: v ? enxerto.status : "" })}
        />
        {enxerto.tipo && (
          <CampoSelect
            label="Situação:"
            value={enxerto.status}
            options={enxertoStatusOptions}
            placeholder="Selecione"
            onChange={v => onChange({ ...enxerto, status: v })}
          />
        )}
      </div>
    </div>
  );
}
