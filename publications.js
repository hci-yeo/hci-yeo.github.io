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
    img.src = p.image;
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
        ribbon.innerHTML = '<i class="fas fa-award"></i> ' + escapeHtml(award);
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
      const decorated = items.map((p, idx) => ({
        p,
        idx,
        key: p.firstAuthorHSYeo ? 0 : 1
      }));
      decorated.sort((a, b) => (a.key - b.key) || (a.idx - b.idx));
      publicationList.replaceChildren();
      for (const { p } of decorated) {
        publicationList.appendChild(renderPublication(p));
      }
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
