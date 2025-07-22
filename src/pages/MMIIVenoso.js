import React, { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import { FiSettings, FiHome, FiList, FiLogOut } from "react-icons/fi";

// Constantes para localStorage
const STORAGE_KEY = "examesMMIIVenoso";

// Funções para gerenciar exames salvos
function salvarExame(dadosExame) {
  try {
    const examesExistentes = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const novoExame = {
      ...dadosExame,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      tipo: STORAGE_KEY
    };
    
    examesExistentes.push(novoExame);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(examesExistentes));
    return true;
  } catch (error) {
    console.error("Erro ao salvar exame:", error);
    return false;
  }
}

function carregarExameEmEdicao() {
  try {
    const exameEmEdicao = localStorage.getItem("exameEmEdicao");
    if (exameEmEdicao) {
      const exame = JSON.parse(exameEmEdicao);
      localStorage.removeItem("exameEmEdicao"); // Limpar após carregar
      return exame;
    }
    return null;
  } catch (error) {
    console.error("Erro ao carregar exame em edição:", error);
    return null;
  }
}

// Opções e legendas por extenso
const veiasProfundas = [
  "Veia Femoral Comum",
  "Veia Femoral Superficial",
  "Veia Femoral Profunda",
  "Veia Poplítea",
  "Veias Tibiais posteriores",
  "Veias Tibiais anteriores",
  "Veias Gastrocnêmicas",
  "Veias Soleares",
];
const veiasSuperficiais = [
  "JSF",
  "Safena Magna",
  "JSP",
  "Safena Parva",
];
const profOptions = [
  "pérvia e competente",
  "pérvia e incompetente",
  "não compressível e sem fluxo (sugestivo de trombose)",
  "semi compressível, sugestivo de recanalização parcial",
];
const supOptions = [
  "pérvia e competente",
  "pérvia e incompetente",
  "não compressível e sem fluxo (trombose)",
  "ausente",
];
const lados = ["Direito", "Esquerdo", "Ambos"];
const legendaCampos = {
  "JSF": "JSF",
  "JSP": "JSP",
  "cm_acima_joelho": "cm acima do joelho",
  "cm_abaixo_joelho": "cm abaixo do joelho",
  "cm_acima_tornozelo": "cm acima do tornozelo",
  "tornozelo": "tornozelo",
};

const perfurantesStatusOptions = [
  "pérvia e competente",
  "pérvia e incompetente",
];
const perfurantesSegmentoOptions = [
  "cm acima do joelho",
  "cm abaixo do joelho",
  "cm acima do tornozelo",
];

// Bloco de campos por lado
function BlocoCampos({ lado, profundas, superficiais, magna, parva, perfurantes, onProfundas, onSuperficiais, onMagna, onParva, onPerfurantes, jsfDiametro, setJsfDiametro, jspDiametro, setJspDiametro, observacao, onObservacao, varizes, onVarizes }) {
  return (
    <div style={{
      marginBottom: 'clamp(12px, 2vw, 16px)', 
      width: '100%', 
      padding: 'clamp(12px, 2.5vw, 16px) clamp(14px, 3vw, 20px)', 
      boxSizing: 'border-box', 
      background: 'rgba(0,0,0,0.10)', 
      borderRadius: 'clamp(8px, 1.5vw, 12px)', 
      boxShadow: '0 2px 16px 0 #0002', 
      marginLeft: 'auto', 
      marginRight: 'auto', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 'clamp(8px, 1.5vw, 12px)'
    }}>
      <div style={{
        marginTop: 'clamp(4px, 1vw, 8px)',
        marginBottom: 'clamp(4px, 1vw, 6px)',
        fontWeight: 700, 
        fontSize: 'clamp(12px, 2.5vw, 14px)'
      }}>
        Sistema Venoso Profundo ({lado}):
      </div>
      {veiasProfundas.map(veia => (
        <div key={veia} style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'clamp(6px, 1.5vw, 8px)', 
          marginBottom: 'clamp(3px, 1vw, 4px)', 
          flexWrap: 'wrap' 
        }}>
          <label style={{ 
            minWidth: 'clamp(120px, 20vw, 160px)', 
            fontSize: 'clamp(11px, 2.2vw, 13px)' 
          }}>{veia}:</label>
          <select 
            value={profundas[veia]} 
            onChange={e=>onProfundas({...profundas, [veia]:e.target.value})} 
            style={{
              flex: 1, 
              minWidth: 'clamp(120px, 25vw, 150px)', 
              maxWidth: 'clamp(300px, 40vw, 400px)', 
              padding: 'clamp(3px, 1vw, 4px)', 
              borderRadius: 'clamp(3px, 1vw, 4px)', 
              fontSize: 'clamp(11px, 2.2vw, 13px)'
            }}
          >
            {profOptions.map(opt=><option key={opt}>{opt}</option>)}
          </select>
        </div>
      ))}
      <div style={{
        marginTop: 'clamp(12px, 2.5vw, 16px)',
        fontWeight: 700, 
        fontSize: 'clamp(12px, 2.5vw, 14px)'
      }}>
        Sistema Venoso Superficial ({lado}):
      </div>
      {veiasSuperficiais.map(veia => (
        <div key={veia} style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'clamp(6px, 1.5vw, 8px)', 
          marginBottom: 'clamp(3px, 1vw, 4px)', 
          flexWrap: 'wrap', 
          width: '100%' 
        }}>
          <label style={{ 
            minWidth: 'clamp(120px, 20vw, 160px)', 
            fontSize: 'clamp(11px, 2.2vw, 13px)' 
          }}>{veia}:</label>
          <select
            value={superficiais[veia]}
            onChange={e=>onSuperficiais({...superficiais, [veia]:e.target.value})}
            style={{
              flex: 1, 
              minWidth: 'clamp(120px, 25vw, 150px)', 
              maxWidth: 'clamp(300px, 40vw, 400px)', 
              padding: 'clamp(3px, 1vw, 4px)', 
              borderRadius: 'clamp(3px, 1vw, 4px)', 
              fontSize: 'clamp(11px, 2.2vw, 13px)'
            }}
          >
            {supOptions.map(opt=><option key={opt}>{opt}</option>)}
          </select>
          {(veia === "JSF") && (
            <input 
              type="number" 
              min={0} 
              step={0.1} 
              placeholder="Diâmetro (mm)" 
              value={jsfDiametro || ""} 
              onChange={e => setJsfDiametro(e.target.value)} 
              style={{ 
                width: 'clamp(80px, 15vw, 100px)', 
                marginLeft: 'clamp(4px, 1.5vw, 6px)', 
                borderRadius: 'clamp(3px, 1vw, 4px)', 
                border: "1px solid #0eb8d0", 
                padding: 'clamp(3px, 1vw, 4px)', 
                fontSize: 'clamp(11px, 2.2vw, 13px)' 
              }} 
            />
          )}
          {(veia === "JSP") && (
            <input 
              type="number" 
              min={0} 
              step={0.1} 
              placeholder="Diâmetro (mm)" 
              value={jspDiametro || ""} 
              onChange={e => setJspDiametro(e.target.value)} 
              style={{ 
                width: 'clamp(80px, 15vw, 100px)', 
                marginLeft: 'clamp(4px, 1.5vw, 6px)', 
                borderRadius: 'clamp(3px, 1vw, 4px)', 
                border: "1px solid #0eb8d0", 
                padding: 'clamp(3px, 1vw, 4px)', 
                fontSize: 'clamp(11px, 2.2vw, 13px)' 
              }} 
            />
          )}
          {veia === "Safena Magna" && (
            <div style={{ width: '100%' }}>
              <SafenaMagnaExtra status={superficiais[veia]} valores={magna} onChange={onMagna} />
            </div>
          )}
          {veia === "Safena Parva" && (
            <div style={{ width: '100%' }}>
              <SafenaParvaExtra status={superficiais[veia]} valores={parva} onChange={onParva} />
            </div>
          )}
        </div>
      ))}
      {/* Linha para seleção de varizes */}
      <div style={{
        marginTop: 'clamp(12px, 2.5vw, 16px)',
        marginBottom: 'clamp(8px, 2vw, 12px)',
        fontWeight: 700,
        fontSize: 'clamp(12px, 2.5vw, 14px)'
      }}>
        Varizes
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 1vw, 8px)', flexWrap: 'wrap', marginBottom: 'clamp(6px, 1vw, 10px)' }}>
        {["varizes reticulares", "varizes superficiais", "microvarizes", "nenhuma"].map(tipo => (
          <label key={tipo} style={{ marginRight: 'clamp(4px, 1vw, 8px)', textTransform: 'capitalize', fontSize: 'clamp(10px, 1.5vw, 12px)' }}>
            <input
              type="radio"
              name={`tipoVariz_${lado}`}
              value={tipo === "nenhuma" ? "" : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
              checked={varizes.tipo === (tipo === "nenhuma" ? "" : tipo.charAt(0).toUpperCase() + tipo.slice(1))}
              onChange={e => onVarizes({ ...varizes, tipo: e.target.value, localizacao: e.target.value ? varizes.localizacao : [] })}
              style={{ marginRight: 4 }}
            />
            {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 12px)', flexWrap: 'wrap', marginBottom: 'clamp(6px, 1vw, 10px)' }}>
        <span style={{ fontWeight: 500, fontSize: 'clamp(11px, 2.2vw, 13px)', marginRight: 8 }}>Localização:</span>
        {["coxa", "perna", "tornozelo", "pé"].map(loc => (
          <label key={loc} style={{ marginRight: 'clamp(8px, 2vw, 12px)' }}>
            <input
              type="checkbox"
              name={`localVariz_${lado}_${loc}`}
              checked={varizes.localizacao.includes(loc)}
              disabled={!varizes.tipo}
              onChange={e => {
                if (e.target.checked) {
                  onVarizes({ ...varizes, localizacao: [...varizes.localizacao, loc] });
                } else {
                  onVarizes({ ...varizes, localizacao: varizes.localizacao.filter(l => l !== loc) });
                }
              }}
              style={{ marginRight: 4 }}
            />
            {loc}
          </label>
        ))}
      </div>
      {/* Bloco de veias perfurantes */}
      <div style={{
        marginTop: 'clamp(12px, 2.5vw, 16px)', 
        fontWeight: 700, 
        fontSize: 'clamp(12px, 2.5vw, 14px)'
      }}>Veias Perfurantes ({lado}):</div>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 'clamp(6px, 1.5vw, 8px)', 
        marginBottom: 'clamp(3px, 1vw, 4px)', 
        flexWrap: 'wrap' 
      }}>
        <label style={{ 
          minWidth: 'clamp(120px, 20vw, 160px)', 
          fontSize: 'clamp(11px, 2.2vw, 13px)' 
        }}>Veias Perfurantes:</label>
        <select
          value={perfurantes.status}
          onChange={e => onPerfurantes({ ...perfurantes, status: e.target.value })}
          style={{
            flex: 1, 
            minWidth: 'clamp(120px, 25vw, 150px)', 
            maxWidth: 'clamp(300px, 40vw, 400px)', 
            padding: 'clamp(3px, 1vw, 4px)', 
            borderRadius: 'clamp(3px, 1vw, 4px)', 
            fontSize: 'clamp(11px, 2.2vw, 13px)'
          }}
        >
          {perfurantesStatusOptions.map(opt => <option key={opt}>{opt}</option>)}
        </select>
      </div>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 'clamp(6px, 1.5vw, 8px)', 
        marginBottom: 'clamp(3px, 1vw, 4px)', 
        flexWrap: 'wrap', 
        marginLeft: 'clamp(8px, 2vw, 12px)' 
      }}>
        <select
          value={perfurantes.segmento}
          onChange={e => onPerfurantes({ ...perfurantes, segmento: e.target.value, valor: "" })}
          style={{ 
            minWidth: 'clamp(120px, 25vw, 150px)', 
            maxWidth: 'clamp(180px, 30vw, 220px)', 
            padding: 'clamp(3px, 1vw, 4px)', 
            borderRadius: 'clamp(3px, 1vw, 4px)', 
            fontSize: 'clamp(11px, 2.2vw, 13px)' 
          }}
        >
          <option value="">Selecione o segmento</option>
          {perfurantesSegmentoOptions.map(opt => <option key={opt}>{opt}</option>)}
        </select>
        {perfurantes.segmento && (
          <input
            type="number"
            min={0}
            step={0.1}
            value={perfurantes.valor}
            onChange={e => onPerfurantes({ ...perfurantes, valor: e.target.value })}
            placeholder="cm"
            style={{ 
              width: 'clamp(50px, 10vw, 60px)', 
              marginLeft: 'clamp(3px, 1vw, 4px)', 
              borderRadius: 'clamp(3px, 1vw, 4px)', 
              padding: 'clamp(3px, 1vw, 4px)', 
              border: '1.5px solid #0eb8d0', 
              fontSize: 'clamp(11px, 2.2vw, 13px)' 
            }}
          />
        )}
      </div>
      {/* Caixa de Observação por membro */}
      <div style={{ width: '100%', marginTop: 'clamp(6px, 1.5vw, 8px)' }}>
        <label style={{ 
          fontWeight: 600, 
          fontSize: 'clamp(12px, 2.5vw, 14px)', 
          marginBottom: 'clamp(3px, 1vw, 4px)', 
          display: 'block' 
        }}>Observações ({lado}):</label>
        <textarea
          value={observacao || ''}
          onChange={e => onObservacao(e.target.value)}
          placeholder={`Digite observações adicionais do exame do membro ${lado.toLowerCase()}...`}
          style={{ 
            width: '100%', 
            minHeight: 'clamp(40px, 8vw, 50px)', 
            fontSize: 'clamp(11px, 2.2vw, 13px)', 
            borderRadius: 'clamp(4px, 1vw, 6px)', 
            border: '1.5px solid #0eb8d0', 
            padding: 'clamp(6px, 1.5vw, 8px)', 
            resize: 'vertical', 
            marginTop: 'clamp(1px, 0.5vw, 2px)' 
          }}
        />
      </div>
    </div>
  );
}

// Componentes extras das safenas
function SafenaMagnaExtra({ status, valores, onChange }) {
  if (status !== "pérvia e incompetente") return null;
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
function SafenaParvaExtra({ status, valores, onChange }) {
  if (status !== "pérvia e incompetente") return null;
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

// Função que monta o laudo e mostra legendas por extenso
function gerarConclusaoPorLado({ profundas, superficiais, magna, parva, perfurantes, varizes }) {
  const conclusoes = [];
  if (Object.values(profundas).some(v => v.includes("não compressível"))) {
    conclusoes.push("Trombose venosa profunda");
  }
  if (Object.values(profundas).some(v => v.includes("semi compressível"))) {
    conclusoes.push("Sinais de recanalização parcial do sistema venoso profundo");
  }
  if (Object.values(profundas).some(v => v.includes("incompetente"))) {
    conclusoes.push("Insuficiência de sistema venoso profundo");
  }
  if (superficiais["Safena Magna"] === "pérvia e incompetente") {
    const ini = magna.inicio;
    const fim = magna.fim;
    const ini_val = magna.inicio_valor;
    const fim_val = magna.fim_valor;
    const ini_fmt = ini && legendaCampos[ini] && ini_val ? `${ini_val} ${legendaCampos[ini]}` : legendaCampos[ini] || ini;
    const fim_fmt = fim && legendaCampos[fim] && fim_val ? `${fim_val} ${legendaCampos[fim]}` : legendaCampos[fim] || fim;
    
    // Verifica se tem dados de início e fim preenchidos
    if (ini && fim) {
      if ((ini_fmt && ini_fmt.includes("JSF")) && (fim_fmt && fim_fmt.includes("tornozelo"))) {
        conclusoes.push("Insuficiência total da safena magna");
      } else if ((ini_fmt && (ini_fmt.includes("joelho") || ini_fmt.includes("JSF"))) && (fim_fmt && fim_fmt.includes("tornozelo"))) {
        conclusoes.push("Insuficiência parcial da safena magna");
      } else if ((ini_fmt && ini_fmt.includes("joelho")) && (fim_fmt && fim_fmt.includes("joelho"))) {
        conclusoes.push("Insuficiência segmentar da safena magna");
      } else if ((ini_fmt && ini_fmt.includes("JSF")) && (fim_fmt && fim_fmt.includes("joelho"))) {
        conclusoes.push("Insuficiência parcial da safena magna");
      } else {
        conclusoes.push("Insuficiência da safena magna");
      }
    } else {
      conclusoes.push("Insuficiência da safena magna");
    }
  }
  if (superficiais["Safena Parva"] === "pérvia e incompetente") {
    const ini = parva.inicio;
    const fim = parva.fim;
    const ini_val = parva.inicio_valor;
    const fim_val = parva.fim_valor;
    const ini_fmt = ini && legendaCampos[ini] && ini_val ? `${ini_val} ${legendaCampos[ini]}` : legendaCampos[ini] || ini;
    const fim_fmt = fim && legendaCampos[fim] && fim_val ? `${fim_val} ${legendaCampos[fim]}` : legendaCampos[fim] || fim;
    
    // Verifica se tem dados de início e fim preenchidos
    if (ini && fim) {
      if ((ini_fmt && ini_fmt.includes("JSP")) && (fim_fmt && fim_fmt.includes("tornozelo"))) {
        conclusoes.push("Insuficiência total da safena parva");
      } else if ((ini_fmt && (ini_fmt.includes("joelho") || ini_fmt.includes("JSP"))) && (fim_fmt && fim_fmt.includes("tornozelo"))) {
        conclusoes.push("Insuficiência parcial da safena parva");
      } else if ((ini_fmt && ini_fmt.includes("joelho")) && (fim_fmt && fim_fmt.includes("joelho"))) {
        conclusoes.push("Insuficiência segmentar da safena parva");
      } else if ((ini_fmt && ini_fmt.includes("JSP")) && (fim_fmt && fim_fmt.includes("joelho"))) {
        conclusoes.push("Insuficiência parcial da safena parva");
      } else {
        conclusoes.push("Insuficiência da safena parva");
      }
    } else {
      conclusoes.push("Insuficiência da safena parva");
    }
  }
  if (superficiais["Safena Magna"] === "não compressível e sem fluxo (trombose)") {
    conclusoes.push("Tromboflebite da safena magna");
  }
  if (superficiais["Safena Parva"] === "não compressível e sem fluxo (trombose)") {
    conclusoes.push("Tromboflebite da safena parva");
  }
  if (superficiais["JSF"] === "pérvia e incompetente") {
    conclusoes.push("Incompetência da junção safeno-femoral (JSF)");
  }
  if (superficiais["JSP"] === "pérvia e incompetente") {
    conclusoes.push("Incompetência da junção safeno-poplítea (JSP)");
  }
  if (perfurantes && perfurantes.status === "pérvia e incompetente") {
    conclusoes.push("Insuficiência de veia perfurante");
  }
  if (varizes && varizes.tipo) {
    conclusoes.push(varizes.tipo + ".");
  }
  if (!conclusoes.length) return "- Ausência de refluxo venoso nos territórios estudados.";
  return "- " + conclusoes.join("\n- ");
}

function montarLaudo({ nome, data, lado, profundas, superficiais, magna, parva, jsfDiametro, jspDiametro, observacoes, perfurantes, varizes }) {
  const lados = lado === "Ambos" ? ["Direito", "Esquerdo"] : [lado];
  const blocos = lados.map(l => {
    let linhas = [];
    linhas.push(`PACIENTE: ${nome}`);
    linhas.push(`DATA: ${data}`);
    linhas.push(`DOPPLER VENOSO DE MEMBRO INFERIOR ${l.toUpperCase()}`);
    linhas.push("");
    linhas.push("Sistema Venoso Profundo:");
    veiasProfundas.forEach(v => {
      linhas.push(`- ${v}: ${profundas[l][v]}`);
    });
    linhas.push("");
    linhas.push("Sistema Venoso Superficial:");
    veiasSuperficiais.forEach(v => {
      let extra = "";
      if (v === "JSF" && jsfDiametro && jsfDiametro[l] && jsfDiametro[l] !== "") extra = ` (diâmetro: ${jsfDiametro[l]} mm)`;
      if (v === "JSP" && jspDiametro && jspDiametro[l] && jspDiametro[l] !== "") extra = ` (diâmetro: ${jspDiametro[l]} mm)`;
      linhas.push(`- ${v}: ${superficiais[l][v]}${extra}`);
      if (v === "Safena Magna" && superficiais[l][v] === "pérvia e incompetente") {
        if (magna[l].coxa) linhas.push(`  > Diâmetro - Coxa: ${magna[l].coxa} mm`);
        if (magna[l].perna) linhas.push(`  > Diâmetro - Perna: ${magna[l].perna} mm`);
        if (magna[l].tornozelo) linhas.push(`  > Diâmetro - Tornozelo: ${magna[l].tornozelo} mm`);
        const ini = magna[l].inicio;
        const fim = magna[l].fim;
        const ini_val = magna[l].inicio_valor;
        const fim_val = magna[l].fim_valor;
        const ini_fmt = ini && legendaCampos[ini] && ini_val ? `${ini_val} ${legendaCampos[ini]}` : legendaCampos[ini] || ini;
        const fim_fmt = fim && legendaCampos[fim] && fim_val ? `${fim_val} ${legendaCampos[fim]}` : legendaCampos[fim] || fim;
        linhas.push(`  > Segmento insuficiente: de ${ini_fmt || ''} até ${fim_fmt || ''}`);
      }
      if (v === "Safena Parva" && superficiais[l][v] === "pérvia e incompetente") {
        if (parva[l].proximal) linhas.push(`  > Diâmetro Proximal: ${parva[l].proximal} mm`);
        if (parva[l].distal) linhas.push(`  > Diâmetro Distal: ${parva[l].distal} mm`);
        const ini = parva[l].inicio;
        const fim = parva[l].fim;
        const ini_val = parva[l].inicio_valor;
        const fim_val = parva[l].fim_valor;
        const ini_fmt = ini && legendaCampos[ini] && ini_val ? `${ini_val} ${legendaCampos[ini]}` : legendaCampos[ini] || ini;
        const fim_fmt = fim && legendaCampos[fim] && fim_val ? `${fim_val} ${legendaCampos[fim]}` : legendaCampos[fim] || fim;
        linhas.push(`  > Segmento insuficiente: de ${ini_fmt || ''} até ${fim_fmt || ''}`);
      }
    });
    linhas.push("");
    linhas.push("Veias Perfurantes:");
    if (perfurantes[l] && perfurantes[l].status) {
      let linhaPerf = `- ${perfurantes[l].status}`;
      if (perfurantes[l].segmento && perfurantes[l].valor) {
        linhaPerf += ` (${perfurantes[l].valor} ${perfurantes[l].segmento})`;
      }
      linhas.push(linhaPerf);
    } else {
      linhas.push("- Não especificado");
    }
    // Adicione aqui a linha detalhada das varizes
    if (varizes && varizes[l] && varizes[l].tipo) {
      linhas.push(""); // Adiciona espaço em branco
      let linhaVariz = `${varizes[l].tipo}`;
      if (varizes[l].localizacao && varizes[l].localizacao.length > 0) {
        linhaVariz += ` em ${varizes[l].localizacao.map(loc => loc.charAt(0).toUpperCase() + loc.slice(1)).join(', ')}`;
      }
      linhaVariz += ".";
      linhas.push(linhaVariz);
      linhas.push("");
    }
    linhas.push("");
    linhas.push("CONCLUSÃO:");
    linhas.push(gerarConclusaoPorLado({ profundas: profundas[l], superficiais: superficiais[l], magna: magna[l], parva: parva[l], perfurantes: perfurantes[l], varizes: varizes[l] }));
    if (observacoes && observacoes[l]) {
      linhas.push("");
      linhas.push("OBSERVAÇÕES:");
      linhas.push(observacoes[l]);
    }
    return linhas.join("\n");
  });
  return blocos.join("\n\n" + "=".repeat(80) + "\n\n");
}

function MMIIVenoso() {
  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [data, setData] = useState("");
  const [lado, setLado] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const ladosIndividuais = ["Direito", "Esquerdo"];
  const [profundas, setProfundas] = useState({
    Direito: Object.fromEntries(veiasProfundas.map(v=>[v, profOptions[0]])),
    Esquerdo: Object.fromEntries(veiasProfundas.map(v=>[v, profOptions[0]])),
  });
  const [superficiais, setSuperficiais] = useState({
    Direito: Object.fromEntries(veiasSuperficiais.map(v=>[v, supOptions[0]])),
    Esquerdo: Object.fromEntries(veiasSuperficiais.map(v=>[v, supOptions[0]])),
  });
  const [magna, setMagna] = useState({
    Direito: {coxa:"",perna:"",tornozelo:"",inicio:"",inicio_valor:"",fim:"",fim_valor:""},
    Esquerdo: {coxa:"",perna:"",tornozelo:"",inicio:"",inicio_valor:"",fim:"",fim_valor:""},
  });
  const [parva, setParva] = useState({
    Direito: {proximal:"",distal:"",inicio:"",inicio_valor:"",fim:"",fim_valor:""},
    Esquerdo: {proximal:"",distal:"",inicio:"",inicio_valor:"",fim:"",fim_valor:""},
  });
  const [perfurantes, setPerfurantes] = useState({
    Direito: { status: "pérvia e competente", segmento: "", valor: "" },
    Esquerdo: { status: "pérvia e competente", segmento: "", valor: "" }
  });
  const [observacoes, setObservacoes] = useState({ Direito: '', Esquerdo: '' });
  const [laudoTexto, setLaudoTexto] = useState("");
  const [jsfDiametro, setJsfDiametro] = useState({ Direito: "", Esquerdo: "" });
  const [jspDiametro, setJspDiametro] = useState({ Direito: "", Esquerdo: "" });
  const [erro, setErro] = useState("");
  const [varizes, setVarizes] = useState({
    Direito: { tipo: '', localizacao: [] },
    Esquerdo: { tipo: '', localizacao: [] }
  });

  // Hook para detectar mudanças no tamanho da tela
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Hook para carregar exame em edição
  useEffect(() => {
    const exameEmEdicao = carregarExameEmEdicao();
    if (exameEmEdicao) {
      setNome(exameEmEdicao.nome || "");
      setIdade(exameEmEdicao.idade || "");
      setData(exameEmEdicao.data || "");
      setLado(exameEmEdicao.lado || "");
      
      if (exameEmEdicao.profundas) setProfundas(exameEmEdicao.profundas);
      if (exameEmEdicao.superficiais) setSuperficiais(exameEmEdicao.superficiais);
      if (exameEmEdicao.magna) setMagna(exameEmEdicao.magna);
      if (exameEmEdicao.parva) setParva(exameEmEdicao.parva);
      if (exameEmEdicao.perfurantes) setPerfurantes(exameEmEdicao.perfurantes);
      if (exameEmEdicao.observacoes) setObservacoes(exameEmEdicao.observacoes);
      if (exameEmEdicao.jsfDiametro) setJsfDiametro(exameEmEdicao.jsfDiametro);
      if (exameEmEdicao.jspDiametro) setJspDiametro(exameEmEdicao.jspDiametro);
      
      // Se já tem laudo, mostrar
      if (exameEmEdicao.laudo) {
        setLaudoTexto(exameEmEdicao.laudo);
      }
    }
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "nome") setNome(value);
    else if (name === "idade") setIdade(value);
    else if (name === "data") setData(value);
    else if (name === "lado") setLado(value);
  }

  function handleVisualizar() {
    setErro("");
    if (!nome || !data || !lado) {
      setErro("Preencha nome, data e lado antes de visualizar o laudo!");
      return;
    }
    const laudo = montarLaudo({ nome, data, lado, profundas, superficiais, magna, parva, jsfDiametro, jspDiametro, observacoes, perfurantes, varizes });
    setLaudoTexto(laudo);
  }

  function handleSalvarExame() {
    setErro("");
    if (!nome || !data || !lado) {
      setErro("Preencha nome, data e lado antes de salvar o exame!");
      return;
    }
    
    // Gerar laudo se ainda não foi gerado
    let laudo = laudoTexto;
    if (!laudo) {
      laudo = montarLaudo({ nome, data, lado, profundas, superficiais, magna, parva, jsfDiametro, jspDiametro, observacoes, perfurantes, varizes });
    }
    
    const dadosExame = {
      nome,
      idade,
      data,
      lado,
      profundas,
      superficiais,
      magna,
      parva,
      perfurantes,
      observacoes,
      jsfDiametro,
      jspDiametro,
      laudo,
      tipoNome: "MMII Venoso"
    };
    
    const sucesso = salvarExame(dadosExame);
    if (sucesso) {
      alert("Exame salvo com sucesso!");
    } else {
      setErro("Erro ao salvar o exame. Tente novamente.");
    }
  }

  function handleVoltarMenu() {
    window.location.href = '/home';
  }

  function handleConfiguracao() {
    window.location.href = '/configuracoes';
  }

  function handleVisualizarExamesSalvos() {
    window.location.href = '/exames-realizados';
  }

  function handleLogout() {
    // Implementar lógica de logout se necessário
    window.location.href = '/';
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(120deg,#101824 0%,#1c2740 100%)",
      color: "#fff",
      fontFamily: "Segoe UI, Inter, Arial, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "clamp(8px, 2vw, 20px)",
      boxSizing: "border-box",
      position: "relative"
    }}>
      {/* Botão Casa - Canto superior esquerdo */}
      <button
        onClick={handleVoltarMenu}
        style={{
          position: "absolute",
          left: "clamp(8px, 2vw, 12px)",
          top: "clamp(8px, 2vw, 12px)",
          background: "rgba(18, 30, 56, 0.7)",
          border: "1px solid rgba(14, 184, 208, 0.3)",
          borderRadius: "clamp(4px, 1vw, 6px)",
          padding: "clamp(4px, 1vw, 6px)",
          color: "#0eb8d0",
          fontSize: "clamp(14px, 2.5vw, 18px)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          opacity: 0.8,
          transition: "all 0.2s ease"
        }}
        onMouseEnter={(e) => {
          e.target.style.opacity = "1";
          e.target.style.background = "rgba(18, 30, 56, 0.9)";
        }}
        onMouseLeave={(e) => {
          e.target.style.opacity = "0.8";
          e.target.style.background = "rgba(18, 30, 56, 0.7)";
        }}
        title="Menu de Exames"
      >
        <FiHome />
      </button>

      {/* Botões - Canto superior direito */}
      <div style={{ position: "absolute", right: "clamp(8px, 2vw, 12px)", top: "clamp(8px, 2vw, 12px)", display: "flex", gap: "clamp(6px, 1.5vw, 8px)", zIndex: 10 }}>
        <button
          onClick={handleVisualizarExamesSalvos}
          style={{
            background: "rgba(18, 30, 56, 0.7)",
            border: "1px solid rgba(111, 66, 193, 0.3)",
            borderRadius: "clamp(4px, 1vw, 6px)",
            padding: "clamp(4px, 1vw, 6px)",
            color: "#6f42c1",
            fontSize: "clamp(14px, 2.5vw, 18px)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.8,
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.target.style.opacity = "1";
            e.target.style.background = "rgba(18, 30, 56, 0.9)";
          }}
          onMouseLeave={(e) => {
            e.target.style.opacity = "0.8";
            e.target.style.background = "rgba(18, 30, 56, 0.7)";
          }}
          title="Visualizar Exames Salvos"
        >
          <FiList />
        </button>
        <button
          onClick={handleConfiguracao}
          style={{
            background: "rgba(18, 30, 56, 0.7)",
            border: "1px solid rgba(14, 184, 208, 0.3)",
            borderRadius: "clamp(4px, 1vw, 6px)",
            padding: "clamp(4px, 1vw, 6px)",
            color: "#0eb8d0",
            fontSize: "clamp(14px, 2.5vw, 18px)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.8,
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.target.style.opacity = "1";
            e.target.style.background = "rgba(18, 30, 56, 0.9)";
          }}
          onMouseLeave={(e) => {
            e.target.style.opacity = "0.8";
            e.target.style.background = "rgba(18, 30, 56, 0.7)";
          }}
          title="Configurações"
        >
          <FiSettings />
        </button>
        <button
          onClick={handleLogout}
          style={{
            background: "rgba(18, 30, 56, 0.7)",
            border: "1px solid rgba(255, 124, 124, 0.3)",
            borderRadius: "clamp(4px, 1vw, 6px)",
            padding: "clamp(4px, 1vw, 6px)",
            color: "#ff7c7c",
            fontSize: "clamp(14px, 2.5vw, 18px)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.8,
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.target.style.opacity = "1";
            e.target.style.background = "rgba(18, 30, 56, 0.9)";
          }}
          onMouseLeave={(e) => {
            e.target.style.opacity = "0.8";
            e.target.style.background = "rgba(18, 30, 56, 0.7)";
          }}
          title="Sair"
        >
          <FiLogOut />
        </button>
      </div>

      <img
        src={process.env.PUBLIC_URL + "/venoai-logo.png"}
        alt="VENO.AI"
        style={{
          width: "clamp(100px, 15vw, 140px)",
          marginTop: "clamp(8px, 2vw, 16px)",
          marginBottom: "clamp(6px, 1.5vw, 10px)",
          filter: "drop-shadow(0 10px 32px #00e0ff90)",
          animation: "logoGlow 3s ease-in-out infinite alternate"
        }}
      />

      <div style={{
        width: "100%",
        maxWidth: "min(1100px, 95vw)",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: "clamp(8px, 1.5vw, 12px)",
        margin: "0 auto clamp(12px, 2vw, 16px) auto",
        background: "#18243a",
        borderRadius: "clamp(8px, 1.5vw, 12px)",
        boxShadow: "0 2px 18px #00e0ff18, 0 1.5px 8px #00e0ff10",
        padding: "clamp(8px, 1.5vw, 10px) clamp(12px, 2vw, 16px) clamp(4px, 1vw, 6px) clamp(12px, 2vw, 16px)",
        flexWrap: "wrap"
      }}>
        <input
          type="text"
          name="nome"
          placeholder="Nome do Paciente"
          value={nome}
          onChange={handleChange}
          required
          style={{ 
            ...inputStyle, 
            width: "clamp(250px, 35vw, 500px)", 
            fontSize: "clamp(12px, 2.5vw, 14px)", 
            height: "clamp(28px, 4vw, 32px)", 
            padding: "clamp(3px, 1vw, 4px) clamp(6px, 1.5vw, 8px)", 
            boxShadow: "0 1.5px 6px #00e0ff08" 
          }}
          autoComplete="off"
        />
        <input
          type="number"
          name="idade"
          placeholder="Idade"
          value={idade}
          onChange={handleChange}
          min={0}
          max={120}
          required
          style={{ 
            ...inputStyle, 
            width: "clamp(80px, 12vw, 120px)", 
            fontSize: "clamp(12px, 2.5vw, 14px)", 
            height: "clamp(28px, 4vw, 32px)", 
            padding: "clamp(3px, 1vw, 4px) clamp(6px, 1.5vw, 8px)", 
            boxShadow: "0 1.5px 6px #00e0ff08" 
          }}
        />
        <input
          type="date"
          name="data"
          placeholder="Data do Exame"
          value={data}
          onChange={handleChange}
          required
          style={{ 
            ...inputStyle, 
            width: "clamp(120px, 15vw, 150px)", 
            fontSize: "clamp(12px, 2.5vw, 14px)", 
            height: "clamp(28px, 4vw, 32px)", 
            padding: "clamp(3px, 1vw, 4px) clamp(6px, 1.5vw, 8px)", 
            boxShadow: "0 1.5px 6px #00e0ff08" 
          }}
        />
        <select
          name="lado"
          value={lado}
          onChange={handleChange}
          style={{ 
            ...inputStyle, 
            width: "clamp(140px, 18vw, 200px)", 
            fontSize: "clamp(12px, 2.5vw, 14px)", 
            height: "clamp(28px, 4vw, 32px)", 
            color: lado ? "#222" : "#888", 
            padding: "clamp(3px, 1vw, 4px) clamp(6px, 1.5vw, 8px)", 
            boxShadow: "0 1.5px 6px #00e0ff08" 
          }}
          required
        >
          <option value="">Selecione o Lado</option>
          <option value="Direito">Direito</option>
          <option value="Esquerdo">Esquerdo</option>
          <option value="Ambos">Ambos</option>
        </select>
      </div>
      <div style={{ color: "#ff6565", marginTop: 12, fontWeight: 600 }}>{erro && erro}</div>
      <div style={{ 
        width: '100%', 
        maxWidth: 'min(1200px, 98vw)', 
        margin: 'clamp(16px, 3vw, 24px) auto 0 auto', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: 'clamp(12px, 2vw, 16px)' 
      }}>
        <div style={{ 
          width: '100%', 
          display: 'flex', 
          gap: 'clamp(12px, 2vw, 20px)',
          flexDirection: isMobile ? 'column' : 'row'
        }}>
          {/* Layout para lado único (Direito ou Esquerdo) */}
          {(lado === "Direito" || lado === "Esquerdo") && (
            <>
              <div style={{
                background: '#18243a', 
                borderRadius: 'clamp(8px, 1.5vw, 12px)', 
                boxShadow: '0 2px 12px #00e0ff18', 
                padding: 'clamp(10px, 2vw, 14px)', 
                minWidth: 0, 
                width: isMobile ? '100%' : '50%'
              }}>
                <BlocoCampos
                  lado={lado}
                  profundas={profundas[lado]}
                  superficiais={superficiais[lado]}
                  magna={magna[lado]}
                  parva={parva[lado]}
                  perfurantes={perfurantes[lado]}
                  onProfundas={val => setProfundas(prev => ({ ...prev, [lado]: val }))}
                  onSuperficiais={val => setSuperficiais(prev => ({ ...prev, [lado]: val }))}
                  onMagna={val => setMagna(prev => ({ ...prev, [lado]: val }))}
                  onParva={val => setParva(prev => ({ ...prev, [lado]: val }))}
                  onPerfurantes={val => setPerfurantes(prev => ({ ...prev, [lado]: val }))}
                  jsfDiametro={typeof jsfDiametro[lado] === 'string' ? jsfDiametro[lado] : ''}
                  setJsfDiametro={v => setJsfDiametro(prev => ({ ...prev, [lado]: v }))}
                  jspDiametro={typeof jspDiametro[lado] === 'string' ? jspDiametro[lado] : ''}
                  setJspDiametro={v => setJspDiametro(prev => ({ ...prev, [lado]: v }))}
                  observacao={observacoes[lado]}
                  onObservacao={val => setObservacoes(prev => ({ ...prev, [lado]: val }))}
                  varizes={varizes[lado]}
                  onVarizes={val => setVarizes(prev => ({ ...prev, [lado]: val }))}
                />
              </div>
              {/* Laudo ao lado direito para lado único */}
              {laudoTexto && (
                <div style={{
                  background: "#fff",
                  color: "#222",
                  borderRadius: 'clamp(8px, 1.5vw, 12px)',
                  padding: 'clamp(12px, 2.5vw, 20px)',
                  boxShadow: "0 8px 32px #00e0ff33",
                  fontFamily: "monospace",
                  fontSize: 'clamp(11px, 2.2vw, 13px)',
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  width: isMobile ? '100%' : '50%',
                  maxHeight: "75vh",
                  overflowY: "auto"
                }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 'clamp(6px, 1.5vw, 8px)', marginBottom: 'clamp(6px, 1.5vw, 8px)' }}>
                    <button style={{ 
                      ...buttonStyle, 
                      background: "#0eb8d0", 
                      color: "#fff", 
                      fontSize: 'clamp(10px, 2vw, 12px)', 
                      padding: "clamp(4px, 1.5vw, 6px) clamp(8px, 2vw, 12px)" 
                    }} onClick={() => {
                      const blob = new Blob([laudoTexto], { type: "text/plain;charset=utf-8" });
                      saveAs(blob, `Laudo_${nome}_${data}.txt`);
                    }}>Salvar TXT</button>
                    <button style={{ 
                      ...buttonStyle, 
                      background: "#0eb8d0", 
                      color: "#fff", 
                      fontSize: 'clamp(10px, 2vw, 12px)', 
                      padding: "clamp(4px, 1.5vw, 6px) clamp(8px, 2vw, 12px)" 
                    }} onClick={() => {
                      // Buscar dados do localStorage
                      const nomeMedico = localStorage.getItem("nomeMedico") || "";
                      const crm = localStorage.getItem("crm") || "";
                      const especialidade = localStorage.getItem("especialidadeLaudo") || "";
                      const nomeClinica = localStorage.getItem("nomeClinica") || "";
                      const enderecoClinica = localStorage.getItem("enderecoClinica") || "";
                      const telefoneClinica = localStorage.getItem("telefoneClinica") || "";
                      const emailClinica = localStorage.getItem("emailClinica") || "";
                      const logoClinica = localStorage.getItem("logoClinica") || null;
                      const assinaturaMedico = localStorage.getItem("assinaturaMedico") || null;

                      const doc = new jsPDF();
                      const lados = lado === "Ambos" ? ["Direito", "Esquerdo"] : [lado];
                      const blocos = laudoTexto.split("=".repeat(80));

                      function addCabecalho(y) {
                        let yLogo = 14; // topo do logo
                        let yAtual = yLogo;
                        if (logoClinica) {
                          try {
                            doc.addImage(logoClinica, 'PNG', 95, yLogo, 20, 20); // quadrado 20x20
                          } catch (e) {}
                        }
                        doc.setFontSize(9);
                        let cabecalho = [];
                        if (nomeClinica) cabecalho.push(nomeClinica);
                        if (enderecoClinica) cabecalho.push(enderecoClinica);
                        if (telefoneClinica) cabecalho.push("Tel: " + telefoneClinica);
                        if (emailClinica) cabecalho.push(emailClinica);
                        // Alinhar o cabeçalho à direita, na mesma altura do logo
                        cabecalho.forEach((txt, idx) => {
                          doc.setFont(undefined, "bold");
                          doc.text(txt, 200, yLogo + 5 + idx * 5, { align: "right" });
                        });
                        doc.setFont(undefined, "normal");
                        doc.setFontSize(11);
                        return yLogo + 22;
                      }

                      function addRodape() {
                        const yRodape = 280; // margem inferior de 1cm
                        doc.setFontSize(8);
                        if (assinaturaMedico) {
                          try {
                            doc.addImage(assinaturaMedico, 'PNG', 150, yRodape - 18, 50, 15);
                          } catch (e) {}
                        }
                        doc.text("Assinatura: ________________", 200, yRodape, { align: "right" });
                        let yInfo = yRodape + 5;
                        if (nomeMedico) { doc.setFont(undefined, "bold"); doc.text(nomeMedico, 200, yInfo, { align: "right" }); yInfo += 4; }
                        if (crm) { doc.setFont(undefined, "normal"); doc.text("CRM: " + crm, 200, yInfo, { align: "right" }); yInfo += 4; }
                        if (especialidade) { doc.setFont(undefined, "normal"); doc.text(especialidade, 200, yInfo, { align: "right" }); yInfo += 4; }
                        doc.setFontSize(11);
                      }

                      let pagina = 0;
                      lados.forEach((ladoAtual, idx) => {
                        if (pagina > 0) doc.addPage();
                        let y = addCabecalho(12);
                        const bloco = blocos[idx].trim().split("\n");
                        let inConclusao = false;
                        for (let i = 0; i < bloco.length; i++) {
                          let line = bloco[i];
                          // Negrito para nome do paciente e nome do exame
                          if (line.startsWith("PACIENTE:")) {
                            doc.setFont(undefined, "bold");
                            doc.text(line, 15, y);
                            doc.setFont(undefined, "normal");
                          } else if (line.startsWith("DOPPLER VENOSO DE MEMBRO INFERIOR")) {
                            doc.setFont(undefined, "bold");
                            doc.text(line, 15, y);
                            doc.setFont(undefined, "normal");
                          } else if (line.startsWith("CONCLUSÃO") || line.startsWith("Sistema Venoso Profundo") || line.startsWith("Sistema Venoso Superficial")) {
                            doc.setFont(undefined, "bold");
                            doc.text(line, 15, y);
                            if (line.startsWith("CONCLUSÃO")) inConclusao = true;
                            doc.setFont(undefined, "normal");
                          } else if (inConclusao && line.trim() !== "" && !line.startsWith("OBSERVAÇÕES") && !line.startsWith("=")) {
                            doc.setFont(undefined, "bold");
                            doc.text(line, 15, y);
                            doc.setFont(undefined, "normal");
                          } else {
                            doc.setFont(undefined, "normal");
                            doc.text(line, 15, y);
                            if (inConclusao && line.trim() === "") inConclusao = false;
                          }
                          y += 8;
                          if (y > 265) {
                            addRodape();
                            doc.addPage();
                            y = addCabecalho(12);
                          }
                        }
                        addRodape();
                        pagina++;
                      });
                      doc.save(`Laudo_${nome}_${data}.pdf`);
                      // Limpar formulário para novo laudo
                      setNome("");
                      setIdade("");
                      setData("");
                      setLado("");
                      setProfundas({
                        Direito: Object.fromEntries(veiasProfundas.map(v=>[v, profOptions[0]])),
                        Esquerdo: Object.fromEntries(veiasProfundas.map(v=>[v, profOptions[0]])),
                      });
                      setSuperficiais({
                        Direito: Object.fromEntries(veiasSuperficiais.map(v=>[v, supOptions[0]])),
                        Esquerdo: Object.fromEntries(veiasSuperficiais.map(v=>[v, supOptions[0]])),
                      });
                      setMagna({
                        Direito: {coxa:"",perna:"",tornozelo:"",inicio:"",inicio_valor:"",fim:"",fim_valor:""},
                        Esquerdo: {coxa:"",perna:"",tornozelo:"",inicio:"",inicio_valor:"",fim:"",fim_valor:""},
                      });
                      setParva({
                        Direito: {proximal:"",distal:"",inicio:"",inicio_valor:"",fim:"",fim_valor:""},
                        Esquerdo: {proximal:"",distal:"",inicio:"",inicio_valor:"",fim:"",fim_valor:""},
                      });
                      setPerfurantes({
                        Direito: { status: "pérvia e competente", segmento: "", valor: "" },
                        Esquerdo: { status: "pérvia e competente", segmento: "", valor: "" }
                      });
                      setObservacoes({ Direito: '', Esquerdo: '' });
                      setLaudoTexto("");
                      setJsfDiametro({ Direito: "", Esquerdo: "" });
                      setJspDiametro({ Direito: "", Esquerdo: "" });
                      setErro("");
                    }}>Salvar PDF</button>
                  </div>
                  {laudoTexto}
                </div>
              )}
            </>
          )}
          
          {/* Layout para ambos os lados */}
          {lado === "Ambos" && (
            <>
              <div style={{
                background: '#18243a', 
                borderRadius: 'clamp(8px, 1.5vw, 12px)', 
                boxShadow: '0 2px 12px #00e0ff18', 
                padding: 'clamp(10px, 2vw, 14px)', 
                minWidth: 0, 
                width: isMobile ? '100%' : '50%', 
                maxWidth: isMobile ? '100%' : 700, 
                marginRight: isMobile ? 0 : 'clamp(6px, 1.5vw, 10px)'
              }}>
                <BlocoCampos
                  lado="Direito"
                  profundas={profundas.Direito}
                  superficiais={superficiais.Direito}
                  magna={magna.Direito}
                  parva={parva.Direito}
                  perfurantes={perfurantes.Direito}
                  onProfundas={val => setProfundas(prev => ({ ...prev, Direito: val }))}
                  onSuperficiais={val => setSuperficiais(prev => ({ ...prev, Direito: val }))}
                  onMagna={val => setMagna(prev => ({ ...prev, Direito: val }))}
                  onParva={val => setParva(prev => ({ ...prev, Direito: val }))}
                  onPerfurantes={val => setPerfurantes(prev => ({ ...prev, Direito: val }))}
                  jsfDiametro={typeof jsfDiametro.Direito === 'string' ? jsfDiametro.Direito : ''}
                  setJsfDiametro={v => setJsfDiametro(prev => ({ ...prev, Direito: v }))}
                  jspDiametro={typeof jspDiametro.Direito === 'string' ? jspDiametro.Direito : ''}
                  setJspDiametro={v => setJspDiametro(prev => ({ ...prev, Direito: v }))}
                  observacao={observacoes.Direito}
                  onObservacao={val => setObservacoes(prev => ({ ...prev, Direito: val }))}
                  varizes={varizes.Direito}
                  onVarizes={val => setVarizes(prev => ({ ...prev, Direito: val }))}
                />
              </div>
              <div style={{
                background: '#18243a', 
                borderRadius: 'clamp(8px, 1.5vw, 12px)', 
                boxShadow: '0 2px 12px #00e0ff18', 
                padding: 'clamp(10px, 2vw, 14px)', 
                minWidth: 0, 
                width: isMobile ? '100%' : '50%', 
                maxWidth: isMobile ? '100%' : 700, 
                marginLeft: isMobile ? 0 : 'clamp(6px, 1.5vw, 10px)'
              }}>
                <BlocoCampos
                  lado="Esquerdo"
                  profundas={profundas.Esquerdo}
                  superficiais={superficiais.Esquerdo}
                  magna={magna.Esquerdo}
                  parva={parva.Esquerdo}
                  perfurantes={perfurantes.Esquerdo}
                  onProfundas={val => setProfundas(prev => ({ ...prev, Esquerdo: val }))}
                  onSuperficiais={val => setSuperficiais(prev => ({ ...prev, Esquerdo: val }))}
                  onMagna={val => setMagna(prev => ({ ...prev, Esquerdo: val }))}
                  onParva={val => setParva(prev => ({ ...prev, Esquerdo: val }))}
                  onPerfurantes={val => setPerfurantes(prev => ({ ...prev, Esquerdo: val }))}
                  jsfDiametro={typeof jsfDiametro.Esquerdo === 'string' ? jsfDiametro.Esquerdo : ''}
                  setJsfDiametro={v => setJsfDiametro(prev => ({ ...prev, Esquerdo: v }))}
                  jspDiametro={typeof jspDiametro.Esquerdo === 'string' ? jspDiametro.Esquerdo : ''}
                  setJspDiametro={v => setJspDiametro(prev => ({ ...prev, Esquerdo: v }))}
                  observacao={observacoes.Esquerdo}
                  onObservacao={val => setObservacoes(prev => ({ ...prev, Esquerdo: val }))}
                  varizes={varizes.Esquerdo}
                  onVarizes={val => setVarizes(prev => ({ ...prev, Esquerdo: val }))}
                />
              </div>
            </>
          )}
        </div>
        {/* Botões Visualizar Laudo e Salvar Exame - sempre abaixo */}
        <div style={{
          display: 'flex',
          gap: 'clamp(8px, 2vw, 12px)',
          marginTop: 'clamp(8px, 2vw, 12px)',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <button
            style={{ 
              ...buttonStyle, 
              background: '#0eb8d0', 
              color: '#fff', 
              minWidth: 'clamp(140px, 25vw, 160px)', 
              fontSize: 'clamp(12px, 2.5vw, 14px)', 
              padding: "clamp(6px, 2vw, 8px) clamp(12px, 3vw, 16px)" 
            }}
            onClick={handleVisualizar}
          >Visualizar Laudo</button>
          <button
            style={{ 
              ...buttonStyle, 
              background: '#28a745', 
              color: '#fff', 
              minWidth: 'clamp(140px, 25vw, 160px)', 
              fontSize: 'clamp(12px, 2.5vw, 14px)', 
              padding: "clamp(6px, 2vw, 8px) clamp(12px, 3vw, 16px)" 
            }}
            onClick={handleSalvarExame}
          >Salvar Exame</button>
        </div>
      </div>
      {/* Exibição do laudo ao lado (lado único) ou embaixo (ambos) */}
      {laudoTexto && lado === "Ambos" && (
        <div style={{
          flex: 1,
          minWidth: "clamp(280px, 90vw, 320px)",
          maxWidth: 'min(1200px, 98vw)',
          marginTop: 'clamp(12px, 2vw, 16px)',
          background: "#fff",
          color: "#222",
          borderRadius: 'clamp(8px, 1.5vw, 12px)',
          padding: 'clamp(12px, 2.5vw, 20px)',
          boxShadow: "0 8px 32px #00e0ff33",
          fontFamily: "monospace",
          fontSize: 'clamp(11px, 2.2vw, 13px)',
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          maxHeight: "75vh",
          overflowY: "auto"
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "flex-end", 
            gap: 'clamp(6px, 1.5vw, 8px)', 
            marginBottom: 'clamp(6px, 1.5vw, 8px)' 
          }}>
            <button style={{ 
              ...buttonStyle, 
              background: "#0eb8d0", 
              color: "#fff", 
              fontSize: 'clamp(10px, 2vw, 12px)', 
              padding: "clamp(4px, 1.5vw, 6px) clamp(8px, 2vw, 12px)" 
            }} onClick={() => {
              const blob = new Blob([laudoTexto], { type: "text/plain;charset=utf-8" });
              saveAs(blob, `Laudo_${nome}_${data}.txt`);
            }}>Salvar TXT</button>
            <button style={{ 
              ...buttonStyle, 
              background: "#0eb8d0", 
              color: "#fff", 
              fontSize: 'clamp(10px, 2vw, 12px)', 
              padding: "clamp(4px, 1.5vw, 6px) clamp(8px, 2vw, 12px)" 
            }} onClick={() => {
              // Buscar dados do localStorage
              const nomeMedico = localStorage.getItem("nomeMedico") || "";
              const crm = localStorage.getItem("crm") || "";
              const especialidade = localStorage.getItem("especialidadeLaudo") || "";
              const nomeClinica = localStorage.getItem("nomeClinica") || "";
              const enderecoClinica = localStorage.getItem("enderecoClinica") || "";
              const telefoneClinica = localStorage.getItem("telefoneClinica") || "";
              const emailClinica = localStorage.getItem("emailClinica") || "";
              const logoClinica = localStorage.getItem("logoClinica") || null;
              const assinaturaMedico = localStorage.getItem("assinaturaMedico") || null;

              const doc = new jsPDF();
              const lados = lado === "Ambos" ? ["Direito", "Esquerdo"] : [lado];
              const blocos = laudoTexto.split("=".repeat(80));

              function addCabecalho(y) {
                let yLogo = 14; // topo do logo
                let yAtual = yLogo;
                if (logoClinica) {
                  try {
                    doc.addImage(logoClinica, 'PNG', 95, yLogo, 20, 20); // quadrado 20x20
                  } catch (e) {}
                }
                doc.setFontSize(9);
                let cabecalho = [];
                if (nomeClinica) cabecalho.push(nomeClinica);
                if (enderecoClinica) cabecalho.push(enderecoClinica);
                if (telefoneClinica) cabecalho.push("Tel: " + telefoneClinica);
                if (emailClinica) cabecalho.push(emailClinica);
                // Alinhar o cabeçalho à direita, na mesma altura do logo
                cabecalho.forEach((txt, idx) => {
                  doc.setFont(undefined, "bold");
                  doc.text(txt, 200, yLogo + 5 + idx * 5, { align: "right" });
                });
                doc.setFont(undefined, "normal");
                doc.setFontSize(11);
                return yLogo + 22;
              }

              function addRodape() {
                const yRodape = 280; // margem inferior de 1cm
                doc.setFontSize(8);
                if (assinaturaMedico) {
                  try {
                    doc.addImage(assinaturaMedico, 'PNG', 150, yRodape - 18, 50, 15);
                  } catch (e) {}
                }
                doc.text("Assinatura: ________________", 200, yRodape, { align: "right" });
                let yInfo = yRodape + 5;
                if (nomeMedico) { doc.setFont(undefined, "bold"); doc.text(nomeMedico, 200, yInfo, { align: "right" }); yInfo += 4; }
                if (crm) { doc.setFont(undefined, "normal"); doc.text("CRM: " + crm, 200, yInfo, { align: "right" }); yInfo += 4; }
                if (especialidade) { doc.setFont(undefined, "normal"); doc.text(especialidade, 200, yInfo, { align: "right" }); yInfo += 4; }
                doc.setFontSize(11);
              }

              let pagina = 0;
              lados.forEach((ladoAtual, idx) => {
                if (pagina > 0) doc.addPage();
                let y = addCabecalho(12);
                const bloco = blocos[idx].trim().split("\n");
                let inConclusao = false;
                for (let i = 0; i < bloco.length; i++) {
                  let line = bloco[i];
                  // Negrito para nome do paciente e nome do exame
                  if (line.startsWith("PACIENTE:")) {
                    doc.setFont(undefined, "bold");
                    doc.text(line, 15, y);
                    doc.setFont(undefined, "normal");
                  } else if (line.startsWith("DOPPLER VENOSO DE MEMBRO INFERIOR")) {
                    doc.setFont(undefined, "bold");
                    doc.text(line, 15, y);
                    doc.setFont(undefined, "normal");
                  } else if (line.startsWith("CONCLUSÃO") || line.startsWith("Sistema Venoso Profundo") || line.startsWith("Sistema Venoso Superficial")) {
                    doc.setFont(undefined, "bold");
                    doc.text(line, 15, y);
                    if (line.startsWith("CONCLUSÃO")) inConclusao = true;
                    doc.setFont(undefined, "normal");
                  } else if (inConclusao && line.trim() !== "" && !line.startsWith("OBSERVAÇÕES") && !line.startsWith("=")) {
                    doc.setFont(undefined, "bold");
                    doc.text(line, 15, y);
                    doc.setFont(undefined, "normal");
                  } else {
                    doc.setFont(undefined, "normal");
                    doc.text(line, 15, y);
                    if (inConclusao && line.trim() === "") inConclusao = false;
                  }
                  y += 8;
                  if (y > 265) {
                    addRodape();
                    doc.addPage();
                    y = addCabecalho(12);
                  }
                }
                addRodape();
                pagina++;
              });
              doc.save(`Laudo_${nome}_${data}.pdf`);
              // Limpar formulário para novo laudo
              setNome("");
              setIdade("");
              setData("");
              setLado("");
              setProfundas({
                Direito: Object.fromEntries(veiasProfundas.map(v=>[v, profOptions[0]])),
                Esquerdo: Object.fromEntries(veiasProfundas.map(v=>[v, profOptions[0]])),
              });
              setSuperficiais({
                Direito: Object.fromEntries(veiasSuperficiais.map(v=>[v, supOptions[0]])),
                Esquerdo: Object.fromEntries(veiasSuperficiais.map(v=>[v, supOptions[0]])),
              });
              setMagna({
                Direito: {coxa:"",perna:"",tornozelo:"",inicio:"",inicio_valor:"",fim:"",fim_valor:""},
                Esquerdo: {coxa:"",perna:"",tornozelo:"",inicio:"",inicio_valor:"",fim:"",fim_valor:""},
              });
              setParva({
                Direito: {proximal:"",distal:"",inicio:"",inicio_valor:"",fim:"",fim_valor:""},
                Esquerdo: {proximal:"",distal:"",inicio:"",inicio_valor:"",fim:"",fim_valor:""},
              });
              setPerfurantes({
                Direito: { status: "pérvia e competente", segmento: "", valor: "" },
                Esquerdo: { status: "pérvia e competente", segmento: "", valor: "" }
              });
              setObservacoes({ Direito: '', Esquerdo: '' });
              setLaudoTexto("");
              setJsfDiametro({ Direito: "", Esquerdo: "" });
              setJspDiametro({ Direito: "", Esquerdo: "" });
              setErro("");
            }}>Salvar PDF</button>
          </div>
          {laudoTexto}
        </div>
      )}
      <style>{`
        @keyframes logoGlow {
          0% {
            filter: drop-shadow(0 10px 32px #00e0ff90);
          }
          100% {
            filter: drop-shadow(0 18px 48px #00e0ffc0);
          }
        }
      `}</style>
    </div>
  );
}

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

const buttonStyle = {
  background: "#0eb8d0",
  color: "#fff",
  fontWeight: 600,
  fontSize: "clamp(14px, 2.5vw, 16px)",
  padding: "clamp(8px, 2vw, 10px) clamp(16px, 3vw, 22px)",
  border: "none",
  borderRadius: "clamp(6px, 1.5vw, 8px)",
  cursor: "pointer",
  letterSpacing: 0.5,
  boxShadow: "0 2px 10px #00e0ff30",
  transition: ".2s",
  marginLeft: "clamp(6px, 1.5vw, 8px)",
  minWidth: "clamp(120px, 20vw, 140px)"
};

export default MMIIVenoso; 