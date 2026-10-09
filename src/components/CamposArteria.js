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
  aneurismaFormaOptions,
  enxertoTipoOptions,
  enxertoStatusOptions,
  enxertoLocalOptions,
  enxertoOrigemOptions,
  enxertoDestinoOptions,
  enxertoTemOrigem,
} from "../utils/mmiiArterialLaudo";
import {
  MANOBRAS,
  resultadoManobraOptions,
  arteriaManobraOptions,
  arcoPalmarOptions,
} from "../utils/mmssArterialLaudo";

// Campos de uma artéria do Doppler Arterial (MMII e MMSS), do enxerto (só MMII)
// e das manobras/pré-FAV (só MMSS), usados nas páginas e no Mapa Interativo.

export const inputStyle = {
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

export const selectStyle = {
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


export const textareaStyle = {
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

export const labelStyle = {
  fontSize: 'clamp(10px, 2vw, 12px)',
  marginBottom: '3px',
  display: 'block',
  color: '#0eb8d0',
  fontWeight: 600
};

export const cardStyle = {
  marginBottom: 'clamp(16px, 3vw, 20px)',
  padding: 'clamp(12px, 2.5vw, 16px)',
  background: 'rgba(0,0,0,0.10)',
  borderRadius: 'clamp(8px, 1.5vw, 12px)',
  boxShadow: '0 2px 16px 0 #0002'
};

export const tituloCardStyle = {
  fontWeight: 700,
  fontSize: 'clamp(13px, 2.5vw, 15px)',
  color: '#0eb8d0',
  marginBottom: 'clamp(8px, 2vw, 12px)'
};

export const gradeCampos = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 'clamp(8px, 2vw, 12px)',
  marginBottom: 'clamp(8px, 2vw, 12px)'
};

export const gradeDestaque = {
  ...gradeCampos,
  padding: 'clamp(8px, 2vw, 12px)',
  background: 'rgba(14, 184, 208, 0.1)',
  borderRadius: 'clamp(4px, 1vw, 6px)',
  border: '1px solid rgba(14, 184, 208, 0.3)'
};

export function CampoSelect({ label, value, options, onChange, placeholder }) {
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

export function CampoCheck({ label, checked, onChange }) {
  return (
    <label style={{ ...labelStyle, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 0 }}>
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

// semMoldura: dentro do Mapa Interativo, que já mostra a caixa com o nome da artéria.
// comCalibre: aorta/ilíacas — calibre medido, forma do aneurisma e trombo mural.
export function CamposArteria({ arteria, valores, onChange, lado, semMoldura, comCalibre }) {
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
    if (field === "aneurisma" && !value) {
      novos.aneurismaDiametro = "";
      novos.aneurismaForma = "";
      novos.tromboMural = false;
    }
    onChange(novos);
  }

  return (
    <div style={semMoldura ? undefined : cardStyle}>
      {!semMoldura && <div style={tituloCardStyle}>{arteria.toUpperCase()}{lado ? ` (${lado.toUpperCase()})` : ""}:</div>}

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
        {comCalibre && (
          <div>
            <label style={labelStyle}>Calibre (mm):</label>
            <input type="number" min="0" step="0.1" value={valores.diametro || ""} onChange={e => set('diametro', e.target.value)} placeholder="mm" style={inputStyle} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(10px, 2.5vw, 18px)', marginBottom: 'clamp(8px, 2vw, 12px)' }}>
        {!isOcluida && <CampoCheck label="Reabitada por colaterais" checked={valores.reabitada} onChange={v => set('reabitada', v)} />}
        <CampoCheck label="Stent" checked={(valores.stent || "Ausente") !== "Ausente"} onChange={v => set('stent', v ? "Pérvio" : "Ausente")} />
        <CampoCheck label="Aneurisma" checked={valores.aneurisma} onChange={v => set('aneurisma', v)} />
        <CampoCheck label="Dissecção" checked={valores.disseccao} onChange={v => set('disseccao', v)} />
      </div>

      {(valores.stent || "Ausente") !== "Ausente" && (
        <div style={gradeDestaque}>
          <CampoSelect
            label="Situação do stent:"
            value={valores.stent}
            options={stentOptions.filter(o => o !== "Ausente")}
            onChange={v => set('stent', v)}
          />
        </div>
      )}

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
          {comCalibre && (
            <>
              <CampoSelect label="Forma:" value={valores.aneurismaForma} options={aneurismaFormaOptions} placeholder="Selecione" onChange={v => set('aneurismaForma', v)} />
              <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
                <CampoCheck label="Trombo mural" checked={valores.tromboMural} onChange={v => set('tromboMural', v)} />
              </div>
            </>
          )}
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
          onChange={v => onChange({
            tipo: v,
            origem: enxertoTemOrigem(v) ? enxerto.origem || "" : "",
            destino: v === "Femorodistal" ? enxerto.destino || "" : "",
            status: v ? enxerto.status : "",
            local: v ? enxerto.local || "" : ""
          })}
        />
        {enxertoTemOrigem(enxerto.tipo) && (
          <CampoSelect
            label="Origem:"
            value={enxerto.origem}
            options={enxertoOrigemOptions}
            placeholder="Selecione"
            onChange={v => onChange({ ...enxerto, origem: v })}
          />
        )}
        {enxerto.tipo === "Femorodistal" && (
          <CampoSelect
            label="Destino:"
            value={enxerto.destino}
            options={enxertoDestinoOptions}
            placeholder="Selecione"
            onChange={v => onChange({ ...enxerto, destino: v })}
          />
        )}
        {enxerto.tipo && (
          <CampoSelect
            label="Situação:"
            value={enxerto.status}
            options={enxertoStatusOptions}
            placeholder="Selecione"
            onChange={v => onChange({ ...enxerto, status: v, local: v === "Pérvio" ? "" : enxerto.local || "" })}
          />
        )}
        {enxerto.tipo && (enxerto.status === "Com estenose" || enxerto.status === "Ocluído") && (
          <CampoSelect
            label="Local da lesão:"
            value={enxerto.local}
            options={enxertoLocalOptions}
            placeholder="Selecione"
            onChange={v => onChange({ ...enxerto, local: v })}
          />
        )}
      </div>
    </div>
  );
}

// MMSS: manobras para síndrome do desfiladeiro torácico.
export function CamposManobras({ lado, manobras, onChange }) {
  const setResultado = (m, v) => onChange({ ...manobras, resultados: { ...manobras.resultados, [m]: v } });
  return (
    <div style={cardStyle}>
      <div style={tituloCardStyle}>DESFILADEIRO TORÁCICO ({lado.toUpperCase()}):</div>
      <div style={{ marginBottom: manobras.realizadas ? 'clamp(8px, 2vw, 12px)' : 0 }}>
        <CampoCheck
          label="Manobra costoclavicular realizada"
          checked={manobras.realizadas}
          onChange={v => onChange({ ...manobras, realizadas: v })}
        />
      </div>
      {manobras.realizadas && (
        <div style={gradeDestaque}>
          <CampoSelect
            label="Artéria avaliada:"
            value={manobras.arteria}
            options={arteriaManobraOptions}
            onChange={v => onChange({ ...manobras, arteria: v })}
          />
          {MANOBRAS.map(m => (
            <CampoSelect
              key={m}
              label={`${m}:`}
              value={manobras.resultados[m]}
              options={resultadoManobraOptions}
              onChange={v => setResultado(m, v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// MMSS: mapeamento arterial pré-fístula arteriovenosa.
export function CamposFAV({ lado, fav, onChange }) {
  const set = (campo, v) => onChange({ ...fav, [campo]: v });
  const medida = (campo, label) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="number"
        min="0"
        step="0.1"
        value={fav[campo]}
        onChange={e => set(campo, e.target.value)}
        placeholder="mm"
        style={inputStyle}
      />
    </div>
  );
  return (
    <div style={cardStyle}>
      <div style={tituloCardStyle}>MAPEAMENTO PRÉ-FAV ({lado.toUpperCase()}):</div>
      <div style={{ marginBottom: fav.realizado ? 'clamp(8px, 2vw, 12px)' : 0 }}>
        <CampoCheck label="Mapeamento pré-fístula realizado" checked={fav.realizado} onChange={v => set('realizado', v)} />
      </div>
      {fav.realizado && (
        <div style={gradeDestaque}>
          {medida('radialPunho', 'Radial no punho (mm):')}
          {medida('ulnarPunho', 'Ulnar no punho (mm):')}
          {medida('braquialCotovelo', 'Braquial na fossa cubital (mm):')}
          <CampoSelect
            label="Arco palmar:"
            value={fav.arcoPalmar}
            options={arcoPalmarOptions}
            placeholder="Selecione"
            onChange={v => set('arcoPalmar', v)}
          />
        </div>
      )}
    </div>
  );
}
