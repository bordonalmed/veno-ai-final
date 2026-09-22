// Lógica de laudo do MMII Venoso extraída para módulo compartilhado, para que
// tanto o formulário (MMIIVenoso.js) quanto o Mapa Interativo possam gerar o
// mesmo texto a partir do mesmo estado, sem duplicar a árvore de decisão.

export const veiasProfundas = [
  "Veia Femoral Comum",
  "Veia Femoral Superficial",
  "Veia Femoral Profunda",
  "Veia Poplítea",
  "Veias Tibiais posteriores",
  "Veias Tibiais anteriores",
  "Veias Gastrocnêmicas",
  "Veias Soleares",
];
export const veiasSuperficiais = [
  "JSF",
  "Safena Magna",
  "JSP",
  "Safena Parva",
];
export const profOptions = [
  "pérvia e competente",
  "pérvia e incompetente",
  "não compressível e sem fluxo (sugestivo de trombose)",
  "semi compressível, sugestivo de recanalização parcial",
];
export const supOptions = [
  "pérvia e competente",
  "pérvia e incompetente",
  "não compressível e sem fluxo (trombose)",
  "ausente",
];
export const perfurantesStatusOptions = [
  "pérvia e competente",
  "pérvia e incompetente",
];
export const perfurantesSegmentoOptions = [
  "cm acima do joelho",
  "cm abaixo do joelho",
  "cm acima do tornozelo",
];
export const legendaCampos = {
  "JSF": "JSF",
  "JSP": "JSP",
  "joelho": "joelho",
  "cm_acima_joelho": "cm acima do joelho",
  "cm_abaixo_joelho": "cm abaixo do joelho",
  "cm_acima_tornozelo": "cm acima do tornozelo",
  "tornozelo": "tornozelo",
};

function gerarConclusaoPorLado({ profundas, superficiais, magna, parva, perfurantes, varizes }) {
  const conclusoes = [];
  if (Object.values(profundas).some(v => v.includes("não compressível"))) {
    conclusoes.push("Trombose venosa profunda");
  }
  if (Object.values(profundas).some(v => v.includes("semi compressível"))) {
    conclusoes.push("Sinais de recanalização parcial do sistema venoso profundo");
  }
  if (Object.values(profundas).some(v => v.includes("incompetente"))) {
    conclusoes.push("Insuficiência de sistema venoso profundo");
  }
  if (superficiais["Safena Magna"] === "pérvia e incompetente") {
    const ini = magna.inicio;
    const fim = magna.fim;
    const ini_val = magna.inicio_valor;
    const fim_val = magna.fim_valor;
    const ini_fmt = ini && legendaCampos[ini] && ini_val ? `${ini_val} ${legendaCampos[ini]}` : legendaCampos[ini] || ini;
    const fim_fmt = fim && legendaCampos[fim] && fim_val ? `${fim_val} ${legendaCampos[fim]}` : legendaCampos[fim] || fim;

    if (ini && fim) {
      if ((ini_fmt && ini_fmt.includes("JSF")) && (fim_fmt && fim_fmt.includes("tornozelo"))) {
        conclusoes.push("Insuficiência total da safena magna");
      } else if ((ini_fmt && (ini_fmt.includes("joelho") || ini_fmt.includes("JSF"))) && (fim_fmt && fim_fmt.includes("tornozelo"))) {
        conclusoes.push("Insuficiência parcial da safena magna");
      } else if ((ini_fmt && ini_fmt.includes("joelho")) && (fim_fmt && fim_fmt.includes("joelho"))) {
        conclusoes.push("Insuficiência segmentar da safena magna");
      } else if ((ini_fmt && ini_fmt.includes("JSF")) && (fim_fmt && fim_fmt.includes("joelho"))) {
        conclusoes.push("Insuficiência parcial da safena magna");
      } else {
        conclusoes.push("Insuficiência da safena magna");
      }
    } else {
      conclusoes.push("Insuficiência da safena magna");
    }
  }
  if (superficiais["Safena Parva"] === "pérvia e incompetente") {
    const ini = parva.inicio;
    const fim = parva.fim;
    const ini_val = parva.inicio_valor;
    const fim_val = parva.fim_valor;
    const ini_fmt = ini && legendaCampos[ini] && ini_val ? `${ini_val} ${legendaCampos[ini]}` : legendaCampos[ini] || ini;
    const fim_fmt = fim && legendaCampos[fim] && fim_val ? `${fim_val} ${legendaCampos[fim]}` : legendaCampos[fim] || fim;

    if (ini && fim) {
      if ((ini_fmt && ini_fmt.includes("JSP")) && (fim_fmt && fim_fmt.includes("tornozelo"))) {
        conclusoes.push("Insuficiência total da safena parva");
      } else if ((ini_fmt && (ini_fmt.includes("joelho") || ini_fmt.includes("JSP"))) && (fim_fmt && fim_fmt.includes("tornozelo"))) {
        conclusoes.push("Insuficiência parcial da safena parva");
      } else if ((ini_fmt && ini_fmt.includes("joelho")) && (fim_fmt && fim_fmt.includes("joelho"))) {
        conclusoes.push("Insuficiência segmentar da safena parva");
      } else if ((ini_fmt && ini_fmt.includes("JSP")) && (fim_fmt && fim_fmt.includes("joelho"))) {
        conclusoes.push("Insuficiência parcial da safena parva");
      } else {
        conclusoes.push("Insuficiência da safena parva");
      }
    } else {
      conclusoes.push("Insuficiência da safena parva");
    }
  }
  if (superficiais["Safena Magna"] === "não compressível e sem fluxo (trombose)") {
    conclusoes.push("Tromboflebite da safena magna");
  }
  if (superficiais["Safena Parva"] === "não compressível e sem fluxo (trombose)") {
    conclusoes.push("Tromboflebite da safena parva");
  }
  if (superficiais["JSF"] === "pérvia e incompetente") {
    conclusoes.push("Incompetência da junção safeno-femoral (JSF)");
  }
  if (superficiais["JSP"] === "pérvia e incompetente") {
    conclusoes.push("Incompetência da junção safeno-poplítea (JSP)");
  }
  if (Array.isArray(perfurantes) && perfurantes.some(p => p.status === "pérvia e incompetente")) {
    const nIncompetentes = perfurantes.filter(p => p.status === "pérvia e incompetente").length;
    conclusoes.push(nIncompetentes > 1 ? "Insuficiência de veias perfurantes" : "Insuficiência de veia perfurante");
  }
  if (varizes && varizes.tipo) {
    conclusoes.push(varizes.tipo + ".");
  }
  if (!conclusoes.length) return "- Ausência de refluxo venoso nos territórios estudados.";
  return "- " + conclusoes.join("\n- ");
}

export function montarLaudo({ nome, data, lado, profundas, superficiais, magna, parva, jsfDiametro, jspDiametro, observacoes, perfurantes, varizes }) {
  const lados = lado === "Ambos" ? ["Direito", "Esquerdo"] : [lado];
  const blocos = lados.map(l => {
    let linhas = [];
    linhas.push(`PACIENTE: ${nome}`);
    linhas.push(`DATA: ${data}`);
    linhas.push(`DOPPLER VENOSO DE MEMBRO INFERIOR ${l.toUpperCase()}`);
    linhas.push("");
    linhas.push("Sistema Venoso Profundo:");
    veiasProfundas.forEach(v => {
      linhas.push(`- ${v}: ${profundas[l][v]}`);
    });
    linhas.push("");
    linhas.push("Sistema Venoso Superficial:");
    veiasSuperficiais.forEach(v => {
      let extra = "";
      if (v === "JSF" && jsfDiametro && jsfDiametro[l] && jsfDiametro[l] !== "") extra = ` (diâmetro: ${jsfDiametro[l]} mm)`;
      if (v === "JSP" && jspDiametro && jspDiametro[l] && jspDiametro[l] !== "") extra = ` (diâmetro: ${jspDiametro[l]} mm)`;
      linhas.push(`- ${v}: ${superficiais[l][v]}${extra}`);
      if (v === "Safena Magna" && superficiais[l][v] === "pérvia e incompetente") {
        if (magna[l].coxa) linhas.push(`  > Diâmetro - Coxa: ${magna[l].coxa} mm`);
        if (magna[l].perna) linhas.push(`  > Diâmetro - Perna: ${magna[l].perna} mm`);
        if (magna[l].tornozelo) linhas.push(`  > Diâmetro - Tornozelo: ${magna[l].tornozelo} mm`);
        const ini = magna[l].inicio;
        const fim = magna[l].fim;
        const ini_val = magna[l].inicio_valor;
        const fim_val = magna[l].fim_valor;
        const ini_fmt = ini && legendaCampos[ini] && ini_val ? `${ini_val} ${legendaCampos[ini]}` : legendaCampos[ini] || ini;
        const fim_fmt = fim && legendaCampos[fim] && fim_val ? `${fim_val} ${legendaCampos[fim]}` : legendaCampos[fim] || fim;
        linhas.push(`  > Segmento insuficiente: de ${ini_fmt || ''} até ${fim_fmt || ''}`);
      }
      if (v === "Safena Parva" && superficiais[l][v] === "pérvia e incompetente") {
        if (parva[l].proximal) linhas.push(`  > Diâmetro Proximal: ${parva[l].proximal} mm`);
        if (parva[l].distal) linhas.push(`  > Diâmetro Distal: ${parva[l].distal} mm`);
        const ini = parva[l].inicio;
        const fim = parva[l].fim;
        const ini_val = parva[l].inicio_valor;
        const fim_val = parva[l].fim_valor;
        const ini_fmt = ini && legendaCampos[ini] && ini_val ? `${ini_val} ${legendaCampos[ini]}` : legendaCampos[ini] || ini;
        const fim_fmt = fim && legendaCampos[fim] && fim_val ? `${fim_val} ${legendaCampos[fim]}` : legendaCampos[fim] || fim;
        linhas.push(`  > Segmento insuficiente: de ${ini_fmt || ''} até ${fim_fmt || ''}`);
      }
    });
    linhas.push("");
    linhas.push("Veias Perfurantes:");
    if (Array.isArray(perfurantes[l]) && perfurantes[l].length) {
      perfurantes[l].forEach((perf, idx) => {
        const prefixo = perfurantes[l].length > 1 ? `- Perfurante ${idx + 1}: ${perf.status}` : `- ${perf.status}`;
        let linhaPerf = prefixo;
        if (perf.segmento && perf.valor) {
          linhaPerf += ` (${perf.valor} ${perf.segmento})`;
        }
        linhas.push(linhaPerf);
      });
    } else {
      linhas.push("- Não especificado");
    }
    if (varizes && varizes[l] && varizes[l].tipo) {
      linhas.push("");
      let linhaVariz = `${varizes[l].tipo}`;
      if (varizes[l].localizacao && varizes[l].localizacao.length > 0) {
        linhaVariz += ` em ${varizes[l].localizacao.map(loc => loc.charAt(0).toUpperCase() + loc.slice(1)).join(', ')}`;
      }
      linhaVariz += ".";
      linhas.push(linhaVariz);
      linhas.push("");
    }
    linhas.push("");
    linhas.push("CONCLUSÃO:");
    linhas.push(gerarConclusaoPorLado({ profundas: profundas[l], superficiais: superficiais[l], magna: magna[l], parva: parva[l], perfurantes: perfurantes[l], varizes: varizes[l] }));
    if (observacoes && observacoes[l]) {
      linhas.push("");
      linhas.push("OBSERVAÇÕES:");
      linhas.push(observacoes[l]);
    }
    return linhas.join("\n");
  });
  return blocos.join("\n\n" + "=".repeat(80) + "\n\n");
}
