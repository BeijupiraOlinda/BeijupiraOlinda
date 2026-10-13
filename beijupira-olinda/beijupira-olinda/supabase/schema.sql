-- ===========================================================================
-- BEIJUPIRÁ OLINDA — OPERAÇÃO DO SALÃO
-- Schema do banco (Postgres / Supabase)
--
-- COMO RODAR
--   Painel do Supabase → SQL Editor → New query → cole tudo → Run.
--   O script é idempotente: pode rodar de novo sem quebrar nada.
--
-- MODELO DE DADOS
--   Um registro por UNIDADE + DATA + TURNO. O preenchimento inteiro do
--   formulário vai no campo `conteudo` (jsonb), no mesmo formato plano que
--   o app usa no localStorage:
--     {"est0":"C","est1":"NC","est1_n":"Trocar lâmpada",
--      "est1_r":"João","est1_p":"2026-10-14","la":"SIM"}
--
--   Sufixos das chaves de um item marcado como NC:
--     _n  ação corretiva   _r  responsável   _p  prazo (date)
--
--   Por que jsonb e não uma coluna por item: os checklists mudam com a
--   operação. Assim dá para incluir/remover item em assets/js/data.js sem
--   migração de banco. As consultas de relatório ficam no fim do arquivo.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. TABELA
-- ---------------------------------------------------------------------------
create table if not exists public.registros_salao (
  id            uuid        primary key default gen_random_uuid(),

  unidade       text        not null,            -- "Olinda", "Noronha"…
  data          date        not null,            -- dia da operação
  turno         text        not null default '', -- "Almoço", "Jantar" ou vazio

  conteudo      jsonb       not null default '{}'::jsonb,  -- formulário inteiro

  -- Carimbo enviado pelo APP (não pelo banco). É o que decide quem vence
  -- quando dois aparelhos editam o mesmo registro: a última escrita ganha.
  atualizado_em timestamptz not null default now(),
  criado_em     timestamptz not null default now()
);

comment on table  public.registros_salao          is 'Registro diário de operação do salão (abertura, briefing, liberação, limpeza, fotos).';
comment on column public.registros_salao.conteudo is 'Formulário completo em pares chave→valor. Chaves definidas em assets/js/data.js.';
comment on column public.registros_salao.atualizado_em is 'Carimbo do cliente. Usado na estratégia "última escrita vence".';


-- ---------------------------------------------------------------------------
-- 2. ÍNDICES
--   O índice único é OBRIGATÓRIO: é ele que o upsert usa como onConflict.
-- ---------------------------------------------------------------------------
create unique index if not exists registros_salao_chave_idx
  on public.registros_salao (unidade, data, turno);

create index if not exists registros_salao_data_idx
  on public.registros_salao (data desc);


-- ---------------------------------------------------------------------------
-- 3. SEGURANÇA (RLS)
--   O app roda sem login e usa a chave `anon`, que é pública. Sem RLS,
--   qualquer pessoa com a URL do site leria e escreveria tudo.
--
--   Escolha UM dos dois cenários abaixo.
-- ---------------------------------------------------------------------------
alter table public.registros_salao enable row level security;

-- Limpa políticas antigas para o script poder rodar de novo
drop policy if exists "anon_select" on public.registros_salao;
drop policy if exists "anon_insert" on public.registros_salao;
drop policy if exists "anon_update" on public.registros_salao;
drop policy if exists "auth_tudo"   on public.registros_salao;

-- ---- CENÁRIO A (padrão): app aberto, sem login -----------------------------
-- Qualquer um com o endereço do site pode ler e gravar o checklist.
-- Aceitável para um link interno, não divulgado, com dado operacional.
-- Note que DELETE continua bloqueado (não existe política de delete):
-- nada pode ser apagado pelo navegador.
create policy "anon_select" on public.registros_salao
  for select to anon using (true);

create policy "anon_insert" on public.registros_salao
  for insert to anon with check (true);

create policy "anon_update" on public.registros_salao
  for update to anon using (true) with check (true);

-- ---- CENÁRIO B (recomendado se o link circular fora da equipe) -------------
-- Exige login (Supabase Auth). Para usar: comente as três políticas "anon_*"
-- acima, descomente a política abaixo e habilite o login no app.
--
-- create policy "auth_tudo" on public.registros_salao
--   for all to authenticated using (true) with check (true);


-- ---------------------------------------------------------------------------
-- 4. CONSULTAS ÚTEIS (relatórios)
--   Rode no SQL Editor quando precisar olhar o histórico.
-- ---------------------------------------------------------------------------

-- 4.1 Últimos 30 registros, com % de conformidade do checklist de abertura
-- select unidade, data, turno,
--        conteudo->>'ger'  as gerente,
--        conteudo->>'la'   as abertura_autorizada,
--        conteudo->>'lh'   as hora_liberacao,
--        (select count(*) from jsonb_each_text(conteudo) e
--          where e.key ~ '^(est|mon|ate)[0-9]+$' and e.value = 'C')  as conformes,
--        (select count(*) from jsonb_each_text(conteudo) e
--          where e.key ~ '^(est|mon|ate)[0-9]+$' and e.value = 'NC') as nao_conformes
--   from public.registros_salao
--  order by data desc, turno
--  limit 30;

-- 4.2 Todas as não conformidades com a tratativa (ação, responsável, prazo)
-- select r.unidade, r.data, r.turno,
--        e.key                              as item,
--        r.conteudo->>(e.key || '_n')       as acao_corretiva,
--        r.conteudo->>(e.key || '_r')       as responsavel,
--        (r.conteudo->>(e.key || '_p'))::date as prazo
--   from public.registros_salao r, jsonb_each_text(r.conteudo) e
--  where e.value = 'NC'
--  order by r.data desc;

-- 4.2b NCs vencidas ou sem tratativa — a fila de cobrança do gestor
-- select r.unidade, r.data, e.key as item,
--        r.conteudo->>(e.key || '_r')       as responsavel,
--        (r.conteudo->>(e.key || '_p'))::date as prazo
--   from public.registros_salao r, jsonb_each_text(r.conteudo) e
--  where e.value = 'NC'
--    and ( coalesce(r.conteudo->>(e.key || '_n'), '') = ''
--       or coalesce(r.conteudo->>(e.key || '_p'), '9999-12-31')::date < current_date )
--  order by prazo nulls first, r.data desc;

-- 4.3 Dias em que a abertura foi autorizada com NC em aberto (auditoria)
-- select unidade, data, turno
--   from public.registros_salao r
--  where conteudo->>'la' = 'SIM'
--    and exists (select 1 from jsonb_each_text(r.conteudo) e where e.value = 'NC')
--  order by data desc;
