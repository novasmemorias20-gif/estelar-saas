# Cosmos Clima by Estelar

Sistema de gestão para empresas e técnicos de climatização: clientes, orçamentos, contratos de manutenção (PMOC), ordens de serviço, agenda e financeiro, direto no celular ou no computador.

App em produção: **https://app.estelarbrasil.com.br**

## O que o sistema faz

- **Clientes** com histórico completo, equipamentos e classificação em semáforo (🟢 normal, 🟡 difícil, 🔴 demitido)
- **Orçamentos** com PDF e texto pronto pra WhatsApp
- **Contratos de manutenção / PMOC** com cálculo de carga térmica e exigência de RT/ART (plano Completo)
- **Ordens de serviço** por status, relatório em PDF com fotos e cobrança por PIX (plano Completo)
- **Agenda** com calendário, compromissos avulsos e ordens de serviço, notificações push, resumo diário por e-mail e botão para adicionar ao calendário do celular
- **Financeiro** do mês, alertas de visita vencida e dashboard
- **Conta de ajudante** com acesso apenas às ordens de serviço e à agenda (plano Completo)
- **Cosmos Copilot**, assistente de IA que consulta os dados da empresa
- **Cancelamento da assinatura pelo próprio cliente**, sem depender de suporte (acesso mantido até o fim do período pago, dados preservados)
- **Backup dos dados** (exportação JSON/CSV) e funcionamento offline para o técnico em campo

### Planos

| Plano | Mensal | Anual | Para quem |
|---|---|---|---|
| Essencial | R$ 39,90 | R$ 399,00 | Clientes ilimitados, orçamento/PDF, OS, agenda, financeiro, dashboard |
| Completo | R$ 129,90 | R$ 1.299,00 | Tudo do Essencial + PMOC, cobrança PIX, relatório de serviço com fotos, conta de ajudante |

## Tecnologias

- Frontend em HTML, CSS e JavaScript puros (sem etapa de build), instalável como PWA (Android e iPhone com iOS 16.4+)
- Backend no **Supabase**: Auth, Postgres (com RLS em todas as tabelas), Edge Functions e agendamento com pg_cron
- Pagamentos pelo **Asaas**
- E-mails pelo **Resend** (domínio de envio em um subdomínio próprio)
- Hospedagem no **Cloudflare Pages**, publicando automaticamente a cada commit na branch `main`

## Estrutura do repositório

```
painel.html            App principal (todas as abas, modo celular e desktop)
login.html             Login e cadastro
redefinir-senha.html   Redefinição de senha
landing.html           Página de apresentação e venda
tutorial.html          Ajuda / perguntas frequentes
admin.html             Painel de administração (acesso restrito)
index.html             Entrada do site
manifest.json          Configuração do PWA
sw.js                  Service Worker: cache offline e notificações push
icon-*.png             Ícones do app

js/
  main.js              Ponto de entrada
  core.js              Lógica principal do app
  config.js            Configurações públicas (preços, chave pública de push)
  supabase.js          Cliente do Supabase
  assinatura.js        Planos, assinatura e cancelamento
  copilot.js           Interface do assistente de IA
  erros.js             Registro automático de erros do app
  utils.js             Funções auxiliares

supabase/functions/    Edge Functions mantidas neste repositório
.github/workflows/     Backup semanal do banco
*.sql                  Scripts do banco, numerados na ordem de execução
```

Algumas Edge Functions (como as de webhook, cancelamento, ajudantes e Copilot) são publicadas direto no painel do Supabase e não estão neste repositório.

## Como publicar uma atualização

1. Suba os arquivos alterados no GitHub (branch `main`). O Cloudflare Pages publica sozinho em poucos minutos.
2. Sempre que mudar arquivos do app, aumente a versão nos dois lugares, para os celulares pegarem a atualização:
   - `VERSAO_APP` em `js/core.js` (aparece no rodapé de Ajustes)
   - `CACHE_NOME` em `sw.js`
3. Edge Functions **não** são atualizadas pelo GitHub: cole o código no painel do Supabase (Edge Functions → função → Code) e faça o Deploy. A função `enviar-notificacoes` deve ficar com "Verify JWT" desligado.
4. Scripts `.sql` são rodados à mão no SQL Editor do Supabase. São seguros pra rodar mais de uma vez.

## Banco de dados e rotinas automáticas

Scripts do banco, em ordem:

| Arquivo | O que faz |
|---|---|
| `02-notificacoes.sql` | Tabelas de preferências, aparelhos registrados e controle de envios |
| `03-agendar-notificacoes.sql` | Agenda a função de avisos a cada 5 minutos (precisa da função publicada e dos segredos criados antes) |
| `04-erros-e-agenda.sql` | Tabela de erros e fechamento automático do compromisso quando a OS é concluída |
| `05-cancelamento-assinatura.sql` | Campo que registra o pedido de cancelamento da assinatura |

O script `01` (classificação de clientes) e os demais scripts anteriores não estão neste repositório.

Rotinas agendadas no Supabase (pg_cron): envio de notificações, rebaixamento de assinaturas vencidas e limpeza de registros antigos de envios e de erros.

## Notificações

- **Push** no celular antes dos compromissos (antecedência escolhida pelo usuário)
- **E-mail** com os compromissos do dia, na hora escolhida (somente em dias com compromisso)
- Tudo é opcional e se liga ou desliga em **Ajustes → Notificações** (o ajudante vê o mesmo painel na aba Agenda)
- No iPhone, o push só funciona com o app instalado na Tela de Início

Segredos usados pela função `enviar-notificacoes` (criados em Edge Functions → Secrets, nunca neste repositório): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, `ADMIN_EMAIL`.

## Monitoramento de erros

O app registra automaticamente erros inesperados na tabela `erros_app` (visível só para o administrador, apagada após 30 dias). Quando surgem erros novos, a função `enviar-notificacoes` manda um alerta por e-mail, no máximo um por hora.

## Backup do banco

Todo domingo, de madrugada, o GitHub Actions gera uma cópia do banco, **criptografada**, e guarda por 90 dias (aba Actions → Artifacts). Também dá pra rodar na hora: Actions → "Backup semanal do banco" → Run workflow.

Segredos necessários no GitHub (Settings → Secrets and variables → Actions): `SUPABASE_DB_URL` (conexão "Session pooler") e `BACKUP_PASSPHRASE`.

Este repositório é público: **nunca** envie backups sem criptografia, chaves, senhas ou guias com segredos para ele.

## Segurança

- Row Level Security ativo em todas as tabelas, com isolamento entre empresas
- Todo dado vindo do banco passa por `esc()` antes de virar HTML
- Chaves privadas e senhas ficam apenas nos Secrets do Supabase e do GitHub

---

Projeto da Estelar. Todos os direitos reservados.
