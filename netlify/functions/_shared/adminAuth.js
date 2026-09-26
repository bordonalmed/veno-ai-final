// Protege endpoints administrativos (que usam a Supabase Service Role Key)
// exigindo um segredo compartilhado, configurado em ADMIN_SECRET_KEY no Netlify.
const crypto = require('crypto');

function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

// Retorna null se autorizado, ou uma resposta HTTP pronta para devolver se não estiver.
function requireAdminKey(event) {
  const expected = process.env.ADMIN_SECRET_KEY;

  if (!expected) {
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        success: false,
        error: 'ADMIN_SECRET_KEY não configurada no servidor. Defina essa variável de ambiente no Netlify antes de usar este endpoint administrativo.'
      })
    };
  }

  const headers = event.headers || {};
  const provided = headers['x-admin-key'] || headers['X-Admin-Key'];

  if (!provided || !timingSafeEqualStr(provided, expected)) {
    return {
      statusCode: 401,
      headers: JSON_HEADERS,
      body: JSON.stringify({ success: false, error: 'Não autorizado' })
    };
  }

  return null;
}

module.exports = { requireAdminKey, timingSafeEqualStr };
