// js/copilot.js — Cosmos Copilot: botão flutuante + chat (Fase 1: apenas conversa)

function montarCopilot() {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <button class="copilot-botao" id="copilotBotao" title="Cosmos Copilot">✨</button>
    <div class="copilot-painel" id="copilotPainel">
      <div class="copilot-cabecalho">
        <span>✨ Cosmos Copilot</span>
        <button class="copilot-fechar" id="copilotFechar">×</button>
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
  const mensagens = document.getElementById('copilotMensagens');
  const input = document.getElementById('copilotInput');
  const enviar = document.getElementById('copilotEnviar');

  botao.addEventListener('click', () => painel.classList.toggle('aberto'));
  fechar.addEventListener('click', () => painel.classList.remove('aberto'));

  function addMensagem(texto, tipo) {
    const div = document.createElement('div');
    div.className = 'copilot-msg ' + tipo;
    div.textContent = texto;
    mensagens.appendChild(div);
    mensagens.scrollTop = mensagens.scrollHeight;
    return div;
  }

  async function enviarMensagem() {
    const texto = input.value.trim();
    if (!texto) return;
    input.value = '';
    enviar.disabled = true;
    addMensagem(texto, 'usuario');
    const carregando = addMensagem('Digitando...', 'ia');

    try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      const resp = await fetch('https://lkankciqsldutuncuvyl.supabase.co/functions/v1/cosmos-copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token
        },
        body: JSON.stringify({ mensagem: texto })
      });
      const dados = await resp.json();
      carregando.remove();
      if (dados.resposta) {
        addMensagem(dados.resposta, 'ia');
      } else {
        addMensagem(dados.error || 'Não consegui responder agora.', 'erro');
      }
    } catch (e) {
      carregando.remove();
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