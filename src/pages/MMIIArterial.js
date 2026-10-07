import React, { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import { FiPaperclip, FiX } from "react-icons/fi";
import ExamHeader from "../components/ExamHeader";
import { appendImagesToPdf } from "../utils/pdfImages";
import "../styles/pdf.css";
import examesRealtimeService from '../services/examesRealtimeService';
import {
  ARTERIAS,
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
  enxertoPadrao,
  arteriasPadrao,
  normalizarArterias,
  gerarLaudoCompleto,
  gerarCabecalhoLaudo,
  gerarBlocoMembro,
  ladosDoExame,
} from "../utils/mmiiArterialLaudo";

// Constantes para localStorage
const STORAGE_KEY = "examesMMIIArterial";

// Funções para gerenciar exames salvos
async function salvarExame(dadosExame) {
  try {
    // Salvar usando o serviço em tempo real
    const resultado = await examesRealtimeService.criarExame({
      ...dadosExame,
      tipoNome: "MMII Arterial"
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

// Campos de uma artéria
function CamposArteria({ arteria, valores, onChange, lado }) {
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

// Bloco de campos por lado
function BlocoCampos({ lado, arteriasValores, onChange, enxerto, onEnxertoChange }) {
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
        MEMBRO INFERIOR {lado.toUpperCase()}:
      </div>

      {ARTERIAS.map(arteria => (
        <CamposArteria
          key={arteria}
          arteria={arteria}
          valores={arteriasValores[arteria]}
          onChange={(valores) => onChange(arteria, valores)}
          lado={lado}
        />
      ))}

      <div style={cardStyle}>
        <div style={tituloCardStyle}>ENXERTO / PONTE ({lado.toUpperCase()}):</div>
        <div style={gradeCampos}>
          <CampoSelect
            label="Tipo:"
            value={enxerto.tipo}
            options={enxertoTipoOptions}
            placeholder="Nenhum"
            onChange={v => onEnxertoChange({ tipo: v, status: v ? enxerto.status : "" })}
          />
          {enxerto.tipo && (
            <CampoSelect
              label="Situação:"
              value={enxerto.status}
              options={enxertoStatusOptions}
              placeholder="Selecione"
              onChange={v => onEnxertoChange({ ...enxerto, status: v })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Componente principal
function MMIIArterial() {
  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [data, setData] = useState("");
  const [lado, setLado] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [erro, setErro] = useState("");
  const [mostrarLaudo, setMostrarLaudo] = useState(false);
  const [anexos, setAnexos] = useState([]);

  const [arteriasDireito, setArteriasDireito] = useState(arteriasPadrao);
  const [arteriasEsquerdo, setArteriasEsquerdo] = useState(arteriasPadrao);
  const [enxertos, setEnxertos] = useState({ Direito: { ...enxertoPadrao }, Esquerdo: { ...enxertoPadrao } });

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  useEffect(() => {
    const exameEmEdicao = carregarExameEmEdicao();
    if (exameEmEdicao) {
      setNome(exameEmEdicao.nome || "");
      setIdade(exameEmEdicao.idade || "");
      setData(exameEmEdicao.data || "");
      setLado(exameEmEdicao.lado || "");
      setArteriasDireito(normalizarArterias(exameEmEdicao.arteriasDireito));
      setArteriasEsquerdo(normalizarArterias(exameEmEdicao.arteriasEsquerdo));
      setEnxertos({
        Direito: { ...enxertoPadrao, ...exameEmEdicao.enxertos?.Direito },
        Esquerdo: { ...enxertoPadrao, ...exameEmEdicao.enxertos?.Esquerdo },
      });
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

  function handleEnxertoChange(lado, enxerto) {
    setEnxertos(prev => ({ ...prev, [lado]: enxerto }));
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

  function gerarTextoLaudo() {
    if (!deveMostrarCampos) return "";
    return gerarLaudoCompleto({ nome, idade, data, lado, arteriasDireito, arteriasEsquerdo, enxertos });
  }

  // Validação dos campos obrigatórios
  const nomeValido = nome && nome.trim && nome.trim().length > 0;
  const idadeValida = idade && !isNaN(idade) && parseInt(idade) > 0 && parseInt(idade) <= 120;
  const dataValida = data && data.trim && data.trim().length > 0;
  const ladoValido = lado && ["Direito", "Esquerdo", "Ambos"].includes(lado);
  const deveMostrarCampos = nomeValido && idadeValida && dataValida && ladoValido;

  function handleVisualizar() {
    if (!deveMostrarCampos) return;
    setMostrarLaudo(!mostrarLaudo);
  }

  async function handleSalvarExame() {
    if (!deveMostrarCampos) {
      alert('Preencha todos os campos obrigatórios antes de salvar!');
      return;
    }

    const dadosExame = {
      nome,
      idade,
      data,
      lado,
      arteriasDireito,
      arteriasEsquerdo,
      enxertos,
      laudo: gerarTextoLaudo(),
      timestamp: new Date().toISOString(),
      tipoNome: "MMII Arterial"
    };

    try {
      const sucesso = await salvarExame(dadosExame);
      alert(sucesso ? "Exame salvo com sucesso!" : 'Erro ao salvar o exame. Tente novamente.');
    } catch (error) {
      console.error("Erro ao salvar exame:", error);
      alert('Erro ao salvar o exame. Tente novamente.');
    }
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
    setErro('');
    
    files.forEach(file => {
      if (validateFile(file)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newAnexo = {
            id: Date.now() + Math.random(),
            file: file,
            name: file.name,
            size: file.size,
            thumbnail: e.target.result
          };
          setAnexos(prev => [...prev, newAnexo]);
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Limpar o input
    event.target.value = '';
  }

  function handleDrop(event) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    setErro('');
    
    files.forEach(file => {
      if (validateFile(file)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newAnexo = {
            id: Date.now() + Math.random(),
            file: file,
            name: file.name,
            size: file.size,
            thumbnail: e.target.result
          };
          setAnexos(prev => [...prev, newAnexo]);
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
        examTitle="MMII Arterial"
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

      {/* Aviso de campos obrigatórios removido - validação apenas pelos botões desabilitados */}

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
                  enxerto={enxertos[lado]}
                  onEnxertoChange={(enx) => handleEnxertoChange(lado, enx)}
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
                    enxerto={enxertos.Direito}
                    onEnxertoChange={(enx) => handleEnxertoChange("Direito", enx)}
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
                    enxerto={enxertos.Esquerdo}
                    onEnxertoChange={(enx) => handleEnxertoChange("Esquerdo", enx)}
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
                  const lados = ladosDoExame(lado);
                  const cabecalhoPaciente = gerarCabecalhoLaudo({ nome, idade, data });

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
                    // Cada página (membro) leva a identificação do paciente.
                    const bloco = (cabecalhoPaciente + "\n" +
                      gerarBlocoMembro(ladoAtual, ladoAtual === "Direito" ? arteriasDireito : arteriasEsquerdo, enxertos[ladoAtual])
                    ).trim().split("\n");
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
                      } else if (line.startsWith("DOPPLER ARTERIAL DE MEMBRO INFERIOR")) {
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

export default MMIIArterial;
