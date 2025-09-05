import React, { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import { FiSettings, FiHome, FiList, FiLogOut } from "react-icons/fi";
import { appendImagesToPdf } from "../utils/pdfImages";

// Constantes para localStorage
const STORAGE_KEY = "examesCarotidasVertebrais";

// Funções de validação
function isIdadeValida(idade) {
  if (!idade || idade.toString().trim() === "") return false;
  const idadeNum = parseInt(idade);
  return !isNaN(idadeNum) && idadeNum >= 0 && idadeNum <= 120;
}

function isDataValida(data) {
  if (!data || data.toString().trim() === "") return false;
  const dataObj = new Date(data);
  return dataObj instanceof Date && !isNaN(dataObj.getTime());
}

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
      localStorage.removeItem("exameEmEdicao");
      return exame;
    }
    return null;
  } catch (error) {
    console.error("Erro ao carregar exame em edição:", error);
    return null;
  }
}

// Opções para os campos
const statusOptions = ["pérvia", "ocluída"];
const fluxoOptions = ["sem alteração", "hipocinético", "hipercinético", "ausente"];
const ateromatoseOptions = ["ausente", "discreta", "moderada", "severa"];
const estenoseOptions = ["ausente", "presente"];
const tipoPlacaOptions = ["lipídica", "calcificada", "mista"];

// Estrutura inicial dos dados dos vasos
const initialVesselData = {
  status: "pérvia",
  fluxo: "sem alteração",
  ateromatose: "ausente",
  estenose: "ausente",
  estenosePercentual: "",
  tipoPlaca: "",
  imt: "",
  observacao: ""
};

// Função para gerar conclusão automática
function gerarConclusaoCarotidas(data) {
  const vesselNames = {
    ACD: "artéria carótida comum direita",
    ACE: "artéria carótida comum esquerda",
    ACID: "artéria carótida interna direita",
    ACIE: "artéria carótida interna esquerda",
    ACED: "artéria carótida externa direita",
    ACEE: "artéria carótida externa esquerda",
    AVD: "artéria vertebral direita",
    AVE: "artéria vertebral esquerda"
  };

  // Verifica se o vaso tem alterações (não é pérvio OU não tem fluxo sem alteração)
  const hasAlterations = (vessel) => {
    return vessel.status !== "pérvia" || vessel.fluxo !== "sem alteração";
  };

  const allVessels = [data.ACD, data.ACID, data.ACED, data.ACE, data.ACIE, data.ACEE, data.AVD, data.AVE];
  const hasAnyAlterations = allVessels.some(hasAlterations);

  // Se não há alterações, retorna a conclusão padrão
  if (!hasAnyAlterations) {
    return "Artérias carótidas e vertebrais pérvias, sem alterações hemodinâmicas.";
  }

  const getVesselDescription = (vessel, vesselKey) => {
    const vesselName = vesselNames[vesselKey];
    const descriptions = [];

    if (vessel.status === "ocluída") {
      descriptions.push(`Oclusão de ${vesselName}`);
    } else {
      if (vessel.estenose === "presente" && vessel.estenosePercentual && vessel.estenosePercentual.toString().trim() !== "") {
        let estenoseDesc = `Estenose de ${vessel.estenosePercentual}% em ${vesselName}`;
        if (vessel.tipoPlaca && vessel.tipoPlaca.trim && vessel.tipoPlaca.trim() !== "") {
          estenoseDesc += ` com placa ${vessel.tipoPlaca}`;
        }
        descriptions.push(estenoseDesc);
      }

      if (vessel.ateromatose !== "ausente" && vessel.estenose === "ausente") {
        if (vessel.ateromatose === "discreta") {
          descriptions.push(`Ateromatose discreta sem repercussão hemodinâmica`);
        } else {
          descriptions.push(`Ateromatose ${vessel.ateromatose} em ${vesselName}`);
        }
      }

      if (vessel.fluxo !== "sem alteração" && 
          vessel.ateromatose === "ausente" && 
          vessel.estenose === "ausente") {
        descriptions.push(`Fluxo ${vessel.fluxo} em ${vesselName}`);
      }
    }

    return descriptions.length > 0 ? descriptions.join(", ") + "." : null;
  };

  const vesselDescriptions = [];
  Object.entries(data).forEach(([vesselKey, vesselData]) => {
    // Só inclui vasos que têm alterações
    if (hasAlterations(vesselData)) {
      const description = getVesselDescription(vesselData, vesselKey);
      if (description) {
        vesselDescriptions.push(description);
      }
    }
  });

  // Cada alteração em uma linha separada
  return vesselDescriptions.join("\n");
} 

// Função para gerar relatório completo
function montarLaudo({ nome, idade, data, carotidasDireitas, carotidasEsquerdas, vertebrais }) {
  const vesselNames = {
    ACD: "Artéria carótida comum direita",
    ACE: "Artéria carótida comum esquerda",
    ACID: "Artéria carótida interna direita",
    ACIE: "Artéria carótida interna esquerda",
    ACED: "Artéria carótida externa direita",
    ACEE: "Artéria carótida externa esquerda",
    AVD: "Artéria vertebral direita",
    AVE: "Artéria vertebral esquerda"
  };

  const formatarVesselDescricao = (vessel, vesselKey) => {
    const vesselName = vesselNames[vesselKey];
    
    // Se a artéria está normal, retornar apenas "pérvia, fluxo sem alteração"
    if (vessel.status === "pérvia" && 
        vessel.fluxo === "sem alteração" && 
        vessel.ateromatose === "ausente" && 
        vessel.estenose === "ausente") {
      return `${vesselName}: pérvia, fluxo sem alteração.`;
    }

    // Caso contrário, incluir todos os dados relevantes
    const descricoes = [];
    descricoes.push(vessel.status);
    descricoes.push(`fluxo ${vessel.fluxo}`);
    
    if (vessel.ateromatose !== "ausente") {
      descricoes.push(`ateromatose ${vessel.ateromatose}`);
    }
    
    if (vessel.estenose === "presente" && vessel.estenosePercentual && vessel.estenosePercentual.toString().trim() !== "") {
      let estenoseDesc = `estenose ${vessel.estenosePercentual}%`;
      if (vessel.tipoPlaca && vessel.tipoPlaca.trim && vessel.tipoPlaca.trim() !== "") {
        estenoseDesc += ` com placa ${vessel.tipoPlaca}`;
      }
      descricoes.push(estenoseDesc);
    }

    // IMT (apenas para carótidas comuns)
    if ((vesselKey === "ACD" || vesselKey === "ACE") && vessel.imt) {
      descricoes.push(`IMT ${vessel.imt} mm`);
    }

    const observacao = vessel.observacao ? vessel.observacao.trim() : "";
    if (observacao) {
      return `${vesselName}: ${descricoes.join(", ")}.\nObservação: ${observacao}`;
    }

    return `${vesselName}: ${descricoes.join(", ")}.`;
  };

  let relatorio = `PACIENTE: ${nome}\n`;
  if (idade) relatorio += `IDADE: ${idade} anos\n`;
  relatorio += `DATA: ${data}\n`;
  relatorio += `DOPPLER DE CARÓTIDAS E VERTEBRAIS\n\n`;

  // Sistema Carotídeo Direito
  relatorio += `**Sistema Carotídeo Direito**\n`;
  relatorio += formatarVesselDescricao(carotidasDireitas.ACD, "ACD") + "\n";
  relatorio += formatarVesselDescricao(carotidasDireitas.ACID, "ACID") + "\n";
  relatorio += formatarVesselDescricao(carotidasDireitas.ACED, "ACED") + "\n\n";

  // Sistema Carotídeo Esquerdo
  relatorio += `**Sistema Carotídeo Esquerdo**\n`;
  relatorio += formatarVesselDescricao(carotidasEsquerdas.ACE, "ACE") + "\n";
  relatorio += formatarVesselDescricao(carotidasEsquerdas.ACIE, "ACIE") + "\n";
  relatorio += formatarVesselDescricao(carotidasEsquerdas.ACEE, "ACEE") + "\n\n";

  // Sistema Vertebral
  relatorio += `**Sistema Vertebral**\n`;
  relatorio += formatarVesselDescricao(vertebrais.AVD, "AVD") + "\n";
  relatorio += formatarVesselDescricao(vertebrais.AVE, "AVE") + "\n\n";

  // Adicionar conclusão
  relatorio += `**CONCLUSÃO:**\n`;
  relatorio += gerarConclusaoCarotidas({ ...carotidasDireitas, ...carotidasEsquerdas, ...vertebrais });

  return relatorio;
}

// Componente para um vaso individual
const VesselField = ({ vessel, vesselKey, onChange, title, showIMT = false }) => {
  return (
    <div style={{
      marginBottom: 'clamp(12px, 2.5vw, 16px)',
      padding: 'clamp(16px, 3vw, 20px)',
      background: 'transparent',
      borderRadius: 'clamp(8px, 1.5vw, 12px)',
      border: '1px solid rgba(14, 184, 208, 0.4)',
      boxShadow: '0 4px 12px rgba(0, 224, 255, 0.15), 0 2px 6px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'clamp(12px, 2.5vw, 16px)'
    }}>
      <div style={{
        fontSize: 'clamp(13px, 2.5vw, 15px)',
        fontWeight: 'bold',
        color: '#0eb8d0',
        marginBottom: 'clamp(12px, 2.5vw, 16px)',
        paddingBottom: 'clamp(8px, 1.5vw, 10px)',
        borderBottom: '2px solid rgba(14, 184, 208, 0.3)'
      }}>
        {title}
      </div>
      
      {/* Primeira linha: Status | Fluxo | Ateromatose | Estenose | IMT */}
      <div style={{
        display: 'flex',
        gap: 'clamp(12px, 2.5vw, 16px)',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.5vw, 8px)', minWidth: 'clamp(140px, 22vw, 180px)' }}>
          <label style={{
            fontSize: 'clamp(11px, 2.2vw, 13px)',
            color: '#fff',
            fontWeight: 'bold',
            minWidth: 'clamp(80px, 15vw, 100px)'
          }}>Status:</label>
          <select
            value={vessel.status}
            onChange={(e) => onChange(vesselKey, 'status', e.target.value)}
            style={{
              padding: 'clamp(8px, 1.5vw, 10px)',
              borderRadius: 'clamp(4px, 1vw, 6px)',
              fontSize: 'clamp(11px, 2.2vw, 13px)',
              background: '#ffffff',
              border: '1px solid #0eb8d0',
              color: '#222',
              minWidth: 'clamp(120px, 20vw, 150px)'
            }}
          >
            {statusOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.5vw, 8px)', minWidth: 'clamp(140px, 22vw, 180px)' }}>
          <label style={{
            fontSize: 'clamp(11px, 2.2vw, 13px)',
            color: '#fff',
            fontWeight: 'bold',
            minWidth: 'clamp(80px, 15vw, 100px)'
          }}>Fluxo:</label>
          <select
            value={vessel.fluxo}
            onChange={(e) => onChange(vesselKey, 'fluxo', e.target.value)}
            style={{
              padding: 'clamp(8px, 1.5vw, 10px)',
              borderRadius: 'clamp(4px, 1vw, 6px)',
              fontSize: 'clamp(11px, 2.2vw, 13px)',
              background: '#ffffff',
              border: '1px solid #0eb8d0',
              color: '#222',
              minWidth: 'clamp(120px, 20vw, 150px)'
            }}
          >
            {fluxoOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.5vw, 8px)', minWidth: 'clamp(140px, 22vw, 180px)' }}>
          <label style={{
            fontSize: 'clamp(11px, 2.2vw, 13px)',
            color: '#fff',
            fontWeight: 'bold',
            minWidth: 'clamp(80px, 15vw, 100px)'
          }}>Ateromatose:</label>
          <select
            value={vessel.ateromatose}
            onChange={(e) => onChange(vesselKey, 'ateromatose', e.target.value)}
            style={{
              padding: 'clamp(8px, 1.5vw, 10px)',
              borderRadius: 'clamp(4px, 1vw, 6px)',
              fontSize: 'clamp(11px, 2.2vw, 13px)',
              background: '#ffffff',
              border: '1px solid #0eb8d0',
              color: '#222',
              minWidth: 'clamp(120px, 20vw, 150px)'
            }}
          >
            {ateromatoseOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.5vw, 8px)', minWidth: 'clamp(140px, 22vw, 180px)' }}>
          <label style={{
            fontSize: 'clamp(11px, 2.2vw, 13px)',
            color: '#fff',
            fontWeight: 'bold',
            minWidth: 'clamp(80px, 15vw, 100px)'
          }}>Estenose:</label>
          <select
            value={vessel.estenose}
            onChange={(e) => onChange(vesselKey, 'estenose', e.target.value)}
            style={{
              padding: 'clamp(8px, 1.5vw, 10px)',
              borderRadius: 'clamp(4px, 1vw, 6px)',
              fontSize: 'clamp(11px, 2.2vw, 13px)',
              background: '#ffffff',
              border: '1px solid #0eb8d0',
              color: '#222',
              minWidth: 'clamp(120px, 20vw, 150px)'
            }}
          >
            {estenoseOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        {showIMT && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.5vw, 8px)', minWidth: 'clamp(140px, 22vw, 180px)' }}>
            <label style={{
              fontSize: 'clamp(11px, 2.2vw, 13px)',
              color: '#fff',
              fontWeight: 'bold',
              minWidth: 'clamp(80px, 15vw, 100px)'
            }}>IMT:</label>
            <input
              type="text"
              value={vessel.imt || ''}
              onChange={(e) => onChange(vesselKey, 'imt', e.target.value)}
              placeholder="mm"
              style={{
                padding: 'clamp(8px, 1.5vw, 10px)',
                borderRadius: 'clamp(4px, 1vw, 6px)',
                fontSize: 'clamp(11px, 2.2vw, 13px)',
                background: '#ffffff',
                border: '1px solid #0eb8d0',
                color: '#222',
                minWidth: 'clamp(120px, 20vw, 150px)'
              }}
            />
          </div>
        )}
      </div>

      {/* Campos condicionais: % Estenose e Tipo Placa (quando Estenose = "presente") */}
      {vessel.estenose === "presente" && (
        <div style={{
          display: 'flex',
          gap: 'clamp(12px, 2.5vw, 16px)',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.5vw, 8px)', minWidth: 'clamp(140px, 22vw, 180px)' }}>
            <label style={{
              fontSize: 'clamp(11px, 2.2vw, 13px)',
              color: '#fff',
              fontWeight: 'bold',
              minWidth: 'clamp(80px, 15vw, 100px)'
            }}>% Estenose:</label>
            <input
              type="number"
              value={vessel.estenosePercentual || ''}
              onChange={(e) => onChange(vesselKey, 'estenosePercentual', e.target.value)}
              placeholder="%"
              required={vessel.estenose === "presente"}
              min="0"
              max="100"
              style={{
                padding: 'clamp(8px, 1.5vw, 10px)',
                borderRadius: 'clamp(4px, 1vw, 6px)',
                fontSize: 'clamp(11px, 2.2vw, 13px)',
                background: '#ffffff',
                border: '1px solid #0eb8d0',
                color: '#222',
                minWidth: 'clamp(120px, 20vw, 150px)'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.5vw, 8px)', minWidth: 'clamp(140px, 22vw, 180px)' }}>
            <label style={{
              fontSize: 'clamp(11px, 2.2vw, 13px)',
              color: '#fff',
              fontWeight: 'bold',
              minWidth: 'clamp(80px, 15vw, 100px)'
            }}>Tipo Placa:</label>
            <select
              value={vessel.tipoPlaca || ''}
              onChange={(e) => onChange(vesselKey, 'tipoPlaca', e.target.value)}
              required={vessel.estenose === "presente"}
              style={{
                padding: 'clamp(8px, 1.5vw, 10px)',
                borderRadius: 'clamp(4px, 1vw, 6px)',
                fontSize: 'clamp(11px, 2.2vw, 13px)',
                background: '#ffffff',
                border: '1px solid #0eb8d0',
                color: '#222',
                minWidth: 'clamp(120px, 20vw, 150px)'
              }}
            >
              <option value="">Selecione...</option>
              {tipoPlacaOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Terceira linha: Observação */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.5vw, 8px)', width: '100%' }}>
        <label style={{
          fontSize: 'clamp(11px, 2.2vw, 13px)',
          color: '#fff',
          fontWeight: 'bold'
        }}>Observação:</label>
        <input
          type="text"
          value={vessel.observacao || ''}
          onChange={(e) => onChange(vesselKey, 'observacao', e.target.value)}
          placeholder="Anotações livres..."
          style={{
            padding: 'clamp(8px, 1.5vw, 10px)',
            borderRadius: 'clamp(4px, 1vw, 6px)',
            fontSize: 'clamp(11px, 2.2vw, 13px)',
            background: '#ffffff',
            border: '1px solid #0eb8d0',
            color: '#222',
            width: '100%'
          }}
        />
      </div>
    </div>
  );
};

function CarotidasVertebrais() {
  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [data, setData] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [laudoTexto, setLaudoTexto] = useState("");
  const [erro, setErro] = useState("");
  const [formReady, setFormReady] = useState(false); // Flag para controlar a visibilidade dos campos
  const [anexos, setAnexos] = useState([]);

  const [carotidasDireitas, setCarotidasDireitas] = useState({
    ACD: { ...initialVesselData },
    ACID: { ...initialVesselData },
    ACED: { ...initialVesselData }
  });

  const [carotidasEsquerdas, setCarotidasEsquerdas] = useState({
    ACE: { ...initialVesselData },
    ACIE: { ...initialVesselData },
    ACEE: { ...initialVesselData }
  });

  const [vertebrais, setVertebrais] = useState({
    AVD: { ...initialVesselData },
    AVE: { ...initialVesselData }
  });

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
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
      
      if (exameEmEdicao.carotidasDireitas) setCarotidasDireitas(exameEmEdicao.carotidasDireitas);
      if (exameEmEdicao.carotidasEsquerdas) setCarotidasEsquerdas(exameEmEdicao.carotidasEsquerdas);
      if (exameEmEdicao.vertebrais) setVertebrais(exameEmEdicao.vertebrais);
      
      if (exameEmEdicao.laudo) {
        setLaudoTexto(exameEmEdicao.laudo);
      }
    }
  }, []);

  useEffect(() => {
    // Define formReady como true quando nome, idade e data são preenchidos
    setFormReady(nome && idade && data);
  }, [nome, idade, data]);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "nome") setNome(value);
    else if (name === "idade") setIdade(value);
    else if (name === "data") setData(value);
  }

  function handleVisualizar() {
    setErro("");
    if (!nome || !data) {
      setErro("Preencha nome e data antes de visualizar o laudo!");
      return;
    }
    
            // Validar campos obrigatórios quando estenose é "presente"
    const todosVasos = { ...carotidasDireitas, ...carotidasEsquerdas, ...vertebrais };
    for (const [vesselKey, vessel] of Object.entries(todosVasos)) {
      if (vessel.estenose === "presente") {
        if (!vessel.estenosePercentual || !vessel.estenosePercentual.toString || vessel.estenosePercentual.toString().trim() === "") {
          setErro(`Campo "% Estenose" é obrigatório para ${vesselKey} quando estenose é presente (primeira validação)!`);
          return;
        }
        if (!vessel.tipoPlaca || !vessel.tipoPlaca.trim || vessel.tipoPlaca.trim() === "") {
          setErro(`Campo "Tipo Placa" é obrigatório para ${vesselKey} quando estenose é presente (primeira validação)!`);
          return;
        }
        // Validar se a porcentagem está entre 0 e 100
        const percentual = parseFloat(vessel.estenosePercentual);
        if (isNaN(percentual) || percentual < 0 || percentual > 100) {
          setErro(`Campo "% Estenose" deve ser um número entre 0 e 100 para ${vesselKey} (primeira função)!`);
          return;
        }
      }
    }
    
    const laudo = montarLaudo({ nome, idade, data, carotidasDireitas, carotidasEsquerdas, vertebrais });
    setLaudoTexto(laudo);
  }

  function handleSalvarExame() {
    setErro("");
    if (!nome || !data) {
      setErro("Preencha nome e data antes de salvar o exame!");
      return;
    }
    
    // Validar campos obrigatórios quando estenose é "presente"
    const todosVasos = { ...carotidasDireitas, ...carotidasEsquerdas, ...vertebrais };
    for (const [vesselKey, vessel] of Object.entries(todosVasos)) {
      if (vessel.estenose === "presente") {
        if (!vessel.estenosePercentual || !vessel.estenosePercentual.toString || vessel.estenosePercentual.toString().trim() === "") {
          setErro(`Campo "% Estenose" é obrigatório para ${vesselKey} quando estenose é presente (segunda validação)!`);
          return;
        }
        if (!vessel.tipoPlaca || !vessel.tipoPlaca.trim || vessel.tipoPlaca.trim() === "") {
          setErro(`Campo "Tipo Placa" é obrigatório para ${vesselKey} quando estenose é presente (segunda validação)!`);
          return;
        }
        // Validar se a porcentagem está entre 0 e 100
        const percentual = parseFloat(vessel.estenosePercentual);
        if (isNaN(percentual) || percentual < 0 || percentual > 100) {
          setErro(`Campo "% Estenose" deve ser um número entre 0 e 100 para ${vesselKey} (segunda função)!`);
          return;
        }
      }
    }
    
    let laudo = laudoTexto;
    if (!laudo) {
      laudo = montarLaudo({ nome, idade, data, carotidasDireitas, carotidasEsquerdas, vertebrais });
    }
    
    const dadosExame = {
      nome,
      idade,
      data,
      carotidasDireitas,
      carotidasEsquerdas,
      vertebrais,
      laudo,
      tipoNome: "Carótidas e Vertebrais"
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

      {/* Título do Exame */}
      <h1 style={{
        fontSize: "clamp(18px, 3vw, 24px)",
        fontWeight: "600",
        color: "#0eb8d0",
        textAlign: "center",
        margin: "0 0 clamp(12px, 2vw, 16px) 0",
        textShadow: "0 2px 8px #00e0ff40",
        letterSpacing: "0.5px"
      }}>
        Carótidas e Vertebrais
      </h1>

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
      </div>
      <div style={{ color: "#ff6565", marginTop: 12, fontWeight: 600 }}>{erro && erro}</div>
      
      {/* Segunda linha: botões centralizados */}
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
            background: formReady ? '#0eb8d0' : '#666', 
            color: '#fff', 
            minWidth: 'clamp(140px, 25vw, 160px)', 
            fontSize: 'clamp(12px, 2.5vw, 14px)', 
            padding: "clamp(6px, 2vw, 8px) clamp(12px, 3vw, 16px)",
            cursor: formReady ? 'pointer' : 'not-allowed',
            opacity: formReady ? 1 : 0.6
          }}
          onClick={handleVisualizar}
          disabled={!formReady}
        >Visualizar Laudo</button>
        <button
          style={{ 
            ...buttonStyle, 
            background: formReady ? '#28a745' : '#666', 
            color: '#fff', 
            minWidth: 'clamp(140px, 25vw, 160px)', 
            fontSize: 'clamp(12px, 2.5vw, 14px)', 
            padding: "clamp(6px, 2vw, 8px) clamp(12px, 3vw, 16px)",
            cursor: formReady ? 'pointer' : 'not-allowed',
            opacity: formReady ? 1 : 0.6
          }}
          onClick={handleSalvarExame}
          disabled={!formReady}
        >Salvar Exame</button>
      </div>
      
      {/* Campos do exame - só aparecem após preencher dados básicos */}
      {formReady && (
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
            flexDirection: 'column',
            gap: 'clamp(12px, 2vw, 20px)'
          }}>
            {/* Sistema Carotídeo Direito */}
            <div style={{
              marginBottom: 'clamp(16px, 3vw, 20px)',
              padding: 'clamp(16px, 3vw, 20px) clamp(18px, 4vw, 24px)',
              background: 'transparent',
              borderRadius: 'clamp(8px, 1.5vw, 12px)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(14, 184, 208, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(12px, 2.5vw, 16px)'
            }}>
              <div style={{
                marginTop: 'clamp(8px, 1.5vw, 10px)',
                marginBottom: 'clamp(8px, 1.5vw, 10px)',
                fontSize: 'clamp(14px, 2.8vw, 16px)',
                fontWeight: 'bold',
                color: '#0eb8d0',
                paddingBottom: 'clamp(6px, 1.5vw, 8px)',
                borderBottom: '2px solid #0eb8d0'
              }}>
                SISTEMA CAROTÍDEO DIREITO
              </div>
              <VesselField 
                vessel={carotidasDireitas.ACD}
                vesselKey="ACD"
                onChange={(key, field, value) => setCarotidasDireitas(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))}
                title="Artéria carótida comum direita"
                showIMT={true}
              />
              <VesselField 
                vessel={carotidasDireitas.ACID}
                vesselKey="ACID"
                onChange={(key, field, value) => setCarotidasDireitas(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))}
                title="Artéria carótida interna direita"
                showIMT={false}
              />
              <VesselField 
                vessel={carotidasDireitas.ACED}
                vesselKey="ACED"
                onChange={(key, field, value) => setCarotidasDireitas(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))}
                title="Artéria carótida externa direita"
                showIMT={false}
              />
            </div>

            {/* Sistema Carotídeo Esquerdo */}
            <div style={{
              marginBottom: 'clamp(16px, 3vw, 20px)',
              padding: 'clamp(16px, 3vw, 20px) clamp(18px, 4vw, 24px)',
              background: 'transparent',
              borderRadius: 'clamp(8px, 1.5vw, 12px)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(14, 184, 208, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(12px, 2.5vw, 16px)'
            }}>
              <div style={{
                marginTop: 'clamp(8px, 1.5vw, 10px)',
                marginBottom: 'clamp(8px, 1.5vw, 10px)',
                fontSize: 'clamp(14px, 2.8vw, 16px)',
                fontWeight: 'bold',
                color: '#0eb8d0',
                paddingBottom: 'clamp(6px, 1.5vw, 8px)',
                borderBottom: '2px solid #0eb8d0'
              }}>
                SISTEMA CAROTÍDEO ESQUERDO
              </div>
              <VesselField 
                vessel={carotidasEsquerdas.ACE}
                vesselKey="ACE"
                onChange={(key, field, value) => setCarotidasEsquerdas(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))}
                title="Artéria carótida comum esquerda"
                showIMT={true}
              />
              <VesselField 
                vessel={carotidasEsquerdas.ACIE}
                vesselKey="ACIE"
                onChange={(key, field, value) => setCarotidasEsquerdas(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))}
                title="Artéria carótida interna esquerda"
                showIMT={false}
              />
              <VesselField 
                vessel={carotidasEsquerdas.ACEE}
                vesselKey="ACEE"
                onChange={(key, field, value) => setCarotidasEsquerdas(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))}
                title="Artéria carótida externa esquerda"
                showIMT={false}
              />
            </div>

            {/* Sistema Vertebral */}
            <div style={{
              marginBottom: 'clamp(16px, 3vw, 20px)',
              padding: 'clamp(16px, 3vw, 20px) clamp(18px, 4vw, 24px)',
              background: 'transparent',
              borderRadius: 'clamp(8px, 1.5vw, 12px)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(14, 184, 208, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(12px, 2.5vw, 16px)'
            }}>
              <div style={{
                marginTop: 'clamp(8px, 1.5vw, 10px)',
                marginBottom: 'clamp(8px, 1.5vw, 10px)',
                fontSize: 'clamp(14px, 2.8vw, 16px)',
                fontWeight: 'bold',
                color: '#0eb8d0',
                paddingBottom: 'clamp(6px, 1.5vw, 8px)',
                borderBottom: '2px solid #0eb8d0'
              }}>
                SISTEMA VERTEBRAL
              </div>
              <VesselField 
                vessel={vertebrais.AVD}
                vesselKey="AVD"
                onChange={(key, field, value) => setVertebrais(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))}
                title="Artéria vertebral direita"
                showIMT={false}
              />
              <VesselField 
                vessel={vertebrais.AVE}
                vesselKey="AVE"
                onChange={(key, field, value) => setVertebrais(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))}
                title="Artéria vertebral esquerda"
                showIMT={false}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Laudo - sempre visível quando existe */}
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

              function addCabecalho(y) {
                let yLogo = 14;
                if (logoClinica) {
                  try {
                    doc.addImage(logoClinica, 'PNG', 95, yLogo, 20, 20);
                  } catch (e) {}
                }
                doc.setFontSize(9);
                let cabecalho = [];
                if (nomeClinica) cabecalho.push(nomeClinica);
                if (enderecoClinica) cabecalho.push(enderecoClinica);
                if (telefoneClinica) cabecalho.push("Tel: " + telefoneClinica);
                if (emailClinica) cabecalho.push(emailClinica);
                cabecalho.forEach((txt, idx) => {
                  doc.setFont(undefined, "bold");
                  doc.text(txt, 200, yLogo + 5 + idx * 5, { align: "right" });
                });
                doc.setFont(undefined, "normal");
                doc.setFontSize(11);
                return yLogo + 22;
              }

              function addRodape() {
                const yRodape = 280;
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

              let y = addCabecalho(12);
              const linhas = laudoTexto.split("\n");
              let inConclusao = false;
              
              for (let i = 0; i < linhas.length; i++) {
                let line = linhas[i];
                if (line.startsWith("PACIENTE:") || line.startsWith("DOPPLER DE CARÓTIDAS")) {
                  doc.setFont(undefined, "bold");
                  doc.text(line, 15, y);
                  doc.setFont(undefined, "normal");
                } else if (line.startsWith("**") && line.endsWith("**")) {
                  doc.setFont(undefined, "bold");
                  doc.text(line.replace(/\*\*/g, ""), 15, y);
                  doc.setFont(undefined, "normal");
                } else if (line.startsWith("**CONCLUSÃO:**")) {
                  doc.setFont(undefined, "bold");
                  doc.text("CONCLUSÃO:", 15, y);
                  doc.setFont(undefined, "normal");
                  inConclusao = true;
                } else if (inConclusao && line && line.trim() !== "" && !line.startsWith("**")) {
                  doc.setFont(undefined, "bold");
                  doc.text(line, 15, y);
                  doc.setFont(undefined, "normal");
                } else {
                  doc.setFont(undefined, "normal");
                  doc.text(line, 15, y);
                  if (inConclusao && line && line.trim() === "") inConclusao = false;
                }
                y += 8;
                if (y > 265) {
                  addRodape();
                  doc.addPage();
                  y = addCabecalho(12);
                }
              }
              addRodape();
              // Adicionar anexos como páginas no final do PDF
              appendImagesToPdf(doc, anexos);
              
              doc.save(`Laudo_${nome}_${data}.pdf`);
              
              setNome("");
              setIdade("");
              setData("");
              setCarotidasDireitas({
                ACD: { ...initialVesselData },
                ACID: { ...initialVesselData },
                ACED: { ...initialVesselData }
              });
              setCarotidasEsquerdas({
                ACE: { ...initialVesselData },
                ACIE: { ...initialVesselData },
                ACEE: { ...initialVesselData }
              });
              setVertebrais({
                AVD: { ...initialVesselData },
                AVE: { ...initialVesselData }
              });
              setLaudoTexto("");
              setErro("");
              setAnexos([]);
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

export default CarotidasVertebrais; 