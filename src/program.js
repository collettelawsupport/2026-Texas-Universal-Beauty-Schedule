const pdf = '/documents/2026-texas-olm-program-book.pdf';
const sections = [
  [2, 'Welcome to Candyland', 'A message from your state directors'],
  [3, 'Meet our royalty', 'Texas Universal Beauty and visiting World royalty'],
  [6, 'Behind the magic', 'Special guests and Texas state staff'],
  [8, 'A year to remember', 'Celebrating our reigning queens'],
  [14, 'Welcome, contestants!', 'Meet the contestants of our state weekend'],
  [17, 'Photogenic', 'Portraits, sponsors, and good-luck messages'],
  [24, 'Photogenic winners', 'Celebrating this year’s winners'],
  [28, 'Texas Official Royalty', 'Introducing our 2026 royalty']
];
export function renderProgram() {
  return `<div class="section-heading"><div><span class="eyebrow">A KEEPSAKE OF OUR CANDYLAND WEEKEND</span><h2>Your 2026 Program Book</h2><p>Celebrate our contestants, royalty, and the people who make this weekend special.</p></div></div>
  <div class="handbook-layout">
    <section class="handbook-book" aria-labelledby="program-title">
      <a class="handbook-cover" href="#program" data-program-page="1" aria-label="Open program book cover"><img src="/assets/program-page-01.jpg" alt="2026 Texas Our Little Miss Candyland program book cover" width="1415" height="1980"></a>
      <div class="handbook-book-copy"><span class="eyebrow">YOUR WEEKEND KEEPSAKE</span><h3 id="program-title">2026 Program Book</h3><p>Flip through all 28 pages or download a copy to keep.</p><a class="button primary full-width" href="#program" data-program-page="1">Open program book <span aria-hidden="true">→</span></a><a class="button button-outline full-width" href="${pdf}" download>Download PDF <span aria-hidden="true">↓</span></a></div>
    </section>
    <div class="handbook-guide"><section class="handbook-topics program-topics" aria-labelledby="program-topics-title"><span class="eyebrow">INSIDE THE PROGRAM</span><h3 id="program-topics-title">Every page, a special memory.</h3><div>${sections.map(([page, title, description]) => `<a class="handbook-topic" href="#program" data-program-page="${page}"><span class="handbook-page">${String(page).padStart(2, '0')}</span><span><strong>${title}</strong><small>${description}</small></span><span aria-hidden="true">→</span></a>`).join('')}</div></section></div>
  </div>`;
}
