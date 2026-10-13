/* ===========================================================================
   state.js — ESTADO DO REGISTRO + PERSISTÊNCIA LOCAL
   ---------------------------------------------------------------------------
   O estado é um objeto PLANO de chave → valor (string). Exemplos:

     { unit:"Olinda", date:"2026-10-13", turno:"Jantar", ger:"André",
       est0:"C", est1:"NC", est1_n:"Trocar lâmpada — João — 18h",
       b0:"Feito", la:"SIM", lh:"18:30", tab:"abertura" }

   Convenções de chave
   -------------------
     unit / date / turno / ger   campos do cabeçalho (unit+date+turno = chave
                                 do registro no Supabase)
     <prefixo><n>                item de checklist: "C" | "NC" | "NA" | "Feito" | …
     <chave>_n                   ação corretiva do item marcado como NC
     tab                         aba aberta por último
     __atualizado_em             carimbo ISO da última alteração local
                                 (usado pelo supabase-sync para "última
                                 escrita vence")

   Persistência: localStorage, chave "bjp1" (a mesma da versão antiga de
   arquivo único — registros já feitos no aparelho continuam valendo).

   API pública: window.BJP_Estado
   =========================================================================== */

window.BJP_Estado = (function () {
  'use strict';

  var CHAVE_LOCAL = 'bjp1';

  var S = {};          // o estado em memória
  var ouvintes = [];   // callbacks chamados depois de cada gravação
  var silencio = false;// quando true, grava sem avisar os ouvintes

  /* --- leitura / gravação no localStorage ------------------------------- */

  /** Carrega o estado do aparelho. Em aba anônima ou storage bloqueado,
   *  começa vazio — o app continua funcionando, só não persiste. */
  function carregar() {
    try { S = JSON.parse(localStorage.getItem(CHAVE_LOCAL) || '{}') || {}; }
    catch (e) { S = {}; }
    return S;
  }

  /** Grava no aparelho e notifica os ouvintes (ex.: a sincronização). */
  function salvar() {
    S.__atualizado_em = new Date().toISOString();
    try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(S)); } catch (e) {}
    if (!silencio) {
      ouvintes.forEach(function (fn) { try { fn(S); } catch (e) { console.warn(e); } });
    }
  }

  /* --- acesso aos valores ------------------------------------------------ */

  /** Valor de uma chave, sempre string ('' quando não existe). */
  function get(k) { return S[k] || ''; }

  /** Define um valor e grava. */
  function set(k, v) { S[k] = v; salvar(); }

  /** Alterna um botão segmentado: clicar no valor já marcado desmarca. */
  function alternar(k, v) { S[k] = (get(k) === v ? '' : v); salvar(); return S[k]; }

  /** Referência ao objeto de estado (leitura). */
  function tudo() { return S; }

  /** Substitui o estado inteiro — usado quando a nuvem traz um registro.
   *  opts.silencioso = true evita disparar um novo envio para o Supabase. */
  function substituir(novo, opts) {
    silencio = !!(opts && opts.silencioso);
    S = novo || {};
    try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(S)); } catch (e) {}
    silencio = false;
  }

  /** Campos de identificação do documento: sobrevivem ao "Limpar o dia",
   *  porque são preenchidos uma vez na implantação, não a cada turno. */
  var PERMANENTES = ['unit', 'rest', 'impl', 'rev'];

  /** "Limpar o dia": apaga marcações e campos do turno, preservando os
   *  campos de identificação acima. */
  function limparDia() {
    var novo = {};
    PERMANENTES.forEach(function (k) { if (S[k]) novo[k] = S[k]; });
    S = novo;
    salvar();
    return S;
  }

  /** Registra um callback executado após cada gravação. */
  function aoSalvar(fn) { if (typeof fn === 'function') ouvintes.push(fn); }

  return {
    CHAVE_LOCAL: CHAVE_LOCAL,
    carregar: carregar,
    salvar: salvar,
    get: get,
    set: set,
    alternar: alternar,
    tudo: tudo,
    substituir: substituir,
    limparDia: limparDia,
    aoSalvar: aoSalvar
  };
})();
