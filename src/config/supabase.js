// Configuração do Supabase
import { createClient } from '@supabase/supabase-js';

// ⚠️ IMPORTANTE: Configure suas credenciais do Supabase
// 1. Acesse: https://supabase.com
// 2. Crie uma conta gratuita
// 3. Crie um novo projeto
// 4. Vá em Settings > API e copie a URL e a chave anônima

// Pegar variáveis de ambiente (ou usar valores padrão)
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "https://seu-projeto.supabase.co";
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "sua-chave-anon-aqui";

// Verificar se está configurado
const isConfigured = SUPABASE_URL.includes("supabase.co") && SUPABASE_ANON_KEY !== "sua-chave-anon-aqui";

// Criar cliente Supabase (mesmo que não configurado, para evitar erros)
let supabaseClient = null;

if (isConfigured) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase configurado e conectado!');
  } catch (error) {
    console.error('❌ Erro ao criar cliente Supabase:', error);
    console.warn('⚠️ Usando localStorage como fallback');
  }
} else {
  console.warn('⚠️ Supabase não configurado! Usando localStorage temporariamente.');
  console.warn('📝 Configure o Supabase:');
  console.warn('   1. Crie arquivo .env na raiz do projeto');
  console.warn('   2. Adicione: REACT_APP_SUPABASE_URL=suas-url');
  console.warn('   3. Adicione: REACT_APP_SUPABASE_ANON_KEY=sua-chave');
  console.warn('   4. Reinicie o servidor (npm start)');
}

export const supabase = supabaseClient;
export const supabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  isConfigured: isConfigured
};

export default supabase;