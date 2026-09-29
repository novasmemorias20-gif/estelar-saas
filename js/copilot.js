// js/copilot.js — Cosmos Copilot: botão flutuante + chat (Fase 1: apenas conversa)

// Conversor markdown -> HTML bem pequeno, só pro que o Copilot realmente usa (negrito, itálico,
// listas com marcadores/numeradas, parágrafos). Escapa o texto ANTES de gerar qualquer tag,
// então não existe caminho pra HTML/script injetado virar tag de verdade.
function escaparHtmlCopilot(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderizarMarkdownSimples(texto) {
  const linhas = escaparHtmlCopilot(String(texto ?? '')).split('\n');
  let html = '';
  let dentroLista = null; // 'ul' | 'ol' | null
  let paragrafoAtual = [];

  function fecharParagrafo() {
    if (paragrafoAtual.length) {
      html += `<p>${paragrafoAtual.join('<br>')}</p>`;
      paragrafoAtual = [];
    }
  }
  function fecharLista() {
    if (dentroLista) { html += `</${dentroLista}>`; dentroLista = null; }
  }
  function aplicarInline(s) {
    return s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  }

  for (const linhaBruta of linhas) {
    const linha = linhaBruta.trim();
    const itemLista = linha.match(/^[-*]\s+(.*)/);
    const itemNumerado = linha.match(/^\d+\.\s+(.*)/);

    if (itemLista) {
      fecharParagrafo();
      if (dentroLista !== 'ul') { fecharLista(); html += '<ul>'; dentroLista = 'ul'; }
      html += `<li>${aplicarInline(itemLista[1])}</li>`;
    } else if (itemNumerado) {
      fecharParagrafo();
      if (dentroLista !== 'ol') { fecharLista(); html += '<ol>'; dentroLista = 'ol'; }
      html += `<li>${aplicarInline(itemNumerado[1])}</li>`;
    } else if (linha === '') {
      fecharLista();
      fecharParagrafo();
    } else {
      fecharLista();
      paragrafoAtual.push(aplicarInline(linha));
    }
  }
  fecharLista();
  fecharParagrafo();
  return html || escaparHtmlCopilot(String(texto ?? ''));
}

function montarCopilot() {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <button class="copilot-botao" id="copilotBotao" title="Cosmos Copilot">✨</button>
    <div class="copilot-painel" id="copilotPainel">
      <div class="copilot-cabecalho">
        <span>✨ Cosmos Copilot</span>
        <div class="copilot-acoes-cab">
          <button class="copilot-nova" id="copilotNova" title="Começar uma conversa nova">Nova conversa</button>
          <button class="copilot-fechar" id="copilotFechar">×</button>
        </div>
      </div>
      <div class="copilot-mensagens" id="copilotMensagens">
        <div class="copilot-msg ia">Oi! Como posso ajudar?</div>
      </div>
      <div class="copilot-rodape">
        <textarea id="copilotInput" rows="1" placeholder="Pergunte algo..."></textarea>
        <button class="copilot-enviar" id="copilotEnviar">➤</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  const botao = document.getElementById('copilotBotao');
  const painel = document.getElementById('copilotPainel');
  const fechar = document.getElementById('copilotFechar');
  const nova = document.getElementById('copilotNova');
  const mensagens = document.getElementById('copilotMensagens');
  const input = document.getElementById('copilotInput');
  const enviar = document.getElementById('copilotEnviar');

  // Memória da conversa: vive só aqui no navegador (não vai pro banco). Some ao recarregar a página,
  // ao clicar em "Nova conversa", ao trocar de usuário ou ao sair da conta.
  const MAX_HISTORICO = 12;         // últimas mensagens (usuário + assistente) enviadas ao modelo
  let historico = [];               // [{ role: 'user' | 'assistant', text }]
  let contextoAtivo = null;         // { cliente_id, equipamento_id } — só dica; o backend revalida tudo
  let usuarioDaConversa = null;     // id do usuário dono desta conversa

  function resetarConversa() {
    historico = [];
    contextoAtivo = null;
    usuarioDaConversa = null;
    mensagens.innerHTML = '<div class="copilot-msg ia">Oi! Como posso ajudar?</div>';
  }

  function registrarTurno(textoUsuario, respostaIa) {
    historico.push({ role: 'user', text: textoUsuario }, { role: 'assistant', text: respostaIa });
    // Ponto de extensão: se um dia a conversa precisar ser resumida em vez de cortada, é aqui.
    while (historico.length > MAX_HISTORICO) historico.shift();
    while (historico.length && historico[0].role !== 'user') historico.shift();
  }

  botao.addEventListener('click', () => painel.classList.toggle('aberto'));
  fechar.addEventListener('click', () => painel.classList.remove('aberto'));
  nova.addEventListener('click', resetarConversa);

  if (window.supabaseClient && window.supabaseClient.auth && window.supabaseClient.auth.onAuthStateChange) {
    window.supabaseClient.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') resetarConversa();
    });
  }

  function addMensagem(texto, tipo) {
    const div = document.createElement('div');
    div.className = 'copilot-msg ' + tipo;
    if (tipo === 'ia') {
      div.innerHTML = renderizarMarkdownSimples(texto);
    } else {
      div.textContent = texto;
    }
    mensagens.appendChild(div);
    mensagens.scrollTop = mensagens.scrollHeight;
    return div;
  }

  async function enviarMensagem() {
    const texto = input.value.trim();
    if (!texto) return;
    input.value = '';
    enviar.disabled = true;

    try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();

      // Se outro usuário assumiu este navegador sem passar pelo evento de logout,
      // a conversa anterior não pode vazar pra ele — reseta antes de mostrar qualquer coisa.
      const usuarioAtual = session && session.user ? session.user.id : null;
      if (usuarioDaConversa && usuarioAtual && usuarioDaConversa !== usuarioAtual) {
        resetarConversa();
      }
      usuarioDaConversa = usuarioAtual;

      addMensagem(texto, 'usuario');
      const carregando = addMensagem('Digitando...', 'ia');

      const resp = await fetch('https://lkankciqsldutuncuvyl.supabase.co/functions/v1/cosmos-copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token
        },
        body: JSON.stringify({ mensagem: texto, historico, contexto: contextoAtivo })
      });
      const dados = await resp.json();
      carregando.remove();
      if (dados.resposta) {
        addMensagem(dados.resposta, 'ia');
        registrarTurno(texto, dados.resposta);
        if ('contexto' in dados) contextoAtivo = dados.contexto;
      } else {
        addMensagem(dados.error || 'Não consegui responder agora.', 'erro');
      }
    } catch (e) {
      addMensagem('Erro de conexão. Tente de novo.', 'erro');
    } finally {
      enviar.disabled = false;
    }
  }

  enviar.addEventListener('click', enviarMensagem);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', montarCopilot);
} else {
  montarCopilot();
}