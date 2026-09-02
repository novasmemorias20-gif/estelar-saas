
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
  const nomePlanoAtual = { completo: 'Plano Completo', basico: 'Plano Básico' }[empresaAtual.plano] || 'Plano Grátis';
  const TABELA_PLANOS = [
    { nome: 'Clientes', gratis: 'Até 10', basico: 'Ilimitado', completo: 'Ilimitado' },
    { nome: 'Orçamentos', gratis: true, basico: true, completo: true },
    { nome: 'Clientes e Agenda', gratis: true, basico: true, completo: true },
    { nome: 'Ordens de Serviço', gratis: true, basico: true, completo: true },
    { nome: 'Financeiro na Início', gratis: true, basico: true, completo: true },
    { nome: 'Contratos de manutenção (PMOC)', gratis: false, basico: false, completo: true },
  ];
  el.innerHTML = `
    <div style="margin-bottom:14px;">
      <span class="badge-plano">${nomePlanoAtual}</span>
      ${empresaAtual.plano !== 'gratis' ? `<span class="status-tag status-${corStatus}" style="margin-left:6px;">${statusLabel}</span>` : ''}
    </div>
    <div style="overflow-x:auto; margin-bottom:16px;">
      <table style="width:100%; border-collapse:collapse; font-size:12px; min-width:420px;">
        <thead><tr><th></th><th>Grátis</th><th>Básico</th><th>Completo</th></tr></thead>
        <tbody>${TABELA_PLANOS.map(l=>`<tr><td style="padding:8px 6px; border-top:1px solid var(--borda);">${l.nome}</td><td style="text-align:center;">${celulaPlano(l.gratis)}</td><td style="text-align:center;">${celulaPlano(l.basico)}</td><td style="text-align:center;">${celulaPlano(l.completo)}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <label>Ciclo de cobrança</label>
    <select id="assinaturaCiclo"><option value="mensal">Mensal</option><option value="anual">Anual (2 meses grátis)</option></select>
    <label>CPF ou CNPJ (exigido pelo Asaas pra gerar a cobrança)</label>
    <input type="text" id="assinaturaCpfCnpj" placeholder="000.000.000-00" value="${esc((empresaAtual.precos.dadosEmpresa && empresaAtual.precos.dadosEmpresa.cnpj) || '')}">
    <div style="margin-top:14px; gap:10px; display:grid;">
      <button class="btn btn-secundario" id="btnAssinarBasico"><b>Básico</b> — <span id="precoBasico">R$ 29,90/mês</span></button>
      <button class="btn btn-ambar" id="btnAssinarCompleto"><b>Completo</b> — <span id="precoCompleto">R$ 79,90/mês</span></button>
    </div>
    <div class="msg" id="msgAssinatura"></div>
  `;
  document.getElementById('assinaturaCiclo').addEventListener('change', atualizarPrecosExibidos);
  document.getElementById('btnAssinarBasico').addEventListener('click', () => assinarPlano('basico'));
  document.getElementById('btnAssinarCompleto').addEventListener('click', () => assinarPlano('completo'));
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
  const cpfCnpj = document.getElementById('assinaturaCpfCnpj').value.replace(/[^\d]/g, '');
  if (!cpfCnpj || (cpfCnpj.length !== 11 && cpfCnpj.length !== 14)){
    msg.className = 'msg erro'; msg.textContent = 'Digite um CPF ou CNPJ válido.'; return;
  }
  msg.className = 'msg'; msg.textContent = 'Gerando cobrança...';
  const { data: { session } } = await supabaseClient.auth.getSession();
  try {
    const resp = await fetch('https://lkankciqsldutuncuvyl.supabase.co/functions/v1/asaas-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
      body: JSON.stringify({ plano, ciclo, cpfCnpj, nome: window.empresaAtual?.nome_empresa || 'Cliente', email: session.user.email })
    });
    const data = await resp.json();
    if (!resp.ok || data.error){
      msg.className = 'msg erro';
      msg.textContent = 'Erro: ' + (data.error || 'não foi possível gerar') + (data.detalhe ? ' — ' + JSON.stringify(data.detalhe).substring(0,300) : '');
      return;
    }
    if (data.invoiceUrl){ window.open(data.invoiceUrl, '_blank'); msg.className = 'msg ok'; msg.textContent = 'Link aberto em nova aba.'; }
  } catch (e){ msg.className = 'msg erro'; msg.textContent = 'Erro: ' + e.message; }
}
