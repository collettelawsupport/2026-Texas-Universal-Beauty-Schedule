import { divisions } from './data.js';

const pdf = '/documents/2026-texas-universal-beauty-handbook.pdf';
const topics = [
  [3, 'Dress for your moment', 'Interview, sportswear, and party dress / evening gown'],
  [5, 'Know the stage', 'Modeling pattern and competition guidelines'],
  [6, 'Make it your own', 'Optional competitions and entry details'],
  [8, 'Sweepstakes', 'Separate divisions and awards'],
  [9, 'The little extras', 'Photos, gifts, and our Candyland celebration'],
  [10, 'Plan your stay', 'Hotel information and admission badges'],
  [11, 'Before you arrive', 'Fees, packages, and fundraiser details']
];
const pills = values => `<ul class="division-pills">${values.map(value => `<li>${value}</li>`).join('')}</ul>`;

export function renderHandbook() {
  return `<div class="section-heading"><div><span class="eyebrow">EVERYTHING FOR YOUR WEEKEND</span><h2>A little preparation. A lot of sparkle.</h2><p>Your contestant handbook, with the current competition age divisions.</p></div></div>
  <div class="handbook-layout">
    <section class="handbook-book" aria-labelledby="handbook-title">
      <a class="handbook-cover" href="${pdf}" target="_blank" rel="noopener" aria-label="Open contestant handbook PDF"><img src="/assets/handbook-cover.jpg" alt="2026 Texas Our Little Miss Candyland contestant handbook cover" width="541" height="700"></a>
      <div class="handbook-book-copy"><span class="eyebrow">YOUR WEEKEND COMPANION</span><h3 id="handbook-title">2026 Contestant Handbook</h3><p>All 12 pages, ready to read or save for the trip.</p><a class="button primary full-width" href="${pdf}" target="_blank" rel="noopener">Open handbook <span aria-hidden="true">↗</span></a><a class="button button-outline full-width" href="${pdf}" download>Download PDF <span aria-hidden="true">↓</span></a><small>Age divisions updated October 13, 2026</small></div>
    </section>
    <div class="handbook-guide">
      <section class="handbook-divisions" aria-labelledby="division-title"><span class="eyebrow">FIND YOUR DIVISION</span><h3 id="division-title">Main competition</h3><p>Age as of October 1, 2026, as listed on the <a href="https://honorrollregistration.texasourlittlemiss.net/" target="_blank" rel="noopener">official registration page ↗</a>.</p>${pills(divisions.map(d => d.replace(' - ', '–').replace(' +', '+')))}<small>Some divisions may be split based on the number of entries.</small></section>
      <section class="handbook-topics" aria-labelledby="topics-title"><span class="eyebrow">TURN TO THE GOOD STUFF</span><h3 id="topics-title">Inside your handbook</h3><div>${topics.map(([page, title, description]) => `<a class="handbook-topic" href="${pdf}#page=${page}" target="_blank" rel="noopener"><span class="handbook-page">${String(page).padStart(2, '0')}</span><span><strong>${title}</strong><small>${description}</small></span><span aria-hidden="true">↗</span></a>`).join('')}</div></section>
    </div>
  </div>
  <section class="optional-divisions" aria-labelledby="optional-division-title"><div><span class="eyebrow">A DIVISION OF THEIR OWN</span><h3 id="optional-division-title">Optional competition age groups</h3><p>Livin’ Doll and Sweepstakes use their own age divisions.</p></div><div class="optional-division-grid"><section><h4>Livin’ Doll</h4>${pills(['0–18 months', '19–36 months', '3–4 years', '5–6 years', '7–9 years', '10–12 years', '13–17 years', '18+ years'])}<a href="${pdf}#page=6" target="_blank" rel="noopener">Details on page 6 ↗</a></section><section><h4>Sweepstakes</h4>${pills(['0–2 years', '3–6 years', '7–12 years', '13+ years'])}<a href="${pdf}#page=8" target="_blank" rel="noopener">Details on page 8 ↗</a></section></div></section>`;
}
