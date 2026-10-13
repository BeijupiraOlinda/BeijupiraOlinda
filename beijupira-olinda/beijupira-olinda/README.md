# Beijupirá Olinda — Operação do Salão

App de checklist operacional do salão: abertura, briefing, liberação do serviço, limpeza e roteiro de fotos. Sem build, sem framework, sem npm — é HTML, CSS e JavaScript puro. Funciona offline no aparelho e, quando configurado, sincroniza com o Supabase.

---

## 1. Estrutura dos arquivos

```
beijupira-olinda/
├── index.html                  esqueleto da página e ordem dos scripts
├── config.js                   suas chaves do Supabase  ← NÃO versionar
├── config.example.js           modelo do config.js      ← versionar
├── vercel.json                 build, headers de segurança e cache
├── scripts/
│   └── gerar-config.js         gera o config.js no deploy, via env vars
├── .gitignore
├── assets/
│   ├── css/
│   │   └── styles.css          todo o visual, em 11 blocos comentados
│   └── js/
│       ├── data.js             CONTEÚDO dos checklists (textos editáveis)
│       ├── state.js            estado + localStorage
│       ├── supabase-sync.js    sincronização opcional com a nuvem
│       ├── ui.js               renderização das telas
│       └── app.js              eventos e inicialização
├── supabase/
│   └── schema.sql              tabela, índices, RLS e consultas de relatório
└── README.md                   este arquivo
```

**Ordem de carregamento (não mude):** `config → data → state → supabase-sync → ui → app`.
Cada arquivo publica um objeto em `window` (`BJP_CONFIG`, `BJP_DATA`, `BJP_Estado`, `BJP_Sync`, `BJP_UI`). Não usei `type="module"` de propósito: assim o `index.html` também abre direto do disco, sem servidor local.

---

## 2. Rodar na sua máquina

**Opção rápida:** dê dois cliques no `index.html`. Funciona, mas só em modo local (sem Supabase — o navegador bloqueia chamadas de rede a partir de `file://` em alguns casos).

**Opção recomendada** (um servidor local, necessário para testar a sincronização):

```bash
cd beijupira-olinda
python3 -m http.server 5173
# abra http://localhost:5173
```

✅ **Checkpoint 1** — a página abre com o cabeçalho verde, as 6 abas aparecem e o selo no cabeçalho diz **"Salvo apenas neste aparelho"**. Marque um item como NC: o campo de ação corretiva deve aparecer logo abaixo. Dê F5: a marcação continua lá.

---

## 3. Ligar o Supabase

### 3.1 Criar a tabela

1. Painel do Supabase → **SQL Editor** → **New query**.
2. Cole o conteúdo de `supabase/schema.sql` e clique em **Run**.

✅ **Checkpoint 2** — em **Table Editor** aparece a tabela `registros_salao` com as colunas `unidade, data, turno, conteudo, atualizado_em, criado_em`. Em **Authentication → Policies**, a tabela mostra RLS habilitado e 3 políticas (`anon_select`, `anon_insert`, `anon_update`).

### 3.2 Preencher o config.js

Painel → **Project Settings → API**. Copie:

| Campo no painel | Vai em |
|---|---|
| Project URL | `supabaseUrl` |
| `anon` `public` | `supabaseAnonKey` |

```js
window.BJP_CONFIG = {
  sincronizacaoAtiva: true,                        // ← troque para true
  supabaseUrl: 'https://xxxxxxxx.supabase.co',
  supabaseAnonKey: 'eyJhbGciOi...',
  tabela: 'registros_salao',
  unidadePadrao: 'Olinda'
};
```

> **Nunca** use a chave `service_role` aqui. Ela ignora todas as políticas de segurança e este arquivo fica visível para qualquer pessoa que abrir o site.

### 3.3 Testar

Recarregue a página e preencha qualquer campo.

✅ **Checkpoint 3** — o selo no cabeçalho passa por *Conectando… → Salvando… → **Sincronizado · HH:MM***. No Supabase → Table Editor → `registros_salao`, aparece uma linha com a sua unidade e a data de hoje, e o `conteudo` contém o que você digitou.

✅ **Checkpoint 4** — abra a mesma URL em outro aparelho (ou aba anônima) com a mesma Unidade/Data/Turno: o preenchimento aparece lá. Se não aparecer, abra o console (F12) e procure por `[sync]` — a mensagem de erro diz se é RLS, nome de tabela ou rede.

---

## 4. Publicar

### Opção A — Supabase Storage (sem outro serviço)

1. **Storage → New bucket** → nome `salao` → marque **Public bucket**.
2. Faça upload mantendo a estrutura de pastas: `index.html`, `config.js`, `assets/css/styles.css`, `assets/js/*.js`.
   Se a interface não deixar criar pastas no upload, crie `assets`, depois `assets/css` e `assets/js`, e suba os arquivos dentro de cada uma.
3. A URL final é:
   `https://<seu-projeto>.supabase.co/storage/v1/object/public/salao/index.html`

Pontos de atenção do Storage:
- Não existe "página inicial": o endereço precisa terminar em `/index.html`.
- Os arquivos precisam subir com o tipo correto (`text/html`, `text/css`, `text/javascript`). Pelo painel isso vem do nome do arquivo — por isso não renomeie as extensões.
- Não dá para apontar domínio próprio direto para o Storage.
- Trocou um arquivo? Faça upload por cima e force o recarregamento (Ctrl+F5) — o Storage guarda cache.

### Opção B — Vercel (recomendado, e já configurado)

O `vercel.json` já está pronto: build, headers de segurança e política de cache. O Supabase continua sendo só o banco.

**Importante:** o `config.js` está no `.gitignore`, então ele **não** chega na Vercel pelo Git. Em vez de commitar a chave, o build gera o arquivo a partir das variáveis de ambiente (`scripts/gerar-config.js`).

1. Suba o repositório para o GitHub e importe o projeto na Vercel.
   Framework Preset: **Other**. Build e Output já vêm do `vercel.json`.
2. **Settings → Environment Variables**, nos três ambientes (Production, Preview, Development):

   | Nome | Valor |
   |---|---|
   | `SUPABASE_URL` | `https://xxxxxxxx.supabase.co` |
   | `SUPABASE_ANON_KEY` | a chave `anon` `public` |
   | `SUPABASE_TABELA` | `registros_salao` (opcional) |
   | `UNIDADE_PADRAO` | `Olinda` (opcional) |

3. **Deployments → Redeploy** (variável nova só vale no próximo build).

✅ **Checkpoint 5** — no log do build aparece `✔ config.js gerado — sincronização ATIVA (…)`. Se aparecer `⚠ … MODO LOCAL`, as variáveis não foram lidas: confira se estão marcadas para o ambiente Production.

✅ **Checkpoint 6** — abra a URL publicada no celular. O layout se ajusta, as abas rolam na horizontal, o selo mostra **Sincronizado** e o botão **Imprimir** gera um PDF com todas as seções abertas.

Detalhes do que o `vercel.json` faz:

- **Build:** `node scripts/gerar-config.js`, sem `npm install` e sem dependências. Se faltar variável, o build **não quebra** — publica em modo local e avisa no log.
- **Trava de segurança:** se alguém colar a `service_role` por engano no lugar da `anon`, o build **falha de propósito**, antes de publicar uma chave administrativa.
- **Headers:** CSP (scripts só da própria origem + CDN do supabase-js, conexões só para `*.supabase.co`), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (câmera/microfone/localização bloqueados) e HSTS.
- **Cache:** `assets/` por 5 minutos (correção chega no mesmo dia sem Ctrl+F5), `index.html` e `config.js` sem cache.

Se a Vercel reclamar do `outputDirectory`, deixe o campo **Output Directory** em branco nas configurações do projeto e apague essa linha do `vercel.json`.

**Domínio próprio:** Settings → Domains. Como você não tem acesso ao painel de DNS do `grupoecocharme.com.br`, quem administra o domínio precisa criar o registro que a Vercel indicar (um `CNAME` para um subdomínio, tipo `salao.grupoecocharme.com.br`). Até lá, a URL `.vercel.app` funciona normalmente.

---

## 5. Como editar os checklists

Todo o texto está em **`assets/js/data.js`**. Nenhuma outra parte do código precisa mudar.

- ✅ Mudar o texto de um item: pode, à vontade.
- ✅ Acrescentar item **no fim** de uma lista: pode.
- ⚠️ **Remover ou reordenar** itens no meio de uma lista: as respostas já salvas passam a apontar para o item errado, porque a chave de cada item vem da posição dele (`est0`, `est1`, `d0`, `d1`…). Se precisar fazer isso, avise a equipe para começar um registro novo.

---

## 6. Como os dados são guardados

Um registro por **Unidade + Data + Turno**. O formulário inteiro vai num único campo `jsonb` chamado `conteudo`, no mesmo formato plano do `localStorage`:

```json
{ "ger": "André", "est0": "C", "est1": "NC",
  "est1_n": "Trocar lâmpada — João — 18h", "la": "SIM", "lh": "18:30" }
```

Escolhi `jsonb` em vez de uma coluna por item justamente porque o checklist muda com a operação: dá para incluir item no `data.js` sem migração de banco. As consultas de relatório (conformidade por dia, lista de NCs, auditoria de liberação com pendência aberta) já estão prontas, comentadas, no fim do `supabase/schema.sql`.

**Conflito entre aparelhos:** última escrita vence. Ao abrir, o app compara o carimbo `atualizado_em` do aparelho com o da nuvem e fica com o mais recente. Para um tablet por turno isso resolve. Se um dia dois setores forem preencher o mesmo registro ao mesmo tempo, o caminho é separar por turno ou evoluir para gravação campo a campo.

**Trocar a data ou o turno não apaga o que está preenchido** (mesmo comportamento da versão anterior). Para começar do zero, use **Limpar o dia** na aba Visão geral.

---

## 7. Segurança — leia antes de divulgar o link

A chave `anon` é pública por natureza: ela vai no `config.js`, que qualquer visitante baixa. Quem protege os dados é o **RLS**, e a configuração padrão do `schema.sql` (Cenário A) é:

| Operação | Quem pode |
|---|---|
| Ler registros | qualquer pessoa com o link |
| Criar / atualizar registros | qualquer pessoa com o link |
| Apagar registros | ninguém pelo navegador |

Isso é aceitável para um link interno não divulgado, com dado operacional de rotina. **Não é aceitável** se o link circular fora da equipe ou se vocês passarem a registrar nome de cliente, dado de reserva ou qualquer informação pessoal — nesse caso vale a LGPD e o acesso tem que ser autenticado.

Para fechar o acesso: comente as políticas `anon_*` no `schema.sql`, descomente a política `auth_tudo` (Cenário B) e acrescente login via Supabase Auth. Posso implementar o login quando você quiser.

Checklist mínimo antes de divulgar:
- [ ] `config.js` nunca foi comitado — `git log --all -- config.js` tem que sair vazio
- [ ] a chave usada (no `config.js` ou nas variáveis da Vercel) é a `anon`, não a `service_role`
- [ ] RLS está **habilitado** na tabela (Table Editor mostra o cadeado)
- [ ] o deploy publicado responde com os headers de segurança: `curl -sI https://SEU-APP.vercel.app | grep -i -E 'content-security|x-frame'`

---

## 8. Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Selo fica em "Salvo apenas neste aparelho" | `sincronizacaoAtiva` ainda está `false` ou URL/chave em branco | revise o `config.js` |
| "Offline — salvo neste aparelho" | o CDN do supabase-js não carregou | teste a internet do aparelho; o app segue funcionando local |
| Erro `42501` / "row-level security" no console | políticas não foram criadas | rode de novo a seção 3 do `schema.sql` |
| Erro `42P01` / "relation does not exist" | nome da tabela diferente | confira `tabela` no `config.js` |
| Upsert falha com "no unique constraint" | faltou o índice único | rode a seção 2 do `schema.sql` |
| Arquivo baixa em vez de abrir, no Storage | content-type errado no upload | suba de novo pelo painel, sem renomear a extensão |
| Mudanças não aparecem depois de republicar | cache | Ctrl+F5 (ou Ctrl+Shift+R) |
| Na Vercel o app fica em modo local | variáveis não marcadas para Production, ou faltou redeploy | revise Environment Variables e rode Redeploy |
| Build da Vercel falha com "ABORTADO" | a chave colada é a `service_role` | troque pela chave `anon` `public` |
| Console mostra erro de CSP | algum recurso novo veio de um domínio não liberado | acrescente o domínio na diretiva certa do `vercel.json` |
