-- Perfil do laudo na conta do usuário (profissional, locais, logos e assinatura)
-- Rodar uma única vez no Supabase: SQL Editor > New query > colar > Run.
-- Pode rodar de novo sem problema (não apaga nada).
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS perfil_laudo jsonb;
