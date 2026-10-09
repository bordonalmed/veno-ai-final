import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { saveAs } from "file-saver";
import { FiArrowLeft, FiTrash2, FiX, FiWifi, FiWifiOff, FiMessageCircle, FiMail, FiMoreVertical, FiAlertTriangle, FiClipboard, FiRefreshCw, FiCheckSquare, FiSquare, FiSearch, FiCalendar, FiEye, FiEdit2, FiPrinter } from "react-icons/fi";
import { MdSort } from "react-icons/md";
import { FaHospital } from "react-icons/fa";
import { GiLeg } from "react-icons/gi";
import examesRealtimeService from "../services/examesRealtimeService";
import { TrialManager } from "../utils/trialManager";
import { carimbarMarcaVenoAIPdfLib } from "../utils/pdfMarca";

// Helpers para exames salvos (localStorage)
const STORAGE_KEY_TO_LABEL = {
  "examesMMIIVenoso": "Doppler Venoso de Membros Inferiores",
  "examesMMIIArterial": "MMII Arterial",
  "examesMMSSVenoso": "MMSS Venoso",
  "examesMMSSArterial": "MMSS Arterial",
  "examesCarotidasVertebrais": "Carótidas e Vertebrais",
  "examesCarotidas": "Carótidas e Vertebrais", // legado
  "examesCarótidaseVertebrais": "Carótidas e Vertebrais", // legado com acento
  "examesAorta": "Aorta e Ilíacas",
  "examesAortaeIlíacas": "Aorta e Ilíacas", // legado com acento
  "examesRenais": "Artérias Renais",
  "examesArtériasRenais": "Artérias Renais", // legado com acento
  "examesLaudo": "Exame"
};

const STORAGE_KEYS = Object.keys(STORAGE_KEY_TO_LABEL);

// Cores por categoria de exame (mesmo padrão usado na Home/Landing)
const TIPO_COR = {
  "Doppler Venoso de Membros Inferiores": "#3f93e0",
  "MMII Venoso": "#3f93e0", // legado
  "MMSS Venoso": "#3f93e0",
  "MMII Arterial": "#e0574a",
  "MMSS Arterial": "#e0574a",
  "Aorta e Ilíacas": "#e0574a",
  "Artérias Renais": "#e0574a",
  "Carótidas e Vertebrais": "#4fd8ec",
};
function corDoTipo(tipoNome) {
  return TIPO_COR[tipoNome] || "#6f8890";
}

function isUsuarioPremium() {
  const userEmail = localStorage.getItem("userEmail") || "";
  return (
    localStorage.getItem("plano_premium") === "true" ||
    localStorage.getItem(`plano_${userEmail}`) === "premium"
  );
}

function temAcessoPremium() {
  // Retorna true se for Premium OU se trial estiver ativo (7 dias com acesso igual ao Premium)
  const userEmail = localStorage.getItem("userEmail") || "";
  if (isUsuarioPremium()) return true;
  const trial = TrialManager.verificarTrial(userEmail);
  return trial.status === "ativo";
}

// Formata data para exibição: dia, mês, ano (DD/MM/YYYY)
function formatarDataDiaMesAno(val) {
  if (val == null || String(val).trim() === "") return "";
  const s = String(val).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); // YYYY-MM-DD (input date)
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const dma = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s); // DD/MM/YYYY ou DD-MM-YYYY
  if (dma) return `${dma[1].padStart(2,"0")}/${dma[2].padStart(2,"0")}/${dma[3]}`;
  return s;
}

// Função para formatar o laudo com melhor espaçamento
function formatarLaudoParaVisualizacao(laudo) {
  if (!laudo) return "Laudo não disponível";
  
  // Dividir o laudo em partes (para exames de ambos os lados)
  const partes = laudo.split('\n\n');
  
  // Se há múltiplas partes (exames de ambos os lados)
  if (partes.length > 1) {
    return partes.map((parte, index) => {
      // Adicionar separador visual entre as partes com muito mais espaçamento
      const separador = index > 0 ? '\n\n\n\n' + '='.repeat(80) + '\n\n\n\n' : '';
      return separador + parte;
    }).join('');
  }
  
  return laudo;
}

// Linhas que são cabeçalho repetido no laudo (não desenhar; usamos cabeçalho padronizado)
function isLinhaCabecalhoRedundante(linhaTrim) {
  return /^PACIENTE\s*:/i.test(linhaTrim) || /^DATA\s*:/i.test(linhaTrim) || /^TIPO\s*:/i.test(linhaTrim) || /^IDADE\s*:/i.test(linhaTrim);
}

async function gerarPDFExame(exame) {
  try {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    
    let page = doc.addPage([595, 842]); // A4 Portrait
    let y = 800;
    const left = 50;
    const lineHeight = 14;
    const marginBottom = 60;
    
    const laudo = (exame.laudo != null && exame.laudo !== "") ? String(exame.laudo) : "Laudo não disponível";
    const todasLinhas = laudo.split(/\r?\n/);
    
    const blocos = [];
    let blocoAtual = [];
    for (const linha of todasLinhas) {
      const trim = linha.trim();
      if (/^=+$/.test(trim)) {
        if (blocoAtual.length > 0) {
          blocos.push(blocoAtual);
          blocoAtual = [];
        }
      } else {
        blocoAtual.push(linha);
      }
    }
    if (blocoAtual.length > 0) blocos.push(blocoAtual);
    
    for (let i = 0; i < blocos.length; i++) {
      if (i > 0) {
        page = doc.addPage([595, 842]);
        y = 800;
      }
      
      // Cabeçalho padronizado: nome, idade, data (uma vez por exame)
      page.drawText(`PACIENTE: ${exame.nome || "—"}`, { x: left, y, font: fontBold, size: 12, color: rgb(0,0,0) }); y -= lineHeight;
      if (exame.idade != null && String(exame.idade).trim() !== "") {
        page.drawText(`IDADE: ${exame.idade} anos`, { x: left, y, font: font, size: 12, color: rgb(0,0,0) }); y -= lineHeight;
      }
      page.drawText(`DATA: ${formatarDataDiaMesAno(exame.data) || "—"}`, { x: left, y, font: font, size: 12, color: rgb(0,0,0) }); y -= lineHeight * 1.2;
      
      let dentroConclusao = false;
      for (const linha of blocos[i]) {
        const linhaTrim = linha.trim();
        if (!linhaTrim) {
          y -= lineHeight * 0.5;
          continue;
        }
        if (isLinhaCabecalhoRedundante(linhaTrim)) continue; // evita duplicar nome, data, tipo, idade
        
        if (y < marginBottom) {
          page = doc.addPage([595, 842]);
          y = 800;
        }
        
        if (/^CONCLUSÃO\s*:/i.test(linhaTrim)) dentroConclusao = true;
        const isComentarioOuObservacao = /^(Comentário(s)?|Observa(ção|ções))(\s*\([^)]+\))?\s*:?/i.test(linhaTrim);
        if (isComentarioOuObservacao) dentroConclusao = false;
        if (/^(PACIENTE:|DOPPLER\s)/i.test(linhaTrim)) dentroConclusao = false;
        
        const isTitulo = /^(PACIENTE:|DOPPLER|Sistema|CONCLUSÃO|Veias Perfurantes)/i.test(linhaTrim);
        const usarNegrito = (isTitulo || dentroConclusao) && !isComentarioOuObservacao;
        page.drawText(linhaTrim, { x: left, y, font: usarNegrito ? fontBold : font, size: 11, color: rgb(0,0,0) });
        y -= lineHeight;
      }
    }
    
    carimbarMarcaVenoAIPdfLib(doc, font, rgb);
    const pdfBytes = await doc.save();
    const dataArquivo = (exame.data && formatarDataDiaMesAno(exame.data)) ? formatarDataDiaMesAno(exame.data).replace(/\//g, "-") : "sem_data";
    const nomeArquivo = `Laudo_${(exame.nome || "paciente").replace(/\s+/g,"_")}_${dataArquivo}.pdf`;
    saveAs(new Blob([pdfBytes], { type: "application/pdf" }), nomeArquivo);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Erro ao gerar PDF. Tente novamente.");
  }
}

export default function ExamesRealizados() {
  const navigate = useNavigate();
  const [exames, setExames] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [exameVisualizando, setExameVisualizando] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busca, setBusca] = useState("");
  const [examesSelecionados, setExamesSelecionados] = useState([]);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [whatsappExame, setWhatsappExame] = useState(null);
  const [whatsappNumeroPaciente, setWhatsappNumeroPaciente] = useState("");
  const [emailExame, setEmailExame] = useState(null);
  const [emailPaciente, setEmailPaciente] = useState("");
  const [ordenacao, setOrdenacao] = useState("recentes");
  const [menuAbertoId, setMenuAbertoId] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null); // { tipo: 'excluirUm'|'excluirSelecionados'|'limparTudo', exame? }
  const [confirmaLimparTudo, setConfirmaLimparTudo] = useState(false);
  const isPremium = isUsuarioPremium();
  const temAcesso = temAcessoPremium(); // Premium OU trial ativo

  // Ref para armazenar o ID do listener
  const listenerIdRef = useRef(null);

  // Configurar sincronização em tempo real
  useEffect(() => {
    const configurarSincronizacao = () => {
      try {
        console.log('🔄 ExamesRealizados: Configurando sincronização em tempo real...');
        
        // Cancelar listener anterior se existir
        if (listenerIdRef.current) {
          examesRealtimeService.unsubscribeExames(listenerIdRef.current);
        }

        // Criar novo listener em tempo real
        const listenerId = examesRealtimeService.subscribeExames(
          (examesAtualizados, metadata) => {
            console.log('📡 ExamesRealizados: Recebida atualização em tempo real:', examesAtualizados.length, 'exames');
            
            // Atualizar estado dos exames
            setExames(examesAtualizados);
            
            // Atualizar status de sincronização
            setSincronizando(metadata.hasPendingWrites);
            setIsOffline(metadata.isOffline);
            
            // Parar loading após primeira carga
            if (carregando) {
              setCarregando(false);
            }
          },
          (error) => {
            console.error('❌ ExamesRealizados: Erro no listener:', error);
            setCarregando(false);
          }
        );

        listenerIdRef.current = listenerId;
        console.log('✅ ExamesRealizados: Sincronização em tempo real ativa');

      } catch (error) {
        console.error('❌ ExamesRealizados: Erro ao configurar sincronização:', error);
        setCarregando(false);
      }
    };

    configurarSincronizacao();

    // Cleanup: cancelar listener quando componente desmontar
    return () => {
      if (listenerIdRef.current) {
        console.log('🔇 ExamesRealizados: Cancelando listener...');
        examesRealtimeService.unsubscribeExames(listenerIdRef.current);
        listenerIdRef.current = null;
      }
    };
  }, []); // Executar apenas uma vez no mount

  // Monitorar status de conexão
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 ExamesRealizados: Conexão restaurada');
      setIsOffline(false);
    };

    const handleOffline = () => {
      console.log('📴 ExamesRealizados: Conexão perdida');
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const examesFiltrados = exames.filter(exame => {
    const matchTipo = filtroTipo === "todos" || exame.tipoNome === filtroTipo;
    const matchBusca = exame.nome.toLowerCase().includes(busca.toLowerCase()) || 
                      (exame.data && exame.data.includes(busca)) || (formatarDataDiaMesAno(exame.data) || "").toLowerCase().includes(busca.toLowerCase()) ||
                      exame.tipoNome.toLowerCase().includes(busca.toLowerCase());
    return matchTipo && matchBusca;
  });

  const examesOrdenados = [...examesFiltrados].sort((a, b) => {
    if (ordenacao === "nome") return (a.nome || "").localeCompare(b.nome || "");
    if (ordenacao === "tipo") return (a.tipoNome || "").localeCompare(b.tipoNome || "");
    return new Date(b.timestamp || b.criadoEm || 0) - new Date(a.timestamp || a.criadoEm || 0);
  });

  const tiposUnicos = [...new Set(exames.map(e => e.tipoNome))];

  function handleEditarExame(exame) {
    // Navegar para a página específica do tipo de exame
    const rotas = {
      "Doppler Venoso de Membros Inferiores": "/mmii-venoso",
      "MMII Venoso": "/mmii-venoso", // legado — nome usado antes da renomeação
      "MMII Arterial": "/mmii-arterial",
      "MMSS Venoso": "/mmss-venoso", 
      "MMSS Arterial": "/mmss-arterial",
      "Carótidas e Vertebrais": "/carotidas-vertebrais",
      "Aorta e Ilíacas": "/aorta-iliacas",
      "Artérias Renais": "/arterias-renais"
    };
    
    const rota = rotas[exame.tipoNome];
    if (rota) {
      // Salvar dados do exame para edição
      localStorage.setItem("exameEmEdicao", JSON.stringify(exame));
      navigate(rota);
    }
  }

  // Função para limpar todos os dados locais
  const limparDadosLocais = () => {
    try {
      console.log('🧹 ExamesRealizados: Limpando todos os dados locais...');
      
      // Limpar todas as chaves de exames do localStorage
      STORAGE_KEYS.forEach(key => {
        localStorage.removeItem(key);
        console.log('🗑️ ExamesRealizados: Removido:', key);
      });
      
      console.log('✅ ExamesRealizados: Dados locais limpos com sucesso');
    } catch (error) {
      console.error('❌ ExamesRealizados: Erro ao limpar dados locais:', error);
    }
  };

  // Função para LIMPAR TODOS os exames (executada após confirmação no modal)
  const confirmarLimparTudo = async () => {
    try {
      setConfirmacao(null);
      setConfirmaLimparTudo(false);

      if (exames.length === 0) {
        alert('Nenhum exame encontrado!');
        return;
      }

      console.log('🔥 ExamesRealizados: Deletando', exames.length, 'exames...');

      let deletados = 0;
      let erros = 0;

      for (const exame of exames) {
        if (exame.id) {
          const resultado = await examesRealtimeService.excluirExame(exame.id);
          if (resultado.success) {
            deletados++;
            console.log('✅ ExamesRealizados: Exame deletado:', exame.id);
          } else {
            erros++;
            console.warn('⚠️ ExamesRealizados: Erro ao deletar:', exame.id);
          }
        }
      }

      // Limpar dados locais também
      limparDadosLocais();

      alert(`🧹 LIMPEZA CONCLUÍDA!\n\n` +
            `✅ Exames deletados: ${deletados}\n` +
            `❌ Erros: ${erros}\n\n` +
            `Sistema limpo e pronto para uso!`);

      console.log('🎉 ExamesRealizados: Sistema limpo com sucesso!');

    } catch (error) {
      console.error('❌ ExamesRealizados: Erro ao limpar exames:', error);
      alert('Erro ao limpar exames: ' + error.message);
    }
  };

  const confirmarExcluirExame = async (exame) => {
    setConfirmacao(null);
    try {
      console.log('🗑️ ExamesRealizados: Excluindo exame:', exame.id);

      const resultado = await examesRealtimeService.excluirExame(exame.id);

      if (resultado.success) {
        console.log('✅ ExamesRealizados: Exame excluído com sucesso');
        // NÃO atualizar estado local - o listener em tempo real fará isso
      } else {
        console.error('❌ ExamesRealizados: Erro ao excluir exame:', resultado.error);
        alert('Erro ao excluir exame: ' + resultado.error);
      }
    } catch (error) {
      console.error('❌ ExamesRealizados: Erro ao excluir exame:', error);
      alert('Erro ao excluir exame: ' + error.message);
    }
  };

  // Funções para seleção múltipla
  const toggleSelecaoExame = (exame) => {
    setExamesSelecionados(prev => {
      const jaSelecionado = prev.find(e => e.id === exame.id);
      if (jaSelecionado) {
        return prev.filter(e => e.id !== exame.id);
      } else {
        return [...prev, exame];
      }
    });
  };

  const selecionarTodos = () => {
    setExamesSelecionados(examesFiltrados);
  };

  const confirmarExcluirSelecionados = async () => {
    if (examesSelecionados.length === 0) return;
    setConfirmacao(null);

    try {
      setCarregando(true);
      
      // Excluir cada exame selecionado
      for (const exame of examesSelecionados) {
        console.log('🗑️ ExamesRealizados: Excluindo exame selecionado:', exame.id);
        
        // Excluir usando o serviço em tempo real
        const resultado = await examesRealtimeService.excluirExame(exame.id);
        
        if (resultado.success) {
          console.log('✅ ExamesRealizados: Exame excluído com sucesso');
        } else {
          console.error('❌ ExamesRealizados: Erro ao excluir exame:', resultado.error);
          alert('Erro ao excluir exame: ' + resultado.error);
          continue; // Continuar com o próximo se falhar
        }
      }
      
      // Limpar seleção
      setExamesSelecionados([]);
      setModoSelecao(false);
      
      console.log('✅ ExamesRealizados: Exames selecionados excluídos com sucesso');
      alert(`${examesSelecionados.length} exame(s) excluído(s) com sucesso!`);
      // NÃO atualizar estado local - o listener em tempo real fará isso
    } catch (error) {
      console.error('❌ ExamesRealizados: Erro ao excluir exames selecionados:', error);
      alert('Erro ao excluir exames selecionados. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(120deg,#101824 0%,#1c2740 100%)",
      color: "#fff",
      fontFamily: "Segoe UI, Inter, Arial, sans-serif",
      padding: "10px"
    }}>
      {/* Header Mobile-First */}
      <div style={{ 
        display: "flex", 
        flexDirection: "column",
        gap: "15px",
        marginBottom: "20px"
      }}>
        {/* Primeira linha: Botão voltar + Título */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "15px",
          flexWrap: "wrap"
        }}>
          <button 
            onClick={() => navigate(-1)}
            style={{
              background: "#232f4e", 
              color: "#0eb8d0", 
              border: "2px solid #0eb8d0",
              borderRadius: "8px", 
              fontSize: "14px", 
              padding: "8px 12px", 
              fontWeight: 600, 
              cursor: "pointer",
              display: "flex", 
              alignItems: "center", 
              gap: "6px",
              minWidth: "auto"
            }}
          >
            <FiArrowLeft size={16}/> Voltar
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
            <h1 style={{
              fontSize: "clamp(18px, 4vw, 24px)",
              fontWeight: 800,
              color: "#0eb8d0",
              margin: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 8
            }}>
              <FiClipboard /> Exames Realizados ({examesFiltrados.length})
            </h1>
            
            {/* Status de sincronização compacto */}
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "4px",
              padding: "4px 8px",
              borderRadius: "12px",
              background: isOffline ? "#e74c3c" : sincronizando ? "#f39c12" : "#27ae60",
              color: "white",
              fontSize: "10px",
              fontWeight: "bold"
            }}>
              {isOffline ? (
                <>
                  <FiWifiOff size={10} />
                  Offline
                </>
              ) : sincronizando ? (
                <>
                  <FiWifi size={10} />
                  Sync...
                </>
              ) : (
                <>
                  <FiWifi size={10} />
                  OK
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Segunda linha: Botões de ação simplificados */}
        <div style={{ 
          display: "flex", 
          gap: "8px", 
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "center"
        }}>
          {/* Botão de Sync - Destaque */}
          <button
            onClick={() => {
              // Forçar re-assinatura (útil para debug)
              if (listenerIdRef.current) {
                examesRealtimeService.unsubscribeExames(listenerIdRef.current);
                listenerIdRef.current = null;
              }
              // Reconfigurar sincronização
              const configurarSincronizacao = () => {
                try {
                  const listenerId = examesRealtimeService.subscribeExames(
                    (examesAtualizados, metadata) => {
                      setExames(examesAtualizados);
                      setSincronizando(metadata.hasPendingWrites);
                      setIsOffline(metadata.isOffline);
                      if (carregando) setCarregando(false);
                    },
                    (error) => {
                      console.error('Erro no listener:', error);
                      setCarregando(false);
                    }
                  );
                  listenerIdRef.current = listenerId;
                } catch (error) {
                  console.error('Erro ao reconfigurar:', error);
                }
              };
              configurarSincronizacao();
              alert('🔄 Sincronização reiniciada!');
            }}
            disabled={carregando}
            style={{
              background: "linear-gradient(45deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: "8px",
              cursor: carregando ? "not-allowed" : "pointer",
              fontSize: "13px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              opacity: carregando ? 0.7 : 1,
              transition: "all 0.3s ease",
              boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)"
            }}
          >
            <FiRefreshCw /> Sync
          </button>
          
          {/* Botão principal: Selecionar */}
          <button
            onClick={() => setModoSelecao(!modoSelecao)}
            style={{
              background: modoSelecao ? "#e74c3c" : "#27ae60",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.3s ease"
            }}
          >
            {modoSelecao ? <><FiX /> Cancelar</> : <><FiCheckSquare /> Selecionar</>}
          </button>
          
          {/* Botões de seleção (apenas no modo seleção) */}
          {modoSelecao && (
            <>
              <button
                onClick={selecionarTodos}
                disabled={examesFiltrados.length === 0}
                style={{
                  background: "#3498db",
                  color: "white",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  cursor: examesFiltrados.length === 0 ? "not-allowed" : "pointer",
                  fontSize: "11px",
                  fontWeight: "bold",
                  opacity: examesFiltrados.length === 0 ? 0.5 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5
                }}
              >
                <FiCheckSquare /> Todos
              </button>

              <button
                onClick={() => setConfirmacao({ tipo: "excluirSelecionados" })}
                disabled={examesSelecionados.length === 0 || carregando}
                style={{
                  background: "#e74c3c",
                  color: "white",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  cursor: examesSelecionados.length === 0 || carregando ? "not-allowed" : "pointer",
                  fontSize: "11px",
                  fontWeight: "bold",
                  opacity: examesSelecionados.length === 0 || carregando ? 0.5 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5
                }}
              >
                <FiTrash2 /> Excluir ({examesSelecionados.length})
              </button>
            </>
          )}

          {/* Zona de risco: separada visualmente das ações normais */}
          {exames.length > 0 && (
            <button
              onClick={() => { setConfirmaLimparTudo(false); setConfirmacao({ tipo: "limparTudo" }); }}
              disabled={carregando}
              title="Apaga todos os exames — ação irreversível"
              style={{
                background: "transparent",
                color: "#e74c3c",
                border: "1.5px dashed #e74c3c88",
                padding: "8px 12px",
                borderRadius: "6px",
                cursor: carregando ? "not-allowed" : "pointer",
                fontSize: "12px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                opacity: carregando ? 0.5 : 0.85,
                marginLeft: "auto"
              }}
            >
              <FiAlertTriangle size={13} /> Limpar tudo
            </button>
          )}
        </div>
      </div>

      {/* Filtros Mobile-Optimized */}
      <div style={{
        background: "#242d43",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "15px"
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}>
          {/* Busca */}
          <div>
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginBottom: "4px",
              fontSize: "12px",
              color: "#aaa"
            }}>
              <FiSearch size={13} /> Buscar:
            </label>
            <input
              type="text"
              placeholder="Nome, data ou tipo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "none",
                fontSize: "14px",
                background: "#fff",
                color: "#333"
              }}
            />
          </div>
          
          {/* Filtro por tipo */}
          <div>
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginBottom: "4px",
              fontSize: "12px",
              color: "#aaa"
            }}>
              <FiClipboard size={13} /> Tipo:
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "none",
                fontSize: "14px",
                background: "#fff",
                color: "#333"
              }}
            >
              <option value="todos">Todos os tipos</option>
              {tiposUnicos.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>

          {/* Ordenação */}
          <div>
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginBottom: "4px",
              fontSize: "12px",
              color: "#aaa"
            }}>
              <MdSort size={14} /> Ordenar por:
            </label>
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "none",
                fontSize: "14px",
                background: "#fff",
                color: "#333"
              }}
            >
              <option value="recentes">Mais recentes</option>
              <option value="nome">Nome do paciente (A-Z)</option>
              <option value="tipo">Tipo de exame (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Exames Mobile-Optimized */}
      {carregando ? (
        <div style={{
          textAlign: "center",
          padding: "50px 20px",
          background: "#242d43",
          borderRadius: "8px",
          color: "#8fb3bd"
        }}>
          <div className="examesSpinner" />
          <p style={{ fontSize: "14px", marginTop: 14 }}>Carregando exames...</p>
        </div>
      ) : examesOrdenados.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "40px 20px",
          background: "#242d43",
          borderRadius: "8px",
          color: "#888"
        }}>
          {exames.length === 0 ? (
            <div>
              <h3 style={{ marginBottom: "10px", fontSize: "18px" }}>Nenhum exame realizado ainda</h3>
              <p style={{ fontSize: "14px" }}>Comece criando seu primeiro exame!</p>
            </div>
          ) : (
            <div>
              <h3 style={{ marginBottom: "10px", fontSize: "18px" }}>Nenhum exame encontrado</h3>
              <p style={{ fontSize: "14px" }}>Tente ajustar os filtros de busca</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}>
          {examesOrdenados.map((exame) => (
            <div
              key={exame.id}
              role="button"
              tabIndex={0}
              aria-label={`Ver exame de ${exame.nome}`}
              onClick={() => (modoSelecao ? toggleSelecaoExame(exame) : setExameVisualizando(exame))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  modoSelecao ? toggleSelecaoExame(exame) : setExameVisualizando(exame);
                }
              }}
              style={{
                background: "#242d43",
                borderRadius: "8px",
                padding: "15px",
                border: "1px solid #0eb8d033",
                borderLeft: `4px solid ${corDoTipo(exame.tipoNome)}`,
                transition: "all 0.2s",
                position: "relative",
                cursor: "pointer",
                borderColor: examesSelecionados.find(e => e.id === exame.id) ? "#e74c3c" : "#0eb8d033"
              }}
            >
              {/* Checkbox para seleção múltipla */}
              {modoSelecao && (
                <div style={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  zIndex: 10
                }}>
                  <input
                    type="checkbox"
                    checked={examesSelecionados.find(e => e.id === exame.id) ? true : false}
                    onChange={() => toggleSelecaoExame(exame)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: "18px",
                      height: "18px",
                      cursor: "pointer"
                    }}
                  />
                </div>
              )}

              <div style={{
                marginLeft: modoSelecao ? "35px" : "0"
              }}>
                {/* Informações do exame */}
                <div style={{ marginBottom: "12px" }}>
                  <h3 style={{
                    color: "#0eb8d0",
                    margin: "0 0 6px 0",
                    fontSize: "16px",
                    fontWeight: 600
                  }}>
                    {exame.nome}
                  </h3>
                  <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    fontSize: "12px",
                    color: "#aaa"
                  }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><FiCalendar size={12} /> {formatarDataDiaMesAno(exame.data) || exame.data}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><FaHospital size={12} /> {exame.tipoNome}</span>
                    {exame.lado && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><GiLeg size={12} /> {exame.lado}</span>}
                  </div>
                </div>

                {/* Botões de ação */}
                {!modoSelecao && (
                  <div style={{
                    display: "flex",
                    gap: "6px",
                    flexWrap: "wrap",
                    alignItems: "center",
                    position: "relative"
                  }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setExameVisualizando(exame); }}
                      style={{
                        background: "#11b581",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "6px 10px",
                        cursor: "pointer",
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <FiEye /> Ver
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditarExame(exame); }}
                      style={{
                        background: "#0eb8d0",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "6px 10px",
                        cursor: "pointer",
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <FiEdit2 /> Editar
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); gerarPDFExame(exame); }}
                      style={{
                        background: "#ff9500",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "6px 10px",
                        cursor: "pointer",
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <FiPrinter /> PDF
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuAbertoId(menuAbertoId === exame.id ? null : exame.id); }}
                      title="Mais ações"
                      style={{
                        background: "#38445e",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "6px 8px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center"
                      }}
                    >
                      <FiMoreVertical size={14} />
                    </button>

                    {menuAbertoId === exame.id && (
                      <>
                        <div
                          style={{ position: "fixed", inset: 0, zIndex: 15 }}
                          onClick={(e) => { e.stopPropagation(); setMenuAbertoId(null); }}
                        />
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute",
                            right: 0,
                            top: "36px",
                            zIndex: 16,
                            background: "#1a2332",
                            border: "1px solid #38445e",
                            borderRadius: "8px",
                            minWidth: "190px",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
                            overflow: "hidden"
                          }}
                        >
                          {temAcesso && localStorage.getItem("whatsapp") === "true" && (
                            <button
                              onClick={() => {
                                setWhatsappExame(exame);
                                setWhatsappNumeroPaciente(exame.telefonePaciente || "");
                                setMenuAbertoId(null);
                              }}
                              style={{
                                width: "100%", textAlign: "left", background: "none", border: "none",
                                color: "#fff", padding: "10px 14px", cursor: "pointer", fontSize: "13px",
                                display: "flex", alignItems: "center", gap: "8px"
                              }}
                            >
                              <FiMessageCircle size={14} color="#25D366" /> WhatsApp
                            </button>
                          )}
                          {temAcesso && localStorage.getItem("envioEmail") === "true" && (
                            <button
                              onClick={() => {
                                setEmailExame(exame);
                                setEmailPaciente(exame.emailPaciente || "");
                                setMenuAbertoId(null);
                              }}
                              style={{
                                width: "100%", textAlign: "left", background: "none", border: "none",
                                color: "#fff", padding: "10px 14px", cursor: "pointer", fontSize: "13px",
                                display: "flex", alignItems: "center", gap: "8px"
                              }}
                            >
                              <FiMail size={14} color="#0eb8d0" /> E-mail
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setMenuAbertoId(null);
                              setConfirmacao({ tipo: "excluirUm", exame });
                            }}
                            style={{
                              width: "100%", textAlign: "left", background: "none", border: "none",
                              borderTop: "1px solid #38445e",
                              color: "#e74c3c", padding: "10px 14px", cursor: "pointer", fontSize: "13px",
                              display: "flex", alignItems: "center", gap: "8px"
                            }}
                          >
                            <FiTrash2 size={14} /> Excluir
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Status de seleção */}
                {modoSelecao && (
                  <div style={{
                    color: examesSelecionados.find(e => e.id === exame.id) ? "#e74c3c" : "#0eb8d0",
                    fontSize: "12px",
                    fontWeight: "bold",
                    padding: "8px",
                    background: examesSelecionados.find(e => e.id === exame.id) ? "#e74c3c20" : "#0eb8d020",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5
                  }}>
                    {examesSelecionados.find(e => e.id === exame.id) ? <><FiCheckSquare /> Selecionado</> : <><FiSquare /> Não selecionado</>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Visualizar Exame Mobile-Optimized */}
      {exameVisualizando && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.9)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: "10px"
        }}>
          <div style={{
            background: "#242d43",
            borderRadius: "8px",
            padding: "15px",
            width: "100%",
            maxWidth: "95vw",
            maxHeight: "95vh",
            overflow: "auto",
            position: "relative"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
              borderBottom: "2px solid #0eb8d0",
              paddingBottom: "8px"
            }}>
              <h3 style={{
                color: "#0eb8d0",
                margin: 0,
                fontSize: "16px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}>
                <FiEye /> {exameVisualizando.nome}
              </h3>
              <button
                onClick={() => setExameVisualizando(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontSize: "20px",
                  cursor: "pointer",
                  padding: "5px"
                }}
              >
                <FiX />
              </button>
            </div>

            <div style={{
              background: "#fff",
              color: "#000",
              padding: "15px",
              borderRadius: "6px",
              maxHeight: "60vh",
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              fontFamily: "monospace",
              fontSize: "12px",
              lineHeight: 1.5
            }}>
              {formatarLaudoParaVisualizacao(exameVisualizando.laudo)}
            </div>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginTop: "15px"
            }}>
              <button
                onClick={() => {
                  setExameVisualizando(null);
                  handleEditarExame(exameVisualizando);
                }}
                style={{
                  background: "#0eb8d0",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px 15px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}
              >
                <FiEdit2 /> Editar Exame
              </button>
              <button
                onClick={() => gerarPDFExame(exameVisualizando)}
                style={{
                  background: "#ff9500",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px 15px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}
              >
                <FiPrinter /> Imprimir PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Enviar por WhatsApp */}
      {whatsappExame && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1001,
          padding: "15px"
        }}>
          <div style={{
            background: "#242d43",
            borderRadius: "8px",
            padding: "20px",
            width: "100%",
            maxWidth: "400px",
            border: "1px solid #25D366"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ color: "#25D366", margin: 0, fontSize: "18px", display: "flex", alignItems: "center", gap: 8 }}>
                <FiMessageCircle size={22} /> Enviar laudo por WhatsApp
              </h3>
              <button
                onClick={() => { setWhatsappExame(null); setWhatsappNumeroPaciente(""); }}
                style={{ background: "none", border: "none", color: "#fff", fontSize: "22px", cursor: "pointer", padding: "4px" }}
              >
                <FiX />
              </button>
            </div>
            <p style={{ color: "#ccc", marginBottom: 12, fontSize: "14px" }}>
              Paciente: <strong style={{ color: "#0eb8d0" }}>{whatsappExame.nome}</strong> — {whatsappExame.tipoNome}
            </p>
            <div style={{ background: "rgba(255,193,7,0.15)", border: "1px solid rgba(255,193,7,0.5)", borderRadius: 8, padding: "10px 12px", marginBottom: 16, fontSize: 13, color: "#e6d68a" }}>
              <strong>Segurança:</strong> Apenas envio em PDF é aceito. Gere o PDF deste exame (botão PDF) antes de enviar e anexe o arquivo na conversa do WhatsApp.
            </div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#fff" }}>
              Número do paciente (com DDD):
            </label>
            <input
              type="tel"
              value={whatsappNumeroPaciente}
              onChange={(e) => setWhatsappNumeroPaciente(e.target.value)}
              placeholder="Ex: 11999999999 ou 11 99999-9999"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "6px",
                border: "none",
                fontSize: "14px",
                marginBottom: "16px",
                boxSizing: "border-box"
              }}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => { setWhatsappExame(null); setWhatsappNumeroPaciente(""); }}
                style={{
                  background: "#555",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px 18px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Cancelar
              </button>
              <button
                disabled={!whatsappNumeroPaciente.trim()}
                onClick={() => {
                  const digits = whatsappNumeroPaciente.replace(/\D/g, "");
                  if (!digits.length) return;
                  const waNumber = digits.startsWith("55") ? digits : (digits.length <= 11 ? "55" + digits : digits);
                  const msg = `Olá! Segue o resultado do seu exame (envie o laudo em PDF em anexo).\nPaciente: ${whatsappExame.nome || ""}\nExame: ${whatsappExame.tipoNome || ""}\nData: ${whatsappExame.data || ""}`;
                  window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
                  setWhatsappExame(null);
                  setWhatsappNumeroPaciente("");
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: whatsappNumeroPaciente.trim() ? "#25D366" : "#555",
                  color: "#fff",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: whatsappNumeroPaciente.trim() ? "pointer" : "not-allowed",
                  opacity: whatsappNumeroPaciente.trim() ? 1 : 0.7
                }}
              >
                <FiMessageCircle size={18} /> Abrir WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Enviar por E-mail */}
      {emailExame && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1001,
          padding: "15px"
        }}>
          <div style={{
            background: "#242d43",
            borderRadius: "8px",
            padding: "20px",
            width: "100%",
            maxWidth: "400px",
            border: "1px solid #0eb8d0"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ color: "#0eb8d0", margin: 0, fontSize: "18px", display: "flex", alignItems: "center", gap: 8 }}>
                <FiMail size={22} /> Enviar laudo por e-mail
              </h3>
              <button
                onClick={() => { setEmailExame(null); setEmailPaciente(""); }}
                style={{ background: "none", border: "none", color: "#fff", fontSize: "22px", cursor: "pointer", padding: "4px" }}
              >
                <FiX />
              </button>
            </div>
            <p style={{ color: "#ccc", marginBottom: 12, fontSize: "14px" }}>
              Paciente: <strong style={{ color: "#0eb8d0" }}>{emailExame.nome}</strong> — {emailExame.tipoNome}
            </p>
            <div style={{ background: "rgba(255,193,7,0.15)", border: "1px solid rgba(255,193,7,0.5)", borderRadius: 8, padding: "10px 12px", marginBottom: 16, fontSize: 13, color: "#e6d68a" }}>
              <strong>Segurança:</strong> Apenas envio em PDF é aceito. Gere o PDF deste exame (botão PDF) antes de enviar e anexe o arquivo no e-mail ao paciente.
            </div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#fff" }}>
              E-mail do paciente:
            </label>
            <input
              type="email"
              value={emailPaciente}
              onChange={(e) => setEmailPaciente(e.target.value)}
              placeholder="ex: paciente@email.com"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "6px",
                border: "none",
                fontSize: "14px",
                marginBottom: "16px",
                boxSizing: "border-box"
              }}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => { setEmailExame(null); setEmailPaciente(""); }}
                style={{
                  background: "#555",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px 18px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Cancelar
              </button>
              <button
                disabled={!emailPaciente.trim()}
                onClick={() => {
                  const email = emailPaciente.trim();
                  if (!email) return;
                  const subject = `Resultado do exame - ${emailExame.nome || "Paciente"}`;
                  const body = `Olá!\n\nSegue o resultado do seu exame.\n\nPaciente: ${emailExame.nome || ""}\nExame: ${emailExame.tipoNome || ""}\nData: ${emailExame.data || ""}\n\nAnexe o laudo em PDF (gerado pelo botão PDF). Apenas formato PDF é aceito por segurança.`;
                  window.open(`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank", "noopener,noreferrer");
                  setEmailExame(null);
                  setEmailPaciente("");
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: emailPaciente.trim() ? "#0eb8d0" : "#555",
                  color: "#fff",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: emailPaciente.trim() ? "pointer" : "not-allowed",
                  opacity: emailPaciente.trim() ? 1 : 0.7
                }}
              >
                <FiMail size={18} /> Abrir e-mail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação (substitui window.confirm nativo) */}
      {confirmacao && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(8,14,22,0.75)", display: "flex",
            justifyContent: "center", alignItems: "center", zIndex: 1002, padding: "15px"
          }}
          onClick={() => { setConfirmacao(null); setConfirmaLimparTudo(false); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#151b26", border: `1px solid ${confirmacao.tipo === "limparTudo" ? "#e74c3c" : "#2a3441"}`,
              borderRadius: "10px", padding: "22px", width: "100%", maxWidth: "420px"
            }}
          >
            {confirmacao.tipo === "excluirUm" && (
              <>
                <h3 style={{ color: "#fff", margin: "0 0 10px 0", fontSize: "17px" }}>Excluir exame?</h3>
                <p style={{ color: "#aab6c2", fontSize: "14px", marginBottom: 20 }}>
                  Tem certeza que deseja excluir o exame de <strong style={{ color: "#0eb8d0" }}>{confirmacao.exame.nome}</strong>? Essa ação não pode ser desfeita.
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setConfirmacao(null)} style={{ background: "#38445e", color: "#fff", border: "none", borderRadius: 6, padding: "9px 16px", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}>Cancelar</button>
                  <button onClick={() => confirmarExcluirExame(confirmacao.exame)} style={{ background: "#e74c3c", color: "#fff", border: "none", borderRadius: 6, padding: "9px 16px", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}>Excluir</button>
                </div>
              </>
            )}

            {confirmacao.tipo === "excluirSelecionados" && (
              <>
                <h3 style={{ color: "#fff", margin: "0 0 10px 0", fontSize: "17px" }}>Excluir exames selecionados?</h3>
                <p style={{ color: "#aab6c2", fontSize: "14px", marginBottom: 20 }}>
                  Tem certeza que deseja excluir <strong style={{ color: "#0eb8d0" }}>{examesSelecionados.length}</strong> exame(s) selecionado(s)? Essa ação não pode ser desfeita.
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setConfirmacao(null)} style={{ background: "#38445e", color: "#fff", border: "none", borderRadius: 6, padding: "9px 16px", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}>Cancelar</button>
                  <button onClick={confirmarExcluirSelecionados} style={{ background: "#e74c3c", color: "#fff", border: "none", borderRadius: 6, padding: "9px 16px", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}>Excluir</button>
                </div>
              </>
            )}

            {confirmacao.tipo === "limparTudo" && (
              <>
                <h3 style={{ color: "#e74c3c", margin: "0 0 10px 0", fontSize: "17px", display: "flex", alignItems: "center", gap: 8 }}>
                  <FiAlertTriangle /> Apagar todos os exames
                </h3>
                <p style={{ color: "#aab6c2", fontSize: "14px", marginBottom: 14 }}>
                  Isso vai deletar permanentemente <strong style={{ color: "#fff" }}>{exames.length}</strong> exame(s) da sua conta. Essa ação NÃO pode ser desfeita.
                </p>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "13px", color: "#e6d68a", marginBottom: 20, cursor: "pointer" }}>
                  <input type="checkbox" checked={confirmaLimparTudo} onChange={(e) => setConfirmaLimparTudo(e.target.checked)} />
                  Entendo que essa ação é irreversível
                </label>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => { setConfirmacao(null); setConfirmaLimparTudo(false); }} style={{ background: "#38445e", color: "#fff", border: "none", borderRadius: 6, padding: "9px 16px", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}>Cancelar</button>
                  <button
                    onClick={confirmarLimparTudo}
                    disabled={!confirmaLimparTudo}
                    style={{
                      background: confirmaLimparTudo ? "#e74c3c" : "#5a3232",
                      color: "#fff", border: "none", borderRadius: 6, padding: "9px 16px", fontWeight: 600,
                      cursor: confirmaLimparTudo ? "pointer" : "not-allowed", fontSize: "14px",
                      opacity: confirmaLimparTudo ? 1 : 0.7
                    }}
                  >
                    Apagar tudo
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>
        {`
          .examesSpinner {
            width: 34px;
            height: 34px;
            margin: 0 auto;
            border: 3px solid #344257;
            border-top-color: #0eb8d0;
            border-radius: 50%;
            animation: examesSpin 0.8s linear infinite;
          }
          @keyframes examesSpin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
} 