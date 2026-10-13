#!/usr/bin/env node
/* ===========================================================================
   scripts/gerar-config.js — GERA O config.js NO DEPLOY
   ---------------------------------------------------------------------------
   Por que existe: o `config.js` está no .gitignore (para a chave não ficar no
   repositório), então ele não chega na Vercel pelo Git. Este script recria o
   arquivo na hora do build, lendo as variáveis de ambiente do projeto.

   É chamado pelo buildCommand do vercel.json. Não precisa de npm install —
   usa só o Node, que a Vercel já tem.

   VARIÁVEIS ESPERADAS (Vercel → Settings → Environment Variables)
     SUPABASE_URL        https://xxxxxxxx.supabase.co
     SUPABASE_ANON_KEY   chave "anon public"  (NUNCA a service_role)
     SUPABASE_TABELA     opcional, padrão "registros_salao"
     UNIDADE_PADRAO      opcional, padrão "Olinda"
     RESTAURANTE_PADRAO  opcional, padrão "Beijupirá"

   Se as variáveis não existirem, o build NÃO quebra: gera um config.js em
   modo local (só localStorage) e avisa no log.

   Rodar na mão para testar:
     SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/gerar-config.js
   =========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

const url    = (process.env.SUPABASE_URL || '').trim();
const chave  = (process.env.SUPABASE_ANON_KEY || '').trim();
const tabela = (process.env.SUPABASE_TABELA || 'registros_salao').trim();
const unidade = (process.env.UNIDADE_PADRAO || 'Olinda').trim();
const restaurante = (process.env.RESTAURANTE_PADRAO || 'Beijupirá').trim();

const ativo = Boolean(url && chave);

// Trava de segurança: a service_role tem "role":"service_role" no payload do
// JWT. Se alguém colar a chave errada, o build para aqui em vez de publicar
// uma chave administrativa para o mundo inteiro.
if (chave) {
  try {
    const payload = JSON.parse(Buffer.from(chave.split('.')[1] || '', 'base64').toString('utf8'));
    if (payload && payload.role && payload.role !== 'anon') {
      console.error('\n✖ ABORTADO: SUPABASE_ANON_KEY parece ser uma chave "' + payload.role + '".');
      console.error('  Use a chave "anon public" (Project Settings → API). A service_role');
      console.error('  ignora todas as políticas de RLS e ficaria visível no navegador.\n');
      process.exit(1);
    }
  } catch (e) {
    // Chave em formato não-JWT (projetos novos usam outro formato): segue o jogo.
  }
}

const conteudo = `/* GERADO AUTOMATICAMENTE por scripts/gerar-config.js — não edite à mão.
   Build: ${new Date().toISOString()} */
window.BJP_CONFIG = {
  sincronizacaoAtiva: ${ativo},
  supabaseUrl: ${JSON.stringify(url)},
  supabaseAnonKey: ${JSON.stringify(chave)},
  tabela: ${JSON.stringify(tabela)},
  unidadePadrao: ${JSON.stringify(unidade)},
  restaurantePadrao: ${JSON.stringify(restaurante)}
};
`;

const destino = path.join(__dirname, '..', 'config.js');
fs.writeFileSync(destino, conteudo, 'utf8');

console.log(ativo
  ? '✔ config.js gerado — sincronização ATIVA (' + url + ', tabela "' + tabela + '")'
  : '⚠ config.js gerado em MODO LOCAL — faltam SUPABASE_URL e/ou SUPABASE_ANON_KEY nas variáveis de ambiente.');
