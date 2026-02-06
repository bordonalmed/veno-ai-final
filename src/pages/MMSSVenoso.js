import React, { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import ExamHeader from "../components/ExamHeader";
import laudoSyncService from '../services/laudoSyncService';
import examesRealtimeService from '../services/examesRealtimeService';

// Constantes para localStorage
const STORAGE_KEY = "examesMMSSVenoso";

// Funções para gerenciar exames salvos
async function salvarExame(dadosExame) {
  try {
    // Salvar usando o serviço em tempo real
    const resultado = await examesRealtimeService.criarExame({
      ...dadosExame,
      tipoNome: "MMSS Venoso"
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

// Função para gerar conclusão por lado
function gerarConclusaoPorLado({ profundas, superficiais }) {
  const conclusoes = [];
  
  // Verificar trombose venosa profunda
  if (Object.values(profundas).some(v => v.includes("não compressível"))) {
    conclusoes.push("Trombose venosa profunda");
  }
  
  // Verificar recanalização parcial do sistema profundo
  if (Object.values(profundas).some(v => v.includes("semi compressível"))) {
    conclusoes.push("Sinais de recanalização parcial do sistema venoso profundo");
  }
  
  // Verificar insuficiência venosa profunda
  if (Object.values(profundas).some(v => v.includes("incompetente"))) {
    conclusoes.push("Insuficiência de sistema venoso profundo");
  }
  
  // Verificar tromboflebite superficial
  if (Object.values(superficiais).some(v => v.includes("não compressível"))) {
    conclusoes.push("Tromboflebite superficial");
  }
  
  // Verificar recanalização parcial do sistema superficial
  if (Object.values(superficiais).some(v => v.includes("semi compressível"))) {
    conclusoes.push("Sinais de recanalização parcial do sistema venoso superficial");
  }
  
  // Verificar insuficiência venosa superficial
  if (Object.values(superficiais).some(v => v.includes("incompetente"))) {
    conclusoes.push("Insuficiência de sistema venoso superficial");
  }
  
  if (!conclusoes.length) return "- Exame dentro dos padrões da normalidade.";
  return "- " + conclusoes.join("\n- ");
}

// Função para montar o laudo
function montarLaudo({ nome, data, lado, profundas, superficiais, observacoes }) {
  const lados = lado === "Ambos" ? ["Direito", "Esquerdo"] : [lado];
  const blocos = lados.map(l => {
    let linhas = [];
    linhas.push(`PACIENTE: ${nome}`);
    linhas.push(`DATA: ${data}`);
    linhas.push(`DOPPLER VENOSO DE MEMBRO SUPERIOR ${l.toUpperCase()}`);
    linhas.push("");
    linhas.push("Sistema Venoso Profundo:");
    veiasProfundas.forEach(v => {
      linhas.push(`- ${v}: ${profundas[l][v]}`);
    });
    linhas.push("");
    linhas.push("Sistema Venoso Superficial:");
    veiasSuperficiais.forEach(v => {
      linhas.push(`- ${v}: ${superficiais[l][v]}`);
    });
    linhas.push("");
    linhas.push("CONCLUSÃO:");
    linhas.push(gerarConclusaoPorLado({ profundas: profundas[l], superficiais: superficiais[l] }));
    if (observacoes && observacoes[l]) {
      linhas.push("");
      linhas.push("OBSERVAÇÕES:");
      linhas.push(observacoes[l]);
    }
    return linhas.join("\n");
  });
  return blocos.join("\n\n" + "=".repeat(80) + "\n\n");
}

// Opções e legendas por extenso para MMSS
const veiasProfundas = [
  "Veia Subclávia",
  "Veia Axilar",
  "Veias Braquiais",
  "Veias Radiais",
  "Veias Ulnares",
];

const veiasSuperficiais = [
  "Veia Cefálica",
  "Veia Basílica",
];

const profOptions = [
  "pérvia com fluxo contínuo",
  "não compressível e sem fluxo (sugestivo de trombose)",
  "semi compressível, sugestivo de recanalização parcial",
];

const supOptions = [
  "pérvia com fluxo contínuo",
  "não compressível e sem fluxo (trombose)",
  "semi compressível, sugestivo de recanalização parcial",
  "ausente",
];

const lados = ["Direito", "Esquerdo", "Ambos"];

// Bloco de campos por lado
function BlocoCampos({ lado, profundas, superficiais, onProfundas, onSuperficiais, observacao, onObservacao }) {
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
        </div>
      ))}
      <div style={{
        marginTop: 'clamp(12px, 2.5vw, 16px)',
        fontWeight: 700, 
        fontSize: 'clamp(12px, 2.5vw, 14px)'
      }}>
        Observações ({lado}):
      </div>
      <textarea
        value={observacao || ""}
        onChange={(e) => onObservacao(e.target.value)}
        placeholder="Observações adicionais..."
        style={{
          width: '100%',
          minHeight: 'clamp(60px, 8vw, 80px)',
          padding: 'clamp(6px, 1vw, 10px)',
          borderRadius: 'clamp(3px, 0.6vw, 5px)',
          border: '1px solid #fff',
          background: '#fff',
          color: '#000',
          fontSize: 'clamp(11px, 1.8vw, 13px)',
          fontWeight: 'normal',
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box'
        }}
      />
    </div>
  );
}

function MMSSVenoso() {
  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [data, setData] = useState("");
  const [lado, setLado] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [observacoes, setObservacoes] = useState({ Direito: '', Esquerdo: '' });
  const [laudoTexto, setLaudoTexto] = useState("");
  const [erro, setErro] = useState("");
  const [anexos, setAnexos] = useState([]);
  
  // Estados para cada lado
  const [profundas, setProfundas] = useState({
    Direito: Object.fromEntries(veiasProfundas.map(v=>[v, profOptions[0]])),
    Esquerdo: Object.fromEntries(veiasProfundas.map(v=>[v, profOptions[0]])),
  });
  const [superficiais, setSuperficiais] = useState({
    Direito: Object.fromEntries(veiasSuperficiais.map(v=>[v, supOptions[0]])),
    Esquerdo: Object.fromEntries(veiasSuperficiais.map(v=>[v, supOptions[0]])),
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
      if (exameEmEdicao.observacoes) setObservacoes(exameEmEdicao.observacoes);
      
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
    const laudo = montarLaudo({ nome, data, lado, profundas, superficiais, observacoes });
    setLaudoTexto(laudo);
  }

  async function handleSalvarExame() {
    setErro("");
    if (!nome || !data || !lado) {
      setErro("Preencha nome, data e lado antes de salvar o exame!");
      return;
    }
    
    // Gerar laudo se ainda não foi gerado
    let laudo = laudoTexto;
    if (!laudo) {
      laudo = montarLaudo({ nome, data, lado, profundas, superficiais, observacoes });
    }
    
    const dadosExame = {
      nome,
      idade,
      data,
      lado,
      profundas,
      superficiais,
      observacoes,
      laudo,
      tipoNome: "MMSS Venoso"
    };
    
    try {
      const sucesso = await salvarExame(dadosExame);
      if (sucesso) {
        alert("Exame salvo com sucesso!");
      } else {
        setErro("Erro ao salvar o exame. Tente novamente.");
      }
    } catch (error) {
      console.error("Erro ao salvar exame:", error);
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
        examTitle="MMSS Venoso"
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
                  onProfundas={val => setProfundas(prev => ({ ...prev, [lado]: val }))}
                  onSuperficiais={val => setSuperficiais(prev => ({ ...prev, [lado]: val }))}
                  observacao={observacoes[lado]}
                  onObservacao={val => setObservacoes(prev => ({ ...prev, [lado]: val }))}
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
                          } else if (line.startsWith("DOPPLER VENOSO DE MEMBRO SUPERIOR")) {
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
                      
                      // Adicionar anexos como páginas no final do PDF
                      anexos.forEach((anexo, index) => {
                        try {
                          doc.addPage();
                          // Adicionar título da imagem
                          doc.setFontSize(14);
                          doc.setFont(undefined, "bold");
                          doc.text(`Anexo ${index + 1}: ${anexo.name}`, 15, 20);
                          
                          // Adicionar a imagem aproveitando melhor a página
                          const pageWidth = doc.internal.pageSize.getWidth();
                          const pageHeight = doc.internal.pageSize.getHeight();
                          const margin = 15; // margem de 15mm
                          const titleSpace = 25; // espaço para o título
                          
                          // Calcular dimensões disponíveis
                          const availableWidth = pageWidth - (margin * 2);
                          const availableHeight = pageHeight - titleSpace - (margin * 2);
                          
                          // Adicionar a imagem centralizada e redimensionada para aproveitar toda a página
                          doc.addImage(anexo.thumbnail, 'PNG', margin, titleSpace, availableWidth, availableHeight);
                        } catch (e) {
                          console.error('Erro ao adicionar anexo ao PDF:', e);
                        }
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
                      setObservacoes({ Direito: '', Esquerdo: '' });
                      setLaudoTexto("");
                      setAnexos([]);
                      setErro("");
                    }}>Salvar PDF</button>
                  </div>
                  {laudoTexto}
                </div>
              )}
              
              {/* Caixa de Anexos Compacta - aparece apenas quando o preview está visível */}
              {laudoTexto && (
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
                      fontWeight: 600
                    }}>
                      📎 Anexos
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
                              transition: 'background 0.2s ease'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#cc3333'}
                            onMouseOut={(e) => e.target.style.background = '#ff4444'}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                width: isMobile ? '100%' : '50%'
              }}>
                <BlocoCampos
                  lado="Direito"
                  profundas={profundas.Direito}
                  superficiais={superficiais.Direito}
                  onProfundas={val => setProfundas(prev => ({ ...prev, Direito: val }))}
                  onSuperficiais={val => setSuperficiais(prev => ({ ...prev, Direito: val }))}
                  observacao={observacoes.Direito}
                  onObservacao={val => setObservacoes(prev => ({ ...prev, Direito: val }))}
                />
              </div>
              <div style={{
                background: '#18243a', 
                borderRadius: 'clamp(8px, 1.5vw, 12px)', 
                boxShadow: '0 2px 12px #00e0ff18', 
                padding: 'clamp(10px, 2vw, 14px)', 
                minWidth: 0, 
                width: isMobile ? '100%' : '50%'
              }}>
                <BlocoCampos
                  lado="Esquerdo"
                  profundas={profundas.Esquerdo}
                  superficiais={superficiais.Esquerdo}
                  onProfundas={val => setProfundas(prev => ({ ...prev, Esquerdo: val }))}
                  onSuperficiais={val => setSuperficiais(prev => ({ ...prev, Esquerdo: val }))}
                  observacao={observacoes.Esquerdo}
                  onObservacao={val => setObservacoes(prev => ({ ...prev, Esquerdo: val }))}
                />
              </div>
            </>
          )}
        </div>

        {/* Laudo abaixo para ambos os lados */}
        {lado === "Ambos" && laudoTexto && (
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
            maxHeight: "50vh",
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
                  const bloco = blocos[idx].trim().split("\n");
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
                    } else if (line.startsWith("DOPPLER VENOSO DE MEMBRO SUPERIOR")) {
                      doc.setFont(undefined, "bold");
                      const linhasQuebradas = quebrarTexto(line, 0, 15);
                      linhasQuebradas.forEach(linha => {
                        doc.text(linha, 15, y);
                        y += 8;
                      });
                      doc.setFont(undefined, "normal");
                      y -= 8; // Ajuste para não ter espaço extra
                    } else if (line.startsWith("CONCLUSÃO") || line.startsWith("Sistema Venoso Profundo") || line.startsWith("Sistema Venoso Superficial")) {
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
                    } else if (inConclusao && line.trim() !== "" && !line.startsWith("OBSERVAÇÕES") && !line.startsWith("=")) {
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
                    } else if (inObservacoes && line.trim() !== "") {
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
                      if (inConclusao && line.trim() === "") {
                        inConclusao = false;
                      }
                      if (inObservacoes && line.trim() === "") {
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
                anexos.forEach((anexo, index) => {
                  try {
                    doc.addPage();
                    // Adicionar título da imagem
                    doc.setFontSize(14);
                    doc.setFont(undefined, "bold");
                    doc.text(`Anexo ${index + 1}: ${anexo.name}`, 15, 20);
                    
                    // Adicionar a imagem aproveitando melhor a página
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();
                    const margin = 15; // margem de 15mm
                    const titleSpace = 25; // espaço para o título
                    
                    // Calcular dimensões disponíveis
                    const availableWidth = pageWidth - (margin * 2);
                    const availableHeight = pageHeight - titleSpace - (margin * 2);
                    
                    // Adicionar a imagem centralizada e redimensionada para aproveitar toda a página
                    doc.addImage(anexo.thumbnail, 'PNG', margin, titleSpace, availableWidth, availableHeight);
                  } catch (e) {
                    console.error('Erro ao adicionar anexo ao PDF:', e);
                  }
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
                setObservacoes({ Direito: '', Esquerdo: '' });
                setLaudoTexto("");
                setAnexos([]);
                setErro("");
              }}>Salvar PDF</button>
            </div>
            {laudoTexto}
          </div>
        )}

        {/* Caixa de Anexos Compacta para layout "Ambos" - aparece apenas quando o preview está visível */}
        {laudoTexto && lado === "Ambos" && (
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
                fontWeight: 600
              }}>
                📎 Anexos
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
              onClick={() => document.getElementById('fileInputAmbos').click()}
            >
              <input
                id="fileInputAmbos"
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
                        transition: 'background 0.2s ease'
                      }}
                      onMouseOver={(e) => e.target.style.background = '#cc3333'}
                      onMouseOut={(e) => e.target.style.background = '#ff4444'}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
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

export default MMSSVenoso; 