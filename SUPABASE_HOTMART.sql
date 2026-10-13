-- ============================================================
-- VENO.AI — Etapa 2: Premium automático pela Hotmart
-- Rodar UMA vez no Supabase: SQL Editor > New query > colar > Run.
-- Pode rodar de novo sem problema. NÃO apaga nada e NÃO tira o
-- Premium de ninguém (só uma compra da Hotmart muda o plano daquele e-mail).
-- ============================================================

-- Colunas (as do teste já existem se você rodou a etapa 1; aqui não duplica)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trial_comeco timestamptz;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trial_laudos jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS premium_ate timestamptz;   -- assinatura cancelada: Premium até o fim do período pago
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS premium_origem text;       -- 'hotmart' quando veio do aviso da Hotmart

-- Compras recebidas da Hotmart (também de quem ainda não criou a conta)
CREATE TABLE IF NOT EXISTS public.compras_hotmart (
  email text PRIMARY KEY,
  ativo boolean NOT NULL DEFAULT false,
  premium_ate timestamptz,
  ultimo_evento text,
  ultimo_evento_em timestamptz,
  transacao text,
  historico jsonb NOT NULL DEFAULT '[]'::jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.compras_hotmart ENABLE ROW LEVEL SECURITY;  -- sem acesso pelo app; só o servidor
REVOKE ALL ON public.compras_hotmart FROM anon, authenticated;

-- O próprio usuário não muda plano, Premium nem teste (só o servidor / painel)
CREATE OR REPLACE FUNCTION public.proteger_plano_usuario()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.premium := false;
      NEW.plano := 'trial';
      NEW.trial_comeco := NULL;
      NEW.trial_laudos := '[]'::jsonb;
      NEW.premium_ate := NULL;
      NEW.premium_origem := NULL;
    ELSE
      NEW.premium := OLD.premium;
      NEW.plano := OLD.plano;
      NEW.trial_comeco := OLD.trial_comeco;
      NEW.trial_laudos := OLD.trial_laudos;
      NEW.premium_ate := OLD.premium_ate;
      NEW.premium_origem := OLD.premium_origem;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS proteger_plano_usuario ON public.users;
CREATE TRIGGER proteger_plano_usuario
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.proteger_plano_usuario();

-- Premium vale agora? (respeita o fim do período depois de cancelar)
CREATE OR REPLACE FUNCTION public.premium_valido(u public.users)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT (COALESCE(u.premium, false) OR u.plano = 'premium')
     AND (u.premium_ate IS NULL OR u.premium_ate > now());
$$;

-- ------------------------------------------------------------
-- Aviso da Hotmart (chamado só pelo servidor, com a chave secreta)
-- p_acao: 'ativar' | 'revogar' | 'cancelar' | 'registrar'
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_evento_hotmart(
  p_email text, p_evento text, p_acao text, p_premium_ate timestamptz,
  p_quando timestamptz, p_transacao text, p_dados jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e text := lower(trim(COALESCE(p_email, '')));
  c public.compras_hotmart%ROWTYPE;
  quando timestamptz := COALESCE(p_quando, now());
  ate timestamptz := GREATEST(COALESCE(p_premium_ate, now()), now());
  aplicado boolean := true;
  motivo text := NULL;
  contas int := 0;
BEGIN
  IF e = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'sem_email');
  END IF;

  INSERT INTO public.compras_hotmart (email) VALUES (e) ON CONFLICT (email) DO NOTHING;
  SELECT * INTO c FROM public.compras_hotmart WHERE email = e FOR UPDATE;

  IF p_acao NOT IN ('ativar', 'revogar', 'cancelar') THEN
    aplicado := false; motivo := 'so_registro';
  ELSIF c.ultimo_evento_em IS NOT NULL AND quando < c.ultimo_evento_em THEN
    aplicado := false; motivo := 'evento_antigo';      -- chegou atrasado
  ELSIF p_evento = 'PURCHASE_CANCELED' AND c.ativo AND c.transacao IS NOT NULL
        AND p_transacao IS DISTINCT FROM c.transacao THEN
    aplicado := false; motivo := 'outra_compra';       -- cancelou outra tentativa, não a assinatura ativa
  END IF;

  IF aplicado THEN
    IF p_acao = 'ativar' THEN
      c.ativo := true; c.premium_ate := NULL; c.transacao := COALESCE(p_transacao, c.transacao);
    ELSIF p_acao = 'revogar' THEN
      c.ativo := false; c.premium_ate := NULL;
    ELSE -- cancelar: continua até o fim do período pago
      c.premium_ate := ate;
    END IF;
    c.ultimo_evento := p_evento;
    c.ultimo_evento_em := quando;
  END IF;

  c.historico := jsonb_build_array(jsonb_build_object(
      'evento', p_evento, 'acao', p_acao, 'em', quando, 'aplicado', aplicado,
      'motivo', motivo, 'transacao', p_transacao)) || COALESCE(c.historico, '[]'::jsonb);
  c.historico := (SELECT COALESCE(jsonb_agg(x ORDER BY i), '[]'::jsonb)
                  FROM jsonb_array_elements(c.historico) WITH ORDINALITY AS t(x, i) WHERE i <= 50);

  UPDATE public.compras_hotmart
     SET ativo = c.ativo, premium_ate = c.premium_ate, ultimo_evento = c.ultimo_evento,
         ultimo_evento_em = c.ultimo_evento_em, transacao = c.transacao,
         historico = c.historico, atualizado_em = now()
   WHERE email = e;

  IF aplicado THEN
    -- quem já tem conta: cria a linha se faltar e aplica na hora
    INSERT INTO public.users (id, email)
      SELECT a.id, a.email FROM auth.users a WHERE lower(a.email) = e
      ON CONFLICT DO NOTHING;

    IF p_acao = 'ativar' THEN
      UPDATE public.users u SET premium = true, plano = 'premium', premium_ate = NULL, premium_origem = 'hotmart'
        FROM auth.users a WHERE a.id = u.id AND lower(a.email) = e;
    ELSIF p_acao = 'revogar' THEN
      UPDATE public.users u SET premium = false, plano = 'trial', premium_ate = NULL, premium_origem = 'hotmart',
             trial_comeco = COALESCE(u.trial_comeco, now() - interval '8 days')   -- reembolso não ganha teste novo
        FROM auth.users a WHERE a.id = u.id AND lower(a.email) = e;
    ELSE
      UPDATE public.users u SET premium_ate = ate, premium_origem = 'hotmart'
        FROM auth.users a WHERE a.id = u.id AND lower(a.email) = e AND (u.premium OR u.plano = 'premium');
    END IF;
    GET DIAGNOSTICS contas = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('ok', true, 'aplicado', aplicado, 'motivo', motivo, 'contas', contas);
END $$;

REVOKE ALL ON FUNCTION public.registrar_evento_hotmart(text, text, text, timestamptz, timestamptz, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_evento_hotmart(text, text, text, timestamptz, timestamptz, text, jsonb) TO service_role;

-- ------------------------------------------------------------
-- Plano do usuário logado (o app chama ao abrir / entrar)
-- Aplica compra feita antes de criar a conta e o fim do período pago.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.meu_plano()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  u public.users%ROWTYPE;
  c public.compras_hotmart%ROWTYPE;
  meu_email text;
  compra_vale boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('premium', false, 'sem_login', true);
  END IF;
  SELECT email INTO meu_email FROM auth.users WHERE id = auth.uid();

  SELECT * INTO u FROM public.users WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.users (id, email) VALUES (auth.uid(), meu_email) ON CONFLICT DO NOTHING;
    SELECT * INTO u FROM public.users WHERE id = auth.uid() FOR UPDATE;
  END IF;

  SELECT * INTO c FROM public.compras_hotmart WHERE email = lower(meu_email);
  IF FOUND AND c.ultimo_evento_em IS NOT NULL THEN
    compra_vale := c.ativo AND (c.premium_ate IS NULL OR c.premium_ate > now());
    IF compra_vale AND NOT (COALESCE(u.premium, false) AND u.premium_origem = 'hotmart'
                            AND u.premium_ate IS NOT DISTINCT FROM c.premium_ate) THEN
      UPDATE public.users SET premium = true, plano = 'premium', premium_ate = c.premium_ate, premium_origem = 'hotmart'
       WHERE id = u.id RETURNING * INTO u;
    ELSIF NOT compra_vale AND u.premium_origem = 'hotmart' AND COALESCE(u.premium, false) THEN
      UPDATE public.users SET premium = false, plano = 'trial', premium_ate = NULL WHERE id = u.id RETURNING * INTO u;
    END IF;
  END IF;

  -- acabou o período pago depois de cancelar
  IF (COALESCE(u.premium, false) OR u.plano = 'premium') AND u.premium_ate IS NOT NULL AND u.premium_ate <= now() THEN
    UPDATE public.users SET premium = false, plano = 'trial', premium_origem = COALESCE(premium_origem, 'hotmart')
     WHERE id = u.id RETURNING * INTO u;
  END IF;

  RETURN jsonb_build_object(
    'premium', public.premium_valido(u),
    'premium_ate', u.premium_ate,
    'revogado', (NOT public.premium_valido(u)) AND u.premium_origem = 'hotmart',
    'trial_comeco', u.trial_comeco,
    'trial_laudos', COALESCE(u.trial_laudos, '[]'::jsonb));
END $$;

REVOKE ALL ON FUNCTION public.meu_plano() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meu_plano() TO authenticated;

-- Teste gratuito (mesma regra da etapa 1, agora respeitando o fim do período pago)
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
      ON CONFLICT DO NOTHING;
    SELECT * INTO u FROM public.users WHERE id = auth.uid() FOR UPDATE;
  END IF;

  IF public.premium_valido(u) THEN
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

-- Conferência: quem é Premium hoje e de onde veio (nada é alterado aqui)
SELECT email, plano, premium, premium_ate, COALESCE(premium_origem, 'manual') AS origem
FROM public.users
WHERE premium = true OR plano = 'premium'
ORDER BY email;
