/* ===========================================================================
   app.js — EVENTOS E INICIALIZAÇÃO
   ---------------------------------------------------------------------------
   Último script a carregar. Faz três coisas:

     1. Delegação de cliques (abas, botões segmentados, imprimir, limpar).
     2. Delegação de digitação (qualquer input com data-f vira chave no estado).
     3. Inicialização: carrega o estado local → renderiza → liga a nuvem.

   Delegação de eventos significa UM listener no document em vez de centenas
   nos botões: a tela é remontada o tempo todo pelo ui.render() e os listeners
   continuam valendo.
   =========================================================================== */

(function () {
  'use strict';

  var E    = window.BJP_Estado;
  var UI   = window.BJP_UI;
  var Sync = window.BJP_Sync;

  /* Campos que compõem a chave do registro na nuvem. Mudou um deles,
     é outro registro — a sincronização precisa rebuscar. */
  var CAMPOS_CHAVE = ['unit', 'date', 'turno'];

  /* --- cliques ----------------------------------------------------------- */
  document.addEventListener('click', function (e) {

    // Aba do menu superior
    var aba = e.target.closest('[data-t]');
    if (aba) return UI.go(aba.dataset.t);

    // Botão "Começar a abertura" (vai para uma aba específica)
    var ir = e.target.closest('[data-ir]');
    if (ir) return UI.go(ir.dataset.ir);

    // Imprimir
    var acao = e.target.closest('[data-acao]');
    if (acao && acao.dataset.acao === 'imprimir') return window.print();

    // Limpar o dia (mantém a unidade)
    if (e.target.id === 'reset') {
      if (confirm('Limpar todas as marcações e campos de hoje?')) {
        E.limparDia();
        UI.render();
        if (Sync) Sync.trocarContexto();
      }
      return;
    }

    // Botão segmentado C / NC / NA / Feito / …
    var b = e.target.closest('[data-k]');
    if (!b) return;

    var k = b.dataset.k;
    var valor = E.alternar(k, b.dataset.v);

    // Atualiza o aria-pressed do grupo e abre/fecha o campo de ação corretiva
    b.parentElement.querySelectorAll('button').forEach(function (x) {
      x.setAttribute('aria-pressed', x.dataset.v === valor);
    });
    var nota = document.getElementById('n_' + k);
    if (nota) nota.classList.toggle('on', valor === 'NC');

    UI.update();
  });

  /* --- digitação --------------------------------------------------------- */
  document.addEventListener('input', function (e) {
    var f = e.target.dataset.f;
    if (!f) return;
    E.set(f, e.target.value);
    UI.update();
    if (CAMPOS_CHAVE.indexOf(f) !== -1 && Sync) Sync.trocarContexto();
  });

  /* --- inicialização ----------------------------------------------------- */
  E.carregar();   // 1. lê o que estava salvo no aparelho
  UI.render();    // 2. desenha a tela com esse conteúdo
  if (Sync) Sync.iniciar();   // 3. liga a nuvem, se configurada
})();
