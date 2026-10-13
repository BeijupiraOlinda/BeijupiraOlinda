/* ===========================================================================
   ui.js — RENDERIZAÇÃO DA INTERFACE
   ---------------------------------------------------------------------------
   Monta o HTML das seções a partir de BJP_DATA + BJP_Estado e cuida dos
   indicadores (barra de progresso, alerta de liberação, lista de NCs).

   Três funções principais:
     render()  reconstrói todas as seções (chamada ao abrir e ao limpar o dia)
     update()  recalcula só os indicadores (chamada a cada clique/digitação)
     go(id)    troca a aba visível

   Os botões e campos não recebem listeners aqui: o app.js usa delegação de
   eventos no document e lê os atributos data-k / data-v / data-f / data-ir.

   API pública: window.BJP_UI
   =========================================================================== */

window.BJP_UI = (function () {
  'use strict';

  var D = window.BJP_DATA;
  var E = window.BJP_Estado;
  var g = function (k) { return E.get(k); };

  /* --- helpers de HTML --------------------------------------------------- */

  /** Escapa texto que vai para dentro de atributos/HTML (digitado pelo usuário). */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  /**
   * Botão segmentado. k = chave no estado; opts = valores possíveis.
   * A classe "c" pinta de verde e "n" de vermelho quando selecionado.
   */
  function seg(k, opts) {
    opts = opts || ['C', 'NC', 'NA'];
    return '<div class="seg" role="group" aria-label="' + esc(k) + '">' +
      opts.map(function (o) {
        var verde = (o == 'C' || o == 'SIM' || o == 'Feito' || o == 'Tirada' || /^(Sem|Aprov|Aprovada)/.test(o));
        var vermelho = (o == 'NC' || o == 'NÃO' || /^(Com|Devolv|Reprov)/.test(o));
        var cls = verde ? 'c' : (vermelho ? 'n' : '');
        return '<button data-k="' + k + '" data-v="' + o + '" class="' + cls +
               '" aria-pressed="' + (g(k) == o) + '">' + o + '</button>';
      }).join('') + '</div>';
  }

  /**
   * Item de checklist.
   * k = chave | txt = título | sub = critério | withNote = abre o bloco de
   * tratativa quando o item for marcado como NC.
   *
   * O bloco de NC segue as colunas do Manual Operacional:
   *   <k>_n  ação corretiva   (chave antiga — registros anteriores continuam valendo)
   *   <k>_r  responsável
   *   <k>_p  prazo / conclusão (date)
   */
  function chk(k, txt, sub, withNote) {
    return '<div class="item"><div class="row"><div class="txt"><b>' + txt + '</b>' +
      (sub ? '<small>' + sub + '</small>' : '') + '</div>' + seg(k) + '</div>' +
      (withNote
        ? '<div class="note ' + (g(k) == 'NC' ? 'on' : '') + '" id="n_' + k + '">' +
          '<div class="g3">' +
          '<input data-f="' + k + '_n" value="' + esc(g(k + '_n')) +
          '" placeholder="Ação corretiva" aria-label="Ação corretiva para ' + esc(txt) + '">' +
          '<input data-f="' + k + '_r" value="' + esc(g(k + '_r')) +
          '" placeholder="Responsável" aria-label="Responsável pela correção de ' + esc(txt) + '">' +
          '<input data-f="' + k + '_p" type="date" value="' + esc(g(k + '_p')) +
          '" aria-label="Prazo para corrigir ' + esc(txt) + '">' +
          '</div></div>'
        : '') + '</div>';
  }

  /** Converte "2026-10-13" em "13/10/2026" para exibição. */
  function dataBR(iso) {
    var p = String(iso).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : esc(iso);
  }

  /** Campo de formulário comum. k = chave | l = rótulo | t = type do input. */
  function fld(k, l, t) {
    return '<div class="f"><label for="x_' + k + '">' + l + '</label>' +
      '<input id="x_' + k + '" type="' + (t || 'text') + '" data-f="' + k +
      '" value="' + esc(g(k)) + '"></div>';
  }

  /** Todas as chaves do checklist de abertura (est0, est1, … ate3). */
  function abKeys() {
    return D.ab.reduce(function (acc, s) {
      return acc.concat(s.i.map(function (_, j) { return s.id + j; }));
    }, []);
  }

  /* --- renderização ------------------------------------------------------ */

  function render() {
    var A = document.getElementById('app');

    A.innerHTML = [

      /* ---------- Visão geral ---------- */
      '<section id="s-geral"><h2>Como a abertura funciona</h2>',
      '<p class="lead">A equipe do salão prepara. A liderança confere cada critério e marca C (conforme), NC (não conforme) ou NA (não aplicável). Toda NC pede ação corretiva, responsável e prazo. Itens críticos bloqueiam a liberação da área até a correção.</p>',
      '<div class="card"><h3>Sequência de abertura</h3><table><tr><th>Momento</th><th>Responsável</th><th>Entregável</th></tr>',
      D.seq.map(function (r) { return '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join(''),
      '</table></div>',
      '<div class="card"><h3>Passo a passo</h3><ol class="steps">',
      '<li><b>Equipe do salão prepara</b><small>Estrutura, montagem e atendimento.</small></li>',
      '<li><b>Liderança confere</b><small>Marca C, NC ou NA na aba Abertura.</small></li>',
      '<li><b>Corrige as NC</b><small>Ação, responsável e prazo no próprio item.</small></li>',
      '<li><b>Gerente conduz o briefing</b><small>10 a 15 minutos, antes de abrir a porta.</small></li>',
      '<li><b>Gerente libera o serviço</b><small>Aba Liberação, com hora e registro.</small></li>',
      '</ol></div>',
      '<div class="card"><h3>Identificação do documento</h3>',
      '<p class="mini">Preenchido uma vez, na implantação. Fica salvo e não precisa ser redigitado a cada turno.</p>',
      '<div class="g2" style="margin-top:10px">',
      fld('impl', 'Responsável pela implantação'), fld('rev', 'Revisão', 'date'),
      '</div></div>',
      '<div class="acts noprint">',
      '<button class="btn" data-ir="abertura">Começar a abertura</button>',
      '<button class="btn o" data-acao="imprimir">Imprimir tudo</button>',
      '<button class="btn o" id="reset">Limpar o dia</button>',
      '</div></section>',

      /* ---------- Abertura ---------- */
      '<section id="s-abertura"><h2>Checklist de abertura</h2>',
      '<p class="lead">Marque cada ponto de controle pelo critério descrito.</p>',
      '<div class="stat"><span id="abTxt"></span><span id="abNc"></span></div><div class="bar"><i id="abBar"></i></div>',
      D.ab.map(function (s) {
        return '<div class="card"><h3>' + s.t + '</h3><div class="resp">Responsável: ' + s.r + '</div>' +
          s.i.map(function (x, j) { return chk(s.id + j, x[0], x[1], 1); }).join('') + '</div>';
      }).join(''),
      '</section>',

      /* ---------- Briefing ---------- */
      '<section id="s-briefing"><h2>Briefing diário pré-serviço</h2>',
      '<p class="lead">10 a 15 minutos, conduzido pelo gerente ou maître, com garçons, cumins, recepção e liderança. Antes de abrir para clientes, e registrado.</p>',
      '<div class="card"><h3>Pauta</h3>',
      D.brief.map(function (b, i) {
        return '<div class="item"><div class="row"><div class="txt"><b>' + b[1] +
          ' <span class="mini">(' + b[0] + ')</span></b><small>' + b[2] + '</small></div>' +
          seg('b' + i, ['Feito']) + '</div></div>';
      }).join(''),
      '</div>',
      '<div class="alert wait">Briefing não é só leitura de avisos. Escolha um tema prático por dia e peça a um colaborador que demonstre o padrão (recepção, oferta de sobremesa, descrição de prato).</div>',
      '<div class="card"><h3>Registro</h3><div class="g2">',
      fld('bi', 'Início', 'time'), fld('bt', 'Término', 'time'), fld('bc', 'Conduzido por'),
      fld('bm', 'Meta do turno'), fld('br', 'Reservas previstas'), fld('bu', 'Indisponíveis'),
      '</div><div class="g2" style="margin-top:10px">',
      fld('bh', 'Tema de hospitalidade do dia'), fld('bp', 'Participantes / ausências'), fld('bd', 'Decisões e recados'),
      '</div></div></section>',

      /* ---------- Liberação ---------- */
      '<section id="s-liberacao"><h2>Liberação final</h2>',
      '<p class="lead">Ocorrências críticas, como banheiro sem condições de uso, risco de acidente ou falha no sistema de atendimento, devem ser corrigidas antes do início do serviço na área afetada.</p>',
      '<div id="libAlert"></div>',
      '<div class="card"><h3>Condições</h3>',
      D.lib.map(function (l, i) { return chk('l' + i, l, '', 0); }).join(''),
      '<div class="item"><div class="row"><div class="txt"><b>Pendências críticas resolvidas</b></div>',
      seg('lc', ['SIM', 'NÃO']), '</div></div></div>',
      '<div class="card"><h3>Abertura autorizada?</h3>', seg('la', ['SIM', 'NÃO']),
      '<div class="g2" style="margin-top:12px">', fld('lh', 'Hora', 'time'), fld('lg', 'Gerente'), '</div></div>',
      '<div class="card"><h3>Não conformidades registradas</h3><div id="ncList" class="mini"></div></div>',
      '<div class="acts noprint"><button class="btn" data-acao="imprimir">Imprimir registro do dia</button></div></section>',

      /* ---------- Limpeza ---------- */
      '<section id="s-limpeza"><h2>Limpeza e conservação</h2>',
      '<p class="lead">Checklist da equipe de limpeza, independente da abertura do salão. A equipe de salão só confere a entrega; execução e correções ficam com a limpeza.</p>',
      '<div class="card"><h3>Identificação</h3>',
      '<p class="mini">Este checklist é um documento independente. Se a limpeza foi executada em outra data ou turno que não o da abertura, registre aqui — os campos do cabeçalho continuam valendo para o salão.</p>',
      '<div class="g2" style="margin-top:10px">',
      fld('lr', 'Responsável pela limpeza'), fld('ld', 'Data da limpeza', 'date'), fld('lt', 'Turno da limpeza'),
      '</div></div>',
      '<div class="card"><h3>Diária</h3>', D.dia.map(function (x, i) { return chk('d' + i, x, '', 0); }).join(''), '</div>',
      '<div class="card"><h3>Semanal</h3>', D.sem.map(function (x, i) { return chk('w' + i, x, '', 0); }).join(''),
      '<div class="g2" style="margin-top:12px">',
      fld('v1', 'Vidros — 1ª execução', 'date'), fld('v2', 'Vidros — 2ª execução', 'date'), fld('el', 'Elevador', 'date'),
      '</div></div>',
      '<div class="card"><h3>Quinzenal (a cada 15 dias)</h3>', D.qui.map(function (x, i) { return chk('q' + i, x, '', 0); }).join(''),
      '<div class="g2" style="margin-top:12px">',
      fld('qu', 'Última limpeza quinzenal', 'date'), fld('qp', 'Próxima prevista', 'date'),
      '</div></div>',
      '<div class="card"><h3>Pendências e correções</h3>',
      [0, 1, 2].map(function (i) {
        return '<div class="g2" style="margin-bottom:8px">' +
          fld('pn' + i, 'Não conformidade / local') +
          fld('pa' + i, 'Responsável e ação corretiva') +
          fld('pz' + i, 'Prazo / conclusão') + '</div>';
      }).join(''),
      '</div>',
      '<div class="card"><h3>Entrega e recebimento</h3><div class="g2">',
      fld('eh', 'Horário de conclusão', 'time'), fld('es', 'Assinatura — equipe de limpeza'),
      fld('er', 'Recebido e conferido por (salão)'), fld('ec', 'Horário da conferência', 'time'),
      '</div><div class="row" style="margin-top:12px"><div>',
      seg('esit', ['Sem pendências', 'Com pendências']), '</div><div>',
      seg('eap', ['Aprovado', 'Devolvido']), '</div></div>',
      '<div class="g2" style="margin-top:12px">', fld('eo', 'Observações'), '</div></div></section>',

      /* ---------- Fotos ---------- */
      '<section id="s-fotos"><h2>Roteiro de fotos</h2>',
      '<p class="lead">Fotos-padrão da unidade, sempre no mesmo ângulo e iluminação. Para cada imagem, registre posição da câmera, critério de aprovação e data da revisão. As imagens em si ficam no arquivo da unidade — este roteiro controla o que já foi feito. Fotos de clientes e colaboradores exigem autorização.</p>',
      '<div class="card">',
      D.fotos.map(function (x, i) {
        return '<div class="item"><div class="row"><div class="txt"><b>' + x + '</b></div>' +
          seg('p' + i, ['Tirada']) + '</div>' +
          '<div class="g3" style="margin-top:8px">' +
          fld('pf' + i, 'Posição da câmera') +
          fld('pc' + i, 'Critério de aprovação') +
          fld('pd' + i, 'Data da revisão', 'date') +
          '</div></div>';
      }).join(''),
      '</div>',
      '<div class="alert wait">Proposta para personalização. Rotinas e limites sanitários específicos devem ser validados pelo responsável técnico e adaptados à unidade.</div></section>'

    ].join('');

    // Abas
    document.getElementById('tabs').innerHTML = D.tabs.map(function (t) {
      return '<button role="tab" data-t="' + t[0] + '" aria-selected="false">' + t[1] + '</button>';
    }).join('');

    preencherCabecalho();
    update();
    go(g('tab') || 'geral');
  }

  /** Repõe os campos fixos do cabeçalho a partir do estado (com padrões). */
  function preencherCabecalho() {
    var S = E.tudo();
    if (!S.date)  S.date = new Date().toISOString().slice(0, 10);
    if (!S.unit)  S.unit = (window.BJP_CONFIG && window.BJP_CONFIG.unidadePadrao) || 'Olinda';
    if (!S.rest)  S.rest = (window.BJP_CONFIG && window.BJP_CONFIG.restaurantePadrao) || 'Beijupirá';
    ['rest', 'unit', 'date', 'turno', 'ger'].forEach(function (k) {
      var el = document.querySelector('header [data-f="' + k + '"]');
      if (el) el.value = S[k] || '';
    });
  }

  /** Recalcula progresso, alerta de liberação e lista de não conformidades. */
  function update() {
    var ks = abKeys();
    var done = ks.filter(function (k) { return g(k); }).length;
    var nc = ks.filter(function (k) { return g(k) == 'NC'; });

    var b = document.getElementById('abBar');
    if (b) {
      b.style.width = (done / ks.length * 100) + '%';
      document.getElementById('abTxt').textContent = done + ' de ' + ks.length + ' conferidos';
      document.getElementById('abNc').textContent = nc.length ? nc.length + ' não conforme(s)' : '';
    }

    var allNc = nc.concat(D.lib.map(function (_, i) { return 'l' + i; }).filter(function (k) { return g(k) == 'NC'; }));

    var la = document.getElementById('libAlert');
    if (la) {
      var m;
      if (g('la') == 'SIM' && (allNc.length || g('lc') == 'NÃO')) {
        m = ['bad', 'Atenção: a abertura está marcada como autorizada, mas há NC ou pendência crítica aberta. Corrija antes de liberar a área afetada.'];
      } else if (g('la') == 'SIM') {
        m = ['ok', 'Abertura autorizada.'];
      } else if (allNc.length || g('lc') == 'NÃO') {
        m = ['bad', 'Há ' + allNc.length + ' item(ns) não conforme(s) ou pendência crítica aberta. Corrija antes de liberar.'];
      } else {
        m = ['wait', 'Abertura: ' + done + ' de ' + ks.length + ' itens conferidos.'];
      }
      la.innerHTML = '<div class="alert ' + m[0] + '">' + m[1] + '</div>';
    }

    var nl = document.getElementById('ncList');
    if (nl) {
      var rows = [];
      D.ab.forEach(function (s) {
        s.i.forEach(function (x, j) {
          var k = s.id + j;
          if (g(k) != 'NC') return;
          var partes = [];
          if (g(k + '_n')) partes.push(esc(g(k + '_n')));
          if (g(k + '_r')) partes.push('resp.: ' + esc(g(k + '_r')));
          if (g(k + '_p')) partes.push('prazo: ' + dataBR(g(k + '_p')));
          rows.push('<p><b>' + x[0] + '</b>' +
            (partes.length ? ': ' + partes.join(' · ') : ' (sem ação registrada)') + '</p>');
        });
      });
      nl.innerHTML = rows.join('') || 'Nenhuma NC marcada.';
    }
  }

  /** Troca a aba visível e guarda a escolha no estado. */
  function go(id) {
    E.set('tab', id);
    document.querySelectorAll('section').forEach(function (s) {
      s.classList.toggle('on', s.id == 's-' + id);
    });
    document.querySelectorAll('#tabs button').forEach(function (b) {
      b.setAttribute('aria-selected', b.dataset.t == id);
    });
    window.scrollTo(0, 0);
  }

  return { render: render, update: update, go: go, esc: esc, abKeys: abKeys };
})();
