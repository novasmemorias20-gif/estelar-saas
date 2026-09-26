import { supabaseClient } from './supabase.js';
import { renderStatusAssinatura, atualizarPrecosExibidos, assinarPlano } from './assinatura.js';
import './copilot.js';
window.supabaseClient = supabaseClient;
window.renderStatusAssinatura = renderStatusAssinatura;
window.atualizarPrecosExibidos = atualizarPrecosExibidos;
window.assinarPlano = assinarPlano;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* offline shell é best-effort */ });
}

// carrega o resto - core já expõe tudo pra window
await import('./core.js');