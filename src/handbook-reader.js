// Keep both books inside the app: iPhone home-screen apps have no PDF browser toolbar.
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
  const books = {
    handbook: { title: 'Contestant handbook', label: 'handbook', pageLabel: 'Handbook', attribute: 'data-handbook-page', manifest: '/data/handbook-pages.json' },
    program: { title: '2026 Program Book', label: 'program book', pageLabel: 'Program book', attribute: 'data-program-page', manifest: '/data/program-pages.json' }
  };
  const manifests = new Map();
  let book = books.handbook;
  let manifest, requestId = 0, page = 1, origin, scrollY = 0, expanded = false;

  function showPage(number) {
    if (!manifest) return;
    page = Math.max(1, Math.min(manifest.pages.length, number));
    const data = manifest.pages[page - 1];
    const img = document.createElement('img');
    img.alt = `${book.title}, page ${page}. Text version available below.`;
    img.width = data.width; img.height = data.height;
    img.addEventListener('error', () => {
      if (!paper.contains(img)) return;
      message.textContent = 'This page image could not load. You can read the page as text below.';
      message.hidden = false; text.open = true;
    });
    img.src = data.image;
    paper.replaceChildren(img);
    text.querySelector('div').textContent = data.text || `${book.title}, page ${page}. This page contains artwork without selectable text.`;
    message.hidden = true;
    select.value = String(page);
    dialog.querySelector('[data-reader-previous]').disabled = page === 1;
    dialog.querySelector('[data-reader-next]').disabled = page === manifest.pages.length;
    dialog.querySelector('#reader-status').textContent = `Page ${page} of ${manifest.pages.length}`;
    scroller.scrollTo(0, 0);
  }

  async function open(number, trigger, selectedBook) {
    if (dialog.open) return;
    const request = ++requestId;
    book = selectedBook;
    origin = trigger;
    dialog.querySelector('#reader-title').textContent = book.title;
    dialog.querySelector('[data-reader-close]').textContent = `← Back to ${book.label}`;
    dialog.querySelector('.reader-close').setAttribute('aria-label', `Close ${book.label}`);
    select.setAttribute('aria-label', `${book.pageLabel} page`);
    scroller.setAttribute('aria-label', `${book.pageLabel} page content`);
    manifest = null;
    select.replaceChildren();
    dialog.querySelector('#reader-total').textContent = '';
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
      message.hidden = false; message.textContent = `Loading ${book.label}…`;
      dialog.querySelectorAll('.reader-controls button, .reader-controls select').forEach(el => el.disabled = true);
      try {
        const url = book.manifest;
        if (!manifests.has(url)) {
          manifests.set(url, fetch(url).then(response => {
            if (!response.ok) throw new Error('Book unavailable');
            return response.json();
          }).catch(error => { manifests.delete(url); throw error; }));
        }
        const loaded = await manifests.get(url);
        if (request !== requestId || !dialog.open) return;
        manifest = loaded;
        select.replaceChildren(...manifest.pages.map((_, index) => new Option(String(index + 1), String(index + 1))));
        dialog.querySelector('#reader-total').textContent = `of ${manifest.pages.length}`;
      } catch {
        if (request !== requestId || !dialog.open) return;
        message.textContent = `The ${book.label} could not load. Go back and reopen it to try again.`;
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
    requestId++;
    document.body.classList.remove('handbook-reader-open');
    document.body.style.top = '';
    window.scrollTo(0, scrollY);
    // Background roster refreshes can replace the original link while reading.
    const target = origin?.isConnected ? origin : document.querySelector(`[${book.attribute}="${origin?.getAttribute(book.attribute)}"]`);
    target?.focus({ preventScroll: true });
    if (history.state?.handbookReader) history.back();
  });
  window.addEventListener('popstate', dismiss);
  // A reload or restored history entry should never leave an invisible modal state behind.
  if (history.state?.handbookReader) history.replaceState(null, '', location.href);
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-handbook-page], [data-program-page]');
    if (!link) return;
    event.preventDefault();
    const selectedBook = link.hasAttribute('data-program-page') ? books.program : books.handbook;
    open(Number(link.getAttribute(selectedBook.attribute)), link, selectedBook);
  });
}
