import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiMapPin, FiArrowLeft, FiTrash2, FiX, FiWifi, FiWifiOff, FiSend, FiMoreVertical, FiAlertTriangle, FiClipboard, FiRefreshCw, FiCheckSquare, FiSquare, FiSearch, FiCalendar, FiEye, FiEdit2, FiPrinter } from "react-icons/fi";
import { MdSort } from "react-icons/md";
import { FaHospital } from "react-icons/fa";
import { GiLeg } from "react-icons/gi";
import examesRealtimeService from "../services/examesRealtimeService";
import { gerarPDFExame, montarPDFExame, perfilParaExame, formatarDataDiaMesAno } from "../utils/pdfExameSalvo";
import { temAcessoEnvio, textoEnvio } from "../utils/envioLaudo";
import EnviarLaudo from "../components/EnviarLaudo";

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
  "examesFAV": "Fístula Arteriovenosa",
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
  "Fístula Arteriovenosa": "#a569d6",
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

// Laudo como foi salvo (os separadores "====" entre membros já vêm no texto).
// Antes cada linha em branco virava um separador gigante na visualização.
function formatarLaudoParaVisualizacao(laudo) {
  return laudo ? String(laudo).replace(/\*\*/g, "") : "Laudo não disponível";
}

const ultimoEnvio = (e) => (Array.isArray(e?.envios) && e.envios.length ? e.envios[e.envios.length - 1] : null);

const SEM_LOCAL = "__sem_local__";
const localDoExame = (e) => String(e?.localExame || "").trim();

export default function ExamesRealizados() {
  const navigate = useNavigate();
  const [exames, setExames] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [exameVisualizando, setExameVisualizando] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroLocal, setFiltroLocal] = useState("todos");
  const [busca, setBusca] = useState("");
  const [examesSelecionados, setExamesSelecionados] = useState([]);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [enviandoExame, setEnviandoExame] = useState(null);
  const [ordenacao, setOrdenacao] = useState("recentes");
  const [menuAbertoId, setMenuAbertoId] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null); // { tipo: 'excluirUm'|'excluirSelecionados'|'limparTudo', exame? }
  const [confirmaLimparTudo, setConfirmaLimparTudo] = useState(false);
  const isPremium = isUsuarioPremium();
  const podeEnviar = temAcessoEnvio();

  // Ref para armazenar o ID do listener
  const listenerIdRef = useRef(null);

  // Voltou para a lista: nenhuma edição em andamento.
  useEffect(() => { examesRealtimeService.encerrarEdicao(); }, []);

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

  // exames sem nome/tipo não quebram mais a busca
  const termo = busca.trim().toLowerCase();
  const examesFiltrados = exames.filter(exame => {
    const matchTipo = filtroTipo === "todos" || exame.tipoNome === filtroTipo;
    const local = localDoExame(exame);
    const matchLocal = filtroLocal === "todos" || (filtroLocal === SEM_LOCAL ? !local : local === filtroLocal);
    const campos = [exame.nome, exame.data, formatarDataDiaMesAno(exame.data), exame.tipoNome, local];
    const matchBusca = !termo || campos.some((c) => String(c || "").toLowerCase().includes(termo));
    return matchTipo && matchLocal && matchBusca;
  });

  const examesOrdenados = [...examesFiltrados].sort((a, b) => {
    if (ordenacao === "nome") return (a.nome || "").localeCompare(b.nome || "");
    if (ordenacao === "tipo") return (a.tipoNome || "").localeCompare(b.tipoNome || "");
    return new Date(b.timestamp || b.criadoEm || 0) - new Date(a.timestamp || a.criadoEm || 0);
  });

  const tiposUnicos = [...new Set(exames.map(e => e.tipoNome).filter(Boolean))];
  const locaisUnicos = [...new Set(exames.map(localDoExame).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const temSemLocal = exames.some((e) => !localDoExame(e));
  const contarLocal = (l) => exames.filter((e) => (l === SEM_LOCAL ? !localDoExame(e) : localDoExame(e) === l)).length;

  async function pdfParaEnvio(exame) {
    if (!exame) return null;
    const bytes = await montarPDFExame(exame, perfilParaExame(exame, localStorage.getItem("userEmail") || ""));
    const data = formatarDataDiaMesAno(exame.data);
    const nomeArquivo = `Laudo_${(exame.nome || "paciente").replace(/\s+/g, "_")}_${data ? data.replace(/\//g, "-") : "sem_data"}.pdf`;
    return { blob: new Blob([bytes], { type: "application/pdf" }), nomeArquivo };
  }

  // Guarda o contato do paciente e o histórico de envios no próprio exame.
  async function registrarEnvio(via, { telefone, email }) {
    const exame = enviandoExame;
    if (!exame) return;
    const novos = {
      ...(telefone ? { telefonePaciente: telefone } : {}),
      ...(email ? { emailPaciente: email } : {}),
      envios: [...(Array.isArray(exame.envios) ? exame.envios : []), { via, em: new Date().toISOString() }],
    };
    const atualizado = { ...exame, ...novos };
    setEnviandoExame(atualizado);
    setExames((lista) => lista.map((e) => (e.id === exame.id ? { ...e, ...novos } : e)));
    await examesRealtimeService.atualizarExame(exame.id, novos, {
      ids: [exame.id, exame.localId, exame.supabaseId].filter(Boolean),
      supabaseId: exame.supabaseId,
      dados: exame,
    });
  }

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
      "Fístula Arteriovenosa": "/fistula-arteriovenosa",
      "Artérias Renais": "/arterias-renais"
    };
    
    const rota = rotas[exame.tipoNome];
    if (rota) {
      // Salvar dados do exame para edição; ao salvar, atualiza este exame
      // (antes criava um exame novo, duplicando)
      localStorage.setItem("exameEmEdicao", JSON.stringify(exame));
      examesRealtimeService.iniciarEdicao(exame);
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
              placeholder="Nome, data, tipo ou local..."
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

          {/* Filtro por local do exame */}
          {(locaisUnicos.length > 0) && (
            <div>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginBottom: "4px",
                fontSize: "12px",
                color: "#aaa"
              }}>
                <FiMapPin size={13} /> Local do exame:
              </label>
              <select
                value={filtroLocal}
                onChange={(e) => setFiltroLocal(e.target.value)}
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
                <option value="todos">Todos os locais ({exames.length})</option>
                {locaisUnicos.map(l => (
                  <option key={l} value={l}>{l} ({contarLocal(l)})</option>
                ))}
                {temSemLocal && <option value={SEM_LOCAL}>Sem local registrado ({contarLocal(SEM_LOCAL)})</option>}
              </select>
            </div>
          )}

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
                    {localDoExame(exame) && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#9fd7e2" }}><FiMapPin size={12} /> {localDoExame(exame)}</span>}
                  </div>
                  {ultimoEnvio(exame) && (
                    <div style={{ marginTop: 6, fontSize: "11.5px", color: "#3ddc97", display: "flex", alignItems: "center", gap: 4 }}>
                      <FiSend size={11} /> {textoEnvio(ultimoEnvio(exame))}
                    </div>
                  )}
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

                    {podeEnviar && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEnviandoExame(exame); }}
                        title="Enviar o laudo ao paciente (WhatsApp, e-mail)"
                        style={{
                          background: "#25a35a",
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
                        <FiSend /> Enviar
                      </button>
                    )}

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
                          <button
                            onClick={() => {
                              setMenuAbertoId(null);
                              setConfirmacao({ tipo: "excluirUm", exame });
                            }}
                            style={{
                              width: "100%", textAlign: "left", background: "none", border: "none",
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

      <EnviarLaudo
        aberto={!!enviandoExame}
        onFechar={() => setEnviandoExame(null)}
        obterPdf={() => pdfParaEnvio(enviandoExame)}
        info={{ paciente: enviandoExame?.nome, tipoNome: enviandoExame?.tipoNome, data: enviandoExame?.data, clinica: localDoExame(enviandoExame) || undefined }}
        telefoneInicial={enviandoExame?.telefonePaciente}
        emailInicial={enviandoExame?.emailPaciente}
        onEnviado={registrarEnvio}
      />

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