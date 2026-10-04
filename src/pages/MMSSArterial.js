import React, { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import { FiPaperclip, FiX } from "react-icons/fi";
import ExamHeader from "../components/ExamHeader";
import { appendImagesToPdf } from "../utils/pdfImages";
import "../styles/pdf.css";
import laudoSyncService from '../services/laudoSyncService';
import examesRealtimeService from '../services/examesRealtimeService';

// Constantes para localStorage
const STORAGE_KEY = "examesMMSSArterial";

// Funções para gerenciar exames salvos
async function salvarExame(dadosExame) {
  try {
    // Salvar usando o serviço em tempo real
    const resultado = await examesRealtimeService.criarExame({
      ...dadosExame,
      tipoNome: "MMSS Arterial"
    });
    
    if (resultado.success) {
      console.log("Exame salvo com sucesso!");
      return true;
    } else {
      console.warn("Erro ao salvar exame, salvando localmente:", resultado.error);
      // Fallback: salvar localmente
      return salvarExameLocal(dadosExame);
    }
  } catch (error) {
    console.error("Erro ao salvar exame:", error);
    // Fallback: salvar localmente
    return salvarExameLocal(dadosExame);
  }
}

// Função de fallback para salvar localmente
function salvarExameLocal(dadosExame) {
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
    console.error("Erro ao salvar exame localmente:", error);
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
    if (field === "estenosePercentual" && (!value || !value.trim || value.trim() === "")) {
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
  const [anexos, setAnexos] = useState([]);
  
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
    window.location.href = '/exames-realizados';
  }

  function handleConfiguracao() {
    window.location.href = '/configuracoes';
  }

  function handleLogout() {
    window.location.href = '/';
  }

  // Funções para gerenciar anexos de imagens
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function validateFile(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const maxSize = 15 * 1024 * 1024; // 15MB

    if (!validTypes.includes(file.type)) {
      setErro('Apenas arquivos PNG e JPG são permitidos.');
      return false;
    }

    if (file.size > maxSize) {
      setErro('O arquivo deve ter no máximo 15MB.');
      return false;
    }

    return true;
  }

  function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    files.forEach(file => {
      if (validateFile(file)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Criar thumbnail (100x100)
            const thumbnailSize = 100;
            canvas.width = thumbnailSize;
            canvas.height = thumbnailSize;
            ctx.drawImage(img, 0, 0, thumbnailSize, thumbnailSize);
            
            const newAnexo = {
              id: Date.now() + Math.random(),
              file: file,
              name: file.name,
              size: file.size,
              thumbnail: e.target.result
            };
            
            setAnexos(prev => [...prev, newAnexo]);
            setErro('');
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
    event.target.value = '';
  }

  function handleDrop(event) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    files.forEach(file => {
      if (validateFile(file)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Criar thumbnail (100x100)
            const thumbnailSize = 100;
            canvas.width = thumbnailSize;
            canvas.height = thumbnailSize;
            ctx.drawImage(img, 0, 0, thumbnailSize, thumbnailSize);
            
            const newAnexo = {
              id: Date.now() + Math.random(),
              file: file,
              name: file.name,
              size: file.size,
              thumbnail: e.target.result
            };
            
            setAnexos(prev => [...prev, newAnexo]);
            setErro('');
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  function handleDragOver(event) {
    event.preventDefault();
  }

  function removeAnexo(id) {
    setAnexos(prev => prev.filter(anexo => anexo.id !== id));
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
      laudo += "DOPPLER ARTERIAL DE MEMBRO SUPERIOR DIREITO\n";
      arterias.forEach(arteria => {
        laudo += gerarTextoArteria(arteria, arteriasDireito[arteria], "Direito") + "\n";
        
        // Observação (se houver)
        if (arteriasDireito[arteria].observacao && arteriasDireito[arteria].observacao.trim && arteriasDireito[arteria].observacao.trim()) {
          laudo += `  ${arteriasDireito[arteria].observacao}\n`;
        }
      });
      
      // Conclusão do Membro Direito
      laudo += "\nCONCLUSÃO\n";
      const conclusaoDireito = getConclusaoMMSSArterialPorMembro(arteriasDireito, "Direito");
      laudo += conclusaoDireito + "\n\n";
    }

    // Separador entre membros (apenas quando ambos são selecionados)
    if (lado === "Ambos") {
      laudo += "=".repeat(80) + "\n";
    }

    // Membro Superior Esquerdo
    if (lado === "Esquerdo" || lado === "Ambos") {
      laudo += "DOPPLER ARTERIAL DE MEMBRO SUPERIOR ESQUERDO\n";
      arterias.forEach(arteria => {
        laudo += gerarTextoArteria(arteria, arteriasEsquerdo[arteria], "Esquerdo") + "\n";
        
        // Observação (se houver)
        if (arteriasEsquerdo[arteria].observacao && arteriasEsquerdo[arteria].observacao.trim && arteriasEsquerdo[arteria].observacao.trim()) {
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
  const nomeValido = nome && nome.trim && nome.trim().length > 0;
  const idadeValida = idade && !isNaN(idade) && parseInt(idade) > 0 && parseInt(idade) <= 120;
  const dataValida = data && data.trim && data.trim().length > 0;
  const ladoValido = lado && ["Direito", "Esquerdo", "Ambos"].includes(lado);
  
  // Verificar se deve mostrar os campos das artérias
  const deveMostrarCampos = nomeValido && idadeValida && dataValida && ladoValido;

  // Função para visualizar o laudo
  function handleVisualizar() {
    if (!deveMostrarCampos) return;
    setMostrarLaudo(!mostrarLaudo);
  }

  async function handleSalvarExame() {
    if (!deveMostrarCampos) return;

    const dadosExame = {
      nome,
      idade,
      data,
      lado,
      arteriasDireito,
      arteriasEsquerdo,
      timestamp: new Date().toISOString(),
      tipoNome: "MMSS Arterial"
    };

    try {
      const sucesso = await salvarExame(dadosExame);
      
      if (sucesso) {
        alert('Exame salvo com sucesso!');
      } else {
        alert('Erro ao salvar o exame. Tente novamente.');
      }
    } catch (error) {
      console.error("Erro ao salvar exame:", error);
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
              background: "#fff",
              color: "#222",
              borderRadius: 'clamp(8px, 1.5vw, 12px)',
              padding: 'clamp(12px, 2.5vw, 20px)',
              boxShadow: "0 8px 32px #00e0ff33",
              fontFamily: "monospace",
              fontSize: 'clamp(11px, 2.2vw, 13px)',
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              width: '100%',
              maxWidth: 'min(1200px, 98vw)',
              maxHeight: "75vh",
              overflowY: "auto",
              marginTop: 'clamp(12px, 2vw, 16px)'
            }}>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 'clamp(6px, 1.5vw, 8px)', marginBottom: 'clamp(6px, 1.5vw, 8px)' }}>
                <button style={{ 
                  ...buttonStyle, 
                  background: "#0eb8d0", 
                  color: "#fff", 
                  fontSize: 'clamp(10px, 2vw, 12px)', 
                  padding: "clamp(4px, 1.5vw, 6px) clamp(8px, 2vw, 12px)" 
                }} onClick={() => {
                  const blob = new Blob([gerarTextoLaudo()], { type: "text/plain;charset=utf-8" });
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
                  const blocos = gerarTextoLaudo().split("=".repeat(80));

                  function addCabecalho(y) {
                    let yLogo = 14; // topo do logo
                    let yAtual = yLogo;
                    const logoHeight = 20; // altura do logo
                    const logoSpacing = 8; // espaço após o logo antes do conteúdo
                    
                    if (logoClinica) {
                      try {
                        doc.addImage(logoClinica, 'PNG', 95, yLogo, logoHeight, logoHeight); // quadrado 20x20
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
                    // Retorna posição Y após logo + espaço + margem superior
                    return yLogo + logoHeight + logoSpacing;
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

                  // Função auxiliar para quebrar conclusão por travessões
                  function processarConclusao(texto) {
                    // Se a linha contém múltiplos travessões, quebrar em linhas separadas
                    if (texto.includes('- ') && texto.split('- ').length > 2) {
                      // Remove o primeiro travessão se já existir
                      const partes = texto.split('- ').filter(p => p.trim() !== '');
                      return partes.map(p => p.trim()).filter(p => p !== '');
                    }
                    return [texto];
                  }

                  // Função auxiliar para quebrar texto longo respeitando margens
                  function quebrarTexto(texto, maxWidth, x) {
                    if (!texto || texto.trim() === '') return [''];
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const margemEsquerda = x || 15;
                    const margemDireita = 15;
                    const larguraDisponivel = pageWidth - margemEsquerda - margemDireita;
                    
                    // Usar splitTextToSize do jsPDF - ele calcula automaticamente baseado na fonte atual
                    try {
                      const linhas = doc.splitTextToSize(texto, larguraDisponivel);
                      // Garantir que sempre retorna um array
                      return Array.isArray(linhas) ? linhas : [linhas];
                    } catch (e) {
                      console.warn('Erro ao quebrar texto com splitTextToSize:', e);
                      // Fallback: quebrar manualmente por caracteres
                      const linhas = [];
                      // Aproximação conservadora: ~3mm por caractere para fonte padrão
                      const maxChars = Math.max(1, Math.floor(larguraDisponivel / 3));
                      for (let i = 0; i < texto.length; i += maxChars) {
                        linhas.push(texto.substring(i, i + maxChars));
                      }
                      return linhas.length > 0 ? linhas : [texto];
                    }
                  }

                  let pagina = 0;
                  lados.forEach((ladoAtual, idx) => {
                    if (pagina > 0) doc.addPage();
                    let y = addCabecalho(12);
                    const bloco = blocos[idx] ? blocos[idx].trim().split("\n") : [];
                    let inConclusao = false;
                    let inObservacoes = false;
                    for (let i = 0; i < bloco.length; i++) {
                      let line = bloco[i];
                      // Negrito para nome do paciente e nome do exame
                      if (line.startsWith("PACIENTE:")) {
                        doc.setFont(undefined, "bold");
                        const linhasQuebradas = quebrarTexto(line, 0, 15);
                        linhasQuebradas.forEach(linha => {
                          doc.text(linha, 15, y);
                          y += 8;
                        });
                        doc.setFont(undefined, "normal");
                        y -= 8; // Ajuste para não ter espaço extra
                      } else if (line.startsWith("DOPPLER ARTERIAL DE MEMBRO SUPERIOR")) {
                        doc.setFont(undefined, "bold");
                        const linhasQuebradas = quebrarTexto(line, 0, 15);
                        linhasQuebradas.forEach(linha => {
                          doc.text(linha, 15, y);
                          y += 8;
                        });
                        doc.setFont(undefined, "normal");
                        y -= 8; // Ajuste para não ter espaço extra
                      } else if (line.startsWith("CONCLUSÃO") || line.startsWith("Sistema Arterial")) {
                        doc.setFont(undefined, "bold");
                        const linhasQuebradas = quebrarTexto(line, 0, 15);
                        linhasQuebradas.forEach(linha => {
                          doc.text(linha, 15, y);
                          y += 8;
                        });
                        if (line.startsWith("CONCLUSÃO")) {
                          inConclusao = true;
                          inObservacoes = false;
                        }
                        doc.setFont(undefined, "normal");
                        y -= 8; // Ajuste para não ter espaço extra
                      } else if (line.startsWith("OBSERVAÇÕES")) {
                        doc.setFont(undefined, "bold");
                        doc.text(line, 15, y);
                        doc.setFont(undefined, "normal");
                        inConclusao = false;
                        inObservacoes = true;
                        y += 8;
                      } else if (inConclusao && line && line.trim() !== "" && !line.startsWith("OBSERVAÇÕES") && !line.startsWith("=")) {
                        // Processar conclusão: quebrar por travessões
                        const linhasConclusao = processarConclusao(line);
                        doc.setFont(undefined, "bold");
                        linhasConclusao.forEach(linhaConclusao => {
                          // Garantir que cada item comece com travessão
                          const linhaFormatada = linhaConclusao.startsWith('-') ? linhaConclusao : `- ${linhaConclusao}`;
                          const linhasQuebradas = quebrarTexto(linhaFormatada, 0, 15);
                          linhasQuebradas.forEach(linha => {
                            if (y > 265) {
                              addRodape();
                              doc.addPage();
                              y = addCabecalho(12);
                            }
                            doc.text(linha, 15, y);
                            y += 8;
                          });
                        });
                        doc.setFont(undefined, "normal");
                        y -= 8; // Ajuste para não ter espaço extra
                      } else if (inObservacoes && line && line.trim() !== "") {
                        // Quebrar observações longas respeitando margens
                        doc.setFont(undefined, "normal");
                        const linhasQuebradas = quebrarTexto(line, 0, 15);
                        linhasQuebradas.forEach(linha => {
                          if (y > 265) {
                            addRodape();
                            doc.addPage();
                            y = addCabecalho(12);
                          }
                          doc.text(linha, 15, y);
                          y += 8;
                        });
                        y -= 8; // Ajuste para não ter espaço extra
                      } else {
                        doc.setFont(undefined, "normal");
                        // Quebrar linhas longas também
                        const linhasQuebradas = quebrarTexto(line, 0, 15);
                        linhasQuebradas.forEach(linha => {
                          if (y > 265) {
                            addRodape();
                            doc.addPage();
                            y = addCabecalho(12);
                          }
                          doc.text(linha, 15, y);
                          y += 8;
                        });
                        if (inConclusao && line && line.trim() === "") {
                          inConclusao = false;
                        }
                        if (inObservacoes && line && line.trim() === "") {
                          inObservacoes = false;
                        }
                        y -= 8; // Ajuste para não ter espaço extra
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
                  
                  // Adicionar anexos como páginas no final do PDF
                  appendImagesToPdf(doc, anexos);
                  
                  doc.save(`Laudo_${nome}_${data}.pdf`);
                  
                  // RESET APÓS SALVAR PDF
                  setNome("");
                  setIdade("");
                  setData("");
                  setLado("");
                  setArteriasDireito(Object.fromEntries(arterias.map(arteria => [arteria, { ...estruturaArteria }])));
                  setArteriasEsquerdo(Object.fromEntries(arterias.map(arteria => [arteria, { ...estruturaArteria }])));
                  setMostrarLaudo(false);
                  setErro("");
                  setAnexos([]);
                }}>Salvar PDF</button>
              </div>
              {gerarTextoLaudo()}
            </div>
          )}

          {/* Caixa de Anexos Compacta - aparece apenas quando o preview está visível */}
          {mostrarLaudo && (
            <div style={{
              width: '100%',
              maxWidth: 'min(1200px, 98vw)',
              margin: 'clamp(8px, 1.5vw, 12px) auto 0 auto',
              background: '#18243a',
              borderRadius: 'clamp(6px, 1.2vw, 8px)',
              padding: 'clamp(8px, 1.5vw, 12px)',
              boxShadow: '0 2px 8px #00e0ff15',
              border: '1px solid #0eb8d0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'clamp(6px, 1.2vw, 8px)'
              }}>
                <h3 style={{
                  margin: 0,
                  color: '#0eb8d0',
                  fontSize: 'clamp(12px, 2vw, 14px)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <FiPaperclip /> Anexos
                </h3>
                <span style={{
                  color: '#888',
                  fontSize: 'clamp(10px, 1.6vw, 12px)'
                }}>
                  {anexos.length} arquivo(s)
                </span>
              </div>
              
              {/* Área de Upload Compacta */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                style={{
                  border: '1px dashed #0eb8d0',
                  borderRadius: 'clamp(4px, 1vw, 6px)',
                  padding: 'clamp(8px, 1.5vw, 12px)',
                  textAlign: 'center',
                  background: 'rgba(14, 184, 208, 0.03)',
                  marginBottom: 'clamp(6px, 1.2vw, 8px)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => document.getElementById('fileInput').click()}
              >
                <input
                  id="fileInput"
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <div style={{ color: '#0eb8d0', fontSize: 'clamp(11px, 1.8vw, 13px)' }}>
                  Clique ou arraste para anexar (PNG/JPG até 15MB)
                </div>
              </div>
              
              {/* Lista de Anexos Compacta */}
              {anexos.length > 0 && (
                <div style={{
                  maxHeight: 'clamp(80px, 15vh, 120px)',
                  overflowY: 'auto',
                  border: '1px solid #333',
                  borderRadius: 'clamp(3px, 0.8vw, 4px)',
                  background: '#1a1a1a',
                  padding: 'clamp(4px, 1vw, 6px)'
                }}>
                  {anexos.map(anexo => (
                    <div key={anexo.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'clamp(6px, 1.5vw, 8px)',
                      padding: 'clamp(4px, 1vw, 6px)',
                      background: '#222',
                      borderRadius: 'clamp(3px, 0.8vw, 4px)',
                      marginBottom: 'clamp(2px, 0.8vw, 3px)',
                      border: '1px solid #444'
                    }}>
                      {/* Thumbnail Menor */}
                      <img
                        src={anexo.thumbnail}
                        alt={anexo.name}
                        style={{
                          width: 'clamp(30px, 6vw, 35px)',
                          height: 'clamp(30px, 6vw, 35px)',
                          objectFit: 'cover',
                          borderRadius: 'clamp(2px, 0.6vw, 3px)',
                          border: '1px solid #666'
                        }}
                      />
                      
                      {/* Info do arquivo Compacta */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          color: '#fff',
                          fontSize: 'clamp(10px, 1.6vw, 12px)',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginBottom: 'clamp(1px, 0.3vw, 2px)'
                        }}>
                          {anexo.name}
                        </div>
                        <div style={{
                          color: '#888',
                          fontSize: 'clamp(9px, 1.4vw, 11px)'
                        }}>
                          {formatFileSize(anexo.size)}
                        </div>
                      </div>
                      
                      {/* Botão remover Menor */}
                      <button
                        onClick={() => removeAnexo(anexo.id)}
                        style={{
                          background: '#ff4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 'clamp(2px, 0.6vw, 3px)',
                          padding: 'clamp(3px, 0.8vw, 4px) clamp(6px, 1.5vw, 8px)',
                          fontSize: 'clamp(9px, 1.4vw, 11px)',
                          cursor: 'pointer',
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          transition: 'background 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#cc3333'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#ff4444'}
                      >
                        <FiX />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
