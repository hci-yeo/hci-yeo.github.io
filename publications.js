(function () {
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function enhanceVideoButtons(root) {
    (root || document).querySelectorAll('.action-btn').forEach((a) => {
      const txt = a && typeof a.textContent === 'string' ? a.textContent.trim() : '';
      if (!txt.endsWith('Video')) return;
      a.classList.add('video-btn');
      const icon = a.querySelector && a.querySelector('i');
      if (!icon) return;
      icon.classList.remove('fa-play');
      icon.classList.remove('fas');
      icon.classList.add('fab');
      icon.classList.add('fa-youtube');
    });
  }

  function renderPublication(p) {
    const article = document.createElement('article');
    article.className = 'pub-item';

    const meta = document.createElement('div');
    meta.className = 'pub-meta';
    const pubImage = document.createElement('div');
    pubImage.className = 'pub-image';
    const img = document.createElement('img');
    // YouTube's hqdefault is 4:3 with black bars; mqdefault is the clean 16:9 frame.
    img.src = String(p.image).replace(/img\.youtube\.com\/vi\/([^/]+)\/hqdefault\.jpg$/, 'img.youtube.com/vi/$1/mqdefault.jpg');
    img.loading = 'lazy';
    // Very wide images become thin strips when shown whole, so let those fill the frame.
    img.addEventListener('load', () => {
      if (img.naturalWidth / img.naturalHeight > 2) img.classList.add('is-wide');
    });
    img.alt = p.imageAlt || '';
    pubImage.appendChild(img);
    meta.appendChild(pubImage);

    const details = document.createElement('div');
    details.className = 'pub-details';

    const h3 = document.createElement('h3');
    h3.className = 'pub-title';
    h3.textContent = p.title;

    const authors = document.createElement('div');
    authors.className = 'pub-authors';
    authors.innerHTML = p.authorsHtml;

    const venue = document.createElement('div');
    venue.className = 'pub-venue';
    const venueName = document.createElement('span');
    venueName.className = 'venue-name';
    venueName.textContent = p.venueName;
    venue.appendChild(venueName);
    const venueType = document.createElement('span');
    venueType.className = 'venue-type';
    venueType.textContent = p.venueType;
    venue.appendChild(venueType);
    if (p.awards && p.awards.length) {
      for (const award of p.awards) {
        const ribbon = document.createElement('span');
        ribbon.className = 'award-ribbon';
        ribbon.innerHTML = '<i class="fas fa-trophy"></i> ' + escapeHtml(award);
        venue.appendChild(ribbon);
      }
    }

    const actions = document.createElement('div');
    actions.className = 'pub-actions';
    if (p.pdf) {
      const pdfA = document.createElement('a');
      pdfA.href = p.pdf;
      pdfA.target = '_blank';
      pdfA.rel = 'noopener noreferrer';
      pdfA.className = 'action-btn primary';
      pdfA.innerHTML = '<i class="far fa-file-pdf"></i> PDF';
      actions.appendChild(pdfA);
    }
    if (p.video) {
      const vidA = document.createElement('a');
      vidA.href = p.video;
      vidA.target = '_blank';
      vidA.rel = 'noopener noreferrer';
      vidA.className = 'action-btn';
      vidA.innerHTML = '<i class="fas fa-play"></i> Video';
      actions.appendChild(vidA);
    }

    details.appendChild(h3);
    details.appendChild(authors);
    details.appendChild(venue);
    details.appendChild(actions);
    article.appendChild(meta);
    article.appendChild(details);
    return article;
  }

  let allPubs = [];
  let currentSort = 'author';

  // Year comes from an explicit "year" field, else the first 4-digit year in the venue name.
  function pubYear(p) {
    if (p.year) return Number(p.year);
    const m = String(p.venueName || '').match(/\b(19|20)\d{2}\b/);
    return m ? Number(m[0]) : 0;
  }

  function renderSorted(list, mode) {
    const sorted = allPubs.slice().sort((a, b) => {
      if (mode === 'author') {
        const fa = a.p.firstAuthorHSYeo ? 0 : 1;
        const fb = b.p.firstAuthorHSYeo ? 0 : 1;
        if (fa !== fb) return fa - fb;
      }
      return (b.year - a.year) || (a.idx - b.idx);
    });
    list.replaceChildren();
    // Group headings: years when sorted by year, author role otherwise.
    let lastGroup = null;
    for (const { p, year } of sorted) {
      const group = mode === 'author'
        ? (p.firstAuthorHSYeo ? 'First author' : 'Co-author')
        : (year ? String(year) : 'Other');
      if (group !== lastGroup) {
        const h = document.createElement('h3');
        h.className = 'pub-group';
        h.textContent = group;
        list.appendChild(h);
        lastGroup = group;
      }
      list.appendChild(renderPublication(p));
    }
    enhanceVideoButtons(list);
  }

  function setupSortButtons(list) {
    const buttons = document.querySelectorAll('.pub-sort button[data-sort]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        currentSort = btn.dataset.sort;
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        renderSorted(list, currentSort);
      });
    });
  }

  async function loadPublications() {
    const publicationList = document.querySelector('.publication-list');
    if (!publicationList) return;
    try {
      // Use an explicit non-caching strategy to avoid 304 responses
      // (which can be treated as failures when using `res.ok`).
      const res = await fetch('./publications.json', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('HTTP ' + res.status + ' ' + res.statusText);
      }

      const text = await res.text();
      if (!text) throw new Error('Empty response body');

      const data = JSON.parse(text);
      const items = Array.isArray(data.publications) ? data.publications : [];
      allPubs = items.map((p, idx) => ({ p, idx, year: pubYear(p) }));
      renderSorted(publicationList, currentSort);
      setupSortButtons(publicationList);
      publicationList.removeAttribute('aria-busy');
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      publicationList.innerHTML =
        '<p class="pub-load-error" role="alert">Could not load publications.</p>' +
        '<p class="pub-load-error" role="status" style="margin-top:-0.5rem; font-size:0.95rem;">' +
        escapeHtml(msg) +
        '</p>';
      publicationList.removeAttribute('aria-busy');
      console.error(e);
    }
    enhanceVideoButtons(publicationList);
  }

  loadPublications();
})();
