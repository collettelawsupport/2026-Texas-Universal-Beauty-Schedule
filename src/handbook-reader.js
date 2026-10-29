// Keep the handbook inside the app: iPhone home-screen apps have no PDF browser toolbar.
export function initHandbookReader() {
  const dialog = document.createElement('dialog');
  dialog.id = 'handbook-reader';
  dialog.setAttribute('aria-labelledby', 'reader-title');
  dialog.innerHTML = `<div class="reader-header">
    <div class="reader-return"><button type="button" data-reader-close autofocus>← Back to handbook</button><button type="button" data-reader-close class="reader-close" aria-label="Close handbook">×</button></div>
    <h2 id="reader-title">Contestant handbook</h2>
    <div class="reader-controls"><button type="button" data-reader-previous aria-label="Previous page">←</button><label>Page <select id="reader-page" aria-label="Handbook page"></select></label><span id="reader-total"></span><button type="button" data-reader-next aria-label="Next page">→</button><button type="button" data-reader-zoom aria-pressed="false">Zoom in</button></div>
    <span class="sr-only" id="reader-status" role="status"></span>
  </div><div class="reader-scroll" tabindex="0" aria-label="Handbook page content"><p class="reader-message" role="status">Loading handbook…</p><div class="reader-paper"></div><details class="reader-text"><summary>Read page as text</summary><div></div></details></div>`;
  document.body.append(dialog);
  const paper = dialog.querySelector('.reader-paper');
  const scroller = dialog.querySelector('.reader-scroll');
  const message = dialog.querySelector('.reader-message');
  const text = dialog.querySelector('.reader-text');
  const select = dialog.querySelector('select');
  const zoom = dialog.querySelector('[data-reader-zoom]');
  let manifest, loading, page = 1, origin, scrollY = 0, expanded = false;

  function showPage(number) {
    if (!manifest) return;
    page = Math.max(1, Math.min(manifest.pages.length, number));
    const data = manifest.pages[page - 1];
    const img = document.createElement('img');
    img.alt = `Contestant handbook, page ${page}. Text version available below.`;
    img.width = data.width; img.height = data.height;
    img.addEventListener('error', () => {
      if (!paper.contains(img)) return;
      message.textContent = 'This page image could not load. You can read the page as text below.';
      message.hidden = false; text.open = true;
    });
    img.src = data.image;
    paper.replaceChildren(img);
    text.querySelector('div').textContent = data.text || 'Cover: 2026 Texas Our Little Miss Universal Beauty contestant handbook. Welcome to Candyland.';
    message.hidden = true;
    select.value = String(page);
    dialog.querySelector('[data-reader-previous]').disabled = page === 1;
    dialog.querySelector('[data-reader-next]').disabled = page === manifest.pages.length;
    dialog.querySelector('#reader-status').textContent = `Page ${page} of ${manifest.pages.length}`;
    scroller.scrollTo(0, 0);
  }

  async function open(number, trigger) {
    if (dialog.open) return;
    origin = trigger;
    scrollY = window.scrollY;
    // Save the page position before locking the body for mobile Safari.
    history.pushState({ ...history.state, handbookReader: true }, '', location.href);
    document.body.style.top = `-${scrollY}px`;
    document.body.classList.add('handbook-reader-open');
    dialog.showModal();
    expanded = false; paper.classList.remove('is-zoomed');
    zoom.textContent = 'Zoom in'; zoom.setAttribute('aria-pressed', 'false');
    text.open = false;
    if (!manifest) {
      paper.replaceChildren(); text.hidden = true;
      message.hidden = false; message.textContent = 'Loading handbook…';
      dialog.querySelectorAll('.reader-controls button, .reader-controls select').forEach(el => el.disabled = true);
      try {
        loading ||= fetch('/data/handbook-pages.json').then(response => {
          if (!response.ok) throw new Error('Handbook unavailable');
          return response.json();
        });
        manifest = await loading;
        select.replaceChildren(...manifest.pages.map((_, index) => new Option(String(index + 1), String(index + 1))));
        dialog.querySelector('#reader-total').textContent = `of ${manifest.pages.length}`;
      } catch {
        loading = null;
        message.textContent = 'The handbook could not load. Go back and reopen it to try again.';
        return;
      }
    }
    if (!dialog.open) return;
    text.hidden = false;
    dialog.querySelectorAll('.reader-controls button, .reader-controls select').forEach(el => el.disabled = false);
    showPage(number);
  }

  function dismiss() { if (dialog.open) dialog.close(); }
  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-reader-close]')) dismiss();
    if (event.target.closest('[data-reader-previous]')) showPage(page - 1);
    if (event.target.closest('[data-reader-next]')) showPage(page + 1);
    if (event.target.closest('[data-reader-zoom]')) {
      expanded = !expanded; paper.classList.toggle('is-zoomed', expanded);
      zoom.textContent = expanded ? 'Fit page' : 'Zoom in';
      zoom.setAttribute('aria-pressed', String(expanded));
    }
  });
  select.addEventListener('change', () => showPage(Number(select.value)));
  dialog.addEventListener('close', () => {
    document.body.classList.remove('handbook-reader-open');
    document.body.style.top = '';
    window.scrollTo(0, scrollY);
    // Background roster refreshes can replace the original link while reading.
    const target = origin?.isConnected ? origin : document.querySelector(`[data-handbook-page="${origin?.dataset.handbookPage}"]`);
    target?.focus({ preventScroll: true });
    if (history.state?.handbookReader) history.back();
  });
  window.addEventListener('popstate', dismiss);
  // A reload or restored history entry should never leave an invisible modal state behind.
  if (history.state?.handbookReader) history.replaceState(null, '', location.href);
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-handbook-page]');
    if (!link) return;
    event.preventDefault();
    open(Number(link.dataset.handbookPage), link);
  });
}
