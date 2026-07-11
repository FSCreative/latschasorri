/* Latschasorri Frontend */
(function () {
  'use strict';

  /* Scroll-Reveal */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  /* Fallback: falls der Observer (z. B. im Hintergrund-Tab) nicht feuert */
  setTimeout(function () {
    document.querySelectorAll('.reveal:not(.in)').forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 1.2) el.classList.add('in');
    });
  }, 800);

  /* "Mehr"-Sheet */
  var moreBtn = document.getElementById('moreBtn');
  var backdrop = document.getElementById('sheetBackdrop');
  function toggleSheet(open) {
    document.body.classList.toggle('sheet-open', open);
    if (moreBtn) moreBtn.setAttribute('aria-expanded', String(open));
  }
  if (moreBtn) moreBtn.addEventListener('click', function () {
    toggleSheet(!document.body.classList.contains('sheet-open'));
  });
  if (backdrop) backdrop.addEventListener('click', function () { toggleSheet(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggleSheet(false); });

  /* Tabs (Chips) */
  document.querySelectorAll('.chip[data-tab]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var group = chip.parentElement;
      group.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('on'); });
      chip.classList.add('on');
      var scope = document;
      group.parentElement.querySelectorAll('.tab').forEach(function (t) { t.classList.add('hidden'); });
      var target = scope.getElementById('tab-' + chip.dataset.tab);
      if (target) target.classList.remove('hidden');
    });
  });

  /* Lightbox */
  var lb = document.getElementById('lightbox');
  if (lb) {
    var lbImg = lb.querySelector('img');
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t.matches('[data-lightbox]')) {
        lbImg.src = t.src;
        lb.classList.add('open');
      } else if (t === lb || t.id === 'lbClose' || t === lbImg) {
        lb.classList.remove('open');
      }
    });
  }

  /* Countdown zum nächsten Auftritt */
  var cd = document.querySelector('.countdown');
  if (cd && cd.dataset.date) {
    var target = new Date(cd.dataset.date + 'T00:00:00');
    var diff = Math.ceil((target - new Date()) / 86400000);
    if (diff > 1) cd.textContent = 'Noch ' + diff + ' Tage! 🎉';
    else if (diff === 1) cd.textContent = 'Morgen geht\'s los! 🎺';
    else if (diff === 0) cd.textContent = 'HEUTE! Ore Ore! 🥁';
  }

  /* Chronik: Karten auf-/zuklappen */
  document.querySelectorAll('.tl-card').forEach(function (card) {
    function toggle() {
      card.classList.toggle('open');
      var more = card.querySelector('.tl-more');
      if (more) more.textContent = card.classList.contains('open') ? 'Weniger ↑' : 'Mehr lesen ↓';
    }
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  /* Chronik: Fortschrittslinie beim Scrollen */
  var tl = document.getElementById('timeline');
  if (tl) {
    var updateTl = function () {
      var r = tl.getBoundingClientRect();
      var visible = Math.min(Math.max(window.innerHeight * 0.75 - r.top, 0), r.height);
      tl.style.setProperty('--tlp', (visible / r.height * 100).toFixed(1) + '%');
    };
    window.addEventListener('scroll', updateTl, { passive: true });
    updateTl();
    setTimeout(updateTl, 900);
  }

  /* Admin: Album bearbeiten */
  document.querySelectorAll('[data-edit-album]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var a = JSON.parse(btn.getAttribute('data-edit-album'));
      document.getElementById('af-id').value = a.id;
      document.getElementById('af-titel').value = a.titel;
      document.getElementById('af-beschreibung').value = a.beschreibung || '';
      document.getElementById('af-reset').style.display = 'inline-block';
      document.getElementById('albumForm').scrollIntoView({ behavior: 'smooth' });
    });
  });
  var afReset = document.getElementById('af-reset');
  if (afReset) afReset.addEventListener('click', function () {
    document.getElementById('albumForm').reset();
    document.getElementById('af-id').value = '';
    afReset.style.display = 'none';
  });

  /* Admin: Chronik-Station bearbeiten */
  document.querySelectorAll('[data-edit-chronik]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var c = JSON.parse(btn.getAttribute('data-edit-chronik'));
      document.getElementById('cf-id').value = c.id;
      document.getElementById('cf-jahr').value = c.jahr;
      document.getElementById('cf-titel').value = c.titel;
      document.getElementById('cf-text').value = c.text;
      document.getElementById('cf-reset').style.display = 'inline-block';
      document.getElementById('chronikForm').scrollIntoView({ behavior: 'smooth' });
    });
  });
  var cfReset = document.getElementById('cf-reset');
  if (cfReset) cfReset.addEventListener('click', function () {
    document.getElementById('chronikForm').reset();
    document.getElementById('cf-id').value = '';
    cfReset.style.display = 'none';
  });

  /* Admin: Bericht bearbeiten */
  document.querySelectorAll('[data-edit-bericht]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var b = JSON.parse(btn.getAttribute('data-edit-bericht'));
      document.getElementById('bf-id').value = b.id;
      document.getElementById('bf-titel').value = b.titel;
      document.getElementById('bf-datum').value = b.datum;
      document.getElementById('bf-body').value = b.body;
      document.getElementById('bf-reset').style.display = 'inline-block';
      document.getElementById('berichtForm').scrollIntoView({ behavior: 'smooth' });
    });
  });
  var bfReset = document.getElementById('bf-reset');
  if (bfReset) bfReset.addEventListener('click', function () {
    document.getElementById('berichtForm').reset();
    document.getElementById('bf-id').value = '';
    bfReset.style.display = 'none';
  });

  /* Admin: Mitglied bearbeiten */
  document.querySelectorAll('[data-edit-mitglied]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var m = JSON.parse(btn.getAttribute('data-edit-mitglied'));
      ['id', 'name', 'rufname', 'seit', 'instrument', 'kategorie'].forEach(function (k) {
        var el = document.getElementById('mf-' + k);
        if (el) el.value = m[k] || '';
      });
      document.getElementById('mf-reset').style.display = 'inline-block';
      document.getElementById('mitgliedForm').scrollIntoView({ behavior: 'smooth' });
    });
  });
  var mfReset = document.getElementById('mf-reset');
  if (mfReset) mfReset.addEventListener('click', function () {
    document.getElementById('mitgliedForm').reset();
    document.getElementById('mf-id').value = '';
    mfReset.style.display = 'none';
  });
})();
