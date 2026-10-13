/* ===========================================================================
   supabase-sync.js — SINCRONIZAÇÃO OPCIONAL COM O SUPABASE
   ---------------------------------------------------------------------------
   O app funciona 100% sem isto (só localStorage). Quando config.js traz
   sincronizacaoAtiva: true + URL + chave anon, este módulo passa a:

     1. carregar a biblioteca supabase-js pelo CDN (só se for usar);
     2. BUSCAR o registro da chave unidade + data + turno ao abrir a página;
     3. ENVIAR (upsert) o registro inteiro a cada alteração, com debounce;
     4. REBUSCAR quando o usuário muda unidade, data ou turno.

   Estratégia de conflito: ÚLTIMA ESCRITA VENCE.
   Cada registro carrega `atualizado_em`. Ao abrir, se o carimbo da nuvem for
   mais recente que o do aparelho, a nuvem substitui o local; se for mais
   antigo, o local é enviado por cima. Dois aparelhos editando o MESMO
   registro ao mesmo tempo: o último a salvar prevalece. Para a operação do
   salão (um tablet por turno) isso é suficiente; se um dia dois setores
   forem preencher em paralelo, o caminho é separar por turno ou evoluir para
   gravação por campo.

   Ao trocar a data/turno, o conteúdo já preenchido NÃO é apagado
   automaticamente (mesmo comportamento da versão anterior). Para começar um
   registro em branco, use "Limpar o dia" na aba Visão geral.

   API pública: window.BJP_Sync
   =========================================================================== */

window.BJP_Sync = (function () {
  'use strict';

  var CDN_SUPABASE = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  var ESPERA_ENVIO = 1200;   // ms de debounce antes de enviar
  var ESPERA_CONTEXTO = 800; // ms de debounce ao digitar unidade/turno

  var cfg      = window.BJP_CONFIG || {};
  var Estado   = window.BJP_Estado;
  var cliente  = null;
  var ligado   = false;
  var aplicandoRemoto = false;  // evita loop envio↔recebimento
  var tmrEnvio = null, tmrCtx = null;

  /* --- utilidades -------------------------------------------------------- */

  function habilitado() {
    return !!(cfg.sincronizacaoAtiva && cfg.supabaseUrl && cfg.supabaseAnonKey);
  }

  /** Chave do registro: unidade + data + turno (turno pode ser vazio). */
  function contexto() {
    return {
      unidade: (Estado.get('unit') || 'Olinda').trim(),
      data:    Estado.get('date') || new Date().toISOString().slice(0, 10),
      turno:   (Estado.get('turno') || '').trim()
    };
  }

  /** Atualiza o indicador no cabeçalho. tipo: local|sincronizando|ok|erro */
  function status(texto, tipo) {
    var box = document.getElementById('syncStatus');
    var txt = document.getElementById('syncTxt');
    if (!box || !txt) return;
    box.className = 'sync noprint ' + (tipo || '');
    txt.textContent = texto;
  }

  /** Carrega o supabase-js uma única vez. */
  function carregarBiblioteca() {
    return new Promise(function (resolve, reject) {
      if (window.supabase && window.supabase.createClient) return resolve();
      var s = document.createElement('script');
      s.src = CDN_SUPABASE;
      s.async = true;
      s.onload = function () {
        (window.supabase && window.supabase.createClient)
          ? resolve()
          : reject(new Error('supabase-js carregou mas não expôs createClient'));
      };
      s.onerror = function () { reject(new Error('Falha ao baixar o supabase-js (sem internet?)')); };
      document.head.appendChild(s);
    });
  }

  /* --- leitura ----------------------------------------------------------- */

  /** Busca o registro da nuvem e decide quem vence pelo carimbo de tempo. */
  function puxar() {
    if (!ligado) return Promise.resolve();
    var c = contexto();
    status('Buscando registro…', 'sincronizando');

    return cliente
      .from(cfg.tabela)
      .select('conteudo, atualizado_em')
      .eq('unidade', c.unidade).eq('data', c.data).eq('turno', c.turno)
      .maybeSingle()
      .then(function (r) {
        if (r.error) throw r.error;

        var local = Estado.tudo();
        var tLocal  = local.__atualizado_em || '';
        var tRemoto = (r.data && r.data.atualizado_em) || '';

        // Nada na nuvem ainda → sobe o que existe no aparelho.
        if (!r.data) return empurrar(true);

        // Nuvem mais recente → ela manda. Repõe o cabeçalho a partir da chave.
        if (tRemoto > tLocal) {
          aplicandoRemoto = true;
          var novo = Object.assign({}, r.data.conteudo || {}, {
            unit: c.unidade, date: c.data, turno: c.turno,
            __atualizado_em: tRemoto
          });
          Estado.substituir(novo, { silencioso: true });
          if (window.BJP_UI) window.BJP_UI.render();
          aplicandoRemoto = false;
          status('Atualizado a partir da nuvem', 'ok');
          return;
        }

        // Local igual ou mais novo → mantém e sincroniza.
        return empurrar(true);
      })
      .catch(function (e) {
        console.error('[sync] erro ao buscar:', e);
        status('Sem sincronizar — salvo neste aparelho', 'erro');
      });
  }

  /* --- escrita ----------------------------------------------------------- */

  /** Envia o estado inteiro (upsert pela chave unidade+data+turno). */
  function empurrar(silencioso) {
    if (!ligado) return Promise.resolve();
    var c = contexto();
    var conteudo = Object.assign({}, Estado.tudo());
    var carimbo = conteudo.__atualizado_em || new Date().toISOString();

    if (!silencioso) status('Salvando…', 'sincronizando');

    return cliente
      .from(cfg.tabela)
      .upsert({
        unidade: c.unidade,
        data: c.data,
        turno: c.turno,
        conteudo: conteudo,
        atualizado_em: carimbo
      }, { onConflict: 'unidade,data,turno' })
      .then(function (r) {
        if (r.error) throw r.error;
        status('Sincronizado · ' + new Date().toLocaleTimeString('pt-BR').slice(0, 5), 'ok');
      })
      .catch(function (e) {
        console.error('[sync] erro ao salvar:', e);
        status('Salvo só no aparelho — tentando de novo ao editar', 'erro');
      });
  }

  /** Agenda um envio (debounce) — chamado a cada gravação do estado. */
  function agendarEnvio() {
    if (!ligado || aplicandoRemoto) return;
    status('Salvando…', 'sincronizando');
    clearTimeout(tmrEnvio);
    tmrEnvio = setTimeout(function () { empurrar(false); }, ESPERA_ENVIO);
  }

  /** Chamado quando unidade, data ou turno mudam: rebusca o novo registro. */
  function trocarContexto() {
    if (!ligado) return;
    clearTimeout(tmrCtx);
    tmrCtx = setTimeout(puxar, ESPERA_CONTEXTO);
  }

  /* --- inicialização ----------------------------------------------------- */

  function iniciar() {
    if (!habilitado()) {
      status('Salvo apenas neste aparelho', 'local');
      return Promise.resolve(false);
    }
    status('Conectando…', 'sincronizando');

    return carregarBiblioteca()
      .then(function () {
        cliente = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
          auth: { persistSession: false }   // app sem login; RLS é quem protege
        });
        ligado = true;
        Estado.aoSalvar(agendarEnvio);
        return puxar();
      })
      .then(function () { return true; })
      .catch(function (e) {
        console.error('[sync] não foi possível iniciar:', e);
        status('Offline — salvo neste aparelho', 'erro');
        return false;
      });
  }

  return {
    iniciar: iniciar,
    puxar: puxar,
    empurrar: empurrar,
    trocarContexto: trocarContexto,
    habilitado: habilitado,
    contexto: contexto
  };
})();
