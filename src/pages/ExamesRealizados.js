import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { saveAs } from "file-saver";
import { FiArrowLeft, FiEye, FiEdit, FiPrinter, FiTrash2, FiX, FiWifi, FiWifiOff, FiMessageCircle, FiMail } from "react-icons/fi";
import laudoSyncService from "../services/laudoSyncService";
import examesRealtimeService from "../services/examesRealtimeService";
import { TrialManager } from "../utils/trialManager";

// Helpers para exames salvos (localStorage)
const STORAGE_KEY_TO_LABEL = {
  "examesMMIIVenoso": "MMII Venoso",
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

function getStorageKeyFromTipoNome(tipoNome) {
  if (!tipoNome) return "examesLaudo";

  const entry = Object.entries(STORAGE_KEY_TO_LABEL)
    .find(([, label]) => label === tipoNome);

  if (entry) return entry[0];

  const normalized = tipoNome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');

  return normalized ? `exames${normalized}` : "examesLaudo";
}

// Função para buscar todos os exames
async function getTodosExames() {
  try {
    console.log('🔍 ExamesRealizados: Buscando exames...');
    
    const resultado = await laudoSyncService.buscarLaudos();
    
    if (resultado.success) {
      console.log('✅ ExamesRealizados: Exames carregados:', resultado.laudos.length);
      
      // Converter para o formato esperado pela página
      const examesFormatados = resultado.laudos.map(laudo => {
        const tipoNome = laudo.tipoNome || STORAGE_KEY_TO_LABEL[laudo.tipo] || laudo.tipo || 'Exame';
        const tipo = laudo.tipo || getStorageKeyFromTipoNome(tipoNome);
        return {
          ...laudo,
          tipo,
          tipoNome,
          timestamp: laudo.dataCriacao || laudo.timestamp,
          criadoEm: laudo.dataCriacao || laudo.timestamp,
          origem: laudo.origem || 'localStorage'
        };
      });
      
      // Ordenar por data de criação (mais recente primeiro)
      return examesFormatados.sort((a, b) => new Date(b.timestamp || b.criadoEm || 0) - new Date(a.timestamp || a.criadoEm || 0));
    } else {
      console.warn('⚠️ ExamesRealizados: Erro ao carregar exames:', resultado.error);
      return [];
    }
  } catch (error) {
    console.error('❌ ExamesRealizados: Erro ao carregar exames:', error);
    return [];
  }
}

// Função de fallback para buscar do localStorage
function getTodosExamesLocais() {
  const todosExames = [];
  
  STORAGE_KEYS.forEach((key) => {
    const exames = JSON.parse(localStorage.getItem(key) || "[]");
    exames.forEach(exame => {
      const tipoNome = exame.tipoNome || STORAGE_KEY_TO_LABEL[key] || "Exame";
      todosExames.push({
        ...exame,
        tipo: exame.tipo || key,
        tipoNome
      });
    });
  });
  
  // Ordenar por data de criação (mais recente primeiro)
  return todosExames.sort((a, b) => new Date(b.timestamp || b.criadoEm || 0) - new Date(a.timestamp || a.criadoEm || 0));
}

function getTipoNome(key) {
  return STORAGE_KEY_TO_LABEL[key] || "Exame";
}

function excluirExame(exame) {
  const storageKey = exame.tipo || getStorageKeyFromTipoNome(exame.tipoNome);
  const todos = JSON.parse(localStorage.getItem(storageKey) || "[]");
  const filtrados = todos.filter(e => e.id !== exame.id);
  localStorage.setItem(storageKey, JSON.stringify(filtrados));
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

  const tiposUnicos = [...new Set(exames.map(e => e.tipoNome))];

  function handleEditarExame(exame) {
    // Navegar para a página específica do tipo de exame
    const rotas = {
      "MMII Venoso": "/mmii-venoso",
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

  // Função para LIMPAR TODOS os exames
  const limparTodosExamesFirebase = async () => {
    try {
      const confirmacao = window.confirm(
        '⚠️ ATENÇÃO: Isso irá DELETAR TODOS os exames!\n\n' +
        'Tem certeza que deseja continuar?\n\n' +
        'Esta ação NÃO pode ser desfeita!'
      );
      
      if (!confirmacao) return;
      
      console.log('🗑️ ExamesRealizados: LIMPANDO TODOS os exames...');
      
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


  const handleExcluirExame = async (exame) => {
    if (window.confirm(`Tem certeza que deseja excluir o exame de ${exame.nome}?`)) {
      try {
        console.log('🗑️ ExamesRealizados: Excluindo exame:', exame.id);
        
        // Excluir usando o serviço em tempo real
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

  const deselecionarTodos = () => {
    setExamesSelecionados([]);
  };

  const excluirSelecionados = async () => {
    if (examesSelecionados.length === 0) return;
    
    const confirmacao = window.confirm(
      `Tem certeza que deseja excluir ${examesSelecionados.length} exame(s) selecionado(s)?`
    );
    
    if (!confirmacao) return;

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
              margin: 0
            }}>
              📋 Exames Realizados ({examesFiltrados.length})
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
            🔄 Sync
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
            {modoSelecao ? "❌ Cancelar" : "☑️ Selecionar"}
          </button>
          
          {/* Botão de limpeza (apenas se houver exames) */}
          {exames.length > 0 && (
            <button
              onClick={limparTodosExamesFirebase}
              disabled={carregando}
              style={{
                background: "#e67e22",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "6px",
                cursor: carregando ? "not-allowed" : "pointer",
                fontSize: "12px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                opacity: carregando ? 0.7 : 1
              }}
            >
              🗑️ Limpar
            </button>
          )}
          
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
                  opacity: examesFiltrados.length === 0 ? 0.5 : 1
                }}
              >
                ☑️ Todos
              </button>
              
              <button
                onClick={excluirSelecionados}
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
                  opacity: examesSelecionados.length === 0 || carregando ? 0.5 : 1
                }}
              >
                🗑️ Excluir ({examesSelecionados.length})
              </button>
            </>
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
              display: "block", 
              marginBottom: "4px", 
              fontSize: "12px",
              color: "#aaa"
            }}>
              🔍 Buscar:
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
              display: "block", 
              marginBottom: "4px", 
              fontSize: "12px",
              color: "#aaa"
            }}>
              📋 Tipo:
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
        </div>
      </div>

      {/* Lista de Exames Mobile-Optimized */}
      {examesFiltrados.length === 0 ? (
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
          {examesFiltrados.map((exame, index) => (
            <div key={exame.id} style={{
              background: "#242d43",
              borderRadius: "8px",
              padding: "15px",
              border: "1px solid #0eb8d033",
              transition: "all 0.2s",
              position: "relative",
              borderColor: examesSelecionados.find(e => e.id === exame.id) ? "#e74c3c" : "#0eb8d033"
            }}>
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
                    <span>📅 {formatarDataDiaMesAno(exame.data) || exame.data}</span>
                    <span>🏥 {exame.tipoNome}</span>
                    {exame.lado && <span>🦵 {exame.lado}</span>}
                  </div>
                </div>
                
                {/* Botões de ação */}
                {!modoSelecao && (
                  <div style={{
                    display: "flex",
                    gap: "6px",
                    flexWrap: "wrap"
                  }}>
                    <button
                      onClick={() => setExameVisualizando(exame)}
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
                      👁️ Ver
                    </button>
                    
                    <button
                      onClick={() => handleEditarExame(exame)}
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
                      ✏️ Editar
                    </button>
                    
                    <button
                      onClick={() => gerarPDFExame(exame)}
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
                      🖨️ PDF
                    </button>
                    
                    {temAcesso && localStorage.getItem("whatsapp") === "true" && (
                      <button
                        onClick={() => {
                          setWhatsappExame(exame);
                          setWhatsappNumeroPaciente(exame.telefonePaciente || "");
                        }}
                        style={{
                          background: "#25D366",
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
                        title="Enviar laudo em PDF por WhatsApp ao paciente"
                      >
                        <FiMessageCircle size={14} /> WhatsApp
                      </button>
                    )}
                    {temAcesso && localStorage.getItem("envioEmail") === "true" && (
                      <button
                        onClick={() => {
                          setEmailExame(exame);
                          setEmailPaciente(exame.emailPaciente || "");
                        }}
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
                        title="Enviar laudo em PDF por e-mail ao paciente"
                      >
                        <FiMail size={14} /> E-mail
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleExcluirExame(exame)}
                      style={{
                        background: "#e74c3c",
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
                      🗑️ Excluir
                    </button>
                  </div>
                )}
                
                {/* Status de seleção */}
                {modoSelecao && (
                  <div style={{
                    color: examesSelecionados.find(e => e.id === exame.id) ? "#e74c3c" : "#0eb8d0",
                    fontSize: "12px",
                    fontWeight: "bold",
                    textAlign: "center",
                    padding: "8px",
                    background: examesSelecionados.find(e => e.id === exame.id) ? "#e74c3c20" : "#0eb8d020",
                    borderRadius: "4px"
                  }}>
                    {examesSelecionados.find(e => e.id === exame.id) ? "☑️ Selecionado" : "☐ Não selecionado"}
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
                fontSize: "16px"
              }}>
                👁️ {exameVisualizando.nome}
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
                  fontSize: "14px"
                }}
              >
                ✏️ Editar Exame
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
                  fontSize: "14px"
                }}
              >
                🖨️ Imprimir PDF
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
              <strong>Segurança:</strong> Apenas envio em PDF é aceito. Gere o PDF deste exame (botão 🖨️ PDF) antes de enviar e anexe o arquivo na conversa do WhatsApp.
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
              <strong>Segurança:</strong> Apenas envio em PDF é aceito. Gere o PDF deste exame (botão 🖨️ PDF) antes de enviar e anexe o arquivo no e-mail ao paciente.
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
    </div>
  );
} 