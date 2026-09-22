import React from "react";

// Componentes extras das safenas (diâmetros + início/término do refluxo).
// Extraídos para módulo compartilhado para que tanto o formulário
// (MMIIVenoso.js) quanto o Mapa Interativo usem exatamente os mesmos campos.
export function SafenaMagnaExtra({ status, valores, onChange }) {
  if (status !== "pérvia e incompetente" && status !== "ausente") return null;
  return (
    <div style={{
      width: '100%',
      margin: 'clamp(1px, 0.5vw, 2px) 0 clamp(4px, 1.5vw, 6px) 0',
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      background: 'none'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 'clamp(6px, 1.5vw, 8px)',
        alignItems: 'center',
        width: '100%',
        marginBottom: 'clamp(2px, 1vw, 3px)',
        flexWrap: 'wrap',
        justifyContent: 'flex-start'
      }}>
        <label style={{
          minWidth: 'clamp(60px, 12vw, 80px)',
          fontWeight: 500,
          fontSize: 'clamp(10px, 2vw, 12px)'
        }}>Coxa:
          <input
            type="number"
            min={0}
            step={0.1}
            value={valores.coxa}
            onChange={e => onChange({ ...valores, coxa: e.target.value })}
            style={{
              width: 'clamp(40px, 8vw, 50px)',
              marginLeft: 'clamp(2px, 1vw, 3px)',
              fontSize: 'clamp(10px, 2vw, 12px)',
              padding: 'clamp(1px, 0.5vw, 2px)'
            }}
          />
        </label>
        <label style={{
          minWidth: 'clamp(60px, 12vw, 80px)',
          fontWeight: 500,
          fontSize: 'clamp(10px, 2vw, 12px)'
        }}>Perna:
          <input
            type="number"
            min={0}
            step={0.1}
            value={valores.perna}
            onChange={e => onChange({ ...valores, perna: e.target.value })}
            style={{
              width: 'clamp(40px, 8vw, 50px)',
              marginLeft: 'clamp(2px, 1vw, 3px)',
              fontSize: 'clamp(10px, 2vw, 12px)',
              padding: 'clamp(1px, 0.5vw, 2px)'
            }}
          />
        </label>
        <label style={{
          minWidth: 'clamp(80px, 15vw, 100px)',
          fontWeight: 500,
          fontSize: 'clamp(10px, 2vw, 12px)'
        }}>Tornozelo:
          <input
            type="number"
            min={0}
            step={0.1}
            value={valores.tornozelo}
            onChange={e => onChange({ ...valores, tornozelo: e.target.value })}
            style={{
              width: 'clamp(40px, 8vw, 50px)',
              marginLeft: 'clamp(2px, 1vw, 3px)',
              fontSize: 'clamp(10px, 2vw, 12px)',
              padding: 'clamp(1px, 0.5vw, 2px)'
            }}
          />
        </label>
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 'clamp(6px, 1.5vw, 8px)',
        alignItems: 'center',
        width: '100%',
        flexWrap: 'wrap',
        justifyContent: 'flex-start'
      }}>
        <label style={{
          minWidth: 'clamp(90px, 18vw, 110px)',
          fontWeight: 500,
          fontSize: 'clamp(10px, 2vw, 12px)'
        }}>Início:
          <select
            value={valores.inicio}
            onChange={e => onChange({ ...valores, inicio: e.target.value, inicio_valor: "" })}
            style={{
              marginLeft: 'clamp(2px, 1vw, 3px)',
              width: 'clamp(100px, 20vw, 120px)',
              fontSize: 'clamp(10px, 2vw, 12px)',
              padding: 'clamp(1px, 0.5vw, 2px)'
            }}
          >
            <option value="">Selecione</option>
            <option value="JSF">JSF</option>
            <option value="joelho">joelho</option>
            <option value="cm_acima_joelho">cm acima do joelho</option>
            <option value="cm_abaixo_joelho">cm abaixo do joelho</option>
            <option value="cm_acima_tornozelo">cm acima do tornozelo</option>
          </select>
          {valores.inicio && valores.inicio.startsWith("cm_") && (
            <input
              type="number"
              min={0}
              step={0.1}
              value={valores.inicio_valor}
              onChange={e => onChange({ ...valores, inicio_valor: e.target.value })}
              placeholder="cm"
              style={{
                width: 'clamp(30px, 6vw, 40px)',
                marginLeft: 'clamp(2px, 1vw, 3px)',
                fontSize: 'clamp(10px, 2vw, 12px)',
                padding: 'clamp(1px, 0.5vw, 2px)'
              }}
            />
          )}
        </label>
        <label style={{
          minWidth: 'clamp(90px, 18vw, 110px)',
          fontWeight: 500,
          fontSize: 'clamp(10px, 2vw, 12px)'
        }}>Término:
          <select
            value={valores.fim}
            onChange={e => onChange({ ...valores, fim: e.target.value, fim_valor: "" })}
            style={{
              marginLeft: 'clamp(2px, 1vw, 3px)',
              width: 'clamp(100px, 20vw, 120px)',
              fontSize: 'clamp(10px, 2vw, 12px)',
              padding: 'clamp(1px, 0.5vw, 2px)'
            }}
          >
            <option value="">Selecione</option>
            <option value="joelho">joelho</option>
            <option value="cm_acima_joelho">cm acima do joelho</option>
            <option value="cm_abaixo_joelho">cm abaixo do joelho</option>
            <option value="cm_acima_tornozelo">cm acima do tornozelo</option>
            <option value="tornozelo">tornozelo</option>
          </select>
          {valores.fim && valores.fim.startsWith("cm_") && (
            <input
              type="number"
              min={0}
              step={0.1}
              value={valores.fim_valor}
              onChange={e => onChange({ ...valores, fim_valor: e.target.value })}
              placeholder="cm"
              style={{
                width: 'clamp(30px, 6vw, 40px)',
                marginLeft: 'clamp(2px, 1vw, 3px)',
                fontSize: 'clamp(10px, 2vw, 12px)',
                padding: 'clamp(1px, 0.5vw, 2px)'
              }}
            />
          )}
        </label>
      </div>
    </div>
  );
}
export function SafenaParvaExtra({ status, valores, onChange }) {
  if (status !== "pérvia e incompetente" && status !== "ausente") return null;
  return (
    <div style={{
      width: '100%',
      margin: 'clamp(1px, 0.5vw, 2px) 0 clamp(4px, 1.5vw, 6px) 0',
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      background: 'none'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 'clamp(6px, 1.5vw, 8px)',
        alignItems: 'center',
        width: '100%',
        marginBottom: 'clamp(2px, 1vw, 3px)',
        flexWrap: 'wrap',
        justifyContent: 'flex-start'
      }}>
        <label style={{
          minWidth: 'clamp(70px, 14vw, 90px)',
          fontWeight: 500,
          fontSize: 'clamp(10px, 2vw, 12px)'
        }}>Proximal:
          <input
            type="number"
            min={0}
            step={0.1}
            value={valores.proximal}
            onChange={e => onChange({ ...valores, proximal: e.target.value })}
            style={{
              width: 'clamp(40px, 8vw, 50px)',
              marginLeft: 'clamp(2px, 1vw, 3px)',
              fontSize: 'clamp(10px, 2vw, 12px)',
              padding: 'clamp(1px, 0.5vw, 2px)'
            }}
          />
        </label>
        <label style={{
          minWidth: 'clamp(70px, 14vw, 90px)',
          fontWeight: 500,
          fontSize: 'clamp(10px, 2vw, 12px)'
        }}>Distal:
          <input
            type="number"
            min={0}
            step={0.1}
            value={valores.distal}
            onChange={e => onChange({ ...valores, distal: e.target.value })}
            style={{
              width: 'clamp(40px, 8vw, 50px)',
              marginLeft: 'clamp(2px, 1vw, 3px)',
              fontSize: 'clamp(10px, 2vw, 12px)',
              padding: 'clamp(1px, 0.5vw, 2px)'
            }}
          />
        </label>
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 'clamp(6px, 1.5vw, 8px)',
        alignItems: 'center',
        width: '100%',
        flexWrap: 'wrap',
        justifyContent: 'flex-start'
      }}>
        <label style={{
          minWidth: 'clamp(90px, 18vw, 110px)',
          fontWeight: 500,
          fontSize: 'clamp(10px, 2vw, 12px)'
        }}>Início:
          <select
            value={valores.inicio}
            onChange={e => onChange({ ...valores, inicio: e.target.value, inicio_valor: "" })}
            style={{
              marginLeft: 'clamp(2px, 1vw, 3px)',
              width: 'clamp(100px, 20vw, 120px)',
              fontSize: 'clamp(10px, 2vw, 12px)',
              padding: 'clamp(1px, 0.5vw, 2px)'
            }}
          >
            <option value="">Selecione</option>
            <option value="JSP">JSP</option>
            <option value="joelho">joelho</option>
            <option value="cm_abaixo_joelho">cm abaixo do joelho</option>
          </select>
          {valores.inicio === "cm_abaixo_joelho" && (
            <input
              type="number"
              min={0}
              step={0.1}
              value={valores.inicio_valor}
              onChange={e => onChange({ ...valores, inicio_valor: e.target.value })}
              placeholder="cm"
              style={{
                width: 'clamp(30px, 6vw, 40px)',
                marginLeft: 'clamp(2px, 1vw, 3px)',
                fontSize: 'clamp(10px, 2vw, 12px)',
                padding: 'clamp(1px, 0.5vw, 2px)'
              }}
            />
          )}
        </label>
        <label style={{
          minWidth: 'clamp(90px, 18vw, 110px)',
          fontWeight: 500,
          fontSize: 'clamp(10px, 2vw, 12px)'
        }}>Término:
          <select
            value={valores.fim}
            onChange={e => onChange({ ...valores, fim: e.target.value, fim_valor: "" })}
            style={{
              marginLeft: 'clamp(2px, 1vw, 3px)',
              width: 'clamp(100px, 20vw, 120px)',
              fontSize: 'clamp(10px, 2vw, 12px)',
              padding: 'clamp(1px, 0.5vw, 2px)'
            }}
          >
            <option value="">Selecione</option>
            <option value="cm_acima_tornozelo">cm acima do tornozelo</option>
            <option value="tornozelo">tornozelo</option>
          </select>
          {valores.fim === "cm_acima_tornozelo" && (
            <input
              type="number"
              min={0}
              step={0.1}
              value={valores.fim_valor}
              onChange={e => onChange({ ...valores, fim_valor: e.target.value })}
              placeholder="cm"
              style={{
                width: 'clamp(30px, 6vw, 40px)',
                marginLeft: 'clamp(2px, 1vw, 3px)',
                fontSize: 'clamp(10px, 2vw, 12px)',
                padding: 'clamp(1px, 0.5vw, 2px)'
              }}
            />
          )}
        </label>
      </div>
    </div>
  );
}
