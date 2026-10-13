const params = new URLSearchParams(location.search);
const themes = {fern:['#e8edda','#225d47'],sunset:['#fae1cf','#943f37'],ocean:['#ddeff3','#215b71']};
const colours = themes[params.get('theme')] || themes.fern;
document.documentElement.style.setProperty('--label-light', colours[0]);
document.documentElement.style.setProperty('--label-dark', colours[1]);
document.getElementById('paper-radio-name').textContent = (params.get('name') || 'Kangaroo Radio').slice(0,26);
const publicBase = ['localhost','127.0.0.1','[::1]'].includes(location.hostname) ? 'https://richard-gluga.github.io/radio/' : document.baseURI;
document.getElementById('paper-story-url').textContent = new URL('assets/pip-and-the-little-light.wav',publicBase).href;
function selectSheet() {
  const wanted = ['cards','layout','bench','build-record'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'cards';
  for (const sheet of document.querySelectorAll('.paper-sheet')) sheet.classList.toggle('active-sheet',sheet.id === wanted);
  for (const link of document.querySelectorAll('nav a')) {
    if (link.hash === '#'+wanted) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
  }
  document.getElementById('paper-help').textContent = 'Printing: '+document.querySelector('.active-sheet h2').textContent+'. Choose A4, actual size / 100%, and turn off headers and footers.';
}
document.body.classList.add('paper-ready');
selectSheet();
addEventListener('hashchange',selectSheet);
document.getElementById('print-sheet').addEventListener('click',()=>window.print());
