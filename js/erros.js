// Registro de erros do app: grava na tabela "erros_app" (Supabase) pra você ver o que quebrou nos aparelhos dos usuários.
// Nunca pode derrubar o app: tudo aqui dentro é protegido por try/catch.
import { supabaseClient } from './supabase.js';

const MAX_POR_SESSAO = 10;
const jaVistos = new Set();
let enviados = 0;

// Ruídos conhecidos que não indicam defeito do app
const IGNORAR = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /Failed to fetch|NetworkError|Load failed|network request failed/i, // sem internet / sinal ruim
  /AbortError/i,
  /chrome-extension:|moz-extension:|safari-extension:/i
];

async function registrar(mensagem, origem, stack) {
  try {
    mensagem = String(mensagem || '').slice(0, 500);
    if (!mensagem || !navigator.onLine) return;
    if (IGNORAR.some(r => r.test(mensagem) || r.test(origem || ''))) return;
    const chave = mensagem + '|' + (origem || '');
    if (jaVistos.has(chave) || enviados >= MAX_POR_SESSAO) return;
    jaVistos.add(chave);
    enviados++;
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return; // só registra com usuário logado (regra de acesso da tabela)
    await supabaseClient.from('erros_app').insert({
      user_id: session.user.id,
      mensagem,
      origem: String(origem || '').slice(0, 300),
      stack: String(stack || '').slice(0, 2000),
      pagina: location.pathname + location.hash,
      versao_app: window.__versaoApp || null,
      user_agent: navigator.userAgent.slice(0, 250)
    });
  } catch (e) { /* silencioso de propósito */ }
}

window.addEventListener('error', (ev) => {
  registrar(ev.message, ev.filename ? ev.filename.split('/').slice(-2).join('/') + ':' + ev.lineno + ':' + ev.colno : '', ev.error && ev.error.stack);
});
window.addEventListener('unhandledrejection', (ev) => {
  const r = ev.reason;
  registrar((r && r.message) || String(r), 'promise', r && r.stack);
});

// Pra registrar erros tratados em pontos importantes: window.registrarErro(e, 'contexto')
window.registrarErro = (e, contexto) => registrar((e && e.message) || String(e), contexto || 'manual', e && e.stack);
