
const SUPABASE_URL = "https://lkankciqsldutuncuvyl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_QAzF6HlUkYoAumTQCzKuVg_FEmhtwQ8";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function temAcessoCompleto() {
  if (!empresaAtual) return false;
  if (empresaAtual.cortesia) return true;
  return empresaAtual.plano === 'completo' && empresaAtual.assinatura_status === 'ativa';
}

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}


let empresaAtual = null;

const VALORES_PADRAO = { baseInstalacao:280, baseManutencao:100, baseHigienizacao:175, add9000:0, add12000:0, add18000:60, add24000:100, add30000:150, add36000:210, multMedio:1.15, multDificil:1.45, precoMetro:45, precoSuporte:60, precoEletrica:100, materiaisInstalacao:120, materiaisManutencao:35 };
const DADOS_EMPRESA_PADRAO = { cnpj: '', endereco: '', telefone: '', email: '' };

async function sair() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

async function iniciar() {
  try {
    const { data: { session }, error: erroSessao } = await supabaseClient.auth.getSession();
    if (erroSessao) throw erroSessao;
    if (!session) { window.location.href = "login.html"; return; }

    let { data: empresa, error } = await supabaseClient.from("empresas").select("*").eq("user_id", session.user.id).maybeSingle();
    if (error) throw error;

    if (!empresa) {
      const { data: novaEmpresa, error: erroCriacao } = await supabaseClient
        .from("empresas")
        .insert({ user_id: session.user.id, nome_empresa: "Minha Empresa", plano: "gratis", precos: { config: VALORES_PADRAO, dadosEmpresa: DADOS_EMPRESA_PADRAO } })
        .select().single();
      if (erroCriacao) throw erroCriacao;
      empresa = novaEmpresa;
    }
    if (!empresa.precos || !empresa.precos.config) {
      empresa.precos = { config: Object.assign({}, VALORES_PADRAO), dadosEmpresa: Object.assign({}, DADOS_EMPRESA_PADRAO) };
    }

    empresaAtual = empresa;
    document.getElementById("nomeEmpresa").textContent = empresaAtual.nome_empresa;
    document.getElementById("badgePlano").textContent = { completo: "Plano Completo", basico: "Plano Básico" }[planoEfetivo()] || "Plano Grátis";
    mostrarAba("inicio");
  } catch (e) {
    document.getElementById("conteudo").innerHTML = '<div class="card"><p class="msg erro">Não foi possível carregar: ' + e.message + '</p></div>';
  }
}

function ativarTab(nome) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("ativa", t.dataset.tab === nome));
}

document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => mostrarAba(tab.dataset.tab)));

function mostrarAba(nome) {
  ativarTab(nome);
  const conteudo = document.getElementById("conteudo");

  if (nome === "inicio") { renderInicio(); }
  else if (nome === "avulso") { renderAvulso(); }
  else if (nome === "clientes") { renderClientes(); }
  else if (nome === "agenda") { renderAgenda(); }
  else if (nome === "contrato") {
    if (!temAcessoCompleto()) {
      conteudo.innerHTML = '<div class="card"><h3>Contrato de manutenção</h3><p style="color: var(--cinza-texto); font-size: 14px;">Este recurso faz parte do Plano Completo.</p></div>';
      return;
    }
    renderContrato();
  } else if (nome === "config") {
    const emp = empresaAtual.precos.dadosEmpresa || {};
    conteudo.innerHTML = `<div class="card">
      <h3>Dados da empresa</h3>
      <p style="color: var(--cinza-texto); font-size: 13px; margin-top: -6px;">Esses dados aparecem nos orçamentos e contratos gerados para o cliente.</p>
      <label for="inputNome">Nome da empresa</label>
      <input type="text" id="inputNome" value="${esc(empresaAtual.nome_empresa)}">
      <label>CNPJ</label><input type="text" id="cfgCnpj" placeholder="00.000.000/0000-00" value="${esc(emp.cnpj || '')}">
      <label>Endereço / Cidade</label><input type="text" id="cfgEndereco" placeholder="Bairro, cidade - UF" value="${esc(emp.endereco || '')}">
      <label>Telefone comercial</label><input type="text" id="cfgTelefone" placeholder="(18) 99169-0009" value="${esc(emp.telefone || '')}">
      <label>E-mail comercial</label><input type="text" id="cfgEmail" placeholder="contato@empresa.com" value="${esc(emp.email || '')}">
      <button class="btn" onclick="salvarDadosEmpresa()">Salvar</button>
      <div class="msg" id="msgConfig"></div></div>
      <div class="card" id="cardConta">
        <h3>Conta e login</h3>
        <p class="note" style="margin-top:-6px;">Vincule sua conta Google pra também poder entrar com ela, além do e-mail e senha.</p>
        <div id="statusVinculoGoogle" class="sub-item">Verificando...</div>
        <button class="btn btn-secundario" id="btnVincularGoogle">Vincular conta Google</button>
        <div class="msg" id="msgVinculoGoogle"></div>
      </div>
      <div class="card">
        <h3>Ajuda</h3>
        <a href="tutorial.html" target="_blank" class="btn btn-secundario" style="text-decoration:none; display:block;">📘 Como usar o Cosmos Pro</a>
      </div>
      <div class="card">
        <h3>Plano e assinatura</h3>
        <div id="statusAssinatura"><p class="vazio">Carregando...</p></div>
      </div>
      <div class="card">
        <h3>Aparência</h3>
        <div class="checkbox-row" style="margin-top:0;">
          <input type="checkbox" id="chkTemaEscuro">
          <label>Tema escuro</label>
        </div>
      </div>
      <div class="card">
        <h3>Sessão</h3>
        <button class="btn btn-secundario" onclick="sair()" style="color:var(--erro); border-color:var(--erro);">Sair da conta</button>
      </div>`;
    carregarStatusGoogle();
    renderStatusAssinatura();
    document.getElementById('btnVincularGoogle').addEventListener('click', vincularGoogle);
    document.getElementById('chkTemaEscuro').checked = localStorage.getItem(TEMA_ESCURO_KEY) === '1';
    document.getElementById('chkTemaEscuro').addEventListener('change', (e) => aplicarTema(e.target.checked));
  }
}

async function carregarStatusGoogle() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  const jaVinculado = !!(user && user.identities && user.identities.some(i => i.provider === 'google'));
  const statusEl = document.getElementById('statusVinculoGoogle');
  const btnEl = document.getElementById('btnVincularGoogle');
  if (!statusEl || !btnEl) return;
  if (jaVinculado) {
    statusEl.innerHTML = '<span class="status-tag status-concluido">Conta Google já vinculada</span>';
    btnEl.classList.add('hidden');
  } else {
    statusEl.textContent = 'Nenhuma conta Google vinculada ainda.';
    btnEl.classList.remove('hidden');
  }
}

async function vincularGoogle() {
  const msg = document.getElementById('msgVinculoGoogle');
  msg.className = 'msg'; msg.textContent = 'Redirecionando para o Google...';
  const { error } = await supabaseClient.auth.linkIdentity({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/painel.html' }
  });
  if (error) { msg.className = 'msg erro'; msg.textContent = 'Erro ao vincular: ' + error.message; }
}

const PLANO_PRECOS = { basico: { mensal: 29.90, anual: 299.00 }, completo: { mensal: 79.90, anual: 799.00 } };

const TABELA_PLANOS = [
  { nome: 'Clientes', gratis: 'Até 10', basico: 'Ilimitado', completo: 'Ilimitado' },
  { nome: 'Orçamentos', gratis: true, basico: true, completo: true },
  { nome: 'Clientes e Agenda', gratis: true, basico: true, completo: true },
  { nome: 'Ordens de Serviço', gratis: true, basico: true, completo: true },
  { nome: 'Financeiro na Início', gratis: true, basico: true, completo: true },
  { nome: 'Contratos de manutenção (PMOC)', gratis: false, basico: false, completo: true },
];

function celulaPlano(valor) {
  if (valor === true) return '<span style="color:var(--sucesso); font-weight:800;">✓</span>';
  if (valor === false) return '<span style="color:var(--cinza-texto);">✗</span>';
  return `<span style="font-weight:700; font-size:11.5px;">${valor}</span>`;
}
const ASSINATURA_STATUS_LABEL = { trial: 'Sem assinatura ativa', pendente: 'Pagamento pendente', ativa: 'Ativa', atrasada: 'Pagamento atrasado', cancelada: 'Cancelada' };

function renderStatusAssinatura() {
  const el = document.getElementById('statusAssinatura');
  if (!el) return;

  if (empresaAtual.cortesia) {
    el.innerHTML = `
      <span class="status-tag status-concluido">Acesso cortesia — Completo liberado</span>
      <p class="note" style="margin-top:10px;">Esta conta tem acesso total sem cobrança.</p>
    `;
    return;
  }

  const statusAtual = empresaAtual.assinatura_status || 'trial';
  const statusLabel = ASSINATURA_STATUS_LABEL[statusAtual] || statusAtual;
  const corStatus = statusAtual === 'ativa' ? 'concluido' : (statusAtual === 'atrasada' || statusAtual === 'cancelada' ? 'cancelado' : 'agendado');
  const nomePlanoAtual = { completo: 'Plano Completo', basico: 'Plano Básico' }[empresaAtual.plano] || 'Plano Grátis';

  el.innerHTML = `
    <div style="margin-bottom:14px;">
      <span class="badge-plano">${nomePlanoAtual}</span>
      ${empresaAtual.plano !== 'gratis' ? `<span class="status-tag status-${corStatus}" style="margin-left:6px;">${statusLabel}</span>` : ''}
      ${empresaAtual.assinatura_expira_em ? `<div class="sub-item" style="margin-top:6px;">Válido até ${new Date(empresaAtual.assinatura_expira_em).toLocaleDateString('pt-BR')}</div>` : ''}
    </div>

    <div style="overflow-x:auto; margin-bottom:16px;">
      <table style="width:100%; border-collapse:collapse; font-size:12px; min-width:420px;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px 6px; color:var(--cinza-texto); font-weight:600;"></th>
            <th style="text-align:center; padding:8px 6px; font-family:'Manrope',sans-serif; font-weight:800;">Grátis</th>
            <th style="text-align:center; padding:8px 6px; font-family:'Manrope',sans-serif; font-weight:800;">Básico</th>
            <th style="text-align:center; padding:8px 6px; font-family:'Manrope',sans-serif; font-weight:800; color:var(--azul-escuro);">Completo</th>
          </tr>
        </thead>
        <tbody>
          ${TABELA_PLANOS.map(linha => `
            <tr style="border-top:1px solid var(--cinza-linha);">
              <td style="padding:8px 6px; color:var(--escuro);">${linha.nome}</td>
              <td style="text-align:center; padding:8px 6px;">${celulaPlano(linha.gratis)}</td>
              <td style="text-align:center; padding:8px 6px;">${celulaPlano(linha.basico)}</td>
              <td style="text-align:center; padding:8px 6px;">${celulaPlano(linha.completo)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <label>Ciclo de cobrança</label>
    <select id="assinaturaCiclo">
      <option value="mensal">Mensal</option>
      <option value="anual">Anual (2 meses grátis)</option>
    </select>

    <label>CPF ou CNPJ (exigido pelo Asaas pra gerar a cobrança)</label>
    <input type="text" id="assinaturaCpfCnpj" placeholder="000.000.000-00 ou 00.000.000/0000-00" value="${esc((empresaAtual.precos.dadosEmpresa && empresaAtual.precos.dadosEmpresa.cnpj) || '')}">

    <div class="price-grid" style="grid-template-columns: 1fr; margin-top:14px; gap:10px;">
      <button class="btn btn-secundario" id="btnAssinarBasico" style="margin-top:0; text-align:left; padding:14px;">
        <b>Básico</b> — <span id="precoBasico">R$ 29,90/mês</span>
      </button>
      <button class="btn btn-ambar" id="btnAssinarCompleto" style="margin-top:0; text-align:left; padding:14px;">
        <b>Completo</b> — <span id="precoCompleto">R$ 79,90/mês</span>
      </button>
    </div>
    <div class="msg" id="msgAssinatura"></div>
  `;

  document.getElementById('assinaturaCiclo').addEventListener('change', atualizarPrecosExibidos);
  document.getElementById('btnAssinarBasico').addEventListener('click', () => assinarPlano('basico'));
  document.getElementById('btnAssinarCompleto').addEventListener('click', () => assinarPlano('completo'));
}

function atualizarPrecosExibidos() {
  const ciclo = document.getElementById('assinaturaCiclo').value;
  document.getElementById('precoBasico').textContent = ciclo === 'anual' ? `R$ ${PLANO_PRECOS.basico.anual.toFixed(2).replace('.', ',')}/ano` : `R$ ${PLANO_PRECOS.basico.mensal.toFixed(2).replace('.', ',')}/mês`;
  document.getElementById('precoCompleto').textContent = ciclo === 'anual' ? `R$ ${PLANO_PRECOS.completo.anual.toFixed(2).replace('.', ',')}/ano` : `R$ ${PLANO_PRECOS.completo.mensal.toFixed(2).replace('.', ',')}/mês`;
}

async function assinarPlano(plano) {
  const msg = document.getElementById('msgAssinatura');
  const ciclo = document.getElementById('assinaturaCiclo').value;
  const cpfCnpj = document.getElementById('assinaturaCpfCnpj').value.replace(/[^\d]/g, '');
  if (!cpfCnpj || (cpfCnpj.length !== 11 && cpfCnpj.length !== 14)) {
    msg.className = 'msg erro'; msg.textContent = 'Digite um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.';
    return;
  }
  msg.className = 'msg'; msg.textContent = 'Gerando cobrança...';

  const { data: { session } } = await supabaseClient.auth.getSession();
  try {
    const resp = await fetch('https://lkankciqsldutuncuvyl.supabase.co/functions/v1/asaas-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
      body: JSON.stringify({ plano, ciclo, cpfCnpj })
    });
    const data = await resp.json();
    if (!resp.ok || data.error) {
      msg.className = 'msg erro';
      msg.textContent = 'Erro: ' + (data.error || 'não foi possível gerar a cobrança.') + (data.detalhe ? ' — ' + JSON.stringify(data.detalhe) : '');
      console.error('Erro assinatura:', data);
      return;
    }
    if (data.jaAssinando) {
      msg.className = 'msg ok';
      msg.textContent = 'Você já está assinando este plano.';
      return;
    }
    if (data.updated) {
      msg.className = 'msg ok';
      msg.textContent = 'Plano atualizado! A próxima cobrança já reflete o novo valor.';
      empresaAtual.plano = plano;
      empresaAtual.ciclo_cobranca = ciclo;
      setTimeout(() => mostrarAba('config'), 1200);
      return;
    }
    if (data.invoiceUrl) {
      window.open(data.invoiceUrl, '_blank');
      msg.className = 'msg ok';
      msg.textContent = 'Link de pagamento aberto em nova aba. Depois de pagar, volte e recarregue o app.';
    } else {
      msg.className = 'msg erro'; msg.textContent = 'Cobrança criada, mas sem link de pagamento. Confira no painel do Asaas.';
    }
  } catch (e) {
    msg.className = 'msg erro'; msg.textContent = 'Erro de conexão: ' + e.message;
  }
}

async function salvarDadosEmpresa() {
  const novoNome = document.getElementById("inputNome").value.trim();
  const msgEl = document.getElementById("msgConfig");
  if (!novoNome) { msgEl.className = "msg erro"; msgEl.textContent = "Digite um nome válido."; return; }
  const dadosEmpresa = {
    cnpj: document.getElementById('cfgCnpj').value.trim(),
    endereco: document.getElementById('cfgEndereco').value.trim(),
    telefone: document.getElementById('cfgTelefone').value.trim(),
    email: document.getElementById('cfgEmail').value.trim()
  };
  const novosPrecos = Object.assign({}, empresaAtual.precos, { dadosEmpresa });
  const { error } = await supabaseClient.from("empresas").update({ nome_empresa: novoNome, precos: novosPrecos }).eq("id", empresaAtual.id);
  if (error) { msgEl.className = "msg erro"; msgEl.textContent = "Erro ao salvar."; return; }
  empresaAtual.nome_empresa = novoNome;
  empresaAtual.precos = novosPrecos;
  document.getElementById("nomeEmpresa").textContent = novoNome;
  msgEl.className = "msg ok"; msgEl.textContent = "Salvo!";
}

/* ===================== INÍCIO (DASHBOARD) ===================== */

const FINANCEIRO_OCULTO_KEY = 'estelar_financeiro_oculto';
const TEMA_ESCURO_KEY = 'estelar_tema_escuro';

function aplicarTema(escuro) {
  document.documentElement.setAttribute('data-tema', escuro ? 'escuro' : 'claro');
  localStorage.setItem(TEMA_ESCURO_KEY, escuro ? '1' : '0');
}

function osKanbanColuna(itens) {
  if (!itens.length) return '<p class="vazio" style="padding:10px 0;">Nada por aqui.</p>';
  return itens.map(o => `
    <div class="lista-item" style="cursor:pointer;" data-kb-os="${o.id}">
      <div class="info">
        <div class="titulo-item">${esc(o.clientes ? o.clientes.nome : (o.descricao || 'Ordem de serviço'))}</div>
        <div class="sub-item">${esc(o.descricao || '')} · ${money(o.valor || 0)}</div>
        ${o.pago ? '<span class="status-tag status-concluido">Pago</span>' : (o.status === 'concluida' ? '<span class="status-tag status-cancelado">A receber</span>' : '')}
      </div>
    </div>`).join('');
}

function osKanbanSecaoHtml(titulo, cor, itens) {
  return `<div class="kanban-secao">
    <div class="kanban-cabecalho"><span class="status-tag status-${cor}">${titulo}</span><span class="contagem">${itens.length}</span></div>
    ${osKanbanColuna(itens)}
  </div>`;
}

function ligarCliquesKanban(container) {
  container.querySelectorAll('[data-kb-os]').forEach(el => {
    el.addEventListener('click', () => osAbrirComContexto({ osId: el.getAttribute('data-kb-os') }));
  });
}

function saudacaoAtual() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const ICONE_OS = '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>';
const ICONE_CLIENTE_MAIS = '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/>';
const ICONE_MOEDA = '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5a2.5 2.5 0 0 1 2.5-1.5h.5a2 2 0 0 1 0 4h-1a2 2 0 0 0 0 4h.5a2.5 2.5 0 0 0 2.5-1.5"/>';
const ICONE_CALENDARIO_CHECK = '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/>';

async function renderInicio() {
  const conteudo = document.getElementById("conteudo");
  conteudo.innerHTML = '<div class="card"><p class="vazio">Carregando...</p></div>';

  const [{ data: osData }, { data: clientesData }, { data: agendaConcluida }] = await Promise.all([
    supabaseClient.from('ordens_servico').select('id,status,valor,pago,data_pagamento,descricao,clientes(nome)').eq('empresa_id', empresaAtual.id).order('created_at', { ascending: false }),
    supabaseClient.from('clientes').select('id,nome,intervalo_retorno_dias').eq('empresa_id', empresaAtual.id),
    supabaseClient.from('agenda').select('cliente_id,data_hora').eq('empresa_id', empresaAtual.id).eq('status', 'concluido').order('data_hora', { ascending: false })
  ]);

  const os = osData || [];
  const osPorStatus = {
    aberta: os.filter(o => o.status === 'aberta'),
    em_andamento: os.filter(o => o.status === 'em_andamento'),
    concluida: os.filter(o => o.status === 'concluida')
  };
  const emExecucao = os.filter(o => o.status !== 'concluida').reduce((s, o) => s + (parseFloat(o.valor) || 0), 0);
  const aReceber = osPorStatus.concluida.filter(o => !o.pago).reduce((s, o) => s + (parseFloat(o.valor) || 0), 0);

  const hoje = new Date();
  const recebidoMes = os.filter(o => {
    if (!o.pago || !o.data_pagamento) return false;
    const d = new Date(o.data_pagamento);
    return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  }).reduce((s, o) => s + (parseFloat(o.valor) || 0), 0);

  const ultimaVisitaPorCliente = {};
  (agendaConcluida || []).forEach(a => { if (!ultimaVisitaPorCliente[a.cliente_id]) ultimaVisitaPorCliente[a.cliente_id] = a.data_hora; });

  const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const visitas = (clientesData || [])
    .filter(c => c.intervalo_retorno_dias && ultimaVisitaPorCliente[c.id])
    .map(c => {
      const proxima = new Date(ultimaVisitaPorCliente[c.id]);
      proxima.setDate(proxima.getDate() + c.intervalo_retorno_dias);
      const diffDias = Math.round((proxima - hojeSemHora) / 86400000);
      return { id: c.id, nome: c.nome, diffDias, proxima };
    })
    .filter(v => v.diffDias <= 15)
    .sort((a, b) => a.diffDias - b.diffDias);

  const visitasHtml = visitas.length
    ? visitas.map(v => {
        const vencida = v.diffDias < 0;
        const label = vencida ? `Vencida há ${Math.abs(v.diffDias)} dia(s)` : (v.diffDias === 0 ? 'Hoje' : `Em ${v.diffDias} dias`);
        return `<div class="lista-item" style="cursor:pointer;" data-ir-cliente="${v.id}">
          <div class="info">
            <div class="titulo-item">${esc(v.nome)}</div>
            <div class="sub-item">Prevista para ${v.proxima.toLocaleDateString('pt-BR')}</div>
          </div>
          <span class="status-tag status-${vencida ? 'cancelado' : 'agendado'}">${label}</span>
        </div>`;
      }).join('')
    : '<p class="vazio">Nenhuma visita vencida ou próxima nos próximos 15 dias.</p>';

  const oculto = localStorage.getItem(FINANCEIRO_OCULTO_KEY) === '1';
  const financeiroConteudo = oculto
    ? '<p class="vazio">Valores ocultos. Toque no olho para mostrar.</p>'
    : `
      <div class="lista-item"><div class="info"><div class="titulo-item">Recebido este mês</div><div class="sub-item">Ordens de serviço pagas</div></div><span style="font-weight:800; color:var(--sucesso); font-family:'Manrope',sans-serif;">${money(recebidoMes)}</span></div>
      <div class="lista-item"><div class="info"><div class="titulo-item">A receber</div><div class="sub-item">Concluídas, ainda não pagas</div></div><span style="font-weight:800; color:var(--ambar-escuro); font-family:'Manrope',sans-serif;">${money(aReceber)}</span></div>
      <div class="lista-item"><div class="info"><div class="titulo-item">Em execução</div><div class="sub-item">OS abertas ou em andamento</div></div><span style="font-weight:800; color:var(--cinza-texto); font-family:'Manrope',sans-serif;">${money(emExecucao)}</span></div>
    `;

  conteudo.innerHTML = `
    <div class="saudacao">${saudacaoAtual()}, ${esc(empresaAtual.nome_empresa)}</div>
    <div class="saudacao-sub">${hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</div>

    <div class="atalhos-row">
      <button class="atalho-btn atalho-primario" id="btnAtalhoNovaOS">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONE_OS}</svg>
        <span>Nova OS</span>
      </button>
      <button class="atalho-btn atalho-secundario" id="btnAtalhoNovoCliente">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONE_CLIENTE_MAIS}</svg>
        <span>Novo cliente</span>
      </button>
    </div>

    <div class="card">
      <div class="card-titulo"><div class="card-icon-chip chip-azul"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONE_OS}</svg></div><h3>Ordens de serviço</h3></div>
      ${osKanbanSecaoHtml('Aberta', 'agendado', osPorStatus.aberta)}
      ${osKanbanSecaoHtml('Em andamento', 'agendado', osPorStatus.em_andamento)}
      ${osKanbanSecaoHtml('Concluída', 'concluido', osPorStatus.concluida)}
    </div>

    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div class="card-titulo" style="margin-bottom:0;"><div class="card-icon-chip chip-verde"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONE_MOEDA}</svg></div><h3>Financeiro</h3></div>
        <button class="icon-btn" id="btnOcultarFinanceiro" title="Ocultar/mostrar valores">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${oculto
            ? '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.6 18.6 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
            : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'}</svg>
        </button>
      </div>
      <div id="financeiroConteudo">${financeiroConteudo}</div>
    </div>

    <div class="card">
      <div class="card-titulo"><div class="card-icon-chip chip-ambar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONE_CALENDARIO_CHECK}</svg></div><h3>Clientes — visitas vencidas ou próximas</h3></div>
      ${visitasHtml}
    </div>
  `;

  document.getElementById('btnOcultarFinanceiro').addEventListener('click', () => {
    const novoEstado = localStorage.getItem(FINANCEIRO_OCULTO_KEY) === '1' ? '0' : '1';
    localStorage.setItem(FINANCEIRO_OCULTO_KEY, novoEstado);
    renderInicio();
  });
  conteudo.querySelectorAll('[data-ir-cliente]').forEach(el => {
    el.addEventListener('click', () => irParaFichaCliente(el.getAttribute('data-ir-cliente')));
  });
  ligarCliquesKanban(conteudo);
  document.getElementById('btnAtalhoNovaOS').addEventListener('click', irParaNovaOS);
  document.getElementById('btnAtalhoNovoCliente').addEventListener('click', irParaNovoClienteAtalho);
}

async function irParaNovoClienteAtalho() {
  ativarTab('clientes');
  await renderClientes();
  const campo = document.getElementById('clNome');
  if (campo) campo.focus();
}

async function irParaNovaOS() {
  ativarTab('agenda');
  await renderAgenda();
  agModo = 'novaOS';
  await agAtualizarDinamico();
}

async function agRenderNovaOS(card) {
  const { data: clientes } = await supabaseClient.from('clientes').select('id,nome').eq('empresa_id', empresaAtual.id).order('nome');
  const opcoes = (clientes || []).map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
  card.innerHTML = `
    <div class="voltar-link" id="novaOsVoltarBtn" style="margin-top:0;margin-bottom:10px;text-align:left;">← Voltar ao calendário</div>
    <h3 style="font-size:15px;">Nova ordem de serviço</h3>
    <p class="note" style="margin-top:-4px;">Toda OS parte de um orçamento ou contrato já salvo do cliente. Escolha o cliente pra ver as opções.</p>
    <label>Cliente</label>
    <select id="novaOsCliente"><option value="">— selecionar cliente —</option>${opcoes}</select>
    <div id="novaOsOrigens"></div>
  `;
  document.getElementById('novaOsVoltarBtn').addEventListener('click', () => { agModo = 'calendario'; agAtualizarDinamico(); });
  document.getElementById('novaOsCliente').addEventListener('change', novaOsCarregarOrigens);
}

async function novaOsCarregarOrigens() {
  const cid = document.getElementById('novaOsCliente').value;
  const container = document.getElementById('novaOsOrigens');
  if (!cid) { container.innerHTML = ''; return; }
  container.innerHTML = '<p class="vazio">Carregando orçamentos e contratos...</p>';

  const [{ data: orcamentos }, { data: contratos }] = await Promise.all([
    supabaseClient.from('orcamentos').select('id,dados,valor_total,created_at').eq('cliente_id', cid).order('created_at', { ascending: false }),
    supabaseClient.from('contratos').select('id,valor_visita,created_at,status').eq('cliente_id', cid).order('created_at', { ascending: false })
  ]);

  const itensOrcamento = (orcamentos || []).map(o => `
    <div class="lista-item" style="cursor:pointer;" data-nova-os-orcamento="${o.id}">
      <div class="info">
        <div class="titulo-item">${esc((o.dados && o.dados.numero) || 'Orçamento')} · ${money(o.valor_total || 0)}</div>
        <div class="sub-item">${new Date(o.created_at).toLocaleDateString('pt-BR')} · Orçamento avulso</div>
      </div>
    </div>`).join('');

  const itensContrato = (contratos || []).map(c => `
    <div class="lista-item" style="cursor:pointer;" data-nova-os-contrato="${c.id}">
      <div class="info">
        <div class="titulo-item">Contrato de manutenção · ${money(c.valor_visita || 0)}/visita</div>
        <div class="sub-item">${new Date(c.created_at).toLocaleDateString('pt-BR')}</div>
      </div>
    </div>`).join('');

  if (!itensOrcamento && !itensContrato) {
    container.innerHTML = `<p class="vazio">Este cliente ainda não tem orçamento ou contrato salvo. Crie um na aba Orçamento ou Contrato primeiro, vinculado a ele.</p>`;
    return;
  }

  container.innerHTML = `
    ${itensOrcamento ? `<label style="margin-top:16px;">Orçamentos salvos</label>${itensOrcamento}` : ''}
    ${itensContrato ? `<label style="margin-top:16px;">Contratos salvos</label>${itensContrato}` : ''}
  `;
  container.querySelectorAll('[data-nova-os-orcamento]').forEach(el => {
    el.addEventListener('click', () => osAbrirComContexto({ orcamentoId: el.getAttribute('data-nova-os-orcamento') }));
  });
  container.querySelectorAll('[data-nova-os-contrato]').forEach(el => {
    el.addEventListener('click', () => osAbrirComContexto({ contratoId: el.getAttribute('data-nova-os-contrato') }));
  });
}

/* ===================== INÍCIO (DASHBOARD) FIM ===================== */

/* ===================== CLIENTES ===================== */
let clientesCache = [];

async function renderClientes() {
  const conteudo = document.getElementById("conteudo");
  conteudo.innerHTML = `
    <div id="clAvisoLimite"></div>
    <button class="btn" id="clAbrirFormBtn">+ Novo cliente</button>
    <div class="card hidden" id="clFormCard">
      <h3>Novo cliente</h3>
      <label>Nome</label><input type="text" id="clNome" placeholder="Nome do cliente">
      <label>Telefone</label><input type="text" id="clTelefone" placeholder="(18) 99999-9999">
      <label>E-mail</label><input type="text" id="clEmail" placeholder="cliente@email.com">
      <label>Endereço</label><input type="text" id="clEndereco" placeholder="Rua, número, bairro, cidade">
      <label>Observações</label><input type="text" id="clObs" placeholder="Opcional">
      <label>Intervalo de retorno (manutenção)</label>
      <select id="clIntervalo">
        <option value="">Não controlar</option>
        <option value="30">A cada 30 dias</option>
        <option value="60">A cada 60 dias</option>
        <option value="90">A cada 90 dias</option>
        <option value="180">A cada 6 meses</option>
        <option value="365">A cada 12 meses</option>
      </select>
      <div class="msg" id="clMsg"></div>
      <button class="btn" id="clSalvarBtn">Salvar cliente</button>
    </div>
    <div class="card">
      <h3>Clientes cadastrados</h3>
      <input type="text" id="clBusca" placeholder="Buscar por nome, telefone ou e-mail...">
      <div id="clLista" style="margin-top:12px;"><p class="vazio">Carregando...</p></div>
    </div>
  `;
  document.getElementById("clAbrirFormBtn").addEventListener("click", () => {
    document.getElementById("clFormCard").classList.remove("hidden");
    document.getElementById("clAbrirFormBtn").classList.add("hidden");
    document.getElementById("clNome").focus();
  });
  document.getElementById("clSalvarBtn").addEventListener("click", clSalvarNovo);
  document.getElementById("clBusca").addEventListener("input", (e) => clRenderLista(e.target.value.trim().toLowerCase()));
  await clCarregarLista();
}

const LIMITE_CLIENTES_GRATIS = 10;
const AVISO_CLIENTES_GRATIS = 8;

function planoEfetivo() {
  if (empresaAtual.cortesia) return 'completo';
  return empresaAtual.plano || 'gratis';
}

function atualizarAvisoLimiteClientes() {
  const avisoEl = document.getElementById('clAvisoLimite');
  const formBtn = document.getElementById('clAbrirFormBtn');
  if (!avisoEl) return;

  if (planoEfetivo() !== 'gratis') { avisoEl.innerHTML = ''; if (formBtn) formBtn.classList.remove('hidden'); return; }

  const total = clientesCache.length;
  if (total >= LIMITE_CLIENTES_GRATIS) {
    avisoEl.innerHTML = `
      <div class="card" style="border-color:var(--erro); background:#fef2f2;">
        <b style="color:#b91c1c;">Limite do plano grátis atingido (${LIMITE_CLIENTES_GRATIS} clientes)</b>
        <p class="note" style="margin-top:6px;">Pra cadastrar novos clientes, assine o Básico ou o Completo.</p>
        <button class="btn" onclick="mostrarAba('config')">Ver planos</button>
      </div>`;
    if (formBtn) formBtn.classList.add('hidden');
  } else if (total >= AVISO_CLIENTES_GRATIS) {
    avisoEl.innerHTML = `
      <div class="card" style="border-color:var(--ambar); background:#fffbeb;">
        <b style="color:var(--ambar-escuro);">Você já tem ${total} de ${LIMITE_CLIENTES_GRATIS} clientes do plano grátis</b>
        <p class="note" style="margin-top:6px;">Quando atingir o limite, não vai dar pra cadastrar clientes novos. Que tal assinar o Básico ou o Completo?</p>
        <button class="btn btn-secundario" onclick="mostrarAba('config')">Ver planos</button>
      </div>`;
    if (formBtn) formBtn.classList.remove('hidden');
  } else {
    avisoEl.innerHTML = '';
    if (formBtn) formBtn.classList.remove('hidden');
  }
}

async function clCarregarLista() {
  const { data, error } = await supabaseClient.from("clientes").select("*").eq("empresa_id", empresaAtual.id).order("nome");
  if (error) { document.getElementById("clLista").innerHTML = '<p class="msg erro">Erro ao carregar clientes.</p>'; return; }
  clientesCache = data;
  clRenderLista('');
  atualizarAvisoLimiteClientes();
}

function clRenderLista(termo) {
  const listaEl = document.getElementById("clLista");
  const filtrados = !termo ? clientesCache : clientesCache.filter(c =>
    (c.nome || '').toLowerCase().includes(termo) ||
    (c.telefone || '').toLowerCase().includes(termo) ||
    (c.email || '').toLowerCase().includes(termo)
  );
  if (!clientesCache.length) { listaEl.innerHTML = '<p class="vazio">Nenhum cliente cadastrado ainda.</p>'; return; }
  if (!filtrados.length) { listaEl.innerHTML = '<p class="vazio">Nenhum cliente encontrado.</p>'; return; }
  listaEl.innerHTML = filtrados.map(c => `
    <div class="lista-item" style="cursor:pointer;" data-ver-cliente="${c.id}">
      <div class="info">
        <div class="titulo-item">${esc(c.nome)}</div>
        <div class="sub-item">${esc([c.telefone, c.email].filter(Boolean).join(' · ') || '—')}</div>
        ${c.endereco ? `<div class="sub-item">${esc(c.endereco)}</div>` : ''}
      </div>
      <div class="acoes">
        <button class="icon-btn perigo" data-del-cliente="${c.id}">✕</button>
      </div>
    </div>
  `).join('');
  listaEl.querySelectorAll('[data-ver-cliente]').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('[data-del-cliente]')) return;
      clVerDetalhes(item.getAttribute('data-ver-cliente'));
    });
  });
  listaEl.querySelectorAll('[data-del-cliente]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); clExcluir(btn.getAttribute('data-del-cliente')); });
  });
}

async function clVerDetalhes(id) {
  const cliente = clientesCache.find(c => c.id === id);
  if (!cliente) return;
  const conteudo = document.getElementById("conteudo");
  conteudo.innerHTML = `<div class="card"><p class="vazio">Carregando...</p></div>`;

  const [{ data: orcamentos }, { data: agendaItens }, { data: osItens }, { data: contratosItens }] = await Promise.all([
    supabaseClient.from('orcamentos').select('*').eq('cliente_id', id).order('created_at', { ascending: false }),
    supabaseClient.from('agenda').select('*').eq('cliente_id', id).order('data_hora', { ascending: false }),
    supabaseClient.from('ordens_servico').select('*').eq('cliente_id', id).order('created_at', { ascending: false }),
    supabaseClient.from('contratos').select('*').eq('cliente_id', id).order('created_at', { ascending: false })
  ]);

  const orcamentosHtml = (orcamentos && orcamentos.length)
    ? orcamentos.map(o => `
        <div class="lista-item" style="cursor:pointer;" data-ver-orcamento="${o.id}">
          <div class="info">
            <div class="titulo-item">${(o.dados && o.dados.numero) || 'Orçamento'} · ${money(o.valor_total || 0)}</div>
            <div class="sub-item">${new Date(o.created_at).toLocaleDateString('pt-BR')} · ${o.tipo === 'avulso' ? 'Orçamento avulso' : o.tipo}</div>
          </div>
        </div>`).join('')
    : '<p class="vazio">Nenhum orçamento salvo ainda.</p>';

  const agendaHtml = (agendaItens && agendaItens.length)
    ? agendaItens.map(a => `
        <div class="lista-item" style="cursor:pointer;" data-abrir-compromisso="${a.id}">
          <div class="info">
            <div class="titulo-item">${esc(a.titulo)}</div>
            <div class="sub-item">${agFormatarData(a.data_hora)} · ${agTipoLabel(a.tipo)}</div>
            <span class="status-tag status-${a.status}">${a.status}</span>
          </div>
        </div>`).join('')
    : '<p class="vazio">Nenhum compromisso registrado ainda.</p>';

  const osStatusLabel = { aberta: 'Aberta', em_andamento: 'Em andamento', concluida: 'Concluída' };
  const formaPagamentoLabel = { dinheiro: 'Dinheiro', pix: 'PIX', debito: 'Débito', credito: 'Crédito', transferencia: 'Transferência', boleto: 'Boleto', combinar: 'A combinar' };
  const osHtml = (osItens && osItens.length)
    ? osItens.map(o => `
        <div class="lista-item" style="cursor:pointer;" data-abrir-os="${o.id}">
          <div class="info">
            <div class="titulo-item">${esc(o.descricao || 'Ordem de serviço')} · ${money(o.valor || 0)}</div>
            <div class="sub-item">${new Date(o.created_at).toLocaleDateString('pt-BR')}</div>
            <span class="status-tag status-${o.status === 'concluida' ? 'concluido' : 'agendado'}">${osStatusLabel[o.status] || o.status}</span>
            ${o.pago ? `<span class="status-tag status-concluido" style="margin-left:4px;">Pago · ${formaPagamentoLabel[o.forma_pagamento] || o.forma_pagamento || ''}</span>` : (o.status === 'concluida' ? '<span class="status-tag status-cancelado" style="margin-left:4px;">A receber</span>' : '')}
          </div>
        </div>`).join('')
    : '<p class="vazio">Nenhuma ordem de serviço registrada ainda.</p>';

  const ctStatusLabel = { rascunho: 'Rascunho', ativo: 'Ativo', expirado: 'Expirado', cancelado: 'Cancelado' };
  const contratosHtml = (contratosItens && contratosItens.length)
    ? contratosItens.map(c => `
        <div class="lista-item">
          <div class="info">
            <div class="titulo-item">Contrato de manutenção · ${money(c.valor_visita || 0)}/visita</div>
            <div class="sub-item">${new Date(c.created_at).toLocaleDateString('pt-BR')} · ${ctStatusLabel[c.status] || c.status}</div>
          </div>
          <div class="acoes"><button class="icon-btn perigo" data-del-contrato="${c.id}">✕</button></div>
        </div>`).join('')
    : '<p class="vazio">Nenhum contrato registrado ainda.</p>';

  conteudo.innerHTML = `
    <div class="card" id="clDadosCard">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div style="flex:1;">
          <h3>${esc(cliente.nome)}</h3>
          <div class="sub-item">${esc([cliente.telefone, cliente.email].filter(Boolean).join(' · ') || '—')}</div>
          ${cliente.endereco ? `<div class="sub-item">${esc(cliente.endereco)}</div>` : ''}
          ${cliente.observacoes ? `<div class="sub-item" style="margin-top:6px;">${esc(cliente.observacoes)}</div>` : ''}
        </div>
        <button class="icon-btn" id="clEditarBtn" title="Editar dados">✎</button>
      </div>
    </div>
    <div class="card">
      <h3>Controle de visitas</h3>
      <label>Intervalo de retorno (manutenção)</label>
      <select id="clIntervaloEdit">
        <option value="">Não controlar</option>
        <option value="30">A cada 30 dias</option>
        <option value="60">A cada 60 dias</option>
        <option value="90">A cada 90 dias</option>
        <option value="180">A cada 6 meses</option>
        <option value="365">A cada 12 meses</option>
      </select>
      <div class="msg" id="clIntervaloMsg"></div>
      <div class="sub-item" id="clProximaVisita" style="margin-top:10px;"></div>
    </div>
    <div class="card">
      <h3>Orçamentos</h3>
      ${orcamentosHtml}
    </div>
    <div class="card">
      <h3>Ordens de serviço</h3>
      ${osHtml}
    </div>
    <div class="card">
      <h3>Contratos</h3>
      ${contratosHtml}
    </div>
    <div class="card">
      <h3>Agenda</h3>
      ${agendaHtml}
    </div>
    <div class="voltar-link" id="clVoltarBtn">← Voltar para a lista de clientes</div>
  `;
  document.getElementById('clVoltarBtn').addEventListener('click', renderClientes);
  document.getElementById('clEditarBtn').addEventListener('click', () => clMostrarEdicao(cliente));
  conteudo.querySelectorAll('[data-ver-orcamento]').forEach(el => {
    el.addEventListener('click', () => clVerOrcamento(el.getAttribute('data-ver-orcamento'), id));
  });
  conteudo.querySelectorAll('[data-abrir-compromisso]').forEach(el => {
    el.addEventListener('click', () => clAbrirAgendaItem(el.getAttribute('data-abrir-compromisso')));
  });
  conteudo.querySelectorAll('[data-abrir-os]').forEach(el => {
    el.addEventListener('click', () => osAbrirComContexto({ osId: el.getAttribute('data-abrir-os') }));
  });
  conteudo.querySelectorAll('[data-del-contrato]').forEach(el => {
    el.addEventListener('click', () => ctExcluirContrato(el.getAttribute('data-del-contrato'), id));
  });

  const selIntervalo = document.getElementById('clIntervaloEdit');
  selIntervalo.value = cliente.intervalo_retorno_dias ? String(cliente.intervalo_retorno_dias) : '';
  clAtualizarProximaVisita(cliente, agendaItens);
  selIntervalo.addEventListener('change', async () => {
    const msgEl = document.getElementById('clIntervaloMsg');
    const novoValor = selIntervalo.value ? parseInt(selIntervalo.value) : null;
    const { error } = await supabaseClient.from('clientes').update({ intervalo_retorno_dias: novoValor }).eq('id', id);
    if (error) { msgEl.className = 'msg erro'; msgEl.textContent = 'Erro ao salvar.'; return; }
    cliente.intervalo_retorno_dias = novoValor;
    const idxCache = clientesCache.findIndex(c => c.id === id);
    if (idxCache >= 0) clientesCache[idxCache].intervalo_retorno_dias = novoValor;
    msgEl.className = 'msg ok'; msgEl.textContent = 'Salvo!';
    clAtualizarProximaVisita(cliente, agendaItens);
  });
}

function clMostrarEdicao(cliente) {
  const card = document.getElementById('clDadosCard');
  card.innerHTML = `
    <h3>Editar cliente</h3>
    <label>Nome</label><input type="text" id="clEditNome" value="${esc(cliente.nome)}">
    <label>Telefone</label><input type="text" id="clEditTelefone" value="${esc(cliente.telefone || '')}">
    <label>E-mail</label><input type="text" id="clEditEmail" value="${esc(cliente.email || '')}">
    <label>Endereço</label><input type="text" id="clEditEndereco" value="${esc(cliente.endereco || '')}">
    <label>Observações</label><input type="text" id="clEditObs" value="${esc(cliente.observacoes || '')}">
    <div class="msg" id="clEditMsg"></div>
    <div class="action-row">
      <button class="btn" id="clEditSalvarBtn">Salvar</button>
      <button class="btn btn-secundario" id="clEditCancelarBtn">Cancelar</button>
    </div>
  `;
  document.getElementById('clEditSalvarBtn').addEventListener('click', () => clSalvarEdicao(cliente.id));
  document.getElementById('clEditCancelarBtn').addEventListener('click', () => clVerDetalhes(cliente.id));
}

async function clSalvarEdicao(id) {
  const msg = document.getElementById('clEditMsg');
  const nome = document.getElementById('clEditNome').value.trim();
  if (!nome) { msg.className = 'msg erro'; msg.textContent = 'O nome não pode ficar vazio.'; return; }
  const { error } = await supabaseClient.from('clientes').update({
    nome,
    telefone: document.getElementById('clEditTelefone').value.trim(),
    email: document.getElementById('clEditEmail').value.trim(),
    endereco: document.getElementById('clEditEndereco').value.trim(),
    observacoes: document.getElementById('clEditObs').value.trim()
  }).eq('id', id);
  if (error) { msg.className = 'msg erro'; msg.textContent = 'Erro ao salvar.'; return; }
  const idxCache = clientesCache.findIndex(c => c.id === id);
  if (idxCache >= 0) Object.assign(clientesCache[idxCache], { nome, telefone: document.getElementById('clEditTelefone').value.trim(), email: document.getElementById('clEditEmail').value.trim(), endereco: document.getElementById('clEditEndereco').value.trim(), observacoes: document.getElementById('clEditObs').value.trim() });
  await clVerDetalhes(id);
}

async function ctExcluirContrato(contratoId, clienteId) {
  if (!confirm('Excluir este contrato? Essa ação não pode ser desfeita.')) return;
  const { error } = await supabaseClient.from('contratos').delete().eq('id', contratoId);
  if (error) { alert('Erro ao excluir contrato.'); return; }
  await clVerDetalhes(clienteId);
}

function clAtualizarProximaVisita(cliente, agendaItens) {
  const el = document.getElementById('clProximaVisita');
  if (!cliente.intervalo_retorno_dias) { el.textContent = ''; return; }
  const concluidas = (agendaItens || []).filter(a => a.status === 'concluido');
  if (!concluidas.length) { el.textContent = 'Ainda sem visita concluída registrada — a contagem começa após a primeira.'; return; }
  const ultima = new Date(concluidas[0].data_hora);
  const proxima = new Date(ultima);
  proxima.setDate(proxima.getDate() + cliente.intervalo_retorno_dias);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const diffDias = Math.round((proxima - hoje) / 86400000);
  const dataFmt = proxima.toLocaleDateString('pt-BR');
  if (diffDias < 0) el.innerHTML = `<span class="status-tag status-cancelado">Vencida há ${Math.abs(diffDias)} dia(s)</span> próxima visita prevista: ${dataFmt}`;
  else if (diffDias === 0) el.innerHTML = `<span class="status-tag status-agendado">Hoje</span> próxima visita prevista: ${dataFmt}`;
  else el.innerHTML = `Última visita: ${ultima.toLocaleDateString('pt-BR')} · próxima prevista: ${dataFmt} (em ${diffDias} dias)`;
}

async function clVerOrcamento(orcamentoId, clienteId) {
  const conteudo = document.getElementById("conteudo");
  conteudo.innerHTML = '<div class="card"><p class="vazio">Carregando...</p></div>';
  const { data: orc, error } = await supabaseClient.from('orcamentos').select('*').eq('id', orcamentoId).single();
  if (error || !orc) { conteudo.innerHTML = '<div class="card"><p class="msg erro">Não foi possível carregar o orçamento.</p></div>'; return; }

  const itens = (orc.dados && orc.dados.items) || [];
  const itensHtml = itens.length
    ? itens.map(it => {
        const d = avItemDescricaoCliente(it);
        return `<div class="lista-item"><div class="info"><div class="titulo-item">${esc(d.titulo)}</div><div class="sub-item">${esc(d.detalhe)}</div></div></div>`;
      }).join('')
    : '<p class="vazio">Sem detalhes de itens salvos.</p>';

  conteudo.innerHTML = `
    <div class="card">
      <h3>${(orc.dados && orc.dados.numero) || 'Orçamento'}</h3>
      <div class="sub-item">${new Date(orc.created_at).toLocaleDateString('pt-BR')}</div>
      <div class="item-subtotal" style="margin-top:10px;"><span>Valor total</span><b>${money(orc.valor_total || 0)}</b></div>
    </div>
    <div class="card"><h3>Itens</h3>${itensHtml}</div>
    <button class="btn btn-ambar" id="orcCriarOSBtn">Transformar em Ordem de Serviço</button>
    <button class="btn btn-secundario" id="orcExcluirBtn" style="color:var(--erro); border-color:var(--erro);">Excluir este orçamento</button>
    <div class="voltar-link" id="orcVoltarBtn">← Voltar para o cliente</div>
  `;
  document.getElementById('orcVoltarBtn').addEventListener('click', () => clVerDetalhes(clienteId));
  document.getElementById('orcCriarOSBtn').addEventListener('click', () => osAbrirComContexto({ agendaId: null, orcamentoId }));
  document.getElementById('orcExcluirBtn').addEventListener('click', () => orcExcluir(orcamentoId, clienteId));
}

async function orcExcluir(orcamentoId, clienteId) {
  if (!confirm('Excluir este orçamento? Se houver uma Ordem de Serviço vinculada a ele, ela deixará de estar associada a este orçamento, mas não será apagada. Essa ação não pode ser desfeita.')) return;
  await supabaseClient.from('ordens_servico').update({ orcamento_id: null }).eq('orcamento_id', orcamentoId);
  const { error } = await supabaseClient.from('orcamentos').delete().eq('id', orcamentoId);
  if (error) { alert('Erro ao excluir orçamento.'); return; }
  await clVerDetalhes(clienteId);
}

async function irParaFichaCliente(clienteId) {
  if (!clienteId) return;
  ativarTab('clientes');
  await renderClientes();
  await clVerDetalhes(clienteId);
}

async function clAbrirAgendaItem(agendaId) {
  ativarTab('agenda');
  await renderAgenda();
  agAgendaSelecionadaId = agendaId;
  agModo = 'compromisso';
  await agAtualizarDinamico();
}

async function osAbrirComContexto(ctx) {
  ativarTab('agenda');
  await renderAgenda();
  osContexto = ctx;
  agModo = 'os';
  await agAtualizarDinamico();
}

async function clSalvarNovo() {
  const nome = document.getElementById('clNome').value.trim();
  const msg = document.getElementById('clMsg');
  if (!nome) { msg.className = 'msg erro'; msg.textContent = 'Digite o nome do cliente.'; return; }
  if (planoEfetivo() === 'gratis' && clientesCache.length >= LIMITE_CLIENTES_GRATIS) {
    msg.className = 'msg erro';
    msg.textContent = `O plano grátis permite até ${LIMITE_CLIENTES_GRATIS} clientes. Assine o Básico ou o Completo pra continuar cadastrando.`;
    return;
  }
  const { error } = await supabaseClient.from('clientes').insert({
    empresa_id: empresaAtual.id,
    nome,
    telefone: document.getElementById('clTelefone').value.trim(),
    email: document.getElementById('clEmail').value.trim(),
    endereco: document.getElementById('clEndereco').value.trim(),
    observacoes: document.getElementById('clObs').value.trim(),
    intervalo_retorno_dias: document.getElementById('clIntervalo').value ? parseInt(document.getElementById('clIntervalo').value) : null
  });
  if (error) { msg.className = 'msg erro'; msg.textContent = 'Erro ao salvar cliente.'; return; }
  ['clNome','clTelefone','clEmail','clEndereco','clObs'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('clIntervalo').value = '';
  msg.className = 'msg ok'; msg.textContent = 'Cliente salvo!';
  await clCarregarLista();
}

async function clExcluir(id) {
  if (!confirm('Excluir este cliente? Isso também apaga os orçamentos, agendamentos, ordens de serviço e contratos vinculados a ele. Essa ação não pode ser desfeita.')) return;
  await supabaseClient.from('ordens_servico').delete().eq('cliente_id', id);
  await supabaseClient.from('agenda').delete().eq('cliente_id', id);
  await supabaseClient.from('orcamentos').delete().eq('cliente_id', id);
  await supabaseClient.from('contratos').delete().eq('cliente_id', id);
  const { error } = await supabaseClient.from('clientes').delete().eq('id', id);
  if (error) { alert('Erro ao excluir cliente.'); return; }
  await clCarregarLista();
}

/* ===================== AGENDA (CALENDÁRIO + OS) ===================== */

let agModo = 'calendario';
let agCalendarRef = null;
let agDiaSelecionado = null;
let agAgendaSelecionadaId = null;
let agAgendaAtualObj = null;
let osContexto = null;

async function renderAgenda() {
  agModo = 'calendario';
  if (!agCalendarRef) agCalendarRef = new Date();
  const conteudo = document.getElementById("conteudo");
  const { data: clientes } = await supabaseClient.from("clientes").select("id,nome").eq("empresa_id", empresaAtual.id).order("nome");
  const opcoesClientes = (clientes || []).map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');

  conteudo.innerHTML = `
    <div class="atalhos-row">
      <button class="atalho-btn atalho-primario" id="agAbrirNovaOSBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONE_OS}</svg>
        <span>Nova OS</span>
      </button>
      <button class="atalho-btn atalho-secundario" id="agAbrirFormBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>Novo compromisso</span>
      </button>
    </div>
    <div class="card hidden" id="agFormCard">
      <h3>Novo compromisso</h3>
      <p class="note" style="margin-top:-6px;">Pra reuniões, visitas técnicas ou qualquer coisa que não seja uma Ordem de Serviço. Se for um serviço, use "Nova OS" em vez disso.</p>
      <label>Título</label><input type="text" id="agTitulo" placeholder="Ex: Reunião com fornecedor, visita técnica...">
      <label>Tipo</label>
      <select id="agTipo">
        <option value="visita">Visita técnica</option>
        <option value="reuniao">Reunião</option>
        <option value="outro">Outro</option>
      </select>
      <label>Cliente (opcional)</label>
      <select id="agCliente"><option value="">— nenhum —</option>${opcoesClientes}</select>
      <label>Data e hora</label><input type="datetime-local" id="agDataHora">
      <label>Observações</label><input type="text" id="agObs" placeholder="Opcional">
      <div class="msg" id="agMsg"></div>
      <button class="btn" id="agSalvarBtn">Adicionar à agenda</button>
    </div>
    <button class="btn btn-secundario" id="agVerKanbanBtn">📋 Ver ordens de serviço por status</button>
    <div class="card" id="agDinamicoCard"><p class="vazio">Carregando...</p></div>
  `;
  document.getElementById("agAbrirNovaOSBtn").addEventListener("click", irParaNovaOS);
  document.getElementById("agAbrirFormBtn").addEventListener("click", () => {
    document.getElementById("agFormCard").classList.remove("hidden");
    document.getElementById("agTitulo").focus();
  });
  document.getElementById("agSalvarBtn").addEventListener("click", agSalvarNovo);
  document.getElementById("agVerKanbanBtn").addEventListener("click", () => { agModo = 'kanban'; agAtualizarDinamico(); });
  await agAtualizarDinamico();
}

async function agSalvarNovo() {
  const titulo = document.getElementById('agTitulo').value.trim();
  const dataHora = document.getElementById('agDataHora').value;
  const msg = document.getElementById('agMsg');
  if (!titulo || !dataHora) { msg.className = 'msg erro'; msg.textContent = 'Preencha título e data/hora.'; return; }
  const clienteId = document.getElementById('agCliente').value || null;
  const { error } = await supabaseClient.from('agenda').insert({
    empresa_id: empresaAtual.id,
    cliente_id: clienteId,
    titulo,
    tipo: document.getElementById('agTipo').value,
    data_hora: new Date(dataHora).toISOString(),
    observacoes: document.getElementById('agObs').value.trim()
  });
  if (error) { msg.className = 'msg erro'; msg.textContent = 'Erro ao salvar.'; return; }
  const dataObj = new Date(dataHora);
  ['agTitulo', 'agDataHora', 'agObs'].forEach(id => document.getElementById(id).value = '');
  msg.className = 'msg ok'; msg.textContent = 'Adicionado!';
  agModo = 'calendario';
  agCalendarRef = new Date(dataObj.getFullYear(), dataObj.getMonth(), 1);
  await agAtualizarDinamico();
}

function agTipoLabel(t) {
  return { visita: 'Visita técnica', reuniao: 'Reunião', instalacao: 'Instalação', manutencao: 'Manutenção', outro: 'Outro' }[t] || t;
}

function agFormatarData(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

async function agAtualizarStatus(id, status) {
  await supabaseClient.from('agenda').update({ status }).eq('id', id);
  await agAtualizarDinamico();
}

async function agAtualizarDinamico() {
  const card = document.getElementById('agDinamicoCard');
  card.innerHTML = '<p class="vazio">Carregando...</p>';
  if (agModo === 'calendario') await agRenderCalendario(card);
  else if (agModo === 'dia') await agRenderDia(card);
  else if (agModo === 'compromisso') await agRenderCompromisso(card);
  else if (agModo === 'os') await agRenderOS(card);
  else if (agModo === 'kanban') await agRenderKanban(card);
  else if (agModo === 'novaOS') await agRenderNovaOS(card);
}

async function irParaKanbanOS() {
  ativarTab('agenda');
  await renderAgenda();
  agModo = 'kanban';
  await agAtualizarDinamico();
}

async function agRenderKanban(card) {
  const { data, error } = await supabaseClient
    .from('ordens_servico')
    .select('id, descricao, valor, status, pago, created_at, clientes(nome)')
    .eq('empresa_id', empresaAtual.id)
    .order('created_at', { ascending: false });

  if (error) { card.innerHTML = '<button class="btn btn-secundario" id="kbVoltarBtn">← Voltar ao calendário</button><p class="msg erro">Erro ao carregar ordens de serviço.</p>'; document.getElementById('kbVoltarBtn').addEventListener('click', () => { agModo = 'calendario'; agAtualizarDinamico(); }); return; }

  const os = data || [];
  const html = osKanbanSecaoHtml('Aberta', 'agendado', os.filter(o => o.status === 'aberta'))
    + osKanbanSecaoHtml('Em andamento', 'agendado', os.filter(o => o.status === 'em_andamento'))
    + osKanbanSecaoHtml('Concluída', 'concluido', os.filter(o => o.status === 'concluida'));

  card.innerHTML = `
    <button class="btn btn-secundario" id="kbVoltarBtn" style="margin-top:0; margin-bottom:16px;">← Voltar ao calendário</button>
    <h3 style="font-size:16px;">Ordens de serviço por status</h3>
    ${html}
  `;
  document.getElementById('kbVoltarBtn').addEventListener('click', () => { agModo = 'calendario'; agAtualizarDinamico(); });
  ligarCliquesKanban(card);
}

function agParaInputDatetime(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function agRenderCompromisso(card) {
  const { data: ag } = await supabaseClient.from('agenda').select('*, clientes(nome)').eq('id', agAgendaSelecionadaId).single();
  agAgendaAtualObj = ag;

  const { data: osVinculada } = await supabaseClient.from('ordens_servico').select('id,valor,status,dados').eq('agenda_id', agAgendaSelecionadaId).maybeSingle();
  const itensOS = osVinculada ? osExtrairItensParaExibir(osVinculada.dados) : [];
  const resumoServico = itensOS.length ? itensOS.map(i => i.titulo).join(', ') : agTipoLabel(ag.tipo);

  card.innerHTML = `
    <div class="voltar-link" id="cpVoltarBtn" style="margin-top:0;margin-bottom:10px;text-align:left;">← Voltar</div>
    <h3 style="font-size:15px;">${ag.clientes ? esc(ag.clientes.nome) : 'Sem cliente vinculado'}</h3>
    ${ag.cliente_id ? `<div class="voltar-link" id="cpVerClienteBtn" style="margin-top:0; margin-bottom:12px; text-align:left;">Ver ficha completa do cliente →</div>` : ''}
    <div class="card" style="margin-bottom:16px;">
      <div style="font-size:12px; color:var(--cinza-texto); font-weight:600; text-transform:uppercase; margin-bottom:4px;">Serviço</div>
      <div style="font-weight:700; font-size:14.5px;">${esc(resumoServico)}</div>
      ${osVinculada ? `<div class="sub-item" style="margin-top:4px;">${money(osVinculada.valor || 0)}</div>` : ''}
    </div>
    <label>Título</label><input type="text" id="cpTitulo" value="${esc(ag.titulo || '')}">
    <label>Data e hora</label><input type="datetime-local" id="cpDataHora" value="${agParaInputDatetime(ag.data_hora)}">
    <label>Status</label>
    <select id="cpStatus">
      <option value="agendado" ${ag.status === 'agendado' ? 'selected' : ''}>Agendado</option>
      <option value="concluido" ${ag.status === 'concluido' ? 'selected' : ''}>Concluído</option>
      <option value="cancelado" ${ag.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
    </select>
    <label>Observações</label><input type="text" id="cpObs" value="${esc(ag.observacoes || '')}">
    <div class="msg" id="cpMsg"></div>
    <button class="btn" id="cpSalvarBtn">Salvar alterações</button>
    ${osVinculada ? `<button class="btn btn-secundario" id="cpAbrirOSBtn">Ver Ordem de Serviço</button>` : ''}
    <button class="btn btn-secundario" id="cpExcluirBtn" style="color:var(--erro); border-color:var(--erro);">Excluir este compromisso</button>
  `;
  document.getElementById('cpVoltarBtn').addEventListener('click', () => { agModo = 'dia'; agAtualizarDinamico(); });
  document.getElementById('cpSalvarBtn').addEventListener('click', cpSalvar);
  document.getElementById('cpAbrirOSBtn')?.addEventListener('click', () => osAbrirComContexto({ osId: osVinculada.id }));
  document.getElementById('cpExcluirBtn').addEventListener('click', cpExcluir);
  if (ag.cliente_id) document.getElementById('cpVerClienteBtn').addEventListener('click', () => irParaFichaCliente(ag.cliente_id));
}

async function cpSalvar() {
  const msg = document.getElementById('cpMsg');
  const dataHora = document.getElementById('cpDataHora').value;
  if (!dataHora) { msg.className = 'msg erro'; msg.textContent = 'Escolha data e hora.'; return; }
  const { error } = await supabaseClient.from('agenda').update({
    titulo: document.getElementById('cpTitulo').value.trim(),
    data_hora: new Date(dataHora).toISOString(),
    status: document.getElementById('cpStatus').value,
    observacoes: document.getElementById('cpObs').value.trim()
  }).eq('id', agAgendaSelecionadaId);
  if (error) { msg.className = 'msg erro'; msg.textContent = 'Erro ao salvar.'; return; }
  msg.className = 'msg ok'; msg.textContent = 'Salvo!';
}

async function cpExcluir() {
  if (!confirm('Excluir este compromisso? Se houver uma Ordem de Serviço vinculada, ela deixará de estar associada a um agendamento, mas não será apagada. Essa ação não pode ser desfeita.')) return;
  const msg = document.getElementById('cpMsg');
  await supabaseClient.from('ordens_servico').update({ agenda_id: null }).eq('agenda_id', agAgendaSelecionadaId);
  const { error } = await supabaseClient.from('agenda').delete().eq('id', agAgendaSelecionadaId);
  if (error) { msg.className = 'msg erro'; msg.textContent = 'Erro ao excluir.'; return; }
  agModo = 'dia';
  agAtualizarDinamico();
}

async function agRenderCalendario(card) {
  const ref = agCalendarRef;
  const ano = ref.getFullYear(), mes = ref.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const inicioRange = new Date(ano, mes, 1, 0, 0, 0).toISOString();
  const fimRange = new Date(ano, mes, ultimoDia.getDate(), 23, 59, 59).toISOString();

  const { data } = await supabaseClient
    .from('agenda')
    .select('id, data_hora')
    .eq('empresa_id', empresaAtual.id)
    .neq('status', 'cancelado')
    .gte('data_hora', inicioRange)
    .lte('data_hora', fimRange);

  const porDia = {};
  (data || []).forEach(a => {
    const dia = new Date(a.data_hora).getDate();
    porDia[dia] = (porDia[dia] || 0) + 1;
  });

  const nomeMes = ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const primeiroDiaSemana = primeiroDia.getDay();
  const totalDias = ultimoDia.getDate();
  const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const hoje = new Date();

  let celulas = '';
  for (let i = 0; i < primeiroDiaSemana; i++) celulas += `<div></div>`;
  for (let d = 1; d <= totalDias; d++) {
    const tem = porDia[d];
    const ehHoje = hoje.getFullYear() === ano && hoje.getMonth() === mes && hoje.getDate() === d;
    celulas += `<div class="cal-dia ${tem ? 'cal-tem' : ''} ${ehHoje ? 'cal-hoje' : ''}" data-dia="${d}">${d}${tem ? `<span class="cal-dot"></span>` : ''}</div>`;
  }

  card.innerHTML = `
    <div class="cal-topo">
      <button class="icon-btn" id="calAnteriorBtn">‹</button>
      <span style="font-weight:700; text-transform:capitalize;">${nomeMes}</span>
      <button class="icon-btn" id="calProximoBtn">›</button>
    </div>
    <div class="cal-grid cal-cabecalho">${diasSemana.map(d => `<div>${d}</div>`).join('')}</div>
    <div class="cal-grid">${celulas}</div>
  `;

  document.getElementById('calAnteriorBtn').addEventListener('click', () => { agCalendarRef = new Date(ano, mes - 1, 1); agAtualizarDinamico(); });
  document.getElementById('calProximoBtn').addEventListener('click', () => { agCalendarRef = new Date(ano, mes + 1, 1); agAtualizarDinamico(); });
  card.querySelectorAll('[data-dia]').forEach(el => {
    el.addEventListener('click', () => {
      const dia = parseInt(el.getAttribute('data-dia'));
      agDiaSelecionado = new Date(ano, mes, dia);
      agModo = 'dia';
      agAtualizarDinamico();
    });
  });
}

async function agRenderDia(card) {
  const dia = agDiaSelecionado;
  const inicio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 0, 0, 0).toISOString();
  const fim = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 23, 59, 59).toISOString();
  const { data } = await supabaseClient
    .from('agenda')
    .select('*, clientes(nome)')
    .eq('empresa_id', empresaAtual.id)
    .neq('status', 'cancelado')
    .gte('data_hora', inicio).lte('data_hora', fim)
    .order('data_hora');

  const lista = (data && data.length) ? data.map(a => `
    <div class="lista-item" style="cursor:pointer;" data-agenda="${a.id}">
      <div class="info">
        <div class="titulo-item">${a.clientes ? a.clientes.nome : (a.titulo || 'Sem cliente')}</div>
        <div class="sub-item">${new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${agTipoLabel(a.tipo)}</div>
        <span class="status-tag status-${a.status}">${a.status}</span>
      </div>
    </div>
  `).join('') : '<p class="vazio">Nenhum compromisso neste dia.</p>';

  card.innerHTML = `
    <div class="voltar-link" id="diaVoltarBtn" style="margin-top:0; margin-bottom:10px; text-align:left;">← Voltar ao calendário</div>
    <h3 style="font-size:15px; text-transform:capitalize;">${dia.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}</h3>
    ${lista}
  `;
  document.getElementById('diaVoltarBtn').addEventListener('click', () => { agModo = 'calendario'; agAtualizarDinamico(); });
  card.querySelectorAll('[data-agenda]').forEach(el => {
    el.addEventListener('click', () => { agAgendaSelecionadaId = el.getAttribute('data-agenda'); agModo = 'compromisso'; agAtualizarDinamico(); });
  });
}

function osExtrairItensParaExibir(dados) {
  if (!dados) return [];
  if (Array.isArray(dados.items)) {
    return dados.items.map(it => {
      if (it.titulo !== undefined) return it; // já vem pronto (formato novo)
      const d = avItemDescricaoCliente(it);
      const cfg = construirConfigEstruturado(empresaAtual.precos.config);
      const r = avCalcItem(it, cfg);
      return { titulo: d.titulo, detalhe: d.detalhe, valor: r.total };
    });
  }
  if (dados.tipo) {
    const d = avItemDescricaoCliente(dados);
    return [{ titulo: d.titulo, detalhe: d.detalhe, valor: null }];
  }
  return [];
}

function ctItemDescricao(e) {
  const ehMultiplo = (e.tipo === 'multi' || e.tipo === 'vrf');
  const porteTxt = ehMultiplo ? (e.evaps || []).map(ev => `${ev.qtd}x ${ev.porte}`).join(', ') : e.porte;
  const qtdTxt = ehMultiplo ? (e.evaps || []).reduce((s, ev) => s + (parseInt(ev.qtd) || 1), 0) : e.qtd;
  return { titulo: CT_TIPOS.find(t => t.id === e.tipo).label, detalhe: `${porteTxt} · ${qtdTxt}x · acesso ${CT_ACESSOS.find(a => a.id === e.acesso).label.toLowerCase()}` };
}

async function agRenderOS(card) {
  let clienteInfo = null, clienteId = null, origemLabel = '', origemValor = null, itensPreview = [], osExistente = null;

  if (osContexto.osId) {
    const { data: osDireta } = await supabaseClient.from('ordens_servico').select('*').eq('id', osContexto.osId).maybeSingle();
    if (osDireta) {
      osExistente = osDireta;
      osContexto.agendaId = osDireta.agenda_id || null;
      osContexto.orcamentoId = osDireta.orcamento_id || null;
      osContexto.contratoId = osDireta.contrato_id || null;
      osContexto.clienteId = osDireta.cliente_id || osContexto.clienteId;
    }
  }

  if (osContexto.orcamentoId) {
    const { data: orc } = await supabaseClient.from('orcamentos').select('*, clientes(nome,telefone,endereco)').eq('id', osContexto.orcamentoId).maybeSingle();
    if (orc) {
      clienteInfo = orc.clientes; clienteId = orc.cliente_id;
      origemLabel = esc((orc.dados && orc.dados.numero) || 'Orçamento avulso');
      origemValor = orc.valor_total;
      const cfg = construirConfigEstruturado(empresaAtual.precos.config);
      itensPreview = ((orc.dados && orc.dados.items) || []).map(it => {
        const d = avItemDescricaoCliente(it);
        const r = avCalcItem(it, cfg);
        return { titulo: d.titulo, detalhe: d.detalhe, valor: r.total };
      });
      if (!osExistente) { const { data: os } = await supabaseClient.from('ordens_servico').select('*').eq('orcamento_id', osContexto.orcamentoId).maybeSingle(); osExistente = os; }
    }
  } else if (osContexto.contratoId) {
    const { data: ctr } = await supabaseClient.from('contratos').select('*, clientes(nome,telefone,endereco)').eq('id', osContexto.contratoId).maybeSingle();
    if (ctr) {
      clienteInfo = ctr.clientes; clienteId = ctr.cliente_id;
      origemLabel = 'Contrato de manutenção';
      origemValor = ctr.valor_visita;
      const cfgP = Object.assign({}, CT_VALORES_PADRAO, (empresaAtual.precos.pmoc || {}));
      itensPreview = ((ctr.dados && ctr.dados.equipamentos) || []).map(e => {
        const d = ctItemDescricao(e);
        return { titulo: d.titulo, detalhe: d.detalhe, valor: ctCalcularItem(e, cfgP) };
      });
      if (!osExistente) { const { data: os } = await supabaseClient.from('ordens_servico').select('*').eq('contrato_id', osContexto.contratoId).maybeSingle(); osExistente = os; }
    }
  }

  if (!clienteId && osContexto.clienteId) clienteId = osContexto.clienteId;
  if (!clienteInfo && clienteId) {
    const { data: cli } = await supabaseClient.from('clientes').select('nome,telefone,endereco').eq('id', clienteId).maybeSingle();
    clienteInfo = cli;
  }
  osContexto.clienteId = clienteId;
  osContexto.clienteNome = clienteInfo ? clienteInfo.nome : null;

  const itensExibir = osExistente ? osExtrairItensParaExibir(osExistente.dados) : itensPreview;
  osContexto._itensSnapshot = itensExibir;
  const valorSomado = itensExibir.reduce((s, i) => s + (i.valor || 0), 0);
  const valorOrigem = origemValor != null ? origemValor : valorSomado;

  const cabecalho = `
    <div class="voltar-link" id="osVoltarBtn" style="margin-top:0;margin-bottom:10px;text-align:left;">← Voltar</div>
    <h3 style="font-size:15px;">${esc(clienteInfo ? clienteInfo.nome : 'Cliente')}</h3>
    ${origemLabel ? `<div class="sub-item">${origemLabel}</div>` : ''}
    ${clienteInfo && clienteInfo.telefone ? `<div class="sub-item">${esc(clienteInfo.telefone)}</div>` : ''}
    ${clienteInfo && clienteInfo.endereco ? `<div class="sub-item">${esc(clienteInfo.endereco)}</div>` : ''}
    ${clienteId ? `<div class="voltar-link" id="osVerClienteBtn" style="margin-top:6px; margin-bottom:0; text-align:left;">Ver ficha completa do cliente →</div>` : ''}
  `;

  const itensHtml = itensExibir.length
    ? itensExibir.map(it => `
        <div style="padding:10px 0; border-bottom:1px solid var(--cinza-linha);">
          <div style="font-weight:700; font-size:13.5px;">${esc(it.titulo)}</div>
          <div class="sub-item">${esc(it.detalhe)}</div>
          ${it.valor != null ? `<div style="text-align:right; color:var(--azul); font-weight:700; font-size:13px; margin-top:4px;">${money(it.valor)}</div>` : ''}
        </div>`).join('')
    : '<p class="vazio">Sem detalhes salvos deste serviço.</p>';

  const valorInicial = osExistente ? osExistente.valor : valorOrigem;
  const formasPagamento = [
    ['dinheiro', 'Dinheiro'], ['pix', 'PIX'], ['debito', 'Cartão de débito'], ['credito', 'Cartão de crédito'],
    ['transferencia', 'Transferência'], ['boleto', 'Boleto'], ['combinar', 'A combinar']
  ];
  const formaAtual = (osExistente && osExistente.forma_pagamento) || 'pix';

  card.innerHTML = cabecalho + `
    <div class="card">
      <h3 style="font-size:15px;">Serviço</h3>
      ${itensHtml}
      <div class="item-subtotal" style="margin-top:8px; padding-top:10px;"><span>Total orçado</span><b>${money(valorOrigem)}</b></div>
    </div>
    <div class="card">
      ${osExistente ? `<label>Status</label>
      <select id="osStatus">
        <option value="aberta" ${osExistente.status === 'aberta' ? 'selected' : ''}>Aberta</option>
        <option value="em_andamento" ${osExistente.status === 'em_andamento' ? 'selected' : ''}>Em andamento</option>
        <option value="concluida" ${osExistente.status === 'concluida' ? 'selected' : ''}>Concluída</option>
      </select>` : ''}
      <label>Valor final da OS (R$)</label>
      <input type="number" id="osValor" value="${valorInicial}">
      <div class="note">Ajuste aqui se o valor combinado com o cliente ficou diferente do orçado.</div>
      ${!osExistente ? `
      <label>Data e hora do serviço</label>
      <input type="datetime-local" id="osDataHoraCriacao">
      <div class="note">Isso já cria o compromisso na agenda junto. Se ainda não souber quando será, pode deixar em branco e agendar depois.</div>` : ''}
      <label>Observações internas</label>
      <input type="text" id="osObs" value="${esc(osExistente ? (osExistente.observacoes || '') : '')}" placeholder="Opcional">
      <div class="checkbox-row"><input type="checkbox" id="osPago" ${osExistente && osExistente.pago ? 'checked' : ''}><label>Serviço pago</label></div>
      <div id="osFormaPagamentoWrap" class="${osExistente && osExistente.pago ? '' : 'hidden'}">
        <label>Forma de pagamento</label>
        <select id="osFormaPagamento">${formasPagamento.map(([v, l]) => `<option value="${v}" ${formaAtual === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
      <button class="btn" id="osSalvarBtn">${osExistente ? 'Salvar OS' : 'Criar Ordem de Serviço'}</button>
      <div class="msg" id="osMsg"></div>
      ${osExistente ? `<button class="btn btn-secundario" id="osExcluirBtn" style="color:var(--erro); border-color:var(--erro); margin-top:10px;">Excluir esta OS</button>` : ''}
    </div>
    ${osExistente ? (osContexto.agendaId ? `
    <div class="card" id="osAgendamentoCard">
      <h3 style="font-size:15px;">Agendamento</h3>
      <p class="vazio" style="padding:8px 0;">Carregando...</p>
    </div>` : `
    <div class="card">
      <h3 style="font-size:15px;">Agendamento</h3>
      <p class="note" style="margin-top:-4px;">Esta OS ainda não tem data marcada. Escolha quando o serviço será feito.</p>
      <label>Data e hora</label>
      <input type="datetime-local" id="osAgDataHora">
      <div class="msg" id="osAgMsg"></div>
      <button class="btn btn-ambar" id="osConfirmarAgendaBtn">Confirmar agendamento</button>
    </div>`) : ''}
  `;

  document.getElementById('osVoltarBtn').addEventListener('click', voltarDoOS);
  if (clienteId) document.getElementById('osVerClienteBtn')?.addEventListener('click', () => irParaFichaCliente(clienteId));
  document.getElementById('osPago')?.addEventListener('change', (e) => {
    document.getElementById('osFormaPagamentoWrap').classList.toggle('hidden', !e.target.checked);
  });
  document.getElementById('osSalvarBtn').addEventListener('click', () => osSalvar(osExistente ? osExistente.id : null));
  document.getElementById('osExcluirBtn')?.addEventListener('click', () => osExcluir(osExistente.id));
  document.getElementById('osConfirmarAgendaBtn')?.addEventListener('click', () => osConfirmarAgendamento(osExistente.id));

  if (osExistente && osContexto.agendaId) {
    const { data: ag } = await supabaseClient.from('agenda').select('data_hora,status').eq('id', osContexto.agendaId).maybeSingle();
    const agCard = document.getElementById('osAgendamentoCard');
    if (agCard) {
      agCard.innerHTML = `
        <h3 style="font-size:15px;">Agendamento</h3>
        ${ag ? `<div class="sub-item">${agFormatarData(ag.data_hora)}</div><span class="status-tag status-${ag.status}">${ag.status}</span>` : '<p class="vazio">Compromisso não encontrado.</p>'}
        <div class="voltar-link" id="osVerCompromissoBtn" style="margin-top:10px;">Ver / editar compromisso →</div>
      `;
      document.getElementById('osVerCompromissoBtn').addEventListener('click', () => {
        agAgendaSelecionadaId = osContexto.agendaId;
        agModo = 'compromisso';
        agAtualizarDinamico();
      });
    }
  }
}

async function voltarDoOS() {
  if (osContexto.agendaId) { agAgendaSelecionadaId = osContexto.agendaId; agModo = 'compromisso'; agAtualizarDinamico(); }
  else if (osContexto.clienteId) { await irParaFichaCliente(osContexto.clienteId); }
  else { agModo = 'calendario'; agAtualizarDinamico(); }
}

async function osCriarCompromissoVinculado(osId, dataHoraStr) {
  const itens = osContexto._itensSnapshot || [];
  const tituloResumo = itens[0] ? itens[0].titulo : 'Serviço';
  const resumoMin = tituloResumo.toLowerCase();
  const tipoAgenda = osContexto.contratoId ? 'manutencao' : (resumoMin.includes('instala') ? 'instalacao' : (resumoMin.includes('manuten') ? 'manutencao' : 'outro'));
  const { data: novoCompromisso, error } = await supabaseClient.from('agenda').insert({
    empresa_id: empresaAtual.id,
    cliente_id: osContexto.clienteId,
    titulo: (osContexto.clienteNome ? osContexto.clienteNome + ' — ' : '') + tituloResumo,
    tipo: tipoAgenda,
    data_hora: new Date(dataHoraStr).toISOString(),
    observacoes: ''
  }).select().single();
  if (error) return { error };
  await supabaseClient.from('ordens_servico').update({ agenda_id: novoCompromisso.id }).eq('id', osId);
  osContexto.agendaId = novoCompromisso.id;
  return { data: novoCompromisso };
}

async function osConfirmarAgendamento(osId) {
  const msgEl = document.getElementById('osAgMsg');
  const dataHora = document.getElementById('osAgDataHora').value;
  if (!dataHora) { msgEl.className = 'msg erro'; msgEl.textContent = 'Escolha a data e hora.'; return; }
  const { error } = await osCriarCompromissoVinculado(osId, dataHora);
  if (error) { msgEl.className = 'msg erro'; msgEl.textContent = 'Erro ao agendar.'; return; }
  msgEl.className = 'msg ok'; msgEl.textContent = 'Agendado!';
  setTimeout(() => agAtualizarDinamico(), 500);
}

async function osSalvar(osId) {
  const msg = document.getElementById('osMsg');
  const pago = document.getElementById('osPago').checked;
  const formaPagamento = pago ? document.getElementById('osFormaPagamento').value : null;
  let dataPagamento = null;
  if (pago) {
    if (osId) {
      const { data: atual } = await supabaseClient.from('ordens_servico').select('pago,data_pagamento').eq('id', osId).single();
      dataPagamento = (atual && atual.pago && atual.data_pagamento) ? atual.data_pagamento : new Date().toISOString();
    } else {
      dataPagamento = new Date().toISOString();
    }
  }
  const origemLabel = osContexto.contratoId ? 'Contrato de manutenção' : 'Orçamento';
  const payload = {
    empresa_id: empresaAtual.id,
    cliente_id: osContexto.clienteId || null,
    agenda_id: osContexto.agendaId || null,
    orcamento_id: osContexto.orcamentoId || null,
    contrato_id: osContexto.contratoId || null,
    descricao: origemLabel + (osContexto.clienteNome ? ' — ' + osContexto.clienteNome : ''),
    valor: parseFloat(document.getElementById('osValor').value) || 0,
    observacoes: document.getElementById('osObs').value.trim(),
    status: document.getElementById('osStatus') ? document.getElementById('osStatus').value : 'aberta',
    pago,
    forma_pagamento: formaPagamento,
    data_pagamento: dataPagamento
  };
  if (!osId) payload.dados = { items: osContexto._itensSnapshot || [] };

  let error, novoId = osId;
  if (osId) {
    ({ error } = await supabaseClient.from('ordens_servico').update(payload).eq('id', osId));
  } else {
    const { data, error: erroInsercao } = await supabaseClient.from('ordens_servico').insert(payload).select().single();
    error = erroInsercao;
    if (data) novoId = data.id;
  }
  if (error) { msg.className = 'msg erro'; msg.textContent = 'Erro ao salvar OS: ' + (error.message || 'erro desconhecido'); console.error('Erro ao salvar OS:', error); return; }

  osContexto.osId = novoId;

  let mensagemFinal = 'Salvo!';
  if (!osId) {
    const dataHoraCriacao = document.getElementById('osDataHoraCriacao')?.value;
    if (dataHoraCriacao) {
      const { error: erroAgenda } = await osCriarCompromissoVinculado(novoId, dataHoraCriacao);
      mensagemFinal = erroAgenda ? 'OS criada, mas houve um erro ao agendar. Tente agendar na tela seguinte.' : 'Ordem de Serviço criada e agendada!';
    } else {
      mensagemFinal = 'Ordem de Serviço criada! Agende quando souber a data.';
    }
  }

  msg.className = 'msg ok'; msg.textContent = mensagemFinal;
  setTimeout(() => agAtualizarDinamico(), 500);
}

async function osExcluir(osId) {
  if (!confirm('Excluir esta ordem de serviço? Essa ação não pode ser desfeita.')) return;
  const msg = document.getElementById('osMsg');
  const { error } = await supabaseClient.from('ordens_servico').delete().eq('id', osId);
  if (error) { msg.className = 'msg erro'; msg.textContent = 'Erro ao excluir.'; return; }
  await voltarDoOS();
}

/* ===================== CALCULADORA DE ORÇAMENTO AVULSO ===================== */

let avItems = [];
let avNextId = 1;
let avSalvarTimeout = null;
let avClientesCache = [];
let avOrcamentoSalvoId = null;

function money(v) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

function novoItemAvulso() {
  return { id: avNextId++, tipo: 'instalacao', porte: '12000', dificuldade: 'medio', metros: 3, suporte: false, eletrica220: false, pecasDesc: '', pecas: 0, extraDesc: '', extraValor: 0 };
}

function renderAvulso() {
  avItems = [novoItemAvulso()];
  const c = empresaAtual.precos.config;
  const emp = empresaAtual.precos.dadosEmpresa;

  document.getElementById("conteudo").innerHTML = `
    <div id="avEditor">
      <div class="card">
        <details>
          <summary>Configurações de preço (valores médios, ajuste aqui)</summary>
          <div class="price-grid">
            <span>Mão de obra base — Instalação (R$)</span><input type="number" id="baseInstalacao" value="${c.baseInstalacao}">
            <span>Mão de obra base — Manutenção (R$)</span><input type="number" id="baseManutencao" value="${c.baseManutencao}">
            <span>Mão de obra base — Higienização (R$)</span><input type="number" id="baseHigienizacao" value="${c.baseHigienizacao}">
            <span>Adicional — 9.000 (R$)</span><input type="number" id="add9000" value="${c.add9000}">
            <span>Adicional — 12.000 (R$)</span><input type="number" id="add12000" value="${c.add12000}">
            <span>Adicional — 18.000 (R$)</span><input type="number" id="add18000" value="${c.add18000}">
            <span>Adicional — 24.000 (R$)</span><input type="number" id="add24000" value="${c.add24000}">
            <span>Adicional — 30.000 (R$)</span><input type="number" id="add30000" value="${c.add30000}">
            <span>Adicional — 36.000+ (R$)</span><input type="number" id="add36000" value="${c.add36000}">
            <span>Multiplicador dificuldade — Médio</span><input type="number" id="multMedio" value="${c.multMedio}" step="0.01">
            <span>Multiplicador dificuldade — Difícil</span><input type="number" id="multDificil" value="${c.multDificil}" step="0.01">
            <span>Preço por metro de tubulação (R$)</span><input type="number" id="precoMetro" value="${c.precoMetro}">
            <span>Suporte extra — fixo (R$)</span><input type="number" id="precoSuporte" value="${c.precoSuporte}">
            <span>Elétrica 220V — fixo (R$)</span><input type="number" id="precoEletrica" value="${c.precoEletrica}">
            <span>Materiais base — instalação (R$)</span><input type="number" id="materiaisInstalacao" value="${c.materiaisInstalacao}">
            <span>Insumos — manutenção/higienização (R$)</span><input type="number" id="materiaisManutencao" value="${c.materiaisManutencao}">
          </div>
          <div class="note">Ajustes aqui são salvos automaticamente na sua conta.</div>
          <div class="voltar-link" id="restaurarPadraoBtn" style="margin-top:8px;">Restaurar valores padrão de fábrica</div>
        </details>
      </div>

      <div id="avItemsContainer"></div>
      <button class="add-btn" id="avAddItemBtn">+ Adicionar item ao orçamento</button>

      <div class="card">
        <label style="margin-top:0;">Desconto para pagamento à vista (opcional)</label>
        <div class="price-grid" style="grid-template-columns: 1fr 1fr;">
          <select id="avDescontoTipo"><option value="percentual">Percentual (%)</option><option value="fixo">Valor fixo (R$)</option></select>
          <input type="number" id="avDescontoValor" min="0" step="0.5" value="0" placeholder="0">
        </div>
      </div>

      <div class="result">
        <div class="label">Valor total do orçamento</div>
        <div class="value" id="avTotalValue">R$ 0,00</div>
        <div class="breakdown" id="avBreakdown"></div>
        <div id="avDescontoResumo" class="hidden"></div>
      </div>

      <div class="note">Estimativa de referência. Confirme sempre com vistoria.</div>
      <button class="btn btn-ambar" id="avGerarClienteBtn">Gerar orçamento para o cliente</button>
    </div>

    <div id="avClientView" class="hidden">
      <div class="proposal">
        <div class="proposal-header">
          <div class="brand">${esc(empresaAtual.nome_empresa)}</div>
          <div class="tagline">Orçamento de serviço</div>
          <div class="proposal-numero" id="avProposalNumero"></div>
        </div>
        <div class="proposal-meta">
          <label>Cliente cadastrado</label>
          <select id="avClienteSelect"><option value="">— selecionar cliente —</option></select>
          <label>Nome exibido no orçamento</label>
          <input type="text" id="avClienteNome" placeholder="Ex: João Silva">
          <label>Validade da proposta (dias)</label>
          <input type="number" id="avValidadeDias" value="7" min="1">
        </div>
        <div class="proposal-items" id="avProposalItems"></div>
        <div class="proposal-total"><span class="lbl">Total</span><span class="val" id="avProposalTotal">R$ 0,00</span></div>
        <div class="proposal-total-desconto hidden" id="avProposalTotalDesconto"><span class="lbl">À vista (com desconto)</span><span class="val" id="avProposalTotalComDesconto">R$ 0,00</span></div>
        <div class="proposal-condicoes" id="avProposalCondicoes"></div>
        <div class="proposal-footer" id="avProposalFooter"></div>
        <div class="proposal-marca">feito no Cosmos Pro</div>
      </div>
      <div class="action-row">
        <button class="btn btn-secundario" id="avNovaAbaBtn">Salvar / imprimir PDF</button>
        <button class="btn btn-secundario" id="avWhatsappBtn">Texto p/ WhatsApp</button>
      </div>
      <textarea id="avWhatsappText" class="hidden" readonly></textarea>

      <div class="card" style="margin-top:14px;">
        <button class="btn" id="avSalvarOrcamentoBtn">Salvar orçamento no histórico do cliente</button>
        <div class="msg" id="avSalvarMsg"></div>
        <div id="avAgendarBox" class="hidden" style="margin-top:10px; padding-top:14px; border-top:1px solid var(--cinza-linha);">
          <p class="note" style="margin-top:0;">Cliente aprovou? Continue pra criar a Ordem de Serviço e agendar a visita.</p>
          <button class="btn btn-ambar" id="avIrParaOSBtn">Criar Ordem de Serviço</button>
        </div>
      </div>

      <div class="voltar-link" id="avVoltarBtn">← Voltar para edição</div>
    </div>
  `;

  ligarEventosAvulso();
  avRenderItems();
}

function construirConfigEstruturado(raw) {
  return {
    baseInstalacao: raw.baseInstalacao, baseManutencao: raw.baseManutencao, baseHigienizacao: raw.baseHigienizacao,
    add: { '9000': raw.add9000, '12000': raw.add12000, '18000': raw.add18000, '24000': raw.add24000, '30000': raw.add30000, '36000': raw.add36000 },
    multMedio: raw.multMedio || 1, multDificil: raw.multDificil || 1,
    precoMetro: raw.precoMetro, precoSuporte: raw.precoSuporte, precoEletrica: raw.precoEletrica,
    materiaisInstalacao: raw.materiaisInstalacao, materiaisManutencao: raw.materiaisManutencao
  };
}

function avCfg() {
  const ids = ['baseInstalacao','baseManutencao','baseHigienizacao','add9000','add12000','add18000','add24000','add30000','add36000','multMedio','multDificil','precoMetro','precoSuporte','precoEletrica','materiaisInstalacao','materiaisManutencao'];
  const c = {};
  ids.forEach(id => { c[id] = parseFloat(document.getElementById(id).value) || 0; });
  const estruturado = construirConfigEstruturado(c);
  estruturado._raw = c;
  return estruturado;
}

function avCalcItem(it, c) {
  const baseServico = it.tipo === 'instalacao' ? c.baseInstalacao : (it.tipo === 'manutencao' ? c.baseManutencao : c.baseHigienizacao);
  const adicionalPorte = c.add[it.porte] || 0;
  const multDif = it.dificuldade === 'medio' ? c.multMedio : (it.dificuldade === 'dificil' ? c.multDificil : 1);
  const maoDeObra = (baseServico + adicionalPorte) * multDif;
  let materiais = 0, tubulacaoCusto = 0, suporteCusto = 0, eletricaCusto = 0;
  if (it.tipo === 'instalacao') {
    tubulacaoCusto = (it.metros || 0) * c.precoMetro;
    suporteCusto = it.suporte ? c.precoSuporte : 0;
    eletricaCusto = it.eletrica220 ? c.precoEletrica : 0;
    materiais = c.materiaisInstalacao + tubulacaoCusto + suporteCusto + eletricaCusto;
  } else { materiais = c.materiaisManutencao; }
  const pecasValor = it.tipo === 'manutencao' ? (parseFloat(it.pecas) || 0) : 0;
  const extraValor = parseFloat(it.extraValor) || 0;
  return { maoDeObra, materiais, pecas: pecasValor, extra: extraValor, total: maoDeObra + materiais + pecasValor + extraValor };
}

function avTipoLabel(t) { return t === 'instalacao' ? 'Instalação' : (t === 'manutencao' ? 'Manutenção' : 'Higienização'); }

function avRenderItems() {
  const container = document.getElementById('avItemsContainer');
  container.innerHTML = '';
  avItems.forEach((it, idx) => {
    const div = document.createElement('div');
    div.className = 'item-card';
    div.innerHTML =
      `<div class="item-header"><span>Item ${idx + 1} — ${avTipoLabel(it.tipo)}</span><button class="remove-btn" data-remove="${it.id}">✕</button></div>` +
      `<label>Tipo de serviço</label><select data-field="tipo" data-id="${it.id}">
        <option value="instalacao" ${it.tipo === 'instalacao' ? 'selected' : ''}>Instalação</option>
        <option value="manutencao" ${it.tipo === 'manutencao' ? 'selected' : ''}>Manutenção</option>
        <option value="higienizacao" ${it.tipo === 'higienizacao' ? 'selected' : ''}>Higienização</option>
      </select>` +
      `<label>Porte do aparelho (BTUs)</label><select data-field="porte" data-id="${it.id}">` +
        ['9000','12000','18000','24000','30000','36000'].map(v => {
          const lbl = v === '36000' ? '36.000+' : (parseInt(v)/1000) + '.000';
          return `<option value="${v}" ${it.porte === v ? 'selected' : ''}>${lbl}</option>`;
        }).join('') +
      `</select>` +
      `<label>Dificuldade de acesso</label><select data-field="dificuldade" data-id="${it.id}">
        <option value="facil" ${it.dificuldade === 'facil' ? 'selected' : ''}>Fácil — térreo / fácil acesso</option>
        <option value="medio" ${it.dificuldade === 'medio' ? 'selected' : ''}>Médio</option>
        <option value="dificil" ${it.dificuldade === 'dificil' ? 'selected' : ''}>Difícil — altura / acesso complicado</option>
      </select>` +
      (it.tipo === 'instalacao' ?
        `<label>Distância entre unidades — metros de infra</label>
        <input type="number" min="0" step="0.5" data-field="metros" data-id="${it.id}" value="${it.metros}">
        <div class="checkbox-row"><input type="checkbox" data-field="suporte" data-id="${it.id}" ${it.suporte ? 'checked' : ''}><label>Precisa de suporte / estrutura extra</label></div>
        <div class="checkbox-row"><input type="checkbox" data-field="eletrica220" data-id="${it.id}" ${it.eletrica220 ? 'checked' : ''}><label>Instalação elétrica 220V</label></div>` : '') +
      (it.tipo === 'manutencao' ?
        `<label>Peça(s) a substituir — descrição (opcional)</label>
        <input type="text" placeholder="ex: capacitor, placa" data-field="pecasDesc" data-id="${it.id}" value="${it.pecasDesc || ''}">
        <label>Valor da(s) peça(s) (R$)</label>
        <input type="number" min="0" step="1" data-field="pecas" data-id="${it.id}" value="${it.pecas || 0}">` : '') +
      `<label>Custo extra personalizado (opcional)</label>
      <input type="text" placeholder="ex: suporte sob medida" data-field="extraDesc" data-id="${it.id}" value="${it.extraDesc || ''}">
      <input type="number" min="0" step="1" placeholder="Valor do custo extra (R$)" data-field="extraValor" data-id="${it.id}" value="${it.extraValor || 0}" style="margin-top:6px;">
      <div class="item-subtotal"><span>Subtotal do item</span><b class="subtotal-value"></b></div>`;
    container.appendChild(div);
  });
  avCalcular();
}

function avCalcularDesconto(total) {
  const tipo = document.getElementById('avDescontoTipo').value;
  const valorCampo = parseFloat(document.getElementById('avDescontoValor').value) || 0;
  let valorDesconto = 0, percentual = 0;
  if (tipo === 'percentual') { percentual = valorCampo; valorDesconto = total * (valorCampo / 100); }
  else { valorDesconto = valorCampo; percentual = total > 0 ? (valorCampo / total) * 100 : 0; }
  if (valorDesconto > total) valorDesconto = total;
  return { tipo, percentual: Math.round(percentual * 100) / 100, valor: valorDesconto, totalComDesconto: total - valorDesconto };
}

function avCalcular() {
  const c = avCfg();
  let grandTotal = 0, maoDeObraTotal = 0, materiaisTotal = 0, pecasTotal = 0, extraTotal = 0;
  const cards = document.querySelectorAll('#avItemsContainer .item-card');
  avItems.forEach((it, idx) => {
    const r = avCalcItem(it, c);
    grandTotal += r.total; maoDeObraTotal += r.maoDeObra; materiaisTotal += r.materiais; pecasTotal += r.pecas; extraTotal += r.extra;
    const card = cards[idx];
    if (card) card.querySelector('.subtotal-value').textContent = money(r.total);
  });
  const desconto = avCalcularDesconto(grandTotal);
  document.getElementById('avTotalValue').textContent = money(grandTotal);
  let bd = `<div><span>Mão de obra</span><span>${money(maoDeObraTotal)}</span></div><div><span>Materiais</span><span>${money(materiaisTotal)}</span></div>`;
  if (pecasTotal > 0) bd += `<div><span>Peças</span><span>${money(pecasTotal)}</span></div>`;
  if (extraTotal > 0) bd += `<div><span>Extras</span><span>${money(extraTotal)}</span></div>`;
  bd += `<div><span>Itens</span><span>${avItems.length}</span></div>`;
  document.getElementById('avBreakdown').innerHTML = bd;
  const descontoBox = document.getElementById('avDescontoResumo');
  if (desconto.valor > 0) {
    descontoBox.innerHTML = `<div class="label" style="margin-top:10px;">Valor à vista (com desconto)</div><div class="value" style="font-size:26px;">${money(desconto.totalComDesconto)}</div><div style="font-size:12px;color:#dbeafe;">Desconto de ${money(desconto.valor)} (${desconto.percentual}%)</div>`;
    descontoBox.classList.remove('hidden');
  } else { descontoBox.innerHTML = ''; descontoBox.classList.add('hidden'); }
}

function avItemDescricaoCliente(it) {
  const porteLabel = (parseInt(it.porte) / 1000) + '.000 BTUs';
  const extraSufixo = it.extraDesc && parseFloat(it.extraValor) > 0 ? ' + ' + it.extraDesc : '';
  if (it.tipo === 'instalacao') {
    let det = `Aparelho ${porteLabel} — tubulação de ${it.metros || 0}m`;
    if (it.suporte) det += ' + suporte extra';
    if (it.eletrica220) det += ' + instalação elétrica 220V';
    return { titulo: 'Instalação de ar-condicionado', detalhe: det + extraSufixo };
  }
  if (it.tipo === 'manutencao') {
    let det2 = `Aparelho ${porteLabel}`;
    if (it.pecasDesc) det2 += ' — peça: ' + it.pecasDesc;
    return { titulo: 'Manutenção', detalhe: det2 + extraSufixo };
  }
  return { titulo: 'Higienização', detalhe: `Aparelho ${porteLabel}` + extraSufixo };
}

let avOrcamentoNumero = null;
function avGerarNumero() {
  if (avOrcamentoNumero) return avOrcamentoNumero;
  const seq = Math.floor(Math.random() * 900) + 100;
  const d = new Date();
  const yyyy = d.getFullYear(), mm = String(d.getMonth()+1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0');
  avOrcamentoNumero = `Orçamento nº ${yyyy}${mm}${dd}-${String(seq).padStart(3,'0')}`;
  return avOrcamentoNumero;
}

function avEmpresaRodapeHtml() {
  const emp = empresaAtual.precos.dadosEmpresa || {};
  const cnpj = esc(emp.cnpj || ''), endereco = esc(emp.endereco || ''), telefone = esc(emp.telefone || ''), email = esc(emp.email || '');
  const linha1 = esc(empresaAtual.nome_empresa) + (cnpj ? ' · CNPJ ' + cnpj : '');
  const linha2 = [endereco, telefone, email].filter(Boolean).join(' · ');
  return linha1 + (linha2 ? '<br>' + linha2 : '');
}

function avGerarDados() {
  const c = avCfg();
  let grandTotal = 0, itemsHtml = '';
  const whatsLines = [];
  avItems.forEach(it => {
    const r = avCalcItem(it, c);
    grandTotal += r.total;
    const d = avItemDescricaoCliente(it);
    itemsHtml += `<div class="proposal-item"><div class="titulo">${esc(d.titulo)}</div><div class="detalhe">${esc(d.detalhe)}</div><div class="preco">${money(r.total)}</div></div>`;
    whatsLines.push(`• ${d.titulo} (${d.detalhe}): ${money(r.total)}`);
  });
  const desconto = avCalcularDesconto(grandTotal);
  const validade = parseInt(document.getElementById('avValidadeDias').value) || 7;
  const nome = document.getElementById('avClienteNome').value.trim();
  const footerText = `Esta proposta comercial é válida por ${validade} dias. Valores sujeitos a confirmação técnica durante a vistoria no local.`;
  const condicoesHtml = `<b>Condições comerciais</b>Pagamento combinado na confirmação do serviço. Garantia de 90 dias sobre a mão de obra executada.` + (desconto.valor > 0 ? ' O valor à vista já reflete a política de desconto vigente.' : '');
  const whatsText = `Orçamento ${empresaAtual.nome_empresa}` + (nome ? ' — ' + nome : '') + '\n\n' + whatsLines.join('\n') + '\n\nTotal: ' + money(grandTotal) + (desconto.valor > 0 ? '\nÀ vista (com desconto): ' + money(desconto.totalComDesconto) : '') + '\nVálido por ' + validade + ' dias.';
  return { itemsHtml: itemsHtml || '<div class="proposal-item"><div class="detalhe">Nenhum item adicionado ainda.</div></div>', total: grandTotal, totalFormatado: money(grandTotal), temDesconto: desconto.valor > 0, totalComDescontoFormatado: money(desconto.totalComDesconto), numero: avGerarNumero(), condicoesHtml, empresaHtml: avEmpresaRodapeHtml(), footerText, whatsText, nome };
}

function avMontarProposta() {
  const d = avGerarDados();
  document.getElementById('avProposalNumero').textContent = d.numero;
  document.getElementById('avProposalItems').innerHTML = d.itemsHtml;
  document.getElementById('avProposalTotal').textContent = d.totalFormatado;
  document.getElementById('avProposalCondicoes').innerHTML = d.condicoesHtml;
  document.getElementById('avProposalFooter').textContent = d.footerText;
  const descontoEl = document.getElementById('avProposalTotalDesconto');
  if (d.temDesconto) { document.getElementById('avProposalTotalComDesconto').textContent = d.totalComDescontoFormatado; descontoEl.classList.remove('hidden'); }
  else { descontoEl.classList.add('hidden'); }
}

function avBuildStandaloneHTML(d) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Orçamento${d.nome ? ' — ' + esc(d.nome) : ''}</title><style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f1f5f9;padding:20px;color:#0f172a;}
  .wrap{max-width:480px;margin:0 auto;}
  .proposal{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);}
  .proposal-header{background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:22px 20px;color:#fff;}
  .brand{font-size:20px;font-weight:800;}
  .tagline{font-size:12px;color:#dbeafe;margin-top:2px;}
  .proposal-numero{font-size:11px;color:#bfdbfe;margin-top:6px;}
  .proposal-items{padding:6px 20px 4px;}
  .proposal-item{padding:12px 0;border-bottom:1px solid #e2e8f0;}
  .proposal-item .titulo{font-weight:700;font-size:14px;}
  .proposal-item .detalhe{font-size:12px;color:#64748b;margin-top:2px;}
  .proposal-item .preco{font-weight:700;color:#2563eb;font-size:14px;margin-top:6px;text-align:right;}
  .proposal-total{margin:10px 20px 0;padding:16px;border-radius:10px;background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center;}
  .proposal-total .lbl{font-size:12px;color:#cbd5e1;text-transform:uppercase;}
  .proposal-total .val{font-size:22px;font-weight:800;color:#f59e0b;}
  .proposal-total-desconto{margin:8px 20px 0;padding:16px;border-radius:10px;background:#166534;color:#fff;display:flex;justify-content:space-between;align-items:center;}
  .proposal-total-desconto .val{font-size:22px;font-weight:800;color:#fff;}
  .proposal-condicoes{margin:16px 20px 0;padding:14px 16px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;font-size:11.5px;color:#475569;line-height:1.6;}
  .proposal-condicoes b{display:block;color:#0f172a;font-size:12.5px;margin-bottom:4px;}
  .proposal-footer{padding:16px 20px 4px;font-size:11px;color:#64748b;line-height:1.5;}
  .proposal-marca{padding:10px 20px 18px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;margin-top:4px;}
  .print-btn{width:100%;padding:13px;margin-top:16px;border-radius:10px;border:none;background:#2563eb;color:#fff;font-size:14px;font-weight:700;cursor:pointer;}
  @media print{.no-print{display:none !important;}body{background:#fff;padding:0;}}
  </style></head><body><div class="wrap"><div class="proposal">
  <div class="proposal-header"><div class="brand">${esc(empresaAtual.nome_empresa)}</div><div class="tagline">Orçamento de serviço</div><div class="proposal-numero">${esc(d.numero)}</div></div>
  <div class="proposal-items">${d.itemsHtml}</div>
  <div class="proposal-total"><span class="lbl">Total</span><span class="val">${d.totalFormatado}</span></div>
  ${d.temDesconto ? `<div class="proposal-total-desconto"><span class="lbl">À vista</span><span class="val">${d.totalComDescontoFormatado}</span></div>` : ''}
  <div class="proposal-condicoes">${d.condicoesHtml}</div>
  <div class="proposal-footer">${d.footerText}<br>${d.empresaHtml}</div>
  <div class="proposal-marca">feito no Cosmos Pro</div>
  </div><button class="print-btn no-print" onclick="window.print()">Salvar / imprimir PDF</button></div></body></html>`;
}

async function avSalvarOrcamento() {
  const clienteId = document.getElementById('avClienteSelect').value;
  const msg = document.getElementById('avSalvarMsg');
  if (!clienteId) {
    msg.className = 'msg erro';
    msg.textContent = 'Selecione um cliente cadastrado (aba Clientes) pra salvar o orçamento.';
    return;
  }
  const d = avGerarDados();
  const { data, error } = await supabaseClient.from('orcamentos').insert({
    empresa_id: empresaAtual.id,
    cliente_id: clienteId,
    tipo: 'avulso',
    nome_cliente: document.getElementById('avClienteNome').value.trim(),
    dados: { items: avItems, numero: d.numero, validadeDias: document.getElementById('avValidadeDias').value },
    valor_total: d.total
  }).select().single();
  if (error) { msg.className = 'msg erro'; msg.textContent = 'Erro ao salvar orçamento.'; return; }
  avOrcamentoSalvoId = data.id;
  msg.className = 'msg ok';
  msg.textContent = 'Orçamento salvo no histórico do cliente!';
  document.getElementById('avAgendarBox').classList.remove('hidden');
}

function avSalvarConfigDebounced() {
  clearTimeout(avSalvarTimeout);
  avSalvarTimeout = setTimeout(avSalvarConfig, 800);
}

async function avSalvarConfig() {
  const c = avCfg()._raw;
  const dadosEmpresa = empresaAtual.precos.dadosEmpresa || {};
  empresaAtual.precos = { config: c, dadosEmpresa };
  await supabaseClient.from('empresas').update({ precos: empresaAtual.precos }).eq('id', empresaAtual.id);
}

function ligarEventosAvulso() {
  document.getElementById('avAddItemBtn').addEventListener('click', () => { avItems.push(novoItemAvulso()); avRenderItems(); });

  document.getElementById('avItemsContainer').addEventListener('input', (e) => {
    const id = parseInt(e.target.getAttribute('data-id'));
    const field = e.target.getAttribute('data-field');
    if (!id || !field) return;
    const it = avItems.find(i => i.id === id);
    if (!it) return;
    if (field === 'suporte' || field === 'eletrica220') it[field] = e.target.checked;
    else if (field === 'metros' || field === 'pecas' || field === 'extraValor') it[field] = parseFloat(e.target.value) || 0;
    else it[field] = e.target.value;
    if (field === 'tipo') avRenderItems(); else avCalcular();
  });

  document.getElementById('avItemsContainer').addEventListener('click', (e) => {
    const id = e.target.getAttribute('data-remove');
    if (id) { avItems = avItems.filter(i => i.id !== parseInt(id)); avRenderItems(); }
  });

  document.querySelectorAll('#avEditor .price-grid input').forEach(el => {
    el.addEventListener('input', () => { avCalcular(); avSalvarConfigDebounced(); });
  });
  document.getElementById('restaurarPadraoBtn').addEventListener('click', () => {
    Object.keys(VALORES_PADRAO).forEach(id => { document.getElementById(id).value = VALORES_PADRAO[id]; });
    avCalcular(); avSalvarConfig();
  });

  document.getElementById('avDescontoTipo').addEventListener('input', avCalcular);
  document.getElementById('avDescontoValor').addEventListener('input', avCalcular);

  document.getElementById('avGerarClienteBtn').addEventListener('click', async () => {
    avOrcamentoSalvoId = null;
    avOrcamentoNumero = null;
    const { data: clientes } = await supabaseClient.from('clientes').select('id,nome').eq('empresa_id', empresaAtual.id).order('nome');
    avClientesCache = clientes || [];
    const select = document.getElementById('avClienteSelect');
    select.innerHTML = '<option value="">— selecionar cliente —</option>' + avClientesCache.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
    document.getElementById('avSalvarMsg').textContent = '';
    document.getElementById('avAgendarBox').classList.add('hidden');
    avMontarProposta();
    document.getElementById('avEditor').classList.add('hidden');
    document.getElementById('avClientView').classList.remove('hidden');
  });
  document.getElementById('avClienteSelect').addEventListener('change', (e) => {
    const c = avClientesCache.find(c => c.id === e.target.value);
    if (c) document.getElementById('avClienteNome').value = c.nome;
    avMontarProposta();
  });
  document.getElementById('avSalvarOrcamentoBtn').addEventListener('click', avSalvarOrcamento);
  document.getElementById('avIrParaOSBtn').addEventListener('click', () => {
    if (!avOrcamentoSalvoId) return;
    osAbrirComContexto({ orcamentoId: avOrcamentoSalvoId });
  });
  document.getElementById('avVoltarBtn').addEventListener('click', () => {
    document.getElementById('avClientView').classList.add('hidden');
    document.getElementById('avEditor').classList.remove('hidden');
  });
  document.getElementById('avClienteNome').addEventListener('input', avMontarProposta);
  document.getElementById('avValidadeDias').addEventListener('input', avMontarProposta);
  document.getElementById('avNovaAbaBtn').addEventListener('click', () => {
    const d = avGerarDados();
    const html = avBuildStandaloneHTML(d);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) alert('O navegador bloqueou a nova aba. Permita pop-ups para este site e tente novamente.');
  });
  document.getElementById('avWhatsappBtn').addEventListener('click', () => {
    const ta = document.getElementById('avWhatsappText');
    ta.classList.remove('hidden');
    ta.select();
    try { navigator.clipboard.writeText(ta.value); } catch (e) { try { document.execCommand('copy'); } catch (e2) {} }
  });
}

/* ===================== CONTRATO DE MANUTENÇÃO (PMOC) ===================== */

const CT_VALORES_PADRAO = { pBaseSplit: 90, pBaseCassete: 110, pBasePisoTeto: 110, pBaseMulti: 90, pBaseVrf: 150, pPorte: 40, mAcessoMedio: 1.25, mAcessoDificil: 1.75, mCondRegular: 1.15, mCondRuim: 1.4, pKm: 2.5, pTaxaVisita: 0 };
const CT_TIPOS = [{ id: 'split', label: 'Split Hi-Wall' }, { id: 'cassete', label: 'Cassete' }, { id: 'pisoteto', label: 'Piso Teto' }, { id: 'multi', label: 'Multi-Split (por evap.)' }, { id: 'vrf', label: 'VRF (por evap.)' }];
const CT_PORTES = ['9k', '12k', '18k', '24k', '30k', '36k+'];
const CT_ACESSOS = [{ id: 'facil', label: 'Fácil' }, { id: 'medio', label: 'Médio' }, { id: 'dificil', label: 'Difícil' }];
const CT_CONDICOES = [{ id: 'bom', label: 'Bom' }, { id: 'regular', label: 'Regular' }, { id: 'ruim', label: 'Ruim' }];

let ctEquipamentos = [];
let ctContadorId = 0;
let ctClientesCache = [];
let ctContratoSalvoId = null;
let ctSalvarConfigTimeout = null;

function ctNovoEquip(dados) {
  ctContadorId++;
  const eq = Object.assign({ id: ctContadorId, tipo: 'split', porte: '9k', qtd: 1, acesso: 'facil', condicao: 'bom' }, dados || {});
  if ((eq.tipo === 'multi' || eq.tipo === 'vrf') && !eq.evaps) eq.evaps = [{ porte: '9k', qtd: 1 }];
  return eq;
}

function ctCfg() {
  const ids = Object.keys(CT_VALORES_PADRAO);
  const c = {};
  ids.forEach(id => { c[id] = parseFloat(document.getElementById(id).value) || 0; });
  return c;
}

function ctPrecoBase(tipo, c) {
  const map = { split: 'pBaseSplit', cassete: 'pBaseCassete', pisoteto: 'pBasePisoTeto', multi: 'pBaseMulti', vrf: 'pBaseVrf' };
  return c[map[tipo]] || 0;
}

function ctPrecoPorte(porte, c) {
  const idx = CT_PORTES.indexOf(porte);
  return idx >= 2 ? (c.pPorte || 0) * (idx - 1) : 0;
}

function ctCalcularItem(eq, c) {
  const mAcesso = eq.acesso === 'medio' ? c.mAcessoMedio : (eq.acesso === 'dificil' ? c.mAcessoDificil : 1);
  const mCondicao = eq.condicao === 'regular' ? c.mCondRegular : (eq.condicao === 'ruim' ? c.mCondRuim : 1);
  const taxaVisita = c.pTaxaVisita || 0;
  if (eq.tipo === 'multi' || eq.tipo === 'vrf') {
    const base = ctPrecoBase(eq.tipo, c);
    let soma = 0;
    (eq.evaps || []).forEach(ev => { soma += (base + ctPrecoPorte(ev.porte, c)) * (parseInt(ev.qtd) || 1); });
    return (soma * mAcesso * mCondicao) + taxaVisita;
  }
  let preco = ctPrecoBase(eq.tipo, c) + ctPrecoPorte(eq.porte, c);
  preco *= mAcesso * mCondicao;
  preco += taxaVisita;
  return preco * eq.qtd;
}

function ctBtuDoPorte(porte) {
  return { '9k': 9000, '12k': 12000, '18k': 18000, '24k': 24000, '30k': 30000, '36k+': 36000 }[porte] || 0;
}

function ctCargaTermicaTotal() {
  let btu = 0, temPortePlus = false;
  ctEquipamentos.forEach(e => {
    if (e.tipo === 'multi' || e.tipo === 'vrf') {
      (e.evaps || []).forEach(ev => { btu += ctBtuDoPorte(ev.porte) * (parseInt(ev.qtd) || 1); if (ev.porte === '36k+') temPortePlus = true; });
    } else {
      btu += ctBtuDoPorte(e.porte) * (parseInt(e.qtd) || 1);
      if (e.porte === '36k+') temPortePlus = true;
    }
  });
  return { btu, tr: btu / 12000, temPortePlus };
}

function ctVisitasPorAno() {
  const v = document.getElementById('ctFreqPreset').value;
  if (v === 'custom') return Math.max(1, parseInt(document.getElementById('ctFreqCustom').value) || 1);
  return parseInt(v);
}

function renderContrato() {
  ctEquipamentos = [ctNovoEquip()];
  const conf = Object.assign({}, CT_VALORES_PADRAO, (empresaAtual.precos.pmoc || {}));

  document.getElementById("conteudo").innerHTML = `
    <div id="ctEditor">
      <div class="card">
        <h3>Cliente</h3>
        <label>Cliente cadastrado</label>
        <select id="ctClienteSelect"><option value="">— selecionar cliente —</option></select>
        <label>Tipo de local</label>
        <select id="ctClienteTipo">
          <option>Empresa / Escritório</option><option>Hotel / Pousada</option><option>Mercado / Varejo</option>
          <option>Clínica / Consultório</option><option>Indústria</option><option>Condomínio</option><option>Outro</option>
        </select>
        <label>CNPJ / CPF</label><input type="text" id="ctClienteCnpj" placeholder="00.000.000/0000-00">
        <label>Nome do responsável</label><input type="text" id="ctClienteResponsavel" placeholder="Quem está fechando o contrato">
        <label>Contato (WhatsApp)</label><input type="text" id="ctClienteContato" placeholder="(18) 9....">
        <label>Endereço / Cidade</label><input type="text" id="ctClienteEndereco" placeholder="Bairro, cidade">
      </div>

      <div class="card">
        <h3>Equipamentos</h3>
        <p class="note" style="margin-top:-6px;">Adicione cada aparelho ou grupo de aparelhos iguais do contrato.</p>
        <div id="ctListaEquip"></div>
        <button class="add-btn" id="ctAddEquipBtn">+ Adicionar equipamento</button>
      </div>

      <div class="card">
        <h3>Deslocamento e frequência</h3>
        <label>Distância até o local (km, ida)</label>
        <input type="number" id="ctDistanciaKm" value="0" min="0">
        <label>Visitas por ano</label>
        <select id="ctFreqPreset">
          <option value="12">Mensal (12x/ano)</option><option value="4">Trimestral (4x/ano)</option>
          <option value="2">Semestral (2x/ano)</option><option value="1">Anual (1x/ano)</option>
          <option value="custom">Personalizado</option>
        </select>
        <div class="field hidden" id="ctFreqCustomWrap">
          <label>Número de visitas por ano (personalizado)</label>
          <input type="number" id="ctFreqCustom" value="6" min="1">
        </div>
      </div>

      <div class="card">
        <details>
          <summary>Ajustar tabela de preços (valores médios editáveis)</summary>
          <div class="note">Preço base = por visita, por equipamento. Ajuste aqui e o cálculo já atualiza.</div>
          <div class="price-grid">
            <span>Base Split (R$)</span><input type="number" id="pBaseSplit" value="${conf.pBaseSplit}">
            <span>Base Cassete (R$)</span><input type="number" id="pBaseCassete" value="${conf.pBaseCassete}">
            <span>Base Piso Teto (R$)</span><input type="number" id="pBasePisoTeto" value="${conf.pBasePisoTeto}">
            <span>Base Multi-Split (R$/evap.)</span><input type="number" id="pBaseMulti" value="${conf.pBaseMulti}">
            <span>Base VRF (R$/evap.)</span><input type="number" id="pBaseVrf" value="${conf.pBaseVrf}">
            <span>Adicional por porte 18k+ (R$)</span><input type="number" id="pPorte" value="${conf.pPorte}">
            <span>Mult. acesso médio</span><input type="number" step="0.05" id="mAcessoMedio" value="${conf.mAcessoMedio}">
            <span>Mult. acesso difícil</span><input type="number" step="0.05" id="mAcessoDificil" value="${conf.mAcessoDificil}">
            <span>Mult. condição regular</span><input type="number" step="0.05" id="mCondRegular" value="${conf.mCondRegular}">
            <span>Mult. condição ruim</span><input type="number" step="0.05" id="mCondRuim" value="${conf.mCondRuim}">
            <span>R$ por km (ida e volta)</span><input type="number" step="0.5" id="pKm" value="${conf.pKm}">
            <span>Taxa fixa/visita (R$)</span><input type="number" id="pTaxaVisita" value="${conf.pTaxaVisita}">
          </div>
        </details>
      </div>

      <div class="result">
        <div class="label">Valor por visita</div>
        <div class="value" id="ctTotalVisita">R$ 0,00</div>
        <div class="breakdown" id="ctTotalAnual"></div>
      </div>
      <div class="card">
        <div class="note" style="margin-top:0;">Carga térmica total (uso interno, não aparece no orçamento do cliente)</div>
        <div style="font-family:'Manrope',sans-serif; font-weight:800; font-size:16px; margin-top:4px;" id="ctCargaValores">0 BTU/h · 0,0 TR</div>
        <span class="status-tag" id="ctBadge" style="margin-top:8px;"></span>
      </div>

      <button class="btn btn-secundario" id="ctVerPropostaBtn">Ver proposta para o cliente</button>
      <button class="btn" id="ctSalvarBtn">Salvar contrato no histórico do cliente</button>
      <div class="msg" id="ctSalvarMsg"></div>

      <div class="card" id="ctGerarContratoBox" style="margin-top:14px;">
        <label>Modelo de contrato</label>
        <select id="ctTipoOverride">
          <option value="auto">Automático (pela carga térmica)</option>
          <option value="pequena">Forçar: pequenas empresas (sem RT)</option>
          <option value="grande">Forçar: empresas maiores (com RT/ART)</option>
        </select>
        <button class="btn btn-ambar" id="ctGerarContratoBtn">Gerar contrato preenchido</button>
      </div>
    </div>

    <div id="ctPropostaView" class="hidden">
      <div class="proposal">
        <div class="proposal-header">
          <div class="brand">${esc(empresaAtual.nome_empresa)}</div>
          <div class="tagline">Orçamento — Contrato de manutenção</div>
        </div>
        <div class="proposal-items" id="ctPropostaItems"></div>
        <div class="proposal-total"><span class="lbl">Valor por visita</span><span class="val" id="ctPropostaTotal">R$ 0,00</span></div>
        <div class="proposal-condicoes" id="ctPropostaCondicoes"></div>
        <div class="proposal-marca">feito no Cosmos Pro</div>
      </div>
      <div class="action-row">
        <button class="btn btn-secundario" id="ctPrintBtn">Salvar / imprimir PDF</button>
        <button class="btn btn-secundario" id="ctWhatsappBtn">Texto p/ WhatsApp</button>
      </div>
      <textarea id="ctWhatsappText" class="hidden" readonly></textarea>
      <div class="voltar-link" id="ctVoltarPropostaBtn">← Voltar para edição</div>
    </div>

    <div id="ctContratoView" class="hidden">
      <div class="proposal" id="ctContratoConteudo" style="padding: 24px 20px; font-size: 13px; line-height: 1.55;"></div>
      <div class="action-row"><button class="btn btn-secundario" id="ctPrintContratoBtn">Salvar / imprimir PDF</button></div>
      <div class="voltar-link" id="ctVoltarContratoBtn">← Voltar para edição</div>
    </div>
  `;

  ligarEventosContrato();
  ctRenderEquip();

  supabaseClient.from('clientes').select('id,nome,telefone,endereco').eq('empresa_id', empresaAtual.id).order('nome').then(({ data }) => {
    ctClientesCache = data || [];
    const select = document.getElementById('ctClienteSelect');
    if (select) select.innerHTML = '<option value="">— selecionar cliente —</option>' + ctClientesCache.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
  });
}

function ctRenderEquip() {
  const el = document.getElementById('ctListaEquip');
  el.innerHTML = ctEquipamentos.map((e, i) => {
    const ehMultiplo = (e.tipo === 'multi' || e.tipo === 'vrf');
    const seletorTipo = `<select data-eq="${e.id}" data-campo="tipo">${CT_TIPOS.map(t => `<option value="${t.id}" ${e.tipo === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}</select>`;
    const seletorAcesso = `<select data-eq="${e.id}" data-campo="acesso">${CT_ACESSOS.map(a => `<option value="${a.id}" ${e.acesso === a.id ? 'selected' : ''}>${a.label}</option>`).join('')}</select>`;
    const seletorCondicao = `<select data-eq="${e.id}" data-campo="condicao">${CT_CONDICOES.map(c => `<option value="${c.id}" ${e.condicao === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}</select>`;

    if (ehMultiplo) {
      const evapsHtml = (e.evaps || []).map((ev, idx) => `
        <div class="price-grid" style="grid-template-columns: 1fr 70px 32px; margin-top:6px;">
          <select data-eq="${e.id}" data-evap="${idx}" data-campo="porte">${CT_PORTES.map(p => `<option ${ev.porte === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
          <input type="number" min="1" value="${ev.qtd}" data-eq="${e.id}" data-evap="${idx}" data-campo="qtd">
          <button class="remove-btn" data-remove-evap="${e.id}:${idx}">✕</button>
        </div>`).join('');
      return `
        <div class="item-card">
          <div class="item-header"><span>Item ${i + 1} — Condensadora (${ehMultiplo ? 'multi/VRF' : ''})</span><button class="remove-btn" data-remove-equip="${e.id}">✕</button></div>
          <label>Tipo</label>${seletorTipo}
          <label>Acesso</label>${seletorAcesso}
          <label>Condição</label>${seletorCondicao}
          <label>Evaporadoras nesta condensadora</label>
          ${evapsHtml}
          <button class="add-btn" style="margin-top:10px; padding:9px;" data-add-evap="${e.id}">+ Evaporadora</button>
        </div>`;
    }
    return `
      <div class="item-card">
        <div class="item-header"><span>Item ${i + 1} — ${CT_TIPOS.find(t => t.id === e.tipo).label}</span><button class="remove-btn" data-remove-equip="${e.id}">✕</button></div>
        <label>Tipo</label>${seletorTipo}
        <label>Porte</label><select data-eq="${e.id}" data-campo="porte">${CT_PORTES.map(p => `<option ${e.porte === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
        <label>Quantidade</label><input type="number" min="1" value="${e.qtd}" data-eq="${e.id}" data-campo="qtd">
        <label>Acesso</label>${seletorAcesso}
        <label>Condição</label>${seletorCondicao}
      </div>`;
  }).join('');
  ctCalcular();
}

function ctCalcular() {
  const c = ctCfg();
  const totalEquip = ctEquipamentos.reduce((s, e) => s + ctCalcularItem(e, c), 0);
  const km = parseFloat(document.getElementById('ctDistanciaKm').value) || 0;
  const custoKm = km * (c.pKm || 0);
  const totalVisita = totalEquip + custoKm;
  const visitas = ctVisitasPorAno();
  const totalAnual = totalVisita * visitas;

  document.getElementById('ctTotalVisita').textContent = money(totalVisita);
  document.getElementById('ctTotalAnual').innerHTML = `<div><span>Anual estimado</span><span>${money(totalAnual)} · ${visitas}x/ano</span></div>`;

  const { btu, tr, temPortePlus } = ctCargaTermicaTotal();
  document.getElementById('ctCargaValores').textContent = `${btu.toLocaleString('pt-BR')}${temPortePlus ? '+' : ''} BTU/h · ${tr.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${temPortePlus ? '+' : ''} TR`;
  const badge = document.getElementById('ctBadge');
  if (btu >= 60000) { badge.className = 'status-tag status-cancelado'; badge.textContent = '≥ 5 TR — exige Responsável Técnico e ART'; }
  else { badge.className = 'status-tag status-concluido'; badge.textContent = '< 5 TR — PMOC simplificado (sem RT/ART)'; }
}

function ctSalvarConfigDebounced() {
  clearTimeout(ctSalvarConfigTimeout);
  ctSalvarConfigTimeout = setTimeout(async () => {
    const c = ctCfg();
    empresaAtual.precos = Object.assign({}, empresaAtual.precos, { pmoc: c });
    await supabaseClient.from('empresas').update({ precos: empresaAtual.precos }).eq('id', empresaAtual.id);
  }, 800);
}

function ligarEventosContrato() {
  document.getElementById('ctAddEquipBtn').addEventListener('click', () => { ctEquipamentos.push(ctNovoEquip()); ctRenderEquip(); });

  document.getElementById('ctListaEquip').addEventListener('change', (e) => {
    const eqId = parseInt(e.target.getAttribute('data-eq'));
    const campo = e.target.getAttribute('data-campo');
    const evapIdx = e.target.getAttribute('data-evap');
    if (!eqId || !campo) return;
    const eq = ctEquipamentos.find(x => x.id === eqId);
    if (!eq) return;
    if (evapIdx !== null) {
      const idx = parseInt(evapIdx);
      eq.evaps[idx][campo] = campo === 'qtd' ? Math.max(1, parseInt(e.target.value) || 1) : e.target.value;
      ctCalcular();
      return;
    }
    if (campo === 'tipo') {
      eq.tipo = e.target.value;
      if ((e.target.value === 'multi' || e.target.value === 'vrf') && !eq.evaps) eq.evaps = [{ porte: '9k', qtd: 1 }];
      ctRenderEquip();
      return;
    }
    eq[campo] = campo === 'qtd' ? Math.max(1, parseInt(e.target.value) || 1) : e.target.value;
    ctCalcular();
  });

  document.getElementById('ctListaEquip').addEventListener('click', (e) => {
    const remEquip = e.target.getAttribute('data-remove-equip');
    if (remEquip) { ctEquipamentos = ctEquipamentos.filter(x => x.id !== parseInt(remEquip)); ctRenderEquip(); return; }
    const addEvap = e.target.getAttribute('data-add-evap');
    if (addEvap) { const eq = ctEquipamentos.find(x => x.id === parseInt(addEvap)); eq.evaps.push({ porte: '9k', qtd: 1 }); ctRenderEquip(); return; }
    const remEvap = e.target.getAttribute('data-remove-evap');
    if (remEvap) {
      const [eqId, idx] = remEvap.split(':').map(Number);
      const eq = ctEquipamentos.find(x => x.id === eqId);
      eq.evaps.splice(idx, 1);
      if (eq.evaps.length === 0) eq.evaps.push({ porte: '9k', qtd: 1 });
      ctRenderEquip();
    }
  });

  document.getElementById('ctDistanciaKm').addEventListener('input', ctCalcular);
  document.getElementById('ctFreqPreset').addEventListener('change', () => {
    document.getElementById('ctFreqCustomWrap').classList.toggle('hidden', document.getElementById('ctFreqPreset').value !== 'custom');
    ctCalcular();
  });
  document.getElementById('ctFreqCustom').addEventListener('input', ctCalcular);
  document.querySelectorAll('#ctEditor .price-grid input').forEach(el => {
    if (el.id) el.addEventListener('input', () => { ctCalcular(); ctSalvarConfigDebounced(); });
  });

  document.getElementById('ctClienteSelect').addEventListener('change', (e) => {
    const c = ctClientesCache.find(c => c.id === e.target.value);
    if (c) {
      document.getElementById('ctClienteContato').value = c.telefone || '';
      document.getElementById('ctClienteEndereco').value = c.endereco || '';
    }
  });

  document.getElementById('ctVerPropostaBtn').addEventListener('click', ctMontarProposta);
  document.getElementById('ctVoltarPropostaBtn').addEventListener('click', () => {
    document.getElementById('ctPropostaView').classList.add('hidden');
    document.getElementById('ctEditor').classList.remove('hidden');
  });
  document.getElementById('ctPrintBtn').addEventListener('click', () => window.print());
  document.getElementById('ctWhatsappBtn').addEventListener('click', () => {
    const ta = document.getElementById('ctWhatsappText');
    ta.classList.remove('hidden');
    ta.select();
    try { navigator.clipboard.writeText(ta.value); } catch (e) { try { document.execCommand('copy'); } catch (e2) {} }
  });

  document.getElementById('ctSalvarBtn').addEventListener('click', ctSalvarContrato);
  document.getElementById('ctGerarContratoBtn').addEventListener('click', ctMontarContrato);
  document.getElementById('ctVoltarContratoBtn').addEventListener('click', () => {
    document.getElementById('ctContratoView').classList.add('hidden');
    document.getElementById('ctEditor').classList.remove('hidden');
  });
  document.getElementById('ctPrintContratoBtn').addEventListener('click', () => window.print());
}

function ctNomeClienteSelecionado() {
  const sel = document.getElementById('ctClienteSelect');
  const c = ctClientesCache.find(c => c.id === sel.value);
  return c ? c.nome : '';
}

function ctMontarProposta() {
  const c = ctCfg();
  const linhas = [];
  let totalEquip = 0;
  ctEquipamentos.forEach(e => {
    const valor = ctCalcularItem(e, c);
    totalEquip += valor;
    const ehMultiplo = (e.tipo === 'multi' || e.tipo === 'vrf');
    const porteTxt = ehMultiplo ? (e.evaps || []).map(ev => `${ev.qtd}x ${ev.porte}`).join(', ') : e.porte;
    const qtdTxt = ehMultiplo ? (e.evaps || []).reduce((s, ev) => s + (parseInt(ev.qtd) || 1), 0) : e.qtd;
    linhas.push({ titulo: CT_TIPOS.find(t => t.id === e.tipo).label, detalhe: `${porteTxt} · ${qtdTxt}x · acesso ${CT_ACESSOS.find(a => a.id === e.acesso).label.toLowerCase()}`, valor });
  });
  const km = parseFloat(document.getElementById('ctDistanciaKm').value) || 0;
  const custoKm = km * (c.pKm || 0);
  const totalVisita = totalEquip + custoKm;
  const visitas = ctVisitasPorAno();
  const totalAnual = totalVisita * visitas;
  const nomeCliente = ctNomeClienteSelecionado();

  document.getElementById('ctPropostaItems').innerHTML = linhas.map(l => `<div class="proposal-item"><div class="titulo">${esc(l.titulo)}</div><div class="detalhe">${esc(l.detalhe)}</div><div class="preco">${money(l.valor)}</div></div>`).join('')
    + `<div class="proposal-item"><div class="titulo">Deslocamento</div><div class="detalhe">${km} km (ida e volta)</div><div class="preco">${money(custoKm)}</div></div>`;
  document.getElementById('ctPropostaTotal').textContent = money(totalVisita);
  document.getElementById('ctPropostaCondicoes').innerHTML = `<b>Condições</b>${visitas}x de visitas por ano · total anual estimado ${money(totalAnual)}. Inclui deslocamento. Peças e materiais não inclusos — orçados à parte quando necessário.`;

  const whatsLines = linhas.map(l => `• ${l.titulo} (${l.detalhe}): ${money(l.valor)}`);
  const whatsText = `Orçamento — Contrato de manutenção — ${empresaAtual.nome_empresa}` + (nomeCliente ? ' — ' + nomeCliente : '') + '\n\n' + whatsLines.join('\n') + `\n\nValor por visita: ${money(totalVisita)}\n${visitas}x/ano · Total anual estimado: ${money(totalAnual)}`;
  document.getElementById('ctWhatsappText').value = whatsText;

  document.getElementById('ctEditor').classList.add('hidden');
  document.getElementById('ctPropostaView').classList.remove('hidden');
}

async function ctSalvarContrato() {
  const msg = document.getElementById('ctSalvarMsg');
  const clienteId = document.getElementById('ctClienteSelect').value;
  if (!clienteId) { msg.className = 'msg erro'; msg.textContent = 'Selecione um cliente cadastrado (aba Clientes) pra salvar o contrato.'; return; }
  const c = ctCfg();
  const totalEquip = ctEquipamentos.reduce((s, e) => s + ctCalcularItem(e, c), 0);
  const km = parseFloat(document.getElementById('ctDistanciaKm').value) || 0;
  const custoKm = km * (c.pKm || 0);
  const totalVisita = totalEquip + custoKm;
  const visitas = ctVisitasPorAno();
  const totalAnual = totalVisita * visitas;

  const dados = {
    equipamentos: ctEquipamentos.map(({ id, ...resto }) => resto),
    distanciaKm: km,
    freqPreset: document.getElementById('ctFreqPreset').value,
    freqCustom: document.getElementById('ctFreqCustom').value,
    tipoLocal: document.getElementById('ctClienteTipo').value,
    cnpj: document.getElementById('ctClienteCnpj').value,
    responsavel: document.getElementById('ctClienteResponsavel').value,
    contato: document.getElementById('ctClienteContato').value,
    endereco: document.getElementById('ctClienteEndereco').value
  };

  const { data, error } = await supabaseClient.from('contratos').insert({
    empresa_id: empresaAtual.id,
    cliente_id: clienteId,
    dados,
    valor_visita: totalVisita,
    valor_anual: totalAnual,
    status: 'rascunho'
  }).select().single();

  if (error) { msg.className = 'msg erro'; msg.textContent = 'Erro ao salvar contrato.'; return; }
  ctContratoSalvoId = data.id;
  msg.className = 'msg ok'; msg.textContent = 'Contrato salvo no histórico do cliente!';
}

function ctMontarContrato() {
  const override = document.getElementById('ctTipoOverride').value;
  const { btu } = ctCargaTermicaTotal();
  const ehGrande = override === 'auto' ? (btu >= 60000) : (override === 'grande');

  const nomeCliente = esc(ctNomeClienteSelecionado() || '________________________');
  const tipoLocal = esc(document.getElementById('ctClienteTipo').value);
  const enderecoCliente = esc(document.getElementById('ctClienteEndereco').value || '________________________');
  const cnpjCliente = esc(document.getElementById('ctClienteCnpj').value || '________________________');
  const responsavelCliente = esc(document.getElementById('ctClienteResponsavel').value || '________________________');

  const c = ctCfg();
  const totalEquip = ctEquipamentos.reduce((s, e) => s + ctCalcularItem(e, c), 0);
  const km = parseFloat(document.getElementById('ctDistanciaKm').value) || 0;
  const custoKm = km * (c.pKm || 0);
  const totalVisita = totalEquip + custoKm;
  const visitas = ctVisitasPorAno();
  const totalAnual = totalVisita * visitas;
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  const linhasEquip = ctEquipamentos.map((e, i) => {
    const ehMultiplo = (e.tipo === 'multi' || e.tipo === 'vrf');
    const tipoLbl = CT_TIPOS.find(t => t.id === e.tipo).label;
    const porteCol = ehMultiplo ? (e.evaps || []).map(ev => `${ev.qtd}x ${ev.porte}`).join(', ') : e.porte;
    const qtdCol = ehMultiplo ? (e.evaps || []).reduce((s, ev) => s + (parseInt(ev.qtd) || 1), 0) : e.qtd;
    return `<tr><td style="padding:6px 8px; border-bottom:1px solid var(--cinza-linha);">${i + 1}</td><td style="padding:6px 8px; border-bottom:1px solid var(--cinza-linha);">${esc(tipoLbl)}</td><td style="padding:6px 8px; border-bottom:1px solid var(--cinza-linha);">${esc(porteCol)}</td><td style="padding:6px 8px; border-bottom:1px solid var(--cinza-linha);">${qtdCol}</td></tr>`;
  }).join('');

  const clausulaRT = ehGrande ? `
    <p><b>CLÁUSULA 4ª – DA RESPONSABILIDADE TÉCNICA.</b> A CONTRATADA indicará profissional habilitado, devidamente registrado no CREA/CFT sob o nº ____________, como Responsável Técnico (RT) pela execução do PMOC, cabendo a este a emissão da respectiva Anotação de Responsabilidade Técnica (ART), cujo custo correrá por conta de ____________.</p>
    <p><b>CLÁUSULA 5ª – DO LIVRO DE REGISTRO.</b> A CONTRATADA manterá disponível no estabelecimento da CONTRATANTE, ou em meio digital de fácil acesso, o registro de todas as intervenções realizadas, ficando à disposição dos órgãos de vigilância sanitária e demais autoridades fiscalizadoras.</p>
  ` : `<p><b>CLÁUSULA 4ª – DO REGISTRO DAS ATIVIDADES.</b> A CONTRATADA manterá registro simplificado das visitas realizadas, com data e descrição sucinta dos serviços executados, disponibilizando-o à CONTRATANTE sempre que solicitado.</p>`;

  const objetoTexto = ehGrande
    ? `O presente contrato tem por objeto a prestação, pela CONTRATADA à CONTRATANTE, de serviços de manutenção preventiva e execução do Plano de Manutenção, Operação e Controle (PMOC) dos sistemas de climatização relacionados no Anexo I, em conformidade com a Lei Federal nº 13.589/2018 e com a norma técnica ABNT NBR 13971, sob responsabilidade técnica de profissional habilitado nos termos da Cláusula 4ª.`
    : `O presente contrato tem por objeto a prestação, pela CONTRATADA à CONTRATANTE, de serviços de manutenção preventiva periódica dos equipamentos relacionados no Anexo I, incluindo a elaboração e execução do PMOC em sua forma simplificada, nos termos da Lei Federal nº 13.589/2018, aplicável a sistemas com carga térmica total inferior a 60.000 BTU/h (5 TR), dispensando-se a indicação de responsável técnico habilitado e a emissão de ART.`;

  const n = ehGrande ? { obrigContratante: '6ª', obrigContratada: '7ª', pecas: '8ª', valor: '9ª', vigencia: '10ª', rescisao: '11ª', foro: '12ª' }
    : { obrigContratante: '5ª', obrigContratada: '6ª', pecas: '7ª', valor: '8ª', vigencia: '9ª', rescisao: '10ª', foro: '11ª' };

  document.getElementById('ctContratoConteudo').innerHTML = `
    <h2 style="text-align:center; font-family:'Manrope',sans-serif; font-size:18px; color:var(--escuro); margin-bottom:2px;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MANUTENÇÃO</h2>
    <p style="text-align:center; color:var(--azul); font-style:italic; font-size:12.5px; margin-top:0;">PMOC — Plano de Manutenção, Operação e Controle · ${ehGrande ? 'com Responsabilidade Técnica' : 'modelo simplificado'}</p>

    <h3 style="border-bottom:2px solid var(--ambar); padding-bottom:4px; font-size:14px; color:var(--escuro);">Partes</h3>
    <p><b>CONTRATANTE:</b> ${nomeCliente}<br><b>Tipo de local:</b> ${tipoLocal}<br><b>Endereço:</b> ${enderecoCliente}<br><b>CNPJ/CPF:</b> ${cnpjCliente}<br><b>Representante legal:</b> ${responsavelCliente}</p>
    <p>doravante denominada CONTRATANTE; e, de outro lado,</p>
    <p><b>CONTRATADA:</b> ${esc(empresaAtual.nome_empresa)}<br><b>Contato:</b> ${esc((empresaAtual.precos.dadosEmpresa && empresaAtual.precos.dadosEmpresa.telefone) || '________________________')}<br><b>CNPJ:</b> ${esc((empresaAtual.precos.dadosEmpresa && empresaAtual.precos.dadosEmpresa.cnpj) || '________________________')}</p>
    <p>doravante denominada CONTRATADA, têm entre si justo e contratado o que segue.</p>

    <h3 style="border-bottom:2px solid var(--ambar); padding-bottom:4px; font-size:14px; color:var(--escuro);">Cláusulas</h3>
    <p><b>CLÁUSULA 1ª – DO OBJETO.</b> ${objetoTexto}</p>
    <p><b>CLÁUSULA 2ª – DOS EQUIPAMENTOS.</b> Os equipamentos objeto deste contrato estão relacionados no Anexo I, parte integrante deste instrumento, o qual será atualizado sempre que houver inclusão, substituição ou baixa de equipamentos.</p>
    <p><b>CLÁUSULA 3ª – DA PERIODICIDADE E DAS ATIVIDADES.</b> As visitas de manutenção ocorrerão na frequência de ${visitas} vez(es) ao ano, compreendendo limpeza e/ou substituição de filtros, higienização de bandejas e drenos, verificação de gás refrigerante, inspeção de componentes elétricos e mecânicos, e demais procedimentos previstos na ABNT NBR 13971, com relatório entregue à CONTRATANTE após cada visita.</p>
    ${clausulaRT}
    <p><b>CLÁUSULA ${n.obrigContratante} – DAS OBRIGAÇÕES DA CONTRATANTE.</b> Permitir livre acesso da equipe da CONTRATADA aos equipamentos; comunicar previamente qualquer alteração no parque de equipamentos; e zelar pelo uso adequado dos sistemas entre as visitas.</p>
    <p><b>CLÁUSULA ${n.obrigContratada} – DAS OBRIGAÇÕES DA CONTRATADA.</b> Executar os serviços conforme cronograma e boas práticas técnicas, utilizando EPI e observando as normas de segurança do trabalho.</p>
    <p><b>CLÁUSULA ${n.pecas} – DE PEÇAS E MATERIAIS.</b> Este contrato compreende exclusivamente mão de obra de manutenção preventiva. Peças e materiais de reposição não estão inclusos, sendo orçados à parte e executados somente mediante aprovação da CONTRATANTE.</p>
    <p><b>CLÁUSULA ${n.valor} – DO VALOR E FORMA DE PAGAMENTO.</b> Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA o valor de ${money(totalVisita)} por visita, totalizando ${money(totalAnual)} ao ano, com vencimento a combinar, podendo o valor ser reajustado anualmente pelo índice IGP-M/IPCA.</p>
    <p><b>CLÁUSULA ${n.vigencia} – DA VIGÊNCIA E RENOVAÇÃO.</b> O presente contrato vigorará pelo prazo de 12 (doze) meses a contar da assinatura, renovando-se automaticamente por períodos iguais, salvo manifestação em contrário com antecedência mínima de 30 dias.</p>
    <p><b>CLÁUSULA ${n.rescisao} – DA RESCISÃO.</b> Qualquer das partes poderá rescindir o contrato mediante aviso prévio de 30 dias, sem prejuízo do pagamento pelos serviços já executados.</p>
    <p><b>CLÁUSULA ${n.foro} – DO FORO.</b> Fica eleito o foro da comarca de ________________________ para dirimir quaisquer controvérsias oriundas deste contrato.</p>

    <p style="margin-top:20px;">${dataHoje}.</p>
    <div style="text-align:center; margin-top:50px;"><div style="border-top:1px solid #333; width:280px; margin:0 auto; padding-top:6px; font-weight:600; font-size:13px;">CONTRATANTE — ${nomeCliente}</div></div>
    <div style="text-align:center; margin-top:40px;"><div style="border-top:1px solid #333; width:280px; margin:0 auto; padding-top:6px; font-weight:600; font-size:13px;">CONTRATADA — ${esc(empresaAtual.nome_empresa)}</div></div>

    <h3 style="border-bottom:2px solid var(--ambar); padding-bottom:4px; font-size:14px; color:var(--escuro); margin-top:32px;">Anexo I — Relação de Equipamentos</h3>
    <table style="width:100%; border-collapse:collapse; font-size:12.5px; margin-top:8px;">
      <thead><tr style="background:var(--cinza-claro);"><th style="text-align:left; padding:6px 8px;">Item</th><th style="text-align:left; padding:6px 8px;">Tipo</th><th style="text-align:left; padding:6px 8px;">Porte</th><th style="text-align:left; padding:6px 8px;">Qtd.</th></tr></thead>
      <tbody>${linhasEquip}</tbody>
    </table>
    <p style="margin-top:12px; font-size:12.5px;"><b>Frequência:</b> ${visitas}x/ano · <b>Deslocamento:</b> ${km} km · <b>Valor/visita:</b> ${money(totalVisita)} · <b>Valor anual estimado:</b> ${money(totalAnual)}</p>
    <p style="font-size:11px; color:var(--cinza-texto); margin-top:16px;">Minuta gerada automaticamente a partir do orçamento. Revise dados cadastrais (CNPJ, RT, foro) antes de formalizar.</p>
    <div class="proposal-marca">feito no Cosmos Pro</div>
  `;

  document.getElementById('ctEditor').classList.add('hidden');
  document.getElementById('ctContratoView').classList.remove('hidden');
}


// === FIX: expor funções para onclick do HTML ===
try {
  const _expor = { sair, iniciar, mostrarAba, salvarDadosEmpresa, carregarStatusGoogle, vincularGoogle,
    renderInicio, irParaNovoClienteAtalho, irParaNovaOS, renderClientes, clCarregarLista, clVerDetalhes,
    clSalvarEdicao, clExcluir, clSalvarNovo, clVerOrcamento, orcExcluir, irParaFichaCliente, clAbrirAgendaItem,
    osAbrirComContexto, clExcluir, renderAgenda, agSalvarNovo, agAtualizarStatus, agAtualizarDinamico, irParaKanbanOS,
    agRenderKanban, cpSalvar, cpExcluir, agRenderCalendario, agRenderDia, voltarDoOS, osCriarCompromissoVinculado,
    osConfirmarAgendamento, osSalvar, osExcluir, renderAvulso, avSalvarOrcamento, avSalvarConfig, novoItemAvulso,
    renderContrato, ctSalvarContrato, ctExcluirContrato, ctNovoEquip };
  Object.entries(_expor).forEach(([k,v])=>{ if(typeof v==='function') window[k]=v; });
  window.empresaAtual = empresaAtual;
  // keep empresaAtual updated via getter
  Object.defineProperty(window, 'empresaAtual', { get: ()=> empresaAtual, set: (v)=>{ empresaAtual=v; } });
} catch(e){ console.warn('expor falhou', e); }

window.sair = sair;
window.salvarDadosEmpresa = salvarDadosEmpresa;


iniciar();
