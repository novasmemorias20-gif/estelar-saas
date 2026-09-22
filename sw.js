// Service worker do Cosmos Clima — cuidado ao editar.
// Sobe esse número (ex: 'cosmos-v2') sempre que publicar uma atualização de painel.html/js,
// senão quem já instalou o app pode continuar vendo a versão antiga por um tempo.
// Atualize também o VERSAO_APP no topo do js/core.js (aparece na aba Ajustes).
const CACHE_NOME = 'cosmos-v2';

const ARQUIVOS_ESSENCIAIS = [
  './painel.html',
  './login.html',
  './js/main.js',
  './js/core.js',
  './js/supabase.js',
  './js/config.js',
  './js/utils.js',
  './js/assinatura.js',
  './manifest.json',
  './icon-192.png',
  './icon-192-maskable.png',
  './icon-512.png',
  './icon-512-maskable.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NOME).then((cache) =>
      Promise.allSettled(ARQUIVOS_ESSENCIAIS.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => n !== CACHE_NOME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Só cuida de leituras (GET). Chamadas ao Supabase e qualquer POST/PUT/DELETE
  // seguem direto pra rede, sem passar pelo cache.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const ehMesmaOrigem = url.origin === self.location.origin;
  const ehCdnConhecida = url.hostname === 'cdn.jsdelivr.net';
  if (!ehMesmaOrigem && !ehCdnConhecida) return;

  if (ehCdnConhecida) {
    // Scripts de biblioteca são versionados na própria URL — cache primeiro, sem custo de revalidar.
    event.respondWith(
      caches.match(req).then((emCache) => emCache || fetch(req).then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE_NOME).then((cache) => cache.put(req, copia)).catch(() => {});
        return resposta;
      }))
    );
    return;
  }

  // App do próprio Cosmos: "rede primeiro" — com internet sempre busca a versão mais nova
  // (e atualiza o cache); só usa o que está guardado quando a rede falha de verdade.
  event.respondWith(
    fetch(req).then((resposta) => {
      const copia = resposta.clone();
      caches.open(CACHE_NOME).then((cache) => cache.put(req, copia)).catch(() => {});
      return resposta;
    }).catch(() =>
      caches.match(req).then((resposta) => resposta || caches.match('./painel.html'))
    )
  );
});
