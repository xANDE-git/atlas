/*
 * Banco de dados falso para rodar o Atlas fora do Claude.
 *
 * O Atlas original guarda tudo no banco que o claude.ai dá para cada artefato
 * (window.claude.use('db'), no estilo do Firestore). Aqui eu imito só o pedaço
 * que o Atlas usa: collection().onSnapshot(), doc().update(), doc().delete() e add().
 * Os dados ficam no localStorage do navegador. Para voltar ao estado inicial,
 * abra a página com ?reset no endereço.
 *
 * Todos os negócios abaixo são inventados.
 */
(function () {
  var CHAVE = 'atlas-demo-v1';

  function iso(d) {
    var m = String(d.getMonth() + 1).padStart(2, '0'), dia = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dia;
  }
  function dias(n) { var d = new Date(); d.setDate(d.getDate() + n); return iso(d); }

  var HOR = 'seg-sex 08:00-18:00; sab 08:00-12:00';
  var HOR2 = 'seg-sab 09:00-18:00';

  function contato(ordem, nome, ramo, cidade, nota, n, zap, extra) {
    return Object.assign({
      categoria: ramo, cidade: cidade, grupo: 'Prospecção demo', nome: nome,
      notas: 'Maps: ' + nota + ' (' + n + '). Sem site: só Instagram (dados de exemplo).',
      ordem: ordem, pedidoEm: dias(-3) + ' 14:00', pedidoFonte: 'Varredura de exemplo',
      proximoPasso: 'Mandar "Olá, tudo bem?".', ramo: ramo, situacao: 'Ainda não chamado',
      tipo: 'Contato sem protótipo', whatsapp: zap, horario: HOR
    }, extra || {});
  }

  function sementes() {
    var s = {};
    // Fila "Para chamar agora": negócios que aparecem no Google sem site.
    s['demo-fio-de-prosa'] = contato(1, 'Papelaria Fio de Prosa', 'Papelaria personalizada', 'São José da Lapa', '4,9', 48, '5500900000001', { instagram: 'fiodeprosa.demo' });
    s['demo-ponto-virgula'] = contato(2, 'Ateliê Ponto e Vírgula', 'Papelaria personalizada', 'Vespasiano', '5,0', 31, '5500900000002');
    s['demo-vo-lia'] = contato(3, 'Doces da Vó Lia', 'Confeitaria', 'Pedro Leopoldo', '4,7', 112, '5500900000003', { horario: HOR2 });
    s['demo-massa-fina'] = contato(4, 'Confeitaria Massa Fina', 'Confeitaria', 'São José da Lapa', '4,6', 74, '5500900000004');
    s['demo-pet-quintal'] = contato(5, 'Pet Quintal', 'Pet shop', 'Vespasiano', '4,8', 203, '5500900000005', { instagram: 'petquintal.demo' });
    s['demo-cantinho-bichos'] = contato(6, 'Cantinho dos Bichos', 'Pet shop', 'Pedro Leopoldo', '4,5', 39, '5500900000006');
    s['demo-brilho-total'] = contato(7, 'Brilho Total Estética Automotiva', 'Estética automotiva', 'Vespasiano', '4,9', 87, '5500900000007');
    s['demo-garagem-31'] = contato(8, 'Garagem 31 Estética', 'Estética automotiva', 'Pedro Leopoldo', '4,4', 22, '5500900000008', { horario: HOR2 });
    // Gancho escrito à mão para um deles (o texto automático ficaria genérico).
    s['demo-fio-de-prosa'].aprGancho = 'Vi no Google que a Papelaria Fio de Prosa tem nota 4,9 com 48 avaliações, e que vocês fazem cadernos personalizados.';
    s['demo-fio-de-prosa'].aprRamo = 'papelaria e cadernos personalizados';

    // Protótipo pronto, esperando o primeiro contato.
    s['demo-clima-facil'] = {
      categoria: 'Ar-condicionado', cidade: 'Vespasiano', grupo: 'Serviço local', nome: 'Clima Fácil', ramo: 'Ar-condicionado',
      tipo: 'Protótipo de venda', situacao: 'Protótipo pronto', link: 'https://exemplo.invalid/clima-facil',
      whatsapp: '5500900000009', horario: HOR, ordem: 30, pedidoEm: dias(-6) + ' 10:00',
      notas: 'Maps: 4,8 (51). Protótipo de exemplo.', proximoPasso: 'Chamar e mandar o link da prévia.', ultimoContato: ''
    };

    // Já chamados, esperando resposta.
    s['demo-cores-letras'] = {
      categoria: 'Papelaria personalizada', cidade: 'São José da Lapa', grupo: 'Prospecção demo', nome: 'Papelaria Cores e Letras', ramo: 'Papelaria personalizada',
      tipo: 'Contato sem protótipo', situacao: 'Mensagem enviada', whatsapp: '5500900000010', horario: HOR, ordem: 9, pedidoEm: dias(-5) + ' 09:00',
      notas: dias(-2) + ': chamei, ainda sem resposta.\nMaps: 4,7 (66).', proximoPasso: 'Aguardar resposta.', ultimoContato: dias(-2)
    };

    // Interessados e negociando: aparecem na agenda de cobrança.
    s['demo-linha-solta'] = {
      categoria: 'Personalizados', cidade: 'Vespasiano', grupo: 'Prospecção demo', nome: 'Ateliê Linha Solta', ramo: 'Personalizados',
      tipo: 'Contato sem protótipo', situacao: 'Interessado', whatsapp: '5500900000011', horario: HOR, ordem: 10, pedidoEm: dias(-9) + ' 09:00',
      notas: dias(-3) + ': gostou da ideia, pediu para eu mandar os valores.', proximoPasso: 'Mandar a proposta.', ultimoContato: dias(-3), cobrar: dias(0)
    };
    s['demo-casa-acucar'] = {
      categoria: 'Confeitaria', cidade: 'Pedro Leopoldo', grupo: 'Prospecção demo', nome: 'Doceria Casa de Açúcar', ramo: 'Confeitaria',
      tipo: 'Contato sem protótipo', situacao: 'Negociando', whatsapp: '5500900000012', horario: HOR2, ordem: 11, pedidoEm: dias(-10) + ' 09:00',
      notas: dias(-4) + ': quer a opção mensal. Vai falar com a sócia.', proximoPasso: 'Cobrar a resposta da sócia.', ultimoContato: dias(-4), cobrar: dias(-1)
    };

    // Em espera.
    s['demo-rabo-feliz'] = {
      categoria: 'Pet shop', cidade: 'São José da Lapa', grupo: 'Prospecção demo', nome: 'Pet Shop Rabo Feliz', ramo: 'Pet shop',
      tipo: 'Contato sem protótipo', situacao: 'Em espera', whatsapp: '5500900000013', horario: HOR, ordem: 12, pedidoEm: dias(-12) + ' 09:00',
      notas: dias(-4) + ': pediu para voltar depois do feriado.', proximoPasso: 'Em espera: voltar depois do feriado.',
      esperaNota: 'Pediu para voltar depois do feriado', esperaDesde: dias(-4), esperaAte: dias(6), ultimoContato: dias(-4)
    };

    // Descartado e no ar (aparecem na aba de sites e na vitrine).
    s['demo-duas-rodas'] = {
      categoria: 'Oficina mecânica', cidade: 'Vespasiano', grupo: 'Prospecção demo', nome: 'Mecânica Duas Rodas', ramo: 'Oficina mecânica',
      tipo: 'Contato sem protótipo', situacao: 'Descartado', whatsapp: '5500900000014', ordem: 13, pedidoEm: dias(-14) + ' 09:00',
      notas: dias(-8) + ': não quer no momento.', proximoPasso: 'Nenhum.', ultimoContato: dias(-8)
    };
    s['demo-tinta-viva'] = {
      categoria: 'Estúdio de tatuagem', cidade: 'São José da Lapa', grupo: 'Vitrine', nome: 'Estúdio Tinta Viva', ramo: 'Estúdio de tatuagem',
      tipo: 'Protótipo de venda', situacao: 'Pronto e no ar', link: 'https://exemplo.invalid/tinta-viva', whatsapp: '5500900000015',
      ordem: 40, pedidoEm: dias(-20) + ' 09:00', notas: 'Exemplo de site no ar para a vitrine.', proximoPasso: 'Nenhum.', ultimoContato: dias(-15)
    };
    return s;
  }

  function pedidosIniciais() {
    return {
      'demo-ped-1': {
        tipo: 'criar-site', designBase: '05-elegante-claro', designNome: 'Elegante e claro', nome: 'Ateliê Linha Solta',
        siteId: 'demo-linha-solta', status: 'pronto', criadoEm: new Date().toISOString(),
        resumo: 'Pedido de exemplo: no Atlas original, o Claude Code lê este pedido e cria o protótipo.'
      }
    };
  }

  function carrega() {
    var estado = null;
    try {
      if (/[?&]reset\b/.test(location.search)) localStorage.removeItem(CHAVE);
      estado = JSON.parse(localStorage.getItem(CHAVE));
    } catch (e) {}
    if (!estado || !estado.sites) estado = { sites: sementes(), pedidos: pedidosIniciais() };
    return estado;
  }

  var dados = carrega();
  function salva() { try { localStorage.setItem(CHAVE, JSON.stringify(dados)); } catch (e) {} }
  salva();

  var ouvintes = { sites: [], pedidos: [] };
  function snapshotDe(nome) {
    var col = dados[nome];
    return {
      metadata: { fromCache: false },
      docs: Object.keys(col).map(function (id) { return { id: id, data: function () { return JSON.parse(JSON.stringify(col[id])); } }; })
    };
  }
  function avisa(nome) { ouvintes[nome].forEach(function (fn) { setTimeout(function () { fn(snapshotDe(nome)); }, 0); }); }

  function colecao(nome) {
    return {
      onSnapshot: function (ok) { ouvintes[nome].push(ok); setTimeout(function () { ok(snapshotDe(nome)); }, 30); return function () {}; },
      doc: function (id) {
        return {
          update: function (campos) { dados[nome][id] = Object.assign({}, dados[nome][id], campos); salva(); avisa(nome); return Promise.resolve(); },
          delete: function () { delete dados[nome][id]; salva(); avisa(nome); return Promise.resolve(); }
        };
      },
      add: function (doc) {
        var id = 'demo-' + Math.random().toString(36).slice(2, 10);
        dados[nome][id] = doc; salva(); avisa(nome); return Promise.resolve({ id: id });
      }
    };
  }

  window.claude = {
    use: function (nome) {
      if (nome === 'db') return Promise.resolve({ collection: colecao });
      if (nome === 'user') return Promise.resolve({ can: function () { return true; } });
      return Promise.resolve(null);
    }
  };

  // Faixa fixa avisando que é demonstração.
  document.addEventListener('DOMContentLoaded', function () {
    var f = document.createElement('div');
    f.setAttribute('role', 'note');
    f.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99;padding:.45rem 1rem;font:600 13px/1.3 system-ui,sans-serif;text-align:center;background:#0E0F0C;color:#D8F27B;';
    f.innerHTML = 'Versão de demonstração: todos os negócios são inventados e os dados ficam só neste navegador. <a href="?reset" style="color:inherit">Restaurar exemplo</a>';
    document.body.appendChild(f);
  });
})();
