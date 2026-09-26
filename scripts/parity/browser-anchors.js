/**
 * Run in the browser on /dev/resume-preview?preset=… (paste into the console
 * or evaluate via Playwright). Returns the same anchors pdf-anchors.mjs reads
 * from the PDF: page number and baseline distance from the page top, in pt.
 *
 * The baseline is found by inserting a zero-height inline-block at the start
 * of the anchor's element; its bottom edge sits exactly on the baseline.
 */
(anchors) => {
  const PX_TO_PT = 0.75;
  const pages = [...document.querySelectorAll('[data-page]')];
  const norm = (s) => s.replace(/\s+/g, '');
  const used = new Set();

  const candidates = [];
  pages.forEach((pageEl, index) => {
    const walker = document.createTreeWalker(pageEl, NodeFilter.SHOW_ELEMENT);
    for (let el = walker.nextNode(); el; el = walker.nextNode()) {
      // Leaf-ish elements whose own text starts the string we want.
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('');
      if (own.trim()) candidates.push({ el, page: index + 1, pageEl, text: el.textContent });
    }
  });

  return anchors.map((anchor) => {
    const hit = candidates.find((c, i) => !used.has(i) && norm(c.text).startsWith(norm(anchor)) && (used.add(i) || true));
    if (!hit) return { anchor, page: null, y: null };
    const probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    hit.el.insertBefore(probe, hit.el.firstChild);
    const scale = hit.pageEl.getBoundingClientRect().width / hit.pageEl.offsetWidth;
    const y = (probe.getBoundingClientRect().bottom - hit.pageEl.getBoundingClientRect().top) / scale;
    probe.remove();
    return { anchor, page: hit.page, y: Math.round(y * PX_TO_PT * 10) / 10 };
  });
};
