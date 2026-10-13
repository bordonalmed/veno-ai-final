// Aviso de compras da Hotmart → Premium automático.
// Endereço: https://venoai.xyz/.netlify/functions/hotmart-webhook
// (abrir no navegador mostra se as chaves estão configuradas)
const { handlerNetlify } = require("./_shared/hotmart");

exports.handler = handlerNetlify;
