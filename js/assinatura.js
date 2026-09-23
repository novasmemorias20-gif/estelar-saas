
import { supabaseClient } from './supabase.js';
import { PLANO_PRECOS } from './config.js';
import { esc } from './utils.js';

const ASSINATURA_STATUS_LABEL = { trial: 'Sem assinatura ativa', pendente: 'Pagamento pendente', ativa: 'Ativa', atrasada: 'Pagamento atrasado', cancelada: 'Cancelada' };

function celulaPlano(valor){
  if (valor === true) return '<span style="color:var(--ok); font-weight:800;">✓</span>';
  if (valor === false) return '<span style="color:var(--cinza-texto);">✗</span>';
  return `<span style="font-weight:700; font-size:11.5px;">${valor}</span>`;
}

export function renderStatusAssinatura(){
  const el = document.getElementById('statusAssinatura');
  if (!el) return;
  const empresaAtual = window.empresaAtual;
  if (!empresaAtual) return;
  if (empresaAtual.cortesia){
    el.innerHTML = `<span class="status-tag status-concluido">Acesso cortesia — Completo liberado</span>`;
    return;
  }
  const statusAtual = empresaAtual.assinatura_status || 'trial';
  const statusLabel = ASSINATURA_STATUS_LABEL[statusAtual] || statusAtual;
  const corStatus = statusAtual === 'ativa' ? 'concluido' : (statusAtual === 'atrasada' || statusAtual === 'cancelada' ? 'cancelado' : 'agendado');
  const nomePlanoAtual = { completo: 'Plano Completo', basico: 'Plano Essencial' }[empresaAtual.plano] || 'Sem plano';
  const trialAtivo = !!(empresaAtual.trial_completo_expira_em && new Date(empresaAtual.trial_completo_expira_em) > new Date());
  const diasTrial = trialAtivo ? Math.max(1, Math.ceil((new Date(empresaAtual.trial_completo_expira_em) - new Date()) / 86400000)) : 0;
  const trialElegivel = !trialAtivo && !empresaAtual.trial_completo_usado && empresaAtual.plano !== 'completo';
  const TABELA_PLANOS = [
    { nome: 'Clientes e equipamentos', basico: true, completo: true },
    { nome: 'Orçamentos profissionais', basico: true, completo: true },
    { nome: 'Ordens de Serviço', basico: true, completo: true },
    { nome: 'Agenda', basico: true, completo: true },
    { nome: 'Financeiro e dashboard', basico: true, completo: true },
    { nome: 'Contratos de manutenção (PMOC)', basico: false, completo: true },
    { nome: 'Usuários e funcionários', basico: false, completo: true },
    { nome: 'Relatório de serviço em PDF', basico: false, completo: true },
    { nome: 'Cobrança PIX pro cliente', basico: false, completo: true },
  ];
  el.innerHTML = `
    <div style="margin-bottom:14px;">
      <span class="badge-plano">${nomePlanoAtual}</span>
      ${empresaAtual.plano !== 'gratis' ? `<span class="status-tag status-${corStatus}" style="margin-left:6px;">${statusLabel}</span>` : ''}
    </div>
    ${trialAtivo ? `
    <div style="background:var(--azul-tinta); border:1px solid #bfdbfe; border-radius:12px; padding:12px 14px; margin-bottom:16px; font-size:13px;">
      🚀 Você está testando o <b>Completo</b> — faltam <b>${diasTrial} dia${diasTrial > 1 ? 's' : ''}</b>. Gostou? Assine abaixo pra não perder o acesso.
    </div>
    ` : trialElegivel ? `
    <div style="background:var(--azul-tinta); border:1px solid #bfdbfe; border-radius:12px; padding:12px 14px; margin-bottom:16px; font-size:13px; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
      <span>🚀 Nunca testou o <b>Completo</b>? Experimente 14 dias grátis, sem cartão.</span>
      <button class="btn btn-secundario" id="btnIniciarTrialAssinatura" style="margin:0; width:auto; padding:8px 14px; font-size:12.5px;">Testar grátis</button>
    </div>
    ` : ''}
    <div style="overflow-x:auto; margin-bottom:16px;">
      <table style="width:100%; border-collapse:collapse; font-size:12px; min-width:420px;">
        <thead><tr><th></th><th>Essencial</th><th>Completo</th></tr></thead>
        <tbody>${TABELA_PLANOS.map(l=>`<tr><td style="padding:8px 6px; border-top:1px solid var(--borda);">${l.nome}</td><td style="text-align:center;">${celulaPlano(l.basico)}</td><td style="text-align:center;">${celulaPlano(l.completo)}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <label>Ciclo de cobrança</label>
    <select id="assinaturaCiclo"><option value="mensal">Mensal</option><option value="anual">Anual (2 meses grátis)</option></select>
    <label>Forma de pagamento</label>
    <select id="assinaturaMetodo"><option value="pix">PIX (cobrança recorrente por e-mail a cada ciclo)</option><option value="cartao">Cartão de crédito (cobrança automática)</option></select>
    <label>CPF ou CNPJ (exigido pelo Asaas pra gerar a cobrança)</label>
    <input type="text" id="assinaturaCpfCnpj" placeholder="000.000.000-00" value="${esc((empresaAtual.precos.dadosEmpresa && empresaAtual.precos.dadosEmpresa.cnpj) || '')}">
    <div style="margin-top:14px; gap:10px; display:grid;">
      <button class="btn btn-secundario" id="btnAssinarBasico"><b>Essencial</b> — <span id="precoBasico">R$ 39,90/mês</span></button>
      <button class="btn btn-ambar" id="btnAssinarCompleto"><b>Completo</b> — <span id="precoCompleto">R$ 129,90/mês</span></button>
    </div>
    <div class="msg" id="msgAssinatura"></div>
  `;
  document.getElementById('assinaturaCiclo').addEventListener('change', atualizarPrecosExibidos);
  document.getElementById('btnAssinarBasico').addEventListener('click', () => assinarPlano('basico'));
  document.getElementById('btnAssinarCompleto').addEventListener('click', () => assinarPlano('completo'));
  document.getElementById('btnIniciarTrialAssinatura')?.addEventListener('click', () => window.iniciarTrialCompleto && window.iniciarTrialCompleto());
  atualizarPrecosExibidos();
}

export function atualizarPrecosExibidos(){
  const cicloEl = document.getElementById('assinaturaCiclo');
  if (!cicloEl) return;
  const ciclo = cicloEl.value;
  const elB = document.getElementById('precoBasico');
  const elC = document.getElementById('precoCompleto');
  if (elB) elB.textContent = ciclo === 'anual' ? `R$ ${PLANO_PRECOS.basico.anual.toFixed(2).replace('.', ',')}/ano` : `R$ ${PLANO_PRECOS.basico.mensal.toFixed(2).replace('.', ',')}/mês`;
  if (elC) elC.textContent = ciclo === 'anual' ? `R$ ${PLANO_PRECOS.completo.anual.toFixed(2).replace('.', ',')}/ano` : `R$ ${PLANO_PRECOS.completo.mensal.toFixed(2).replace('.', ',')}/mês`;
}

export async function assinarPlano(plano){
  const msg = document.getElementById('msgAssinatura');
  const ciclo = document.getElementById('assinaturaCiclo').value;
  const metodoPagamento = document.getElementById('assinaturaMetodo').value;
  const cpfCnpj = document.getElementById('assinaturaCpfCnpj').value.replace(/[^\d]/g, '');
  if (!cpfCnpj || (cpfCnpj.length !== 11 && cpfCnpj.length !== 14)){
    msg.className = 'msg erro'; msg.textContent = 'Digite um CPF ou CNPJ válido.'; return;
  }
  msg.className = 'msg'; msg.textContent = 'Gerando cobrança...';
  try {
    const { data, error } = await supabaseClient.functions.invoke('asaas-checkout', {
      body: { plano, ciclo, cpfCnpj, metodoPagamento, nome: window.empresaAtual?.nome_empresa || 'Cliente', email: (await supabaseClient.auth.getUser()).data.user?.email }
    });
    
    if (error){
      // supabase-js não entrega o corpo JSON quando a function retorna status != 2xx;
      // o corpo real (com o "detalhe" do Asaas) fica em error.context, uma Response crua.
      let corpo = null;
      try { corpo = await error.context?.json(); } catch (_) { /* corpo não era JSON */ }
      msg.className = 'msg erro';
      msg.textContent = 'Erro: ' + (corpo?.error || error.message) + (corpo?.detalhe ? ' — ' + JSON.stringify(corpo.detalhe).substring(0,300) : '');
      return;
    }
    if (data?.error){
      msg.className = 'msg erro';
      msg.textContent = 'Erro: ' + data.error + (data.detalhe ? ' — ' + JSON.stringify(data.detalhe).substring(0,300) : '');
      return;
    }
    if (data?.invoiceUrl){
      window.open(data.invoiceUrl, '_blank');
      msg.className = 'msg ok'; msg.textContent = 'Link aberto em nova aba.';
    } else if (metodoPagamento === 'pix') {
      msg.className = 'msg ok'; msg.textContent = 'Assinatura criada! O link de pagamento PIX chega no e-mail cadastrado em instantes.';
    } else {
      msg.className = 'msg erro'; msg.textContent = 'Não retornou link de pagamento.';
    }
  } catch (e){
    msg.className = 'msg erro'; msg.textContent = 'Erro de conexão: ' + e.message;
  }
}
