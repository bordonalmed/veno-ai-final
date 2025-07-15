import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { saveAs } from "file-saver";
import { FiArrowLeft, FiEye, FiEdit, FiPrinter, FiTrash2, FiX } from "react-icons/fi";

// Helpers para exames salvos (localStorage)
const STORAGE_KEYS = {
  MMII_VENOSO: "examesMMIIVenoso",
  MMII_ARTERIAL: "examesMMIIArterial",
  MMSS_VENOSO: "examesMMSSVenoso",
  MMSS_ARTERIAL: "examesMMSSArterial",
  CAROTIDAS: "examesCarotidas",
  AORTA: "examesAorta",
  RENAIS: "examesRenais"
};

function getTodosExames() {
  const todosExames = [];
  
  Object.values(STORAGE_KEYS).forEach(key => {
    const exames = JSON.parse(localStorage.getItem(key) || "[]");
    exames.forEach(exame => {
      todosExames.push({
        ...exame,
        tipo: key,
        tipoNome: getTipoNome(key)
      });
    });
  });
  
  // Ordenar por data de criação (mais recente primeiro)
  return todosExames.sort((a, b) => new Date(b.timestamp || b.criadoEm || 0) - new Date(a.timestamp || a.criadoEm || 0));
}

function getTipoNome(key) {
  const tipos = {
    "examesMMIIVenoso": "MMII Venoso",
    "examesMMIIArterial": "MMII Arterial", 
    "examesMMSSVenoso": "MMSS Venoso",
    "examesMMSSArterial": "MMSS Arterial",
    "examesCarotidas": "Carótidas e Vertebrais",
    "examesAorta": "Aorta e Ilíacas",
    "examesRenais": "Artérias Renais"
  };
  return tipos[key] || "Exame";
}

function excluirExame(exame) {
  const todos = JSON.parse(localStorage.getItem(exame.tipo) || "[]");
  const filtrados = todos.filter(e => e.id !== exame.id);
  localStorage.setItem(exame.tipo, JSON.stringify(filtrados));
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

async function gerarPDFExame(exame) {
  try {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    
    const page = doc.addPage([595, 842]); // A4 Portrait
    let y = 800;
    const left = 50;
    const lineHeight = 20;
    
    // Cabeçalho
    page.drawText(`PACIENTE: ${exame.nome}`, { x: left, y, font: fontBold, size: 13, color: rgb(0,0,0) }); y -= lineHeight;
    page.drawText(`DATA: ${exame.data}`, { x: left, y, font: font, size: 12, color: rgb(0,0,0) }); y -= lineHeight;
    page.drawText(`TIPO: ${exame.tipoNome}`, { x: left, y, font: font, size: 12, color: rgb(0,0,0) }); y -= lineHeight*1.2;
    
    // Laudo
    const laudo = exame.laudo || "Laudo não disponível";
    const linhas = laudo.split('\n');
    
    linhas.forEach(linha => {
      if (y < 70) {
        y = 800;
        doc.addPage([595, 842]);
      }
      
      if (linha.startsWith("PACIENTE:") || linha.startsWith("DOPPLER") || linha.startsWith("Sistema") || linha.startsWith("CONCLUSÃO")) {
        page.drawText(linha, { x: left, y, font: fontBold, size: 12, color: rgb(0,0,0) });
      } else {
        page.drawText(linha, { x: left, y, font: font, size: 12, color: rgb(0,0,0) });
      }
      y -= lineHeight*0.95;
    });
    
    const pdfBytes = await doc.save();
    const nomeArquivo = `Laudo_${exame.nome.replace(/\s+/g,"_")}_${exame.data}.pdf`;
    saveAs(new Blob([pdfBytes], { type: "application/pdf" }), nomeArquivo);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Erro ao gerar PDF. Tente novamente.");
  }
}

export default function ExamesRealizados() {
  const navigate = useNavigate();
  const [exames] = useState(getTodosExames());
  const [exameVisualizando, setExameVisualizando] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busca, setBusca] = useState("");

  const examesFiltrados = exames.filter(exame => {
    const matchTipo = filtroTipo === "todos" || exame.tipoNome === filtroTipo;
    const matchBusca = exame.nome.toLowerCase().includes(busca.toLowerCase()) || 
                      exame.data.includes(busca) ||
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

  function handleExcluirExame(exame) {
    if (window.confirm(`Tem certeza que deseja excluir o exame de ${exame.nome}?`)) {
      excluirExame(exame);
      window.location.reload(); // Recarregar para atualizar a lista
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(120deg,#101824 0%,#1c2740 100%)",
      color: "#fff",
      fontFamily: "Segoe UI, Inter, Arial, sans-serif",
      padding: 20
    }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        marginBottom: 30,
        gap: 20
      }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: "#232f4e", 
            color: "#0eb8d0", 
            border: "2px solid #0eb8d0",
            borderRadius: 8, 
            fontSize: 16, 
            padding: "8px 16px", 
            fontWeight: 600, 
            cursor: "pointer",
            display: "flex", 
            alignItems: "center", 
            gap: 8
          }}
        >
          <FiArrowLeft size={18}/> Voltar
        </button>
        
        <h1 style={{ 
          fontSize: 28, 
          fontWeight: 800, 
          color: "#0eb8d0",
          margin: 0
        }}>
          📋 Exames Realizados ({examesFiltrados.length})
        </h1>
      </div>

      {/* Filtros */}
      <div style={{
        background: "#242d43",
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        display: "flex",
        gap: 20,
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        <div>
          <label style={{ display: "block", marginBottom: 5, fontSize: 14 }}>Buscar:</label>
          <input
            type="text"
            placeholder="Nome, data ou tipo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "none",
              fontSize: 14,
              minWidth: 200
            }}
          />
        </div>
        
        <div>
          <label style={{ display: "block", marginBottom: 5, fontSize: 14 }}>Tipo:</label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "none",
              fontSize: 14,
              minWidth: 150
            }}
          >
            <option value="todos">Todos os tipos</option>
            {tiposUnicos.map(tipo => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Exames */}
      {examesFiltrados.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: 60,
          background: "#242d43",
          borderRadius: 12,
          color: "#888"
        }}>
          {exames.length === 0 ? (
            <div>
              <h3 style={{ marginBottom: 10 }}>Nenhum exame realizado ainda</h3>
              <p>Comece criando seu primeiro exame!</p>
            </div>
          ) : (
            <div>
              <h3 style={{ marginBottom: 10 }}>Nenhum exame encontrado</h3>
              <p>Tente ajustar os filtros de busca</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          display: "grid",
          gap: 15,
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))"
        }}>
          {examesFiltrados.map((exame, index) => (
            <div key={exame.id} style={{
              background: "#242d43",
              borderRadius: 12,
              padding: 20,
              border: "1px solid #0eb8d033",
              transition: "transform 0.2s",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => e.target.style.transform = "translateY(-2px)"}
            onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 15
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ 
                    color: "#0eb8d0", 
                    margin: "0 0 8px 0",
                    fontSize: 18,
                    fontWeight: 600
                  }}>
                    {exame.nome}
                  </h3>
                  <div style={{ fontSize: 14, color: "#aaa", marginBottom: 5 }}>
                    📅 {exame.data}
                  </div>
                  <div style={{ fontSize: 14, color: "#aaa", marginBottom: 5 }}>
                    🏥 {exame.tipoNome}
                  </div>
                  {exame.lado && (
                    <div style={{ fontSize: 14, color: "#aaa" }}>
                      🦵 {exame.lado}
                    </div>
                  )}
                </div>
                
                <div style={{
                  display: "flex",
                  gap: 8,
                  flexDirection: "column"
                }}>
                  <button
                    onClick={() => setExameVisualizando(exame)}
                    style={{
                      background: "#11b581",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                    title="Visualizar"
                  >
                    <FiEye size={12} />
                  </button>
                  
                  <button
                    onClick={() => handleEditarExame(exame)}
                    style={{
                      background: "#0eb8d0",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                    title="Editar"
                  >
                    <FiEdit size={12} />
                  </button>
                  
                  <button
                    onClick={() => gerarPDFExame(exame)}
                    style={{
                      background: "#ff9500",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                    title="Imprimir"
                  >
                    <FiPrinter size={12} />
                  </button>
                  
                  <button
                    onClick={() => handleExcluirExame(exame)}
                    style={{
                      background: "#e74c3c",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                    title="Excluir"
                  >
                    <FiTrash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Visualizar Exame */}
      {exameVisualizando && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: "#242d43",
            borderRadius: 14,
            padding: "24px 28px",
            maxWidth: "90vw",
            maxHeight: "90vh",
            overflow: "auto",
            position: "relative"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              borderBottom: "2px solid #0eb8d0",
              paddingBottom: 10
            }}>
              <h3 style={{ color: "#0eb8d0", margin: 0 }}>
                Visualizando: {exameVisualizando.nome}
              </h3>
              <button
                onClick={() => setExameVisualizando(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontSize: 24,
                  cursor: "pointer",
                  padding: 5
                }}
              >
                <FiX />
              </button>
            </div>

            <div style={{
              background: "#fff",
              color: "#000",
              padding: 20,
              borderRadius: 8,
              maxHeight: 500,
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              fontFamily: "monospace",
              fontSize: 14,
              lineHeight: 1.6
            }}>
              {formatarLaudoParaVisualizacao(exameVisualizando.laudo)}
            </div>

            <div style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
              marginTop: 20
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
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Editar Exame
              </button>
              <button
                onClick={() => gerarPDFExame(exameVisualizando)}
                style={{
                  background: "#ff9500",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Imprimir PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 