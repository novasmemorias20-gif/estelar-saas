
export function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
export function money(v){ return 'R$ ' + Number(v).toFixed(2).replace('.', ','); }
