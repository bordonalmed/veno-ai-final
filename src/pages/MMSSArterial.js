import React, { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import ExamHeader from "../components/ExamHeader";

// Constantes para localStorage
const STORAGE_KEY = "examesMMSSArterial";

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

// Opções para os campos das artérias
const statusOptions = ["Pérvia", "Ocluída"];
const localizacaoOclusaoOptions = ["Proximal", "Medial", "Distal", "Total"];
const ateromatoseOptions = ["Ausente", "Discreta", "Moderada", "Severa"];
const velocidadeOptions = ["Normocinético", "Hipercinético", "Hipocinético"];
const tipoOndaOptions = ["Trifásico", "Bifásico", "Monofásico"];
const sentidoOptions = ["Anterógrado", "Retrógrado"];
const placaOptions = ["Ausente", "Presente"];
const caracteristicaPlacaOptions = ["Calcificada", "Lipídica", "Mista"];
const lados = ["Direito", "Esquerdo", "Ambos"];

// Lista das artérias de MMSS
const arterias = [
  "Artéria Subclávia",
  "Artéria Axilar",
  "Artéria Braquial",
  "Artéria Radial",
  "Artéria Ulnar"
];

// Estilos globais
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

// Estrutura padrão para cada artéria
const estruturaArteria = {
  status: "Pérvia",
  localizacaoOclusao: "",
  ateromatose: "Ausente",
  velocidade: "Normocinético",
  tipoOnda: "Trifásico",
  sentido: "Anterógrado",
  placa: "Ausente",
  estenosePercentual: "",
  caracteristicaPlaca: "",
  observacao: ""
};

// Componente para campos de uma artéria
function CamposArteria({ arteria, valores, onChange, lado }) {
  const [showPlacaExtra, setShowPlacaExtra] = useState(false);

  useEffect(() => {
    setShowPlacaExtra(valores.placa === "Presente");
  }, [valores.placa]);

  // Helper para verificar se a artéria está ocluída
  const isOcluida = valores.status === "Ocluída";

  // Função para lidar com mudanças nos campos
  function handleFieldChange(field, value) {
    let newValores = { ...valores, [field]: value };
    
    // Se Status mudou para "Ocluída", limpar todos os campos relacionados e definir fluxo como "Ausência de fluxo"
    if (field === "status" && value === "Ocluída") {
      newValores = {
        ...newValores,
        localizacaoOclusao: "",
        ateromatose: "Ausente",
        velocidade: "Ausência de fluxo",
        tipoOnda: "Trifásico",
        sentido: "Anterógrado",
        placa: "Ausente",
        estenosePercentual: "",
        caracteristicaPlaca: ""
      };
    }
    
    // Se Status voltou para "Pérvia", resetar valores padrão
    if (field === "status" && value === "Pérvia") {
      newValores = {
        ...newValores,
        localizacaoOclusao: "",
        ateromatose: "Ausente",
        velocidade: "Normocinético",
        tipoOnda: "Trifásico",
        sentido: "Anterógrado",
        placa: "Ausente",
        estenosePercentual: "",
        caracteristicaPlaca: ""
      };
    }
    
    // Se Placa mudou para "Ausente", limpar campos extras
    if (field === "placa" && value === "Ausente") {
      newValores.estenosePercentual = "";
      newValores.caracteristicaPlaca = "";
    }
    
    // Se % Estenose foi limpa, limpar característica da placa
    if (field === "estenosePercentual" && (!value || value.trim() === "")) {
      newValores.caracteristicaPlaca = "";
    }
    
    onChange(newValores);
  }

  return (
    <div style={{
      marginBottom: 'clamp(16px, 3vw, 20px)',
      padding: 'clamp(12px, 2.5vw, 16px)',
      background: 'rgba(0,0,0,0.10)',
      borderRadius: 'clamp(8px, 1.5vw, 12px)',
      boxShadow: '0 2px 16px 0 #0002'
    }}>
      <div style={{
        fontWeight: 700,
        fontSize: 'clamp(13px, 2.5vw, 15px)',
        color: '#0eb8d0',
        marginBottom: 'clamp(8px, 2vw, 12px)'
      }}>
        {arteria.toUpperCase()} ({lado.toUpperCase()}):
      </div>
      
      {/* Linha 1 - Campos distribuídos igualmente */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isOcluida ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 'clamp(8px, 2vw, 12px)',
        marginBottom: 'clamp(8px, 2vw, 12px)'
      }}>
        <div>
          <label style={{ 
            fontSize: 'clamp(10px, 2vw, 12px)', 
            marginBottom: '3px', 
            display: 'block',
            color: '#0eb8d0',
            fontWeight: 600
          }}>Perviedade:</label>
          <select
            value={valores.status}
            onChange={e => handleFieldChange('status', e.target.value)}
            style={selectStyle}
          >
            {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        
        {/* Localização da Oclusão - só aparece se estiver ocluída */}
        {isOcluida && (
          <div>
            <label style={{ 
              fontSize: 'clamp(10px, 2vw, 12px)', 
              marginBottom: '3px', 
              display: 'block',
              color: '#0eb8d0',
              fontWeight: 600
            }}>Localização:</label>
            <select
              value={valores.localizacaoOclusao}
              onChange={e => handleFieldChange('localizacaoOclusao', e.target.value)}
              style={selectStyle}
            >
              <option value="">Selecione</option>
              {localizacaoOclusaoOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        )}
        
        {/* Ateromatose - só aparece se não estiver ocluída */}
        {!isOcluida && (
          <div>
            <label style={{ 
              fontSize: 'clamp(10px, 2vw, 12px)', 
              marginBottom: '3px', 
              display: 'block',
              color: '#0eb8d0',
              fontWeight: 600
            }}>Ateromatose:</label>
            <select
              value={valores.ateromatose}
              onChange={e => handleFieldChange('ateromatose', e.target.value)}
              style={selectStyle}
            >
              {ateromatoseOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        )}
        
        {/* Velocidade - só aparece se não estiver ocluída */}
        {!isOcluida && (
          <div>
            <label style={{ 
              fontSize: 'clamp(10px, 2vw, 12px)', 
              marginBottom: '3px', 
              display: 'block',
              color: '#0eb8d0',
              fontWeight: 600
            }}>Velocidade:</label>
            <select
              value={valores.velocidade}
              onChange={e => handleFieldChange('velocidade', e.target.value)}
              style={selectStyle}
            >
              {velocidadeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        )}
        
        {/* Tipo de Onda - só aparece se não estiver ocluída */}
        {!isOcluida && (
          <div>
            <label style={{ 
              fontSize: 'clamp(10px, 2vw, 12px)', 
              marginBottom: '3px', 
              display: 'block',
              color: '#0eb8d0',
              fontWeight: 600
            }}>Tipo de Onda:</label>
            <select
              value={valores.tipoOnda}
              onChange={e => handleFieldChange('tipoOnda', e.target.value)}
              style={selectStyle}
            >
              {tipoOndaOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        )}
        
        {/* Sentido - só aparece se não estiver ocluída */}
        {!isOcluida && (
          <div>
            <label style={{ 
              fontSize: 'clamp(10px, 2vw, 12px)', 
              marginBottom: '3px', 
              display: 'block',
              color: '#0eb8d0',
              fontWeight: 600
            }}>Sentido:</label>
            <select
              value={valores.sentido}
              onChange={e => handleFieldChange('sentido', e.target.value)}
              style={selectStyle}
            >
              {sentidoOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        )}
        
        {/* Placa - só aparece se não estiver ocluída */}
        {!isOcluida && (
          <div>
            <label style={{ 
              fontSize: 'clamp(10px, 2vw, 12px)', 
              marginBottom: '3px', 
              display: 'block',
              color: '#0eb8d0',
              fontWeight: 600
            }}>Placa:</label>
            <select
              value={valores.placa}
              onChange={e => handleFieldChange('placa', e.target.value)}
              style={selectStyle}
            >
              {placaOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Campos extras para placa - só aparecem se não estiver ocluída e placa = "Presente" */}
      {!isOcluida && showPlacaExtra && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 'clamp(8px, 2vw, 12px)',
          marginBottom: 'clamp(8px, 2vw, 12px)',
          padding: 'clamp(8px, 2vw, 12px)',
          background: 'rgba(14, 184, 208, 0.1)',
          borderRadius: 'clamp(4px, 1vw, 6px)',
          border: '1px solid rgba(14, 184, 208, 0.3)'
        }}>
          <div>
            <label style={{ 
              fontSize: 'clamp(10px, 2vw, 12px)', 
              marginBottom: '3px', 
              display: 'block',
              color: '#0eb8d0',
              fontWeight: 600
            }}>% Estenose:</label>
            <input
              type="number"
              min="0"
              max="100"
              value={valores.estenosePercentual}
              onChange={e => handleFieldChange('estenosePercentual', e.target.value)}
              placeholder="%"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ 
              fontSize: 'clamp(10px, 2vw, 12px)', 
              marginBottom: '3px', 
              display: 'block',
              color: '#0eb8d0',
              fontWeight: 600
            }}>Característica da Placa:</label>
            <select
              value={valores.caracteristicaPlaca}
              onChange={e => handleFieldChange('caracteristicaPlaca', e.target.value)}
              style={selectStyle}
            >
              <option value="">Selecione</option>
              {caracteristicaPlacaOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Linha 2 - Observação (sempre visível) */}
      <div>
        <label style={{ 
          fontSize: 'clamp(10px, 2vw, 12px)', 
          marginBottom: '3px', 
          display: 'block',
          color: '#0eb8d0',
          fontWeight: 600
        }}>Observação:</label>
        <textarea
          value={valores.observacao}
          onChange={e => handleFieldChange('observacao', e.target.value)}
          placeholder={`Digite observações para ${arteria}...`}
          style={textareaStyle}
        />
      </div>
    </div>
  );
}

// Bloco de campos por lado
function BlocoCampos({ lado, arteriasValores, onChange }) {
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
        marginBottom: 'clamp(8px, 2vw, 12px)',
        fontWeight: 700, 
        fontSize: 'clamp(14px, 2.5vw, 16px)',
        color: '#0eb8d0'
      }}>
        MEMBRO SUPERIOR {lado.toUpperCase()}:
      </div>
      
      {arterias.map(arteria => (
        <CamposArteria
          key={arteria}
          arteria={arteria}
          valores={arteriasValores[arteria]}
          onChange={(valores) => onChange(arteria, valores)}
          lado={lado}
        />
      ))}
    </div>
  );
}

// Componente principal
function MMSSArterial() {
  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [data, setData] = useState("");
  const [lado, setLado] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [erro, setErro] = useState("");
  const [mostrarLaudo, setMostrarLaudo] = useState(false);
  
  // Estado para as artérias de cada lado
  const [arteriasDireito, setArteriasDireito] = useState(
    Object.fromEntries(arterias.map(arteria => [arteria, { ...estruturaArteria }]))
  );
  const [arteriasEsquerdo, setArteriasEsquerdo] = useState(
    Object.fromEntries(arterias.map(arteria => [arteria, { ...estruturaArteria }]))
  );

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
      
      if (exameEmEdicao.arteriasDireito) {
        setArteriasDireito(exameEmEdicao.arteriasDireito);
      }
      if (exameEmEdicao.arteriasEsquerdo) {
        setArteriasEsquerdo(exameEmEdicao.arteriasEsquerdo);
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

  function handleArteriaChange(lado, arteria, valores) {
    if (lado === "Direito") {
      setArteriasDireito(prev => ({ ...prev, [arteria]: valores }));
    } else {
      setArteriasEsquerdo(prev => ({ ...prev, [arteria]: valores }));
    }
  }

  function handleVoltarMenu() {
    window.location.href = '/home';
  }

  function handleVisualizarExamesSalvos() {
    // Implementar visualização de exames salvos
  }

  function handleConfiguracao() {
    window.location.href = '/configuracoes';
  }

  function handleLogout() {
    window.location.href = '/';
  }

  // Função para gerar o texto do laudo
  function gerarTextoLaudo() {
    if (!deveMostrarCampos) return "";

    let laudo = "";
    
    // Cabeçalho
    laudo += `${nome}, ${idade} anos.\n`;
    laudo += `Data: ${data}\n`;
    laudo += `DOPPLER ARTERIAL DE MMSS\n\n`;

    // Função auxiliar para gerar texto de uma artéria
    function gerarTextoArteria(arteria, valores, lado) {
      let texto = "";
      
      // Nome da artéria com lado
      const nomeArteria = arteria;
      const ladoTexto = lado === "Direito" ? "direita" : "esquerda";
      texto += `${nomeArteria} ${ladoTexto}: `;
      
      // Se estiver ocluída, exibir oclusão com localização e ausência de fluxo
      if (valores.status === "Ocluída") {
        if (valores.localizacaoOclusao) {
          texto += `oclusão ${valores.localizacaoOclusao.toLowerCase()}, ausência de fluxo.`;
        } else {
          texto += "oclusão, ausência de fluxo.";
        }
        return texto;
      }
      
      // Status
      texto += "pérvia, ";
      
      // Ateromatose
      if (valores.ateromatose !== "Ausente") {
        texto += `ateromatose ${valores.ateromatose.toLowerCase()}, `;
      }
      
      // Velocidade
      if (valores.velocidade !== "Normocinético") {
        texto += `fluxo ${valores.velocidade.toLowerCase()}, `;
      } else {
        texto += "fluxo normocinético, ";
      }
      
      // Tipo de Onda
      if (valores.tipoOnda !== "Trifásico") {
        texto += `padrão ${valores.tipoOnda.toLowerCase()}, `;
      } else {
        texto += "padrão trifásico, ";
      }
      
      // Sentido
      if (valores.sentido === "Retrógrado") {
        texto += `sentido retrógrado, `;
      } else {
        texto += "sentido anterógrado, ";
      }
      
      // Placa
      if (valores.placa === "Presente" && valores.estenosePercentual && valores.caracteristicaPlaca) {
        texto += `estenose de ${valores.estenosePercentual}%, placa ${valores.caracteristicaPlaca.toLowerCase()}, `;
      }
      
      // Remover vírgula e espaço do final e adicionar ponto
      texto = texto.replace(/,\s*$/, ".");
      
      return texto;
    }

    // Membro Superior Direito
    if (lado === "Direito" || lado === "Ambos") {
      laudo += "MEMBRO SUPERIOR DIREITO\n";
      arterias.forEach(arteria => {
        laudo += gerarTextoArteria(arteria, arteriasDireito[arteria], "Direito") + "\n";
        
        // Observação (se houver)
        if (arteriasDireito[arteria].observacao && arteriasDireito[arteria].observacao.trim()) {
          laudo += `  ${arteriasDireito[arteria].observacao}\n`;
        }
      });
      
      // Conclusão do Membro Direito
      laudo += "\nCONCLUSÃO\n";
      const conclusaoDireito = getConclusaoMMSSArterialPorMembro(arteriasDireito, "Direito");
      laudo += conclusaoDireito + "\n\n";
    }

    // Membro Superior Esquerdo
    if (lado === "Esquerdo" || lado === "Ambos") {
      laudo += "MEMBRO SUPERIOR ESQUERDO\n";
      arterias.forEach(arteria => {
        laudo += gerarTextoArteria(arteria, arteriasEsquerdo[arteria], "Esquerdo") + "\n";
        
        // Observação (se houver)
        if (arteriasEsquerdo[arteria].observacao && arteriasEsquerdo[arteria].observacao.trim()) {
          laudo += `  ${arteriasEsquerdo[arteria].observacao}\n`;
        }
      });
      
      // Conclusão do Membro Esquerdo
      laudo += "\nCONCLUSÃO\n";
      const conclusaoEsquerdo = getConclusaoMMSSArterialPorMembro(arteriasEsquerdo, "Esquerdo");
      laudo += conclusaoEsquerdo + "\n";
    }

    return laudo;
  }

  // Função para copiar o laudo
  function copiarLaudo() {
    const textoLaudo = gerarTextoLaudo();
    if (textoLaudo) {
      navigator.clipboard.writeText(textoLaudo).then(() => {
        // Feedback visual temporário
        const btn = document.getElementById('btnCopiarLaudo');
        if (btn) {
          const textoOriginal = btn.textContent;
          btn.textContent = "Copiado!";
          btn.style.background = "linear-gradient(135deg, #28a745 0%, #20c997 100%)";
          setTimeout(() => {
            btn.textContent = textoOriginal;
            btn.style.background = "linear-gradient(135deg, #6c757d 0%, #495057 100%)";
          }, 2000);
        }
      }).catch(err => {
        console.error('Erro ao copiar:', err);
      });
    }
  }

  // Validação dos campos obrigatórios
  const nomeValido = nome.trim().length > 0;
  const idadeValida = idade && !isNaN(idade) && parseInt(idade) > 0 && parseInt(idade) <= 120;
  const dataValida = data && data.trim().length > 0;
  const ladoValido = lado && ["Direito", "Esquerdo", "Ambos"].includes(lado);
  
  // Verificar se deve mostrar os campos das artérias
  const deveMostrarCampos = nomeValido && idadeValida && dataValida && ladoValido;

  // Função para visualizar o laudo
  function handleVisualizar() {
    if (!deveMostrarCampos) return;
    setMostrarLaudo(!mostrarLaudo);
  }

  function handleSalvarExame() {
    if (!deveMostrarCampos) return;

    const dadosExame = {
      nome,
      idade,
      data,
      lado,
      arteriasDireito,
      arteriasEsquerdo,
      timestamp: new Date().toISOString()
    };

    const sucesso = salvarExame(dadosExame);
    
    if (sucesso) {
      alert('Exame salvo com sucesso!');
    } else {
      alert('Erro ao salvar o exame. Tente novamente.');
    }
  }

  // Função para verificar se uma artéria está normal
  function isArteriaNormal(valores) {
    return (
      valores.status === "Pérvia" &&
      valores.velocidade === "Normocinético" &&
      valores.tipoOnda === "Trifásico" &&
      valores.sentido === "Anterógrado" &&
      valores.ateromatose === "Ausente" &&
      valores.placa === "Ausente"
    );
  }

  // Função para gerar descrição da estenose baseada na porcentagem
  function getDescricaoEstenose(percentual, nomeArteria) {
    const percentualNum = parseFloat(percentual);
    
    if (percentualNum < 50) {
      return `Estenose menor que 50% em Artéria ${nomeArteria}`;
    } else if (percentualNum >= 50 && percentualNum <= 70) {
      return `Estenose de 50-70% em Artéria ${nomeArteria}`;
    } else if (percentualNum > 70 && percentualNum <= 90) {
      return `Estenose maior que 70% em Artéria ${nomeArteria}`;
    } else if (percentualNum > 90) {
      return `Estenose crítica maior que 90% em Artéria ${nomeArteria}`;
    }
    
    return `Estenose de ${percentualNum}% em Artéria ${nomeArteria}`;
  }

  // Função para gerar conclusão de um membro específico
  function getConclusaoMMSSArterialPorMembro(arteriasValores, lado) {
    // Calcular flags conforme requisitos especificados
    const temAtero = Object.values(arteriasValores).some(v => ['Discreta', 'Moderada', 'Severa'].includes(v.ateromatose));
    const oclusoes = [];
    const estenoses = [];
    let isNormal = true;
    
    // Verificar cada artéria
    Object.entries(arteriasValores).forEach(([nomeArteria, valores]) => {
      const ladoTexto = lado === "Direito" ? "direita" : "esquerda";
      
      // Verificar normalidade da artéria
      if (!isArteriaNormal(valores)) {
        isNormal = false;
      }
      
      // Verificar se a artéria está ocluída
      if (valores.status === "Ocluída") {
        let linhaOclusao = `Oclusão de Artéria ${nomeArteria} ${ladoTexto}`;
        if (valores.localizacaoOclusao) {
          linhaOclusao += ` (${valores.localizacaoOclusao.toLowerCase()})`;
        }
        oclusoes.push(linhaOclusao);
        return; // Pular outras verificações para artéria ocluída
      }
      
      // Verificar se há placa/estenose
      if (valores.placa === "Presente" && valores.estenosePercentual && valores.caracteristicaPlaca) {
        // Corrigir bug de duplicação "Artéria Artéria"
        const nomeLimpo = nomeArteria.replace(/^Artéria\s+/i, '');
        const linhaEstenose = getDescricaoEstenose(valores.estenosePercentual, `${nomeLimpo} ${ladoTexto}`);
        estenoses.push(linhaEstenose);
      }
    });
    
    // Montar array linhas conforme requisitos
    const linhas = [];
    
    if (isNormal) {
      linhas.push('Exame compatível com normalidade.');
    } else {
      // 1) Ateromatose (sempre aparece se existir, mesmo com outros achados)
      if (temAtero) {
        linhas.push('Ateromatose.');
      }
      
      // 2) Oclusões
      linhas.push(...oclusoes);
      
      // 3) Estenoses
      linhas.push(...estenoses);
    }
    
    // Retornar todas as linhas, cada uma separada por quebra de linha
    return linhas.join('\n');
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
      <ExamHeader
        examTitle="MMSS Arterial"
        nome={nome}
        idade={idade}
        data={data}
        lado={lado}
        onInputChange={handleChange}
        onVisualizar={handleVisualizar}
        onSalvar={handleSalvarExame}
        onVoltarMenu={handleVoltarMenu}
        onConfiguracao={handleConfiguracao}
        onVisualizarExamesSalvos={handleVisualizarExamesSalvos}
        onLogout={handleLogout}
        erro={erro}
      />

      {/* Campos das artérias - só aparecem após preencher dados básicos */}
      {deveMostrarCampos && (
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
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : lado === "Ambos" ? 'repeat(2, 1fr)' : '1fr',
            gap: 'clamp(12px, 2vw, 20px)'
          }}>
            {/* Layout para lado único (Direito ou Esquerdo) */}
            {(lado === "Direito" || lado === "Esquerdo") && (
              <div style={{
                background: 'rgba(0,0,0,0.05)', 
                borderRadius: 'clamp(8px, 1.5vw, 12px)', 
                boxShadow: '0 2px 12px #00e0ff18', 
                padding: 'clamp(10px, 2vw, 14px)', 
                minWidth: 0
              }}>
                <BlocoCampos
                  lado={lado}
                  arteriasValores={lado === "Direito" ? arteriasDireito : arteriasEsquerdo}
                  onChange={(arteria, valores) => handleArteriaChange(lado, arteria, valores)}
                />
              </div>
            )}
            
            {/* Layout para ambos os lados */}
            {lado === "Ambos" && (
              <>
                <div style={{
                  background: 'rgba(0,0,0,0.05)', 
                  borderRadius: 'clamp(8px, 1.5vw, 12px)', 
                  boxShadow: '0 2px 12px #00e0ff18', 
                  padding: 'clamp(10px, 2vw, 14px)', 
                  minWidth: 0
                }}>
                  <BlocoCampos
                    lado="Direito"
                    arteriasValores={arteriasDireito}
                    onChange={(arteria, valores) => handleArteriaChange("Direito", arteria, valores)}
                  />
                </div>
                <div style={{
                  background: 'rgba(0,0,0,0.05)', 
                  borderRadius: 'clamp(8px, 1.5vw, 12px)', 
                  boxShadow: '0 2px 12px #00e0ff18', 
                  padding: 'clamp(10px, 2vw, 14px)', 
                  minWidth: 0
                }}>
                  <BlocoCampos
                    lado="Esquerdo"
                    arteriasValores={arteriasEsquerdo}
                    onChange={(arteria, valores) => handleArteriaChange("Esquerdo", arteria, valores)}
                  />
                </div>
              </>
            )}
          </div>

          {/* Preview do Laudo */}
          {mostrarLaudo && (
            <div style={{
              width: '100%',
              maxWidth: 'min(1000px, 95vw)',
              margin: 'clamp(16px, 3vw, 24px) auto 0 auto',
              background: '#ffffff',
              borderRadius: 'clamp(8px, 1.5vw, 12px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              padding: 'clamp(16px, 3vw, 24px)',
              color: '#333',
              fontFamily: 'monospace',
              fontSize: 'clamp(12px, 2.2vw, 14px)',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'clamp(12px, 2.5vw, 16px)',
                paddingBottom: 'clamp(8px, 2vw, 12px)',
                borderBottom: '2px solid #0eb8d0'
              }}>
                <h3 style={{
                  margin: 0,
                  color: '#0eb8d0',
                  fontSize: 'clamp(16px, 3vw, 18px)',
                  fontWeight: 700
                }}>
                  Preview do Laudo
                </h3>
                <button
                  id="btnCopiarLaudo"
                  onClick={copiarLaudo}
                  style={{
                    background: "linear-gradient(135deg, #6c757d 0%, #495057 100%)",
                    border: "none",
                    borderRadius: "clamp(6px, 1.5vw, 8px)",
                    padding: "clamp(8px, 2vw, 12px) clamp(16px, 3vw, 20px)",
                    color: "#fff",
                    fontSize: "clamp(12px, 2.2vw, 14px)",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                  }}
                  title="Copiar Laudo para Área de Transferência"
                >
                  Copiar
                </button>
              </div>
              
              <div style={{
                maxHeight: 'clamp(300px, 50vh, 500px)',
                overflowY: 'auto',
                padding: 'clamp(8px, 2vw, 12px)',
                background: '#f8f9fa',
                borderRadius: 'clamp(4px, 1vw, 6px)',
                border: '1px solid #e9ecef',
                whiteSpace: 'pre-line'
              }}>
                {gerarTextoLaudo()}
              </div>
            </div>
          )}
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

export default MMSSArterial;
