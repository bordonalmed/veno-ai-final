-- ============================================================
-- VENO.AI — Planos (Premium e teste gratuito) protegidos na conta
-- Rodar UMA vez no Supabase: SQL Editor > New query > colar > Run.
-- Pode rodar de novo sem problema. NÃO apaga nada e NÃO tira o
-- Premium de ninguém.
-- ============================================================

-- 1) Colunas do teste gratuito (começa no primeiro laudo)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trial_comeco timestamptz;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trial_laudos jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) O próprio usuário não consegue mais se dar Premium nem zerar o teste.
--    Só o painel do Supabase (você) e o servidor podem mudar essas colunas.
CREATE OR REPLACE FUNCTION public.proteger_plano_usuario()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.premium := false;
      NEW.plano := 'trial';
      NEW.trial_comeco := NULL;
      NEW.trial_laudos := '[]'::jsonb;
    ELSE
      NEW.premium := OLD.premium;
      NEW.plano := OLD.plano;
      NEW.trial_comeco := OLD.trial_comeco;
      NEW.trial_laudos := OLD.trial_laudos;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS proteger_plano_usuario ON public.users;
CREATE TRIGGER proteger_plano_usuario
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.proteger_plano_usuario();

-- 3) Registro de cada laudo do teste (chamado pelo app ao salvar/gerar PDF).
--    Premium: sempre libera. Teste: 7 dias ou 5 laudos a partir do 1º laudo;
--    o mesmo paciente/exame/data não conta duas vezes.
CREATE OR REPLACE FUNCTION public.registrar_laudo_teste(chave text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  u public.users%ROWTYPE;
  laudos jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('permitido', false, 'motivo', 'sem_login');
  END IF;

  SELECT * INTO u FROM public.users WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.users (id, email)
      SELECT a.id, a.email FROM auth.users a WHERE a.id = auth.uid()
      ON CONFLICT (id) DO NOTHING;
    SELECT * INTO u FROM public.users WHERE id = auth.uid() FOR UPDATE;
  END IF;

  IF COALESCE(u.premium, false) OR u.plano = 'premium' THEN
    RETURN jsonb_build_object('premium', true, 'permitido', true);
  END IF;

  IF u.trial_comeco IS NULL THEN
    u.trial_comeco := now();
    UPDATE public.users SET trial_comeco = u.trial_comeco WHERE id = u.id;
  END IF;
  laudos := COALESCE(u.trial_laudos, '[]'::jsonb);

  IF now() - u.trial_comeco >= interval '7 days' THEN
    RETURN jsonb_build_object('premium', false, 'permitido', false, 'motivo', 'tempo',
                              'trial_comeco', u.trial_comeco, 'trial_laudos', laudos);
  END IF;

  IF NOT (laudos ? chave) THEN
    IF jsonb_array_length(laudos) >= 5 THEN
      RETURN jsonb_build_object('premium', false, 'permitido', false, 'motivo', 'laudos',
                                'trial_comeco', u.trial_comeco, 'trial_laudos', laudos);
    END IF;
    laudos := laudos || to_jsonb(chave);
    UPDATE public.users SET trial_laudos = laudos WHERE id = u.id;
  END IF;

  RETURN jsonb_build_object('premium', false, 'permitido', true,
                            'trial_comeco', u.trial_comeco, 'trial_laudos', laudos);
END $$;

REVOKE ALL ON FUNCTION public.registrar_laudo_teste(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_laudo_teste(text) TO authenticated;

-- 4) Garante o Premium das contas do Dr. Gabriel (estavam numa lista do
--    servidor antigo, que não funciona mais).
UPDATE public.users SET premium = true, plano = 'premium'
WHERE lower(email) IN ('vasculargabriel@gmail.com', 'bordonalmed@yahoo.com.br');

-- 5) Conferência: lista quem é Premium hoje (nada é alterado aqui).
SELECT email, plano, premium
FROM public.users
WHERE premium = true OR plano = 'premium'
ORDER BY email;
