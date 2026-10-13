// Envio do laudo ao paciente: mensagem pronta (modelo editável em
// Configurações), telefone normalizado para o WhatsApp e compartilhamento
// com o PDF já anexado quando o aparelho permite (celular).
import { ehPremium, statusTeste } from "../services/planoService";
import { formatarDataDiaMesAno } from "./pdfExameSalvo";

export const CHAVE_MODELO = "modeloMensagemLaudo";
export const MODELO_PADRAO =
  "Olá, {primeiroNome}! Segue o laudo do seu exame {exame}, realizado em {data}{noLocal}.\n\n{medico}{crm}";

export const VARIAVEIS_MENSAGEM = [
  ["{paciente}", "Nome completo do paciente"],
  ["{primeiroNome}", "Primeiro nome do paciente"],
  ["{exame}", "Tipo de exame"],
  ["{data}", "Data do exame"],
  ["{clinica}", "Local do exame"],
  ["{noLocal}", "\"na\" + local (se houver)"],
  ["{medico}", "Seu nome"],
  ["{crm}", "Seu CRM"],
];

// Mesmo critério em todas as telas: Premium, ou teste gratuito ativo / ainda
// não iniciado (antes Configurações e Exames Realizados discordavam).
export function temAcessoEnvio(email = localStorage.getItem("userEmail") || "") {
  if (ehPremium(email)) return true;
  const t = statusTeste(email);
  return t.status === "ativo" || t.status === "nao_iniciado";
}

export function lerModeloMensagem() {
  try { return localStorage.getItem(CHAVE_MODELO) || MODELO_PADRAO; } catch (_) { return MODELO_PADRAO; }
}
export function salvarModeloMensagem(t) {
  try {
    if (!t || t.trim() === MODELO_PADRAO.trim()) localStorage.removeItem(CHAVE_MODELO);
    else localStorage.setItem(CHAVE_MODELO, t);
  } catch (_) {}
}

// Nomes curtos e amigáveis para a mensagem ao paciente.
const NOME_EXAME = {
  "Doppler Venoso de Membros Inferiores": "Doppler venoso de membros inferiores",
  "MMII Venoso": "Doppler venoso de membros inferiores",
  "MMII Arterial": "Doppler arterial de membros inferiores",
  "MMSS Venoso": "Doppler venoso de membros superiores",
  "MMSS Arterial": "Doppler arterial de membros superiores",
  "Carótidas e Vertebrais": "Doppler de carótidas e vertebrais",
  "Aorta e Ilíacas": "Doppler de aorta e ilíacas",
  "Fístula Arteriovenosa": "Doppler de fístula arteriovenosa",
};

export function montarMensagem(modelo, { paciente, tipoNome, data, clinica, medico, crm }) {
  const nome = String(paciente || "").trim();
  const primeiro = nome.split(/\s+/)[0] || "";
  const c = String(clinica || "").trim();
  const mapa = {
    "{paciente}": nome,
    "{primeiroNome}": primeiro ? primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase() : "",
    "{exame}": NOME_EXAME[tipoNome] || tipoNome || "",
    "{data}": formatarDataDiaMesAno(data) || "",
    "{clinica}": c,
    "{noLocal}": c ? ` na ${c}` : "",
    "{medico}": String(medico || "").trim(),
    "{crm}": crm ? ` – CRM ${String(crm).trim()}` : "",
  };
  let t = String(modelo || MODELO_PADRAO);
  Object.entries(mapa).forEach(([k, v]) => { t = t.split(k).join(v); });
  return t
    .replace(/Olá, !/g, "Olá!")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Telefone brasileiro para o WhatsApp: tira tudo que não é número, o zero
// do DDD e o código do país, e confere a quantidade de dígitos.
export function normalizarTelefone(entrada) {
  let d = String(entrada || "").replace(/\D/g, "");
  if (!d) return { ok: false, erro: "Informe o número com DDD." };
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  d = d.replace(/^0+/, "");
  if (d.length !== 10 && d.length !== 11) return { ok: false, erro: "Número inválido: use DDD + número (10 ou 11 dígitos)." };
  return { ok: true, numero: `55${d}`, nacional: d };
}

export function mascararTelefone(entrada) {
  const d = String(entrada || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "").replace(/^0+/, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || "").trim());

// O aparelho consegue compartilhar arquivo? (celular; alguns computadores)
export function podeCompartilharArquivo() {
  try {
    if (typeof navigator === "undefined" || !navigator.canShare || typeof File === "undefined") return false;
    return navigator.canShare({ files: [new File(["x"], "teste.pdf", { type: "application/pdf" })] });
  } catch (_) {
    return false;
  }
}

export async function compartilharPdf({ blob, nomeArquivo, texto, titulo }) {
  const arquivo = new File([blob], nomeArquivo, { type: "application/pdf" });
  await navigator.share({ files: [arquivo], text: texto, title: titulo });
}

export function linkWhatsApp(numero, texto) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export function linkEmail(email, assunto, corpo) {
  return `mailto:${encodeURIComponent(String(email || "").trim())}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

export function textoEnvio(envio) {
  if (!envio) return "";
  const via = { whatsapp: "WhatsApp", email: "e-mail", compartilhado: "compartilhamento" }[envio.via] || envio.via;
  const d = new Date(envio.em);
  const quando = isNaN(d) ? "" : ` em ${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  return `Enviado por ${via}${quando}`;
}
