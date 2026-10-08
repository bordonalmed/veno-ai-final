import React, { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import { FiPaperclip, FiX, FiMousePointer } from "react-icons/fi";
import { MapaInterativoMMSSVenoso, adicionarMapaMMSSVenosoAoPdf } from "../components/MapaMMSS";
import ExamHeader from "../components/ExamHeader";
import { CamposVeia, CamposCateter, CamposFAVVenoso } from "../components/CamposVeiaMMSS";
import { appendImagesToPdf } from "../utils/pdfImages";
import "../styles/pdf.css";
import examesRealtimeService from '../services/examesRealtimeService';
import {
  VEIAS_PROFUNDAS,
  VEIAS_SUPERFICIAIS,
  veiasPadrao,
  extraPadrao,
  normalizarExtra,
  normalizarVeiasLado,
  gerarLaudoCompleto,
  gerarCabecalhoLaudo,
  gerarBlocoMembro,
  ladosDoExame,
} from "../utils/mmssVenosoLaudo";

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

// Estilos globais
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

const subtituloSistema = {
  fontWeight: 700,
  fontSize: 'clamp(13px, 2.4vw, 15px)',
  color: '#fff',
  margin: 'clamp(6px, 1.5vw, 10px) 0 2px',
  borderBottom: '1px solid rgba(14,184,208,0.4)',
  paddingBottom: 4
};

// Bloco de campos por lado
function BlocoCampos({ lado, veias, onChange, extra, onExtraChange, observacao, onObservacao }) {
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

      <div style={subtituloSistema}>Sistema Venoso Profundo</div>
      {VEIAS_PROFUNDAS.map(veia => (
        <CamposVeia key={veia} veia={veia} valores={veias[veia]} onChange={(v) => onChange(veia, v)} lado={lado} />
      ))}

      <div style={subtituloSistema}>Sistema Venoso Superficial</div>
      {VEIAS_SUPERFICIAIS.map(veia => (
        <CamposVeia key={veia} veia={veia} valores={veias[veia]} onChange={(v) => onChange(veia, v)} lado={lado} />
      ))}

      <CamposCateter lado={lado} cateter={extra.cateter} onChange={(c) => onExtraChange({ ...extra, cateter: c })} />
      <CamposFAVVenoso lado={lado} fav={extra.fav} onChange={(f) => onExtraChange({ ...extra, fav: f })} />

      <div>
        <div style={subtituloSistema}>Observações ({lado})</div>
        <textarea
          value={observacao || ""}
          onChange={(e) => onObservacao(e.target.value)}
          placeholder="Observações adicionais..."
          style={{
            width: '100%', minHeight: 70, boxSizing: 'border-box', resize: 'vertical',
            background: '#f7fbff', border: '1.5px solid #0eb8d0', borderRadius: 7,
            padding: '8px 12px', fontSize: 'clamp(13px, 2.5vw, 15px)', fontFamily: 'inherit', color: '#222'
          }}
        />
      </div>
    </div>
  );
}

// Componente principal
function MMSSVenoso() {
  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [data, setData] = useState("");
  const [lado, setLado] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [erro, setErro] = useState("");
  const [mostrarLaudo, setMostrarLaudo] = useState(false);
  const [anexos, setAnexos] = useState([]);

  const [veias, setVeias] = useState(() => ({ Direito: veiasPadrao(), Esquerdo: veiasPadrao() }));
  const [observacoes, setObservacoes] = useState({ Direito: "", Esquerdo: "" });
  const [extras, setExtras] = useState(() => ({ Direito: extraPadrao(), Esquerdo: extraPadrao() }));
  // O Mapa Interativo é a tela principal do exame: abre sozinho assim que o
  // cabeçalho (nome, idade, data e lado) está completo. "Ver formulário"
  // mostra os quadros de preenchimento no lugar dele.
  const [mostrarMapa, setMostrarMapa] = useState(true);
  const [ladoMapa, setLadoMapa] = useState("Direito");
  useEffect(() => {
    setLadoMapa(lado === "Esquerdo" ? "Esquerdo" : "Direito");
  }, [lado]);
  const [incluirMapaPdf, setIncluirMapaPdf] = useState(false);

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
      // Também converte exames salvos no formato antigo (texto por veia).
      setVeias({
        Direito: normalizarVeiasLado(exameEmEdicao, "Direito"),
        Esquerdo: normalizarVeiasLado(exameEmEdicao, "Esquerdo"),
      });
      setObservacoes({ Direito: "", Esquerdo: "", ...exameEmEdicao.observacoes });
      setExtras({
        Direito: normalizarExtra(exameEmEdicao.extras?.Direito),
        Esquerdo: normalizarExtra(exameEmEdicao.extras?.Esquerdo),
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

  function handleVeiaChange(lado, veia, valores) {
    setVeias(prev => ({ ...prev, [lado]: { ...prev[lado], [veia]: valores } }));
  }

  function handleObservacaoChange(lado, texto) {
    setObservacoes(prev => ({ ...prev, [lado]: texto }));
  }

  function handleExtraChange(lado, extra) {
    setExtras(prev => ({ ...prev, [lado]: extra }));
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
    return gerarLaudoCompleto({ nome, idade, data, lado, veias, extras, observacoes });
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
      veias,
      extras,
      observacoes,
      laudo: gerarTextoLaudo(),
      timestamp: new Date().toISOString(),
      tipoNome: "MMSS Venoso"
    };

    try {
      const sucesso = await salvarExame(dadosExame);
      alert(sucesso ? "Exame salvo com sucesso!" : 'Erro ao salvar o exame. Tente novamente.');
    } catch (error) {
      console.error("Erro ao salvar exame:", error);
      alert('Erro ao salvar o exame. Tente novamente.');
    }
  }

  function handleSalvarTXT() {
    const blob = new Blob([gerarTextoLaudo()], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `Laudo_${nome}_${data}.txt`);
  }

  async function handleSalvarPDF() {
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
        gerarBlocoMembro(ladoAtual, veias[ladoAtual], extras[ladoAtual], observacoes[ladoAtual])
      ).trim().split("\n");
      // Com manobras/pré-FAV o membro pode passar de uma página por poucas
      // linhas: nesse caso aperta o espaçamento (até 6) para caber.
      const yInicio = y;
      doc.setFont(undefined, "bold");
      const totalLinhas = bloco.reduce((n, l) => n + quebrarTexto(l.startsWith("-") ? l : `- ${l}`, 0, 15).length, 0);
      doc.setFont(undefined, "normal");
      const passo = Math.max(6, Math.min(8, (265 - yInicio) / totalLinhas));
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
            y += passo;
          });
          doc.setFont(undefined, "normal");
          y -= passo; // Ajuste para não ter espaço extra
        } else if (line.startsWith("DOPPLER VENOSO DE MEMBRO SUPERIOR") || line.startsWith("Sistema Venoso") || line === "CATETER" || line.startsWith("MAPEAMENTO VENOSO PRÉ-FÍSTULA")) {
          doc.setFont(undefined, "bold");
          const linhasQuebradas = quebrarTexto(line, 0, 15);
          linhasQuebradas.forEach(linha => {
            doc.text(linha, 15, y);
            y += passo;
          });
          doc.setFont(undefined, "normal");
          y -= passo; // Ajuste para não ter espaço extra
        } else if (line.startsWith("CONCLUSÃO")) {
          doc.setFont(undefined, "bold");
          const linhasQuebradas = quebrarTexto(line, 0, 15);
          linhasQuebradas.forEach(linha => {
            doc.text(linha, 15, y);
            y += passo;
          });
          if (line.startsWith("CONCLUSÃO")) {
            inConclusao = true;
            inObservacoes = false;
          }
          doc.setFont(undefined, "normal");
          y -= passo; // Ajuste para não ter espaço extra
        } else if (line.startsWith("OBSERVAÇÕES")) {
          doc.setFont(undefined, "bold");
          doc.text(line, 15, y);
          doc.setFont(undefined, "normal");
          inConclusao = false;
          inObservacoes = true;
          y += passo;
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
              y += passo;
            });
          });
          doc.setFont(undefined, "normal");
          y -= passo; // Ajuste para não ter espaço extra
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
            y += passo;
          });
          y -= passo; // Ajuste para não ter espaço extra
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
            y += passo;
          });
          if (inConclusao && line && line.trim() === "") {
            inConclusao = false;
          }
          if (inObservacoes && line && line.trim() === "") {
            inObservacoes = false;
          }
          y -= passo; // Ajuste para não ter espaço extra
        }
        y += passo;
        // Só abre página nova se ainda houver linhas (evita página em branco).
        if (y > 265 && i < bloco.length - 1) {
          addRodape();
          doc.addPage();
          y = addCabecalho(12);
        }
      }
      addRodape();
      pagina++;
    });
    
    // Adicionar anexos como páginas no final do PDF
    if (incluirMapaPdf) {
      await adicionarMapaMMSSVenosoAoPdf(doc, lados, veias, extras);
    }

    appendImagesToPdf(doc, anexos);
    
    doc.save(`Laudo_${nome}_${data}.pdf`);
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

      {deveMostrarCampos && !mostrarMapa && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 'clamp(10px, 2vw, 14px)' }}>
          <button
            type="button"
            onClick={() => setMostrarMapa(true)}
            style={{ ...buttonStyle, background: "#3d5a80", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <FiMousePointer /> Abrir no VENO.AI map
          </button>
        </div>
      )}

      <MapaInterativoMMSSVenoso
        aberto={deveMostrarCampos && mostrarMapa}
        embutido
        onFechar={() => setMostrarMapa(false)}
        lado={lado}
        ladoAtivo={ladoMapa}
        onTrocarLado={setLadoMapa}
        veias={veias}
        onVeiaChange={handleVeiaChange}
        extras={extras}
        onExtraChange={handleExtraChange}
        observacoes={observacoes}
        onObservacao={handleObservacaoChange}
        laudoMembro={deveMostrarCampos
          ? gerarBlocoMembro(ladoMapa, veias[ladoMapa], extras[ladoMapa], observacoes[ladoMapa])
          : ""}
        incluirMapaPdf={incluirMapaPdf}
        onIncluirMapaPdf={setIncluirMapaPdf}
        onSalvarTXT={handleSalvarTXT}
        onSalvarPDF={handleSalvarPDF}
        onSalvarExame={handleSalvarExame}
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
          {/* Quadros de preenchimento: só no modo formulário */}
          {!mostrarMapa && (
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
                  veias={veias[lado]}
                  onChange={(veia, valores) => handleVeiaChange(lado, veia, valores)}
                  observacao={observacoes[lado]}
                  onObservacao={(t) => handleObservacaoChange(lado, t)}
                  extra={extras[lado]}
                  onExtraChange={(ex) => handleExtraChange(lado, ex)}
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
                    veias={veias.Direito}
                    onChange={(veia, valores) => handleVeiaChange("Direito", veia, valores)}
                    observacao={observacoes.Direito}
                    onObservacao={(t) => handleObservacaoChange("Direito", t)}
                    extra={extras.Direito}
                    onExtraChange={(ex) => handleExtraChange("Direito", ex)}
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
                    veias={veias.Esquerdo}
                    onChange={(veia, valores) => handleVeiaChange("Esquerdo", veia, valores)}
                    observacao={observacoes.Esquerdo}
                    onObservacao={(t) => handleObservacaoChange("Esquerdo", t)}
                    extra={extras.Esquerdo}
                    onExtraChange={(ex) => handleExtraChange("Esquerdo", ex)}
                  />
                </div>
              </>
            )}
          </div>
          )}

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
                }} onClick={handleSalvarTXT}>Salvar TXT</button>
                <button style={{ 
                  ...buttonStyle, 
                  background: "#0eb8d0", 
                  color: "#fff", 
                  fontSize: 'clamp(10px, 2vw, 12px)', 
                  padding: "clamp(4px, 1.5vw, 6px) clamp(8px, 2vw, 12px)" 
                }} onClick={handleSalvarPDF}>Salvar PDF</button>
              </div>
              {gerarTextoLaudo()}
            </div>
          )}

          {/* Caixa de Anexos Compacta */}
          {(
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

export default MMSSVenoso;
