import { supabaseClient } from './supabase.js';
import { renderStatusAssinatura, atualizarPrecosExibidos, assinarPlano } from './assinatura.js';
window.supabaseClient = supabaseClient;
window.renderStatusAssinatura = renderStatusAssinatura;
window.atualizarPrecosExibidos = atualizarPrecosExibidos;
window.assinarPlano = assinarPlano;
// carrega o resto - core já expõe tudo pra window
await import('./core.js');
