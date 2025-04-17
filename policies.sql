-- Ativar RLS (Row Level Security) para todas as tabelas
ALTER TABLE account_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartas_um_chamado_a_edificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_carta ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_um_chamado ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA A TABELA account_user
-- Permitir que usuários autenticados vejam seus próprios dados
CREATE POLICY "Usuários podem ver seus próprios dados"
ON account_user FOR SELECT
USING (auth.uid() = user_id);

-- Permitir que usuários autenticados atualizem seus próprios dados
CREATE POLICY "Usuários podem atualizar seus próprios dados"
ON account_user FOR UPDATE
USING (auth.uid() = user_id);

-- Permitir que a API do servidor acesse todos os dados (usando service_role)
CREATE POLICY "Service role pode acessar todos os dados"
ON account_user FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- POLÍTICAS PARA A TABELA cartas_um_chamado_a_edificacao
-- Permitir que todos os usuários autenticados vejam as cartas
CREATE POLICY "Usuários autenticados podem ver cartas"
ON cartas_um_chamado_a_edificacao FOR SELECT
TO authenticated
USING (true);

-- Apenas service_role pode modificar as cartas
CREATE POLICY "Apenas service_role pode modificar cartas"
ON cartas_um_chamado_a_edificacao FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- POLÍTICAS PARA status_carta
-- Usuários podem ver seu próprio status de leitura
CREATE POLICY "Usuários podem ver seu próprio status de leitura"
ON status_carta FOR SELECT
USING (auth.uid() = account_user_id);

-- Usuários podem registrar leitura de cartas
CREATE POLICY "Usuários podem registrar leitura"
ON status_carta FOR INSERT
WITH CHECK (auth.uid() = account_user_id);

-- Service role tem acesso total
CREATE POLICY "Service role acesso total status_carta"
ON status_carta FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- POLÍTICAS PARA subscription_um_chamado
-- Usuários não autenticados podem criar inscrições
CREATE POLICY "Público pode criar inscrições"
ON subscription_um_chamado FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Usuários autenticados podem ver suas próprias inscrições
CREATE POLICY "Usuários autenticados podem ver inscrições por email"
ON subscription_um_chamado FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM account_user
    WHERE account_user.email = subscription_um_chamado.email_subscription
    AND account_user.user_id = auth.uid()
  )
);

-- Acesso de service_role para todas as operações
CREATE POLICY "Service role tem acesso total a inscrições"
ON subscription_um_chamado FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Acesso de leitura anônimo para verificar se email já está inscrito
CREATE POLICY "Verificação anônima de email"
ON subscription_um_chamado FOR SELECT
TO anon
USING (true);
