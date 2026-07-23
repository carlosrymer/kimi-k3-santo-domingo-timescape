/* ════════════════════════════════════════════════════════════════════
   OZAMA TIMESCAPE — app.js
   Vanilla-JS interaction engine. No frameworks, no imports.
   Requires window.ERAS, window.SCENES, window.META (loaded before this).
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── tiny helpers ─────────────────────────────────────────────────── */
  var $ = function (id) { return document.getElementById(id); };
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var clamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };

  var ERAS = Array.isArray(window.ERAS) ? window.ERAS : [];
  var SCENES = window.SCENES || {};
  var META = window.META || {};

  if (!ERAS.length) {
    // Nothing to drive — fail quietly but visibly for developers.
    if (window.console && console.warn) console.warn('Santo Domingo Timescape: window.ERAS is missing or empty.');
    return;
  }

  var CONFIDENCE_LABELS = {
    high: 'Documented',
    moderate: 'Partly documented',
    low: 'Reconstructed'
  };
  var YEAR_MIN = 1400;
  var YEAR_MAX = 2026;

  /* ── element handles (all guarded) ────────────────────────────────── */
  var stage          = $('stage');
  var stageFrame     = stage ? stage.querySelector('.stage-frame') : null;
  var sceneA         = $('scene-a');
  var sceneB         = $('scene-b');
  var sceneTitleText = $('scene-title');
  var yearReadout    = $('year-readout');
  var eraReadout     = $('era-readout');
  var eraNewFlag     = $('era-new');
  var narration      = $('narration');

  var hotspotCard    = $('hotspot-card');
  var hotspotName    = $('hotspot-name');
  var hotspotDetail  = $('hotspot-detail');
  var hotspotConf    = $('hotspot-confidence');
  var hotspotClose   = $('hotspot-close');

  var scrubber       = $('scrubber');
  var scrubberTicks  = $('scrubber-ticks');
  var btnPrev        = $('btn-prev');
  var btnNext        = $('btn-next');
  var scrubberStatus = $('scrubber-status');

  var compareBar     = $('compare-bar');
  var compareOpenBtn = $('compare-open');
  var compareSelectA = $('compare-a');
  var compareSelectB = $('compare-b');
  var compareLayer   = $('compare-layer');
  var compareDivider = $('compare-divider');

  var eraTitleEl     = $('era-title');
  var eraYearsEl     = $('era-years');
  var eraSummaryEl   = $('era-summary');
  var confBadge      = $('confidence-badge');
  var confLabel      = $('confidence-label');
  var confReason     = $('confidence-reason');
  var panelsRoot     = $('panels');
  var sourcesList    = $('sources-list');

  var layerToggles   = $('layer-toggles');

  var sparkTrees     = $('spark-trees');
  var sparkBuilt     = $('spark-built');
  var sparkPop       = $('spark-pop');
  var metricsNote    = $('metrics-note');

  var metaVantage    = $('meta-vantage');
  var metaPlace      = $('meta-place');
  var confNote       = $('confidence-note');

  var modeGuidedBtn  = $('mode-guided');
  var modeExploreBtn = $('mode-explore');

  /* ── state ────────────────────────────────────────────────────────── */
  var state = {
    eraIndex: 0,
    mode: 'guided',
    comparing: false,
    comparePct: 50,
    frontIsA: true,          // which of sceneA/sceneB is currently front
    pointer: { x: 0, y: 0 }, // normalized -1..1
    scroll: 0                // normalized -1..1
  };

  var reducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener: function () {} };

  /* ═══════════════════════════ SCENE RENDERING ═════════════════════ */

  function sceneMarkup(eraId) {
    return typeof SCENES[eraId] === 'string' ? SCENES[eraId] : '';
  }

  function eraSceneTitle(era) {
    return 'Scene of the Ozama river mouth, ' + era.anchorYear + ' — ' + era.label;
  }

  // Inject scene markup into an <svg>. If `withTitle`, (re)create the
  // accessible <title id="scene-title"> as first child (innerHTML wipes it).
  function injectScene(svg, eraId, withTitle) {
    if (!svg) return;
    var era = eraById(eraId);
    svg.innerHTML = sceneMarkup(eraId);
    if (withTitle && era) {
      var title = document.createElementNS(SVG_NS, 'title');
      title.id = 'scene-title';
      title.textContent = eraSceneTitle(era);
      svg.insertBefore(title, svg.firstChild);
      svg.setAttribute('aria-labelledby', 'scene-title');
    }
    applyParallaxTo(svg); // keep freshly injected layers in the right offset
  }

  function frontSvg() { return state.frontIsA ? sceneA : sceneB; }
  function backSvg()  { return state.frontIsA ? sceneB : sceneA; }

  function setSvgAria(svg, isFront, era) {
    if (!svg) return;
    if (isFront) {
      svg.setAttribute('aria-hidden', 'false');
      if (era) svg.setAttribute('aria-label', eraSceneTitle(era));
    } else {
      svg.setAttribute('aria-hidden', 'true');
      svg.removeAttribute('aria-label');
    }
  }

  // What should the front (base) scene show right now?
  function frontEraId() {
    if (state.comparing && compareSelectA && compareSelectA.value) return compareSelectA.value;
    return ERAS[state.eraIndex].id;
  }

  // Cross-fade: inject next content into the back layer, flip .is-front.
  function crossFadeTo(eraId) {
    var front = frontSvg();
    var back = backSvg();
    var era = eraById(eraId);
    if (!front || !back || !era) return;

    injectScene(back, eraId, /* withTitle */ true);
    setSvgAria(back, true, era);
    setSvgAria(front, false, null);

    // Force style flush so the incoming layer starts at opacity 0, then fade.
    void back.offsetWidth;
    back.classList.add('is-front');
    front.classList.remove('is-front');
    state.frontIsA = !state.frontIsA;

    // Free the old layer's markup once the fade has finished.
    var stale = front;
    window.setTimeout(function () {
      if (stale !== frontSvg()) stale.innerHTML = '';
    }, reducedMotion.matches ? 60 : 1000);
  }

  function renderCompareB() {
    if (!compareLayer || !compareSelectB) return;
    injectScene(compareLayer, compareSelectB.value, false);
  }

  /* ═══════════════════════════ ERA LOOKUP ══════════════════════════ */

  function eraById(id) {
    for (var i = 0; i < ERAS.length; i++) if (ERAS[i].id === id) return ERAS[i];
    return null;
  }

  function nearestEraIndex(year) {
    var best = 0, bestDist = Infinity;
    for (var i = 0; i < ERAS.length; i++) {
      var d = Math.abs(ERAS[i].anchorYear - year);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  /* ════════════════════════ MASTER ERA UPDATE ══════════════════════ */

  function setEra(index, opts) {
    opts = opts || {};
    index = clamp(index, 0, ERAS.length - 1);
    if (index === state.eraIndex && !opts.force) return;
    state.eraIndex = index;
    var era = ERAS[index];

    crossFadeTo(frontEraId());
    closeHotspot();

    /* HUD */
    if (yearReadout) yearReadout.textContent = era.anchorYear;
    if (eraReadout) eraReadout.textContent = era.label;
    if (eraNewFlag) eraNewFlag.hidden = !era.isNew;
    if (sceneTitleText) sceneTitleText.textContent = eraSceneTitle(era);

    /* scrubber */
    if (scrubber) scrubber.value = era.anchorYear;
    if (scrubberStatus) {
      scrubberStatus.textContent = 'Era ' + era.index + ' of ' + ERAS.length + ': ' +
        era.label + ', ' + era.yearStart + ' to ' + era.yearEnd + '.';
    }
    updateTicks();
    updateStepButtons();

    /* info column */
    if (eraTitleEl) eraTitleEl.textContent = era.label;
    if (eraYearsEl) eraYearsEl.textContent = era.yearStart + ' – ' + era.yearEnd;
    if (eraSummaryEl) eraSummaryEl.textContent = era.summary || '';

    /* confidence badge */
    var level = era.confidence || 'moderate';
    if (confBadge) confBadge.setAttribute('data-level', level);
    if (confLabel) confLabel.textContent = CONFIDENCE_LABELS[level] || CONFIDENCE_LABELS.moderate;
    if (confReason) confReason.textContent = era.confidenceReason || '';
    if (confBadge) {
      confBadge.setAttribute('aria-label',
        'Confidence: ' + (CONFIDENCE_LABELS[level] || level) + '. ' + (era.confidenceReason || ''));
    }

    /* thematic panels */
    if (panelsRoot && era.panels) {
      var panels = panelsRoot.querySelectorAll('.panel[data-panel]');
      for (var i = 0; i < panels.length; i++) {
        var key = panels[i].getAttribute('data-panel');
        var body = panels[i].querySelector('.panel-body');
        if (body) body.textContent = era.panels[key] || 'No notes for this theme in this era.';
      }
    }

    /* sources */
    if (sourcesList) {
      sourcesList.textContent = '';
      (era.sources || []).forEach(function (src) {
        if (!src || !src.title) return;
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = src.url || '#';
        a.textContent = src.title;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        li.appendChild(a);
        sourcesList.appendChild(li);
      });
    }

    /* sparkline highlight */
    updateSparkDots();

    /* guided-tour narration */
    updateNarration();

    /* compare mode keeps A tracking the current era */
    if (state.comparing && compareSelectA) {
      compareSelectA.value = era.id;
      crossFadeTo(frontEraId());
    }

    /* deep link */
    if (!opts.skipHash) writeHash(era.id);
  }

  function stepEra(delta) {
    setEra(state.eraIndex + delta);
  }

  function updateStepButtons() {
    if (btnPrev) btnPrev.disabled = state.eraIndex <= 0;
    if (btnNext) btnNext.disabled = state.eraIndex >= ERAS.length - 1;
  }

  /* ══════════════════════════ NARRATION (GUIDED) ═══════════════════ */

  function updateNarration() {
    if (!narration) return;
    if (state.mode !== 'guided') {
      narration.classList.remove('is-visible');
      narration.textContent = '';
      return;
    }
    var era = ERAS[state.eraIndex];
    // Retrigger the fade: remove, flush, re-add.
    narration.classList.remove('is-visible');
    narration.textContent = era.summary || '';
    void narration.offsetWidth;
    window.requestAnimationFrame(function () {
      if (narration.textContent) narration.classList.add('is-visible');
    });
  }

  function setMode(mode) {
    if (mode !== 'guided' && mode !== 'explore') return;
    state.mode = mode;
    document.body.setAttribute('data-mode', mode);
    if (modeGuidedBtn) modeGuidedBtn.setAttribute('aria-pressed', String(mode === 'guided'));
    if (modeExploreBtn) modeExploreBtn.setAttribute('aria-pressed', String(mode === 'explore'));
    updateNarration();
  }

  /* ═══════════════════════ SCRUBBER + TICKS ════════════════════════ */

  function buildTicks() {
    if (!scrubberTicks) return;
    scrubberTicks.textContent = '';
    var span = YEAR_MAX - YEAR_MIN;
    ERAS.forEach(function (era, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tick';
      b.setAttribute('data-era', era.id);
      b.style.left = clamp(((era.anchorYear - YEAR_MIN) / span) * 100, 0, 100) + '%';
      b.setAttribute('aria-label', era.anchorYear + ' — ' + era.label);
      var label = document.createElement('span');
      label.className = 'tick-label';
      label.textContent = era.anchorYear;
      b.appendChild(label);
      b.addEventListener('click', function () { setEra(i); });
      scrubberTicks.appendChild(b);
    });
  }

  function updateTicks() {
    if (!scrubberTicks) return;
    var ticks = scrubberTicks.querySelectorAll('.tick');
    var id = ERAS[state.eraIndex].id;
    for (var i = 0; i < ticks.length; i++) {
      var active = ticks[i].getAttribute('data-era') === id;
      ticks[i].classList.toggle('is-active', active);
      if (active) ticks[i].setAttribute('aria-current', 'true');
      else ticks[i].removeAttribute('aria-current');
    }
  }

  function wireScrubber() {
    if (scrubber) {
      // Live feedback while dragging; commit (snap) on release.
      scrubber.addEventListener('input', function () {
        var y = parseInt(scrubber.value, 10);
        if (!isNaN(y) && yearReadout) yearReadout.textContent = y;
        if (scrubberStatus && !isNaN(y)) scrubberStatus.textContent = 'Scrubbing: year ' + y + '.';
      });
      scrubber.addEventListener('change', function () {
        var y = parseInt(scrubber.value, 10);
        if (!isNaN(y)) setEra(nearestEraIndex(y));
      });
      // Arrow keys on the slider jump era-to-era instead of year-by-year.
      scrubber.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); stepEra(-1); }
        else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); stepEra(1); }
        else if (e.key === 'Home') { e.preventDefault(); setEra(0); }
        else if (e.key === 'End') { e.preventDefault(); setEra(ERAS.length - 1); }
      });
    }
    if (btnPrev) btnPrev.addEventListener('click', function () { stepEra(-1); });
    if (btnNext) btnNext.addEventListener('click', function () { stepEra(1); });

    // Global ← / → era stepping (skip when typing in a field).
    document.addEventListener('keydown', function (e) {
      var t = e.target;
      var tag = t && t.tagName ? t.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'select' || tag === 'textarea' || (t && t.isContentEditable)) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); stepEra(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); stepEra(1); }
    });

    // Guided tour: wheel over the scene steps era-by-era.
    if (stageFrame) {
      var wheelLock = 0;
      stageFrame.addEventListener('wheel', function (e) {
        if (state.mode !== 'guided') return;
        var now = Date.now();
        if (now - wheelLock < 650 || Math.abs(e.deltaY) < 6) { e.preventDefault(); return; }
        var dir = e.deltaY > 0 ? 1 : -1;
        var next = state.eraIndex + dir;
        if (next < 0 || next >= ERAS.length) return; // let the page scroll at the ends
        e.preventDefault();
        wheelLock = now;
        setEra(next);
      }, { passive: false });
    }
  }

  /* ═══════════════════════════ PARALLAX ════════════════════════════ */

  var PARALLAX_DEPTHS = {
    'pl-sky': 5,
    'pl-far': 10,
    'pl-water': 14,
    'pl-city': 20,
    'pl-fore': 28
  };
  var parallaxQueued = false;

  function applyParallaxTo(svg) {
    if (!svg || reducedMotion.matches) return;
    var layers = svg.querySelectorAll('.pl');
    for (var i = 0; i < layers.length; i++) {
      var el = layers[i];
      for (var key in PARALLAX_DEPTHS) {
        if (el.classList.contains(key)) {
          var d = PARALLAX_DEPTHS[key];
          var tx = -state.pointer.x * d;
          var ty = (-state.pointer.y * d * 0.6) + (state.scroll * d * 0.8);
          el.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px)';
          break;
        }
      }
    }
  }

  function applyParallaxAll() {
    if (reducedMotion.matches || !stage) return;
    applyParallaxTo(sceneA);
    applyParallaxTo(sceneB);
    if (state.comparing) applyParallaxTo(compareLayer);
  }

  function queueParallax() {
    if (parallaxQueued) return;
    parallaxQueued = true;
    window.requestAnimationFrame(function () {
      parallaxQueued = false;
      applyParallaxAll();
    });
  }

  function clearParallax() {
    if (!stage) return;
    var layers = stage.querySelectorAll('.pl');
    for (var i = 0; i < layers.length; i++) layers[i].style.transform = '';
  }

  function wireParallax() {
    if (!stageFrame) return;
    stageFrame.addEventListener('pointermove', function (e) {
      if (reducedMotion.matches) return;
      var r = stageFrame.getBoundingClientRect();
      if (!r.width || !r.height) return;
      state.pointer.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      state.pointer.y = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      queueParallax();
    });
    stageFrame.addEventListener('pointerleave', function () {
      state.pointer.x = 0;
      state.pointer.y = 0;
      queueParallax();
    });
    window.addEventListener('scroll', function () {
      if (reducedMotion.matches || !stageFrame) return;
      var r = stageFrame.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight || 1;
      var centerOffset = (r.top + r.height / 2 - vh / 2) / (vh / 2);
      state.scroll = clamp(centerOffset, -1, 1);
      queueParallax();
    }, { passive: true });

    var onMotionChange = function () {
      if (reducedMotion.matches) clearParallax();
      else queueParallax();
    };
    if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', onMotionChange);
    else if (reducedMotion.addListener) reducedMotion.addListener(onMotionChange);
  }

  /* ═══════════════════════ LAYER TOGGLES ═══════════════════════════ */

  function wireLayerToggles() {
    if (!layerToggles || !stage) return;
    layerToggles.addEventListener('change', function (e) {
      var input = e.target;
      if (!input || !input.matches || !input.matches('input[data-layer]')) return;
      var layer = input.getAttribute('data-layer');
      stage.classList.toggle('hide-' + layer, !input.checked);
    });
  }

  /* ══════════════════════════ HOTSPOTS ═════════════════════════════ */

  function eraForMarker(marker) {
    // Which era's data does this marker belong to?
    if (state.comparing) {
      if (compareLayer && compareLayer.contains(marker)) return eraById(compareSelectB.value);
      return eraById(compareSelectA.value);
    }
    return ERAS[state.eraIndex];
  }

  function openHotspot(marker) {
    if (!hotspotCard || !stageFrame) return;
    var era = eraForMarker(marker);
    if (!era) return;
    var name = marker.getAttribute('data-hotspot');
    var data = null;
    (era.hotspots || []).forEach(function (h) { if (h && h.name === name) data = h; });
    if (!data) return; // robust: no matching data, no card

    if (hotspotName) hotspotName.textContent = data.name || name || 'Hotspot';
    if (hotspotDetail) hotspotDetail.textContent = data.detail || '';
    if (hotspotConf) {
      var level = data.confidence || era.confidence || 'moderate';
      hotspotConf.setAttribute('data-level', level);
      hotspotConf.textContent = CONFIDENCE_LABELS[level] || level;
    }

    hotspotCard.hidden = false;

    // Position near the marker, clamped inside the stage frame.
    var fr = stageFrame.getBoundingClientRect();
    var mr = marker.getBoundingClientRect();
    var cw = hotspotCard.offsetWidth || 270;
    var ch = hotspotCard.offsetHeight || 120;
    var left = (mr.left - fr.left) + mr.width / 2 + 14;
    var top = (mr.top - fr.top) - 8;
    if (left + cw > fr.width - 8) left = (mr.left - fr.left) + mr.width / 2 - cw - 14;
    left = clamp(left, 8, Math.max(8, fr.width - cw - 8));
    top = clamp(top, 8, Math.max(8, fr.height - ch - 8));
    hotspotCard.style.left = left + 'px';
    hotspotCard.style.top = top + 'px';

    hotspotCard.setAttribute('data-open-hotspot', name || '');
    if (hotspotClose) hotspotClose.focus({ preventScroll: true });
  }

  function closeHotspot() {
    if (hotspotCard) hotspotCard.hidden = true;
  }

  function wireHotspots() {
    if (!stage) return;
    // Delegated: scenes are re-injected, so listeners live on the stage.
    stage.addEventListener('click', function (e) {
      var marker = e.target && e.target.closest ? e.target.closest('.hotspot') : null;
      if (marker && stage.contains(marker)) {
        var already = hotspotCard && !hotspotCard.hidden &&
          hotspotCard.getAttribute('data-open-hotspot') === marker.getAttribute('data-hotspot');
        if (already) closeHotspot();
        else openHotspot(marker);
      } else if (hotspotCard && !hotspotCard.hidden &&
                 !(e.target.closest && e.target.closest('#hotspot-card'))) {
        closeHotspot();
      }
    });
    stage.addEventListener('keydown', function (e) {
      var marker = e.target && e.target.closest ? e.target.closest('.hotspot') : null;
      if (marker && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        openHotspot(marker);
      }
    });
    if (hotspotClose) hotspotClose.addEventListener('click', function () {
      closeHotspot();
      // Return focus to the originating marker if it still exists.
      var name = hotspotCard ? hotspotCard.getAttribute('data-open-hotspot') : null;
      if (name && stage) {
        var marker = stage.querySelector('.hotspot[data-hotspot="' +
          (window.CSS && CSS.escape ? CSS.escape(name) : name.replace(/"/g, '\\"')) + '"]');
        if (marker && marker.focus) marker.focus({ preventScroll: true });
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeHotspot();
    });
    window.addEventListener('resize', closeHotspot);
  }

  /* ═════════════════════════ COMPARE-WIPE ══════════════════════════ */

  function buildCompareSelects() {
    if (!compareSelectA || !compareSelectB) return;
    [compareSelectA, compareSelectB].forEach(function (sel) {
      sel.textContent = '';
      ERAS.forEach(function (era) {
        var opt = document.createElement('option');
        opt.value = era.id;
        opt.textContent = era.anchorYear + ' — ' + era.label;
        sel.appendChild(opt);
      });
    });
    compareSelectA.value = ERAS[0].id;
    compareSelectB.value = ERAS[ERAS.length - 1].id;
  }

  function updateCompareClip() {
    var pct = clamp(state.comparePct, 0, 100);
    if (compareDivider) {
      compareDivider.style.left = pct + '%';
      compareDivider.setAttribute('aria-valuenow', String(Math.round(pct)));
      compareDivider.setAttribute('aria-valuetext', Math.round(pct) + ' percent');
    }
    if (compareLayer) {
      // B scene revealed to the RIGHT of the divider.
      compareLayer.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
    }
  }

  function setComparing(on) {
    state.comparing = !!on;
    if (stage) stage.classList.toggle('is-comparing', state.comparing);
    if (compareOpenBtn) compareOpenBtn.setAttribute('aria-pressed', String(state.comparing));
    if (compareLayer) compareLayer.hidden = !state.comparing;
    if (compareDivider) compareDivider.hidden = !state.comparing;
    if (compareBar) compareBar.classList.toggle('is-idle', !state.comparing);
    closeHotspot();
    if (state.comparing) {
      if (compareSelectA) compareSelectA.value = ERAS[state.eraIndex].id;
      if (compareSelectB && compareSelectB.value === compareSelectA.value) {
        // avoid comparing an era to itself by default
        compareSelectB.value = ERAS[state.eraIndex === 0 ? ERAS.length - 1 : 0].id;
      }
      crossFadeTo(frontEraId());
      renderCompareB();
      state.comparePct = 50;
      updateCompareClip();
    } else {
      if (compareLayer) compareLayer.innerHTML = '';
      crossFadeTo(frontEraId()); // restore the current era on the front scene
    }
  }

  function wireCompare() {
    if (compareOpenBtn) {
      compareOpenBtn.addEventListener('click', function () {
        setComparing(!state.comparing);
      });
    }
    if (compareSelectA) {
      compareSelectA.addEventListener('change', function () {
        if (state.comparing) crossFadeTo(frontEraId());
      });
    }
    if (compareSelectB) {
      compareSelectB.addEventListener('change', function () {
        if (state.comparing) renderCompareB();
      });
    }
    if (!compareDivider || !stageFrame) return;

    var dragging = false;
    var pctFromClientX = function (clientX) {
      var r = stageFrame.getBoundingClientRect();
      if (!r.width) return state.comparePct;
      return clamp(((clientX - r.left) / r.width) * 100, 0, 100);
    };

    compareDivider.addEventListener('pointerdown', function (e) {
      dragging = true;
      if (compareDivider.setPointerCapture) {
        try { compareDivider.setPointerCapture(e.pointerId); } catch (err) {}
      }
      state.comparePct = pctFromClientX(e.clientX);
      updateCompareClip();
      e.preventDefault();
    });
    compareDivider.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      state.comparePct = pctFromClientX(e.clientX);
      updateCompareClip();
    });
    var endDrag = function () { dragging = false; };
    compareDivider.addEventListener('pointerup', endDrag);
    compareDivider.addEventListener('pointercancel', endDrag);

    compareDivider.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowLeft') { state.comparePct = clamp(state.comparePct - step, 0, 100); }
      else if (e.key === 'ArrowRight') { state.comparePct = clamp(state.comparePct + step, 0, 100); }
      else if (e.key === 'Home') { state.comparePct = 0; }
      else if (e.key === 'End') { state.comparePct = 100; }
      else return;
      e.preventDefault();
      e.stopPropagation(); // don't let global ←/→ step eras while wiping
      updateCompareClip();
    });
  }

  /* ═════════════════════════ SPARKLINES ════════════════════════════ */

  var sparkDots = { treeCover: [], builtArea: [], population: [] };

  function buildSparkline(svg, metric) {
    if (!svg) return;
    var W = 320, H = 72, padX = 14, top = 10, bottom = 12;
    var n = ERAS.length;
    var pts = [];
    var values = ERAS.map(function (e) {
      var v = e.metrics && typeof e.metrics[metric] === 'number' ? e.metrics[metric] : 0;
      return clamp(v, 0, 100);
    });
    for (var i = 0; i < n; i++) {
      var x = n === 1 ? W / 2 : padX + (i * (W - 2 * padX)) / (n - 1);
      var y = top + (1 - values[i] / 100) * (H - top - bottom);
      pts.push([x, y]);
    }
    var line = svg.querySelector('.spark-line');
    if (line) {
      line.setAttribute('points', pts.map(function (p) {
        return p[0].toFixed(1) + ',' + p[1].toFixed(1);
      }).join(' '));
    }
    var dotsG = svg.querySelector('.spark-dots');
    sparkDots[metric] = [];
    if (dotsG) {
      while (dotsG.firstChild) dotsG.removeChild(dotsG.firstChild);
      pts.forEach(function (p, i) {
        var c = document.createElementNS(SVG_NS, 'circle');
        c.setAttribute('cx', p[0].toFixed(1));
        c.setAttribute('cy', p[1].toFixed(1));
        c.setAttribute('r', '3');
        var t = document.createElementNS(SVG_NS, 'title');
        t.textContent = ERAS[i].label + ' (' + ERAS[i].anchorYear + '): ' + values[i] + ' / 100 (relative)';
        c.appendChild(t);
        dotsG.appendChild(c);
        sparkDots[metric].push(c);
      });
    }
  }

  function buildSparklines() {
    buildSparkline(sparkTrees, 'treeCover');
    buildSparkline(sparkBuilt, 'builtArea');
    buildSparkline(sparkPop, 'population');
  }

  function updateSparkDots() {
    ['treeCover', 'builtArea', 'population'].forEach(function (metric) {
      var dots = sparkDots[metric] || [];
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle('is-current', i === state.eraIndex);
      }
    });
  }

  /* ═════════════════════════ DEEP LINKS ════════════════════════════ */

  function writeHash(eraId) {
    var target = '#era=' + encodeURIComponent(eraId);
    if (window.location.hash !== target) {
      try {
        history.replaceState(null, '', target);
      } catch (err) {
        window.location.hash = target;
      }
    }
  }

  function readHash() {
    var m = /[#&]era=([^&]+)/.exec(window.location.hash || '');
    if (!m) return null;
    var id = decodeURIComponent(m[1]);
    for (var i = 0; i < ERAS.length; i++) if (ERAS[i].id === id) return i;
    return null;
  }

  function wireHash() {
    window.addEventListener('hashchange', function () {
      var idx = readHash();
      if (idx !== null && idx !== state.eraIndex) setEra(idx, { skipHash: true });
    });
  }

  /* ═════════════════════════ META / FOOTNOTES ══════════════════════ */

  function formatConfidenceLevels(levels) {
    if (!levels) return '';
    if (typeof levels === 'string') return levels;
    if (Array.isArray(levels)) {
      return levels.map(function (l) {
        if (typeof l === 'string') return l;
        if (l && (l.label || l.level)) {
          return (l.label || CONFIDENCE_LABELS[l.level] || l.level) +
            (l.description || l.desc ? ' — ' + (l.description || l.desc) : '');
        }
        return '';
      }).filter(Boolean).join(' · ');
    }
    if (typeof levels === 'object') {
      return Object.keys(levels).map(function (k) {
        var label = CONFIDENCE_LABELS[k] || k;
        return label + ' — ' + levels[k];
      }).join(' · ');
    }
    return '';
  }

  function wireMeta() {
    if (metaVantage && META.vantage) metaVantage.textContent = META.vantage;
    if (metaPlace && META.place) metaPlace.textContent = META.place;
    if (metricsNote && META.metricsNote) metricsNote.textContent = META.metricsNote;
    if (confNote) {
      var text = formatConfidenceLevels(META.confidenceLevels);
      if (text) confNote.textContent = text;
    }
  }

  /* ══════════════════════════ MODE TOGGLE ══════════════════════════ */

  function wireModeToggle() {
    if (modeGuidedBtn) modeGuidedBtn.addEventListener('click', function () { setMode('guided'); });
    if (modeExploreBtn) modeExploreBtn.addEventListener('click', function () { setMode('explore'); });
  }

  /* ════════════════════════════ INIT ═══════════════════════════════ */

  function init() {
    buildTicks();
    buildCompareSelects();
    buildSparklines();
    wireMeta();

    wireScrubber();
    wireParallax();
    wireLayerToggles();
    wireHotspots();
    wireCompare();
    wireHash();
    wireModeToggle();

    setMode('guided');
    if (compareBar) compareBar.classList.add('is-idle');

    var startIndex = readHash();
    state.eraIndex = -1; // force first render
    setEra(startIndex !== null ? startIndex : 0, { force: true, skipHash: startIndex !== null });
    if (startIndex === null) writeHash(ERAS[0].id);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
