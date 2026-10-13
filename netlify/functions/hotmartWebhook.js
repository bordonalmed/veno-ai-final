// Endereço antigo do aviso da Hotmart (/.netlify/functions/hotmartWebhook).
// Mantido para quem já cadastrou esse endereço na Hotmart; usa a mesma lógica
// nova de hotmart-webhook (a versão anterior lia campos que a Hotmart não envia).
const { handlerNetlify } = require("./_shared/hotmart");

exports.handler = handlerNetlify;
