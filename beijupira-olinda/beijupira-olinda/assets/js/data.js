/* ===========================================================================
   data.js — CONTEÚDO DOS CHECKLISTS
   ---------------------------------------------------------------------------
   Este é o único arquivo que o pessoal da operação precisa mexer para mudar
   textos, incluir ou remover itens. Nenhuma lógica aqui, só dados.

   ATENÇÃO — como as respostas são salvas:
   Cada item vira uma CHAVE no estado, derivada da POSIÇÃO dele na lista
   (ex.: o 1º item do bloco "est" é a chave "est0", o 2º é "est1", e assim
   por diante; limpeza diária usa "d0", "d1"…; semanal "w0"; quinzenal "q0";
   liberação "l0"; briefing "b0"; fotos "p0").

   Chaves derivadas de cada item:
     <item>_n  ação corretiva da NC      <item>_r  responsável
     <item>_p  prazo da correção (date)
     pf<n>     posição da câmera (fotos)  pc<n>  critério de aprovação
     pd<n>     data da revisão da foto

   Por isso:
   ✅ Pode editar o TEXTO de um item à vontade.
   ✅ Pode ACRESCENTAR itens no FIM de uma lista sem problema.
   ⚠️ Se você REMOVER ou REORDENAR itens no meio da lista, os registros já
      salvos passam a apontar para o item errado. Nesse caso, faça a mudança
      e oriente a equipe a começar um registro novo (ou rode um UPDATE no
      Supabase remapeando as chaves).
   =========================================================================== */

window.BJP_DATA = {

  /* Abas da navegação: [id interno, rótulo visível].
     O id vira o nome da seção (id="s-<id>") e é guardado no estado. */
  tabs: [
    ['geral',     'Visão geral'],
    ['abertura',  'Abertura'],
    ['briefing',  'Briefing'],
    ['liberacao', 'Liberação'],
    ['limpeza',   'Limpeza'],
    ['fotos',     'Fotos']
  ],

  /* Tabela "Sequência de abertura": [momento, responsável, entregável].
     Só informativa — não gera campos salvos. */
  seq: [
    ['60–90 min antes',           'Líderes de setor',     'Limpeza, reposição e mise en place'],
    ['30 min antes',              'Gerente + chef + bar', 'Conferência de pendências e disponibilidade'],
    ['15 min antes',              'Gerente / maître',     'Briefing diário com a equipe'],
    ['Antes de receber clientes', 'Gerente',              'Ronda final e liberação documentada']
  ],

  /* Checklist de abertura.
     id = prefixo das chaves salvas | t = título do bloco | r = responsável
     i  = itens: [nome do ponto de controle, critério de conformidade]
     Cada item aceita C (conforme), NC (não conforme) ou NA (não aplicável),
     e abre campo de ação corretiva quando marcado NC. */
  ab: [
    {
      id: 'est', t: 'Estrutura, ambiente e banheiros', r: 'Gerente / manutenção',
      i: [
        ['Entrada e fachada', 'Acesso livre, fachada limpa, sinalização visível e iluminação funcionando.'],
        ['Salão e conforto',  'Piso seco, mesas e cadeiras íntegras, ar-condicionado/ventilação, música e iluminação adequados.'],
        ['Banheiros',         'Vasos, pias, espelhos e lixeiras limpos; papel, sabonete e secagem de mãos disponíveis.'],
        ['Segurança',         'Rotas de saída desobstruídas; nenhuma condição de risco aparente.']
      ]
    },
    {
      id: 'mon', t: 'Montagem do salão', r: 'Maître / equipe de salão',
      i: [
        ['Mesas',                        'Superfícies limpas e secas, cadeiras alinhadas, mesas estáveis.'],
        ['Jogos americanos e talheres',  'Posição, quantidade e conservação conforme foto-padrão da unidade.'],
        ['Copos e taças',                'Sem marcas, lascas ou odor; armazenamento e montagem conforme padrão.'],
        ['Galeteiros e materiais',       'Limpos, abastecidos, dentro da validade e posicionados conforme padrão.']
      ]
    },
    {
      id: 'ate', t: 'Atendimento, sistema e reservas', r: 'Maître / recepção',
      i: [
        ['Apresentação da equipe', 'Uniformes limpos, identificação e apresentação conforme política da casa.'],
        ['Equipamentos',           'Máquinas de cartão carregadas, sistema e impressoras testados.'],
        ['Reservas',               'Mapa de mesas, horários, restrições alimentares informadas e ocasiões especiais conferidos.'],
        ['Hospitalidade',          'Recepção preparada, padrão de saudação e responsável por cada praça definidos.']
      ]
    }
  ],

  /* Pauta do briefing: [duração, tema, pergunta-guia]. Marcação "Feito". */
  brief: [
    ['2 min', 'Resultado anterior',          'O que funcionou e o que precisa melhorar?'],
    ['2 min', 'Reservas e movimento',        'Qual a previsão de clientes, horários de pico e eventos?'],
    ['2 min', 'Cozinha e bar',               'Quais itens faltam? Quais especiais, alergênicos e tempos de preparo?'],
    ['2 min', 'Metas comerciais',            'Qual a meta do turno e quais sugestões de venda são adequadas?'],
    ['3 min', 'Hospitalidade e padrão',      'Qual comportamento será treinado hoje?'],
    ['2 min', 'Escala e responsabilidades',  'Quem cobre cada praça e quem resolve imprevistos?'],
    ['1 min', 'Confirmação',                 'Todos compreenderam as prioridades?']
  ],

  /* Condições da liberação final (chaves l0…lN). */
  lib: [
    'Salão e banheiros conferidos',
    'Bar conferido',
    'Cozinha e segurança dos alimentos conferidas',
    'Reservas e sistemas conferidos',
    'Briefing realizado e equipe alinhada'
  ],

  /* Limpeza diária (chaves d0…dN). */
  dia: [
    'Varrer as escadas',
    'Limpar os banheiros',
    'Limpar o salão',
    'Verificar e remover teias de aranha',
    'Verificar e retirar lixo do jardim',
    'Limpar as luminárias',
    'Limpar a porta de entrada'
  ],

  /* Limpeza semanal (chaves w0…wN). */
  sem: [
    'Limpar os vidros — 2 vezes por semana',
    'Limpar o elevador — 1 vez por semana'
  ],

  /* Limpeza quinzenal (chaves q0…qN). */
  qui: [
    'Lavar o salão e passar cera (conforme o tipo de piso e produto autorizado)',
    'Lavar as mesas com produtos adequados ao material'
  ],

  /* Roteiro de fotos-padrão (chaves p0…pN). */
  fotos: [
    'Fachada e entrada',
    'Visão geral do salão',
    'Mesa padrão (superior e lateral)',
    'Galeteiro',
    'Aparador',
    'Recepção e reservas',
    'Mise en place do bar',
    'Cada praça da cozinha',
    'Armazenamento e etiquetas',
    'Banheiros',
    'Recepção'
  ]
};
