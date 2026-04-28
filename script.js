/* ═══════════════════════════════════════════════════════════
   PROMPT ENGINEERING MASTERY — APPLICATION ENGINE
   Professional Presentation Controller
   Author: Ahmed Hamdy | AI Engineer
   ═══════════════════════════════════════════════════════════ */
 
'use strict';
 
// ─── CONFIGURATION ───────────────────────────────────────────
const CONFIG = {
  dataFile: './Slides.json',
  transitionDuration: 380,
  toastDuration: 2200,
  canvasParticleCount: 55,
};
 
// ─── STATE ───────────────────────────────────────────────────
const State = {
  data: null,
  currentSlide: 0,
  totalSlides: 0,
  sidebarCollapsed: false,
  fullscreen: false,
  searchQuery: '',
  particles: [],
};
 
// ─── DOM REFS ────────────────────────────────────────────────
const DOM = {};
 
// ─── UNIT COLOR MAP ──────────────────────────────────────────
const UNIT_COLORS = [
  '#C9933D', '#4A8FE3', '#29B8A8', '#7B6CF6',
  '#E05C8A', '#E87A3F', '#4CAF7D', '#C8503F',
];
 
/* ════════════════════════════════════════════════════════════
   INITIALISATION
════════════════════════════════════════════════════════════ */
async function init() {
  cacheDOMRefs();
  await loadData();
  buildSidebar();
  renderAllSlides();
  goToSlide(0, false);
  bindEvents();
  initCanvas();
  hideLoader();
}
 
function cacheDOMRefs() {
  DOM.loadingOverlay  = document.getElementById('loadingOverlay');
  DOM.sidebar         = document.getElementById('sidebar');
  DOM.mainArea        = document.getElementById('mainArea');
  DOM.sidebarNav      = document.getElementById('sidebarNav');
  DOM.slidesViewport  = document.getElementById('slidesViewport');
  DOM.toggleSidebarBtn= document.getElementById('toggleSidebarBtn');
  DOM.prevBtn         = document.getElementById('prevBtn');
  DOM.nextBtn         = document.getElementById('nextBtn');
  DOM.fullscreenBtn   = document.getElementById('fullscreenBtn');
  DOM.searchInput     = document.getElementById('searchInput');
  DOM.progressFill    = document.getElementById('progressFill');
  DOM.progressText    = document.getElementById('progressText');
  DOM.breadcrumbUnit  = document.getElementById('breadcrumbUnit');
  DOM.breadcrumbSlide = document.getElementById('breadcrumbSlide');
  DOM.slideCounterCurrent = document.getElementById('slideCounterCurrent');
  DOM.slideCounterTotal   = document.getElementById('slideCounterTotal');
  DOM.toast           = document.getElementById('toast');
  DOM.canvas          = document.getElementById('bg-canvas');
}
 
async function loadData() {
  try {
    const res = await fetch(CONFIG.dataFile);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    State.data = await res.json();
    State.totalSlides = State.data.slides.length;
    DOM.slideCounterTotal.textContent = String(State.totalSlides).padStart(2, '0');
  } catch (err) {
    console.error('Failed to load slide data:', err);
    showToast('⚠ Could not load Slides.json — check file path.');
  }
}
 
function hideLoader() {
  setTimeout(() => {
    DOM.loadingOverlay.classList.add('hidden');
  }, 600);
}
 
/* ════════════════════════════════════════════════════════════
   SIDEBAR CONSTRUCTION
════════════════════════════════════════════════════════════ */
function buildSidebar() {
  if (!State.data) return;
  const { metadata } = State.data;
  DOM.sidebarNav.innerHTML = '';
 
  metadata.units.forEach(unit => {
    const [startSlide, endSlide] = unit.slides;
    const color = UNIT_COLORS[unit.id] || '#4A8FE3';
 
    const unitEl = document.createElement('div');
    unitEl.className = 'nav-unit';
    unitEl.dataset.unitId = unit.id;
 
    // Collect slides belonging to this unit
    const slidesInUnit = State.data.slides.filter(s => s.unit === unit.id);
 
    unitEl.innerHTML = `
      <div class="nav-unit-header" data-unit="${unit.id}">
        <div class="nav-unit-dot" style="background:${color};"></div>
        <span class="nav-unit-label">${unit.title}</span>
        <span class="nav-unit-toggle">▾</span>
      </div>
      <div class="nav-unit-slides" id="unitSlides${unit.id}">
        ${slidesInUnit.map(slide => buildNavSlideItem(slide, color)).join('')}
      </div>
    `;
 
    DOM.sidebarNav.appendChild(unitEl);
 
    // Unit header toggle collapse
    unitEl.querySelector('.nav-unit-header').addEventListener('click', () => {
      unitEl.classList.toggle('collapsed');
    });
  });
 
  // Slide nav item click — delegate
  DOM.sidebarNav.addEventListener('click', e => {
    const item = e.target.closest('.nav-slide-item');
    if (!item) return;
    const idx = parseInt(item.dataset.slideIndex, 10);
    if (!isNaN(idx)) goToSlide(idx);
  });
}
 
function buildNavSlideItem(slide, color) {
  const title = escapeHtml(slide.title || `Slide ${slide.id}`);
  return `
    <div class="nav-slide-item" data-slide-index="${slide.id - 1}" data-slide-id="${slide.id}">
      <span class="nav-slide-num">${String(slide.id).padStart(2, '0')}</span>
      <span class="nav-slide-title">${title}</span>
    </div>
  `;
}
 
function updateSidebarActive(index) {
  document.querySelectorAll('.nav-slide-item').forEach(el => {
    el.classList.remove('active');
  });
  const active = document.querySelector(`.nav-slide-item[data-slide-index="${index}"]`);
  if (active) {
    active.classList.add('active');
    active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
 
/* ════════════════════════════════════════════════════════════
   SLIDE RENDERING — MAIN FACTORY
════════════════════════════════════════════════════════════ */
function renderAllSlides() {
  if (!State.data) return;
  DOM.slidesViewport.innerHTML = '';
 
  State.data.slides.forEach((slide, index) => {
    const el = document.createElement('div');
    el.className = `slide slide-type-${slide.type}`;
    el.id = `slide-${index}`;
    el.dataset.slideIndex = index;
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', `Slide ${slide.id}: ${slide.title || ''}`);
 
    const unitColor = UNIT_COLORS[slide.unit] || '#4A8FE3';
 
    switch (slide.type) {
      case 'title':     el.innerHTML = renderTitleSlide(slide, unitColor);     break;
      case 'bio':       el.innerHTML = renderBioSlide(slide, unitColor);       break;
      case 'agenda':    el.innerHTML = renderAgendaSlide(slide, unitColor);    break;
      case 'ecosystem': el.innerHTML = renderEcosystemSlide(slide, unitColor); break;
      default:          el.innerHTML = renderContentSlide(slide, unitColor);   break;
    }
 
    DOM.slidesViewport.appendChild(el);
  });
}
 
/* ─── TITLE SLIDE ─────────────────────────────────────────── */
function renderTitleSlide(slide, color) {
  const titleWords = (slide.title || '').split(' ');
  const lastWord = titleWords.pop();
  const firstWords = titleWords.join(' ');
 
  return `
    <div class="slide-decoration slide-decoration-circle"></div>
    <div class="slide-decoration slide-decoration-line"></div>
    <div class="slide-type-indicator">title / 01</div>
    <div class="title-slide-content">
      <h1 class="title-main">
        ${escapeHtml(firstWords)} <span>${escapeHtml(lastWord)}</span>
      </h1>
      <p class="title-subtitle">${escapeHtml(slide.subtitle || '')}</p>
      <div class="title-divider"></div>
      <div class="title-meta">
        <div class="title-meta-badge" style="border-color: rgba(201,147,61,0.25);">
          <div class="dot"></div>
          Ahmed Hamdy
        </div>
        <div class="title-meta-badge" style="border-color: rgba(74,143,227,0.2);">
          Artificial Intelligence Engineer
        </div>
        <div class="title-meta-badge" style="border-color: rgba(41,184,168,0.2);">
          70 Slides · 6 Units
        </div>
      </div>
    </div>
  `;
}
 
/* ─── BIO SLIDE ───────────────────────────────────────────── */
function renderBioSlide(slide, color) {
  const content = slide.content || [];
  let contentHtml = '';
 
  content.forEach(block => {
    if (block.type === 'focus_points') {
      contentHtml += `
        <div class="focus-points">
          <div class="focus-label">${escapeHtml(block.label || 'Focus Areas')}</div>
          ${(block.items || []).map(item => `
            <div class="focus-item">
              <div class="focus-dot"></div>
              <div class="focus-text">${escapeHtml(item)}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (block.type === 'note') {
      contentHtml += `
        <div class="focus-note">${escapeHtml(block.text || '')}</div>
      `;
    }
  });
 
  return `
    <div class="slide-decoration slide-decoration-circle"></div>
    <div class="slide-type-indicator">bio / 02</div>
    <div class="bio-layout">
      <div class="bio-avatar">AH</div>
      <div class="bio-info">
        <div class="bio-name">${escapeHtml(slide.title || '')}</div>
        <div class="bio-role">${escapeHtml(slide.subtitle || '')}</div>
        ${contentHtml}
      </div>
    </div>
  `;
}
 
/* ─── AGENDA SLIDE ────────────────────────────────────────── */
function renderAgendaSlide(slide, color) {
  const content = slide.content || [];
  let bodyHtml = '';
 
  content.forEach(block => {
    if (block.type === 'numbered_list') {
      bodyHtml += `
        <div class="numbered-list">
          ${(block.items || []).map(item => `
            <div class="numbered-item">
              <div class="item-number">${escapeHtml(item.number)}</div>
              <div class="item-content">
                <div class="item-title">${escapeHtml(item.title)}</div>
                <div class="item-desc">${escapeHtml(item.desc)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
  });
 
  return `
    <div class="slide-decoration slide-decoration-line"></div>
    <div class="slide-type-indicator">agenda / 03</div>
    <div class="slide-header">
      ${renderUnitTag(slide.unit, color)}
      <h2 class="slide-title">${escapeHtml(slide.title || '')}</h2>
      ${slide.subtitle ? `<p class="slide-subtitle">${escapeHtml(slide.subtitle)}</p>` : ''}
    </div>
    <div class="slide-body">
      ${bodyHtml}
    </div>
  `;
}
 
/* ─── ECOSYSTEM SLIDE ─────────────────────────────────────── */
function renderEcosystemSlide(slide, color) {
  const content = slide.content || [];
  let bodyHtml = '';
 
  content.forEach(block => {
    if (block.type === 'ecosystem_table') {
      bodyHtml += `
        <div class="ecosystem-grid">
          ${(block.domains || []).map(domain => `
            <div class="ecosystem-card">
              <div class="eco-domain">${escapeHtml(domain.name)}</div>
              <div class="eco-tools">
                ${(domain.tools || []).map(tool => `
                  <span class="eco-tool-tag">${escapeHtml(tool)}</span>
                `).join('')}
              </div>
              <div class="eco-recommendation">
                <div class="eco-rec-item api">
                  <div class="eco-rec-label">API Choice</div>
                  <div class="eco-rec-value">${escapeHtml(domain.api_choice || '')}</div>
                  <div class="eco-rec-reason">${escapeHtml(domain.api_reason || '')}</div>
                </div>
                <div class="eco-rec-item daily">
                  <div class="eco-rec-label">Daily Choice</div>
                  <div class="eco-rec-value">${escapeHtml(domain.daily_choice || '')}</div>
                  <div class="eco-rec-reason">${escapeHtml(domain.daily_reason || '')}</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (block.type === 'rules') {
      bodyHtml += `
        <div class="rules-block">
          <div class="rules-heading">${escapeHtml(block.heading || '')}</div>
          ${(block.items || []).map(rule => `
            <div class="rule-item">
              <div class="rule-bullet"></div>
              <div class="rule-text">${escapeHtml(rule)}</div>
            </div>
          `).join('')}
        </div>
      `;
    }
  });
 
  return `
    <div class="slide-type-indicator">ecosystem / ${String(slide.id).padStart(2,'0')}</div>
    <div class="slide-header">
      ${renderUnitTag(slide.unit, color)}
      <h2 class="slide-title">${escapeHtml(slide.title || '')}</h2>
      ${slide.subtitle ? `<p class="slide-subtitle">${escapeHtml(slide.subtitle)}</p>` : ''}
    </div>
    <div class="slide-body">
      ${bodyHtml}
    </div>
  `;
}
 
/* ─── CONTENT SLIDE ───────────────────────────────────────── */
function renderContentSlide(slide, color) {
  const content = slide.content || [];
 
  return `
    <div class="slide-decoration slide-decoration-circle"></div>
    <div class="slide-decoration slide-decoration-line"></div>
    <div class="slide-type-indicator">${escapeHtml(slide.type || 'content')} / ${String(slide.id).padStart(2,'0')}</div>
    <div class="slide-header">
      ${renderUnitTag(slide.unit, color)}
      <h2 class="slide-title">${escapeHtml(slide.title || '')}</h2>
      ${slide.subtitle ? `<p class="slide-subtitle">${escapeHtml(slide.subtitle)}</p>` : ''}
      ${slide.objective ? `<div class="slide-objective">✦ ${escapeHtml(slide.objective)}</div>` : ''}
    </div>
    <div class="slide-body">
      ${content.map(block => renderContentBlock(block)).join('')}
    </div>
  `;
}
 
/* ─── CONTENT BLOCK DISPATCHER ───────────────────────────── */
function renderContentBlock(block) {
  switch (block.type) {
    case 'section':         return renderSection(block);
    case 'insight':         return renderInsight(block);
    case 'code':            return renderCode(block);
    case 'math':            return renderMath(block);
    case 'comparison':      return renderComparison(block);
    case 'pipeline':        return renderPipeline(block);
    case 'example':         return renderExample(block);
    case 'scale':           return renderScale(block);
    case 'rules':           return renderRules(block);
    case 'numbered_list':   return renderNumberedList(block);
    case 'focus_points':    return renderFocusPoints(block);
    case 'note':            return `<div class="focus-note">${escapeHtml(block.text || '')}</div>`;
    case 'reference':       return renderReference(block);
    case 'ecosystem_table': return renderEcosystemTable(block);
    case 'structure':       return renderStructure(block);
    default:                return '';
  }
}
 
/* ─── SECTION ─────────────────────────────────────────────── */
function renderSection(block) {
  return `
    <div class="content-section">
      ${block.heading ? `<div class="section-heading">${escapeHtml(block.heading)}</div>` : ''}
      ${block.body ? `<div class="section-body">${escapeHtml(block.body)}</div>` : ''}
    </div>
  `;
}
 
/* ─── INSIGHT ─────────────────────────────────────────────── */
function renderInsight(block) {
  return `
    <div class="insight-box">
      ${block.heading ? `<div class="insight-heading">◆ ${escapeHtml(block.heading)}</div>` : ''}
      ${block.body ? `<div class="insight-body">${escapeHtml(block.body)}</div>` : ''}
    </div>
  `;
}
 
/* ─── CODE BLOCK ──────────────────────────────────────────── */
function renderCode(block) {
  const code = block.code || '';
  const lang = block.language || 'CODE';
 
  return `
    <div class="code-block">
      <div class="code-header">
        <div class="code-dots">
          <div class="code-dot red"></div>
          <div class="code-dot amber"></div>
          <div class="code-dot green"></div>
        </div>
        <div class="code-lang">${escapeHtml(lang)}</div>
        <button class="copy-btn" onclick="copyCode(this)" title="Copy code" style="
          background: none; border: 1px solid var(--border); border-radius: 4px;
          color: var(--text-muted); font-size: 10px; padding: 2px 8px;
          cursor: pointer; font-family: var(--font-mono); letter-spacing: 0.06em;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='var(--accent-blue)'; this.style.color='var(--accent-blue-2)';"
           onmouseout="this.style.borderColor='var(--border)'; this.style.color='var(--text-muted)';">
          COPY
        </button>
      </div>
      <div class="code-body">
        <pre>${syntaxHighlight(code)}</pre>
      </div>
    </div>
  `;
}
 
/* ─── MATH BLOCK ──────────────────────────────────────────── */
function renderMath(block) {
  return `
    <div class="math-block">
      ${block.label ? `<div class="math-label">${escapeHtml(block.label)}</div>` : ''}
      <div class="math-formula">${escapeHtml(block.formula || '')}</div>
      ${block.note ? `<div class="math-note">${escapeHtml(block.note)}</div>` : ''}
    </div>
  `;
}
 
/* ─── COMPARISON ──────────────────────────────────────────── */
function renderComparison(block) {
  const items = block.items || [];
  return `
    <div class="comparison-grid">
      ${items.map(item => `
        <div class="comparison-card">
          ${item.icon ? `<div class="comparison-icon">${item.icon}</div>` : ''}
          <div class="comparison-title">${escapeHtml(item.title || '')}</div>
          <div class="comparison-desc">${escapeHtml(item.desc || '')}</div>
        </div>
      `).join('')}
    </div>
  `;
}
 
/* ─── PIPELINE ────────────────────────────────────────────── */
function renderPipeline(block) {
  const stages = block.stages || [];
  return `
    <div class="pipeline">
      ${stages.map(stage => `
        <div class="pipeline-stage">
          <div class="stage-num">${escapeHtml(String(stage.number || ''))}</div>
          <div class="stage-content">
            <div class="stage-title">${escapeHtml(stage.title || '')}</div>
            <div class="stage-desc">${escapeHtml(stage.desc || '')}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
 
/* ─── EXAMPLE ─────────────────────────────────────────────── */
function renderExample(block) {
  return `
    <div class="example-block">
      ${block.bad ? `
        <div class="example-row bad">
          <div class="example-indicator" style="color: #E05C8A;">✗</div>
          <div class="example-text">${escapeHtml(block.bad)}</div>
        </div>
      ` : ''}
      ${block.good ? `
        <div class="example-row good">
          <div class="example-indicator" style="color: #29B8A8;">✓</div>
          <div class="example-text">${escapeHtml(block.good)}</div>
        </div>
      ` : ''}
      ${block.insight ? `
        <div class="example-insight">↳ ${escapeHtml(block.insight)}</div>
      ` : ''}
    </div>
  `;
}
 
/* ─── SCALE ───────────────────────────────────────────────── */
function renderScale(block) {
  const items = block.items || [];
  return `
    <div class="scale-container">
      ${items.map((item, i) => {
        const colors = ['#4A8FE3', '#E87A3F', '#E05C8A'];
        const c = colors[i % colors.length];
        return `
          <div class="scale-item">
            <div class="scale-range" style="color:${c};">${escapeHtml(item.range || '')}</div>
            <div class="scale-connector"></div>
            <div class="scale-content">
              <div class="scale-label">${escapeHtml(item.label || '')}</div>
              <div class="scale-effect">${escapeHtml(item.effect || item.desc || '')}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
 
/* ─── RULES ───────────────────────────────────────────────── */
function renderRules(block) {
  return `
    <div class="rules-block">
      ${block.heading ? `<div class="rules-heading">${escapeHtml(block.heading)}</div>` : ''}
      ${(block.items || []).map(rule => `
        <div class="rule-item">
          <div class="rule-bullet"></div>
          <div class="rule-text">${escapeHtml(rule)}</div>
        </div>
      `).join('')}
    </div>
  `;
}
 
/* ─── NUMBERED LIST ───────────────────────────────────────── */
function renderNumberedList(block) {
  return `
    <div class="numbered-list">
      ${(block.items || []).map(item => `
        <div class="numbered-item">
          <div class="item-number">${escapeHtml(String(item.number || ''))}</div>
          <div class="item-content">
            <div class="item-title">${escapeHtml(item.title || '')}</div>
            <div class="item-desc">${escapeHtml(item.desc || '')}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
 
/* ─── FOCUS POINTS ────────────────────────────────────────── */
function renderFocusPoints(block) {
  return `
    <div class="focus-points">
      ${block.label ? `<div class="focus-label">${escapeHtml(block.label)}</div>` : ''}
      ${(block.items || []).map(item => `
        <div class="focus-item">
          <div class="focus-dot"></div>
          <div class="focus-text">${escapeHtml(item)}</div>
        </div>
      `).join('')}
    </div>
  `;
}
 
/* ─── REFERENCE ───────────────────────────────────────────── */
function renderReference(block) {
  return `
    <div class="reference-block">
      <div class="reference-icon">📎</div>
      <div class="reference-text">${escapeHtml(block.text || '')}</div>
    </div>
  `;
}
 
/* ─── STRUCTURE BLOCK ─────────────────────────────────────── */
function renderStructure(block) {
  return `
    <div class="structure-block">
      ${block.heading ? `<div class="structure-heading">${escapeHtml(block.heading)}</div>` : ''}
      ${(block.items || []).map((item, i) => `
        <div class="structure-item">
          <div class="structure-position" style="
            background: ${i === 0 ? 'rgba(74,143,227,0.15)' : i === 1 ? 'rgba(123,108,246,0.15)' : 'rgba(41,184,168,0.15)'};
            color: ${i === 0 ? 'var(--accent-blue)' : i === 1 ? '#9D8BFF' : 'var(--accent-teal)'};
          ">${escapeHtml(item.position || '')}</div>
          <div class="structure-info">
            <div class="structure-role">${escapeHtml(item.role || '')}</div>
            <div class="structure-detail">${escapeHtml(item.detail || '')}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
 
/* ─── ECOSYSTEM TABLE (inline) ────────────────────────────── */
function renderEcosystemTable(block) {
  return `
    <div class="ecosystem-grid">
      ${(block.domains || []).map(domain => `
        <div class="ecosystem-card">
          <div class="eco-domain">${escapeHtml(domain.name)}</div>
          <div class="eco-tools">
            ${(domain.tools || []).map(t => `<span class="eco-tool-tag">${escapeHtml(t)}</span>`).join('')}
          </div>
          <div class="eco-recommendation">
            <div class="eco-rec-item api">
              <div class="eco-rec-label">API</div>
              <div class="eco-rec-value">${escapeHtml(domain.api_choice || '')}</div>
              <div class="eco-rec-reason">${escapeHtml(domain.api_reason || '')}</div>
            </div>
            <div class="eco-rec-item daily">
              <div class="eco-rec-label">Daily</div>
              <div class="eco-rec-value">${escapeHtml(domain.daily_choice || '')}</div>
              <div class="eco-rec-reason">${escapeHtml(domain.daily_reason || '')}</div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
 
/* ─── SHARED: UNIT TAG ────────────────────────────────────── */
function renderUnitTag(unitId, color) {
  if (!State.data) return '';
  const unit = State.data.metadata.units.find(u => u.id === unitId);
  if (!unit) return '';
  return `
    <div class="slide-unit-tag" style="
      color: ${color};
      border-color: ${color}33;
      background: ${color}11;
    ">
      <span>●</span>
      ${escapeHtml(unit.title)}
    </div>
  `;
}
 
/* ════════════════════════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════════════════════════ */
function goToSlide(index, animate = true) {
  if (!State.data) return;
  if (index < 0 || index >= State.totalSlides) return;
 
  const oldIndex = State.currentSlide;
  const slides = document.querySelectorAll('.slide');
 
  // Exit previous
  if (animate && slides[oldIndex] && oldIndex !== index) {
    slides[oldIndex].classList.add('exit');
    slides[oldIndex].classList.remove('active');
    setTimeout(() => {
      if (slides[oldIndex]) slides[oldIndex].classList.remove('exit');
    }, CONFIG.transitionDuration);
  } else if (slides[oldIndex]) {
    slides[oldIndex].classList.remove('active');
  }
 
  State.currentSlide = index;
 
  // Activate new slide
  if (slides[index]) {
    slides[index].classList.add('active');
    slides[index].scrollTop = 0;
  }
 
  updateUI();
  updateSidebarActive(index);
}
 
function updateUI() {
  const idx = State.currentSlide;
  const total = State.totalSlides;
  const slide = State.data ? State.data.slides[idx] : null;
 
  // Counter
  DOM.slideCounterCurrent.textContent = String(idx + 1).padStart(2, '0');
 
  // Progress bar
  const pct = ((idx + 1) / total * 100).toFixed(2);
  DOM.progressFill.style.width = `${pct}%`;
  DOM.progressText.textContent = `${idx + 1} / ${total}`;
 
  // Navigation buttons
  DOM.prevBtn.disabled = idx === 0;
  DOM.nextBtn.disabled = idx === total - 1;
 
  // Breadcrumb
  if (slide && State.data) {
    const unit = State.data.metadata.units.find(u => u.id === slide.unit);
    DOM.breadcrumbUnit.textContent = unit ? unit.title : '';
    DOM.breadcrumbSlide.textContent = slide.title || `Slide ${slide.id}`;
 
    // Color-code unit label
    const color = UNIT_COLORS[slide.unit] || '#4A8FE3';
    DOM.breadcrumbUnit.style.color = color;
  }
}
 
/* ════════════════════════════════════════════════════════════
   SEARCH
════════════════════════════════════════════════════════════ */
function handleSearch(query) {
  State.searchQuery = query.toLowerCase().trim();
  const items = document.querySelectorAll('.nav-slide-item');
 
  items.forEach(item => {
    const titleEl = item.querySelector('.nav-slide-title');
    const title = titleEl ? titleEl.textContent.toLowerCase() : '';
    const num = item.querySelector('.nav-slide-num')?.textContent || '';
    const match = !State.searchQuery || title.includes(State.searchQuery) || num.includes(State.searchQuery);
 
    item.style.display = match ? '' : 'none';
  });
 
  // Expand all units when searching
  if (State.searchQuery) {
    document.querySelectorAll('.nav-unit').forEach(u => u.classList.remove('collapsed'));
  }
}
 
/* ════════════════════════════════════════════════════════════
   SIDEBAR TOGGLE
════════════════════════════════════════════════════════════ */
function toggleSidebar() {
  State.sidebarCollapsed = !State.sidebarCollapsed;
  DOM.sidebar.classList.toggle('collapsed', State.sidebarCollapsed);
  DOM.mainArea.classList.toggle('expanded', State.sidebarCollapsed);
  DOM.toggleSidebarBtn.textContent = State.sidebarCollapsed ? '☰' : '✕';
 
  // Mobile: also add mobile-open class
  if (window.innerWidth <= 768) {
    DOM.sidebar.classList.toggle('mobile-open', !State.sidebarCollapsed);
    DOM.sidebar.classList.remove('collapsed');
    DOM.mainArea.classList.remove('expanded');
  }
}
 
/* ════════════════════════════════════════════════════════════
   FULLSCREEN
════════════════════════════════════════════════════════════ */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
    DOM.fullscreenBtn.textContent = '⤡';
    State.fullscreen = true;
  } else {
    document.exitFullscreen().catch(() => {});
    DOM.fullscreenBtn.textContent = '⤢';
    State.fullscreen = false;
  }
}
 
/* ════════════════════════════════════════════════════════════
   COPY CODE
════════════════════════════════════════════════════════════ */
function copyCode(btn) {
  const pre = btn.closest('.code-block').querySelector('pre');
  if (!pre) return;
  const text = pre.textContent;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✓ COPIED';
    btn.style.color = 'var(--accent-teal)';
    btn.style.borderColor = 'var(--accent-teal)';
    setTimeout(() => {
      btn.textContent = 'COPY';
      btn.style.color = 'var(--text-muted)';
      btn.style.borderColor = 'var(--border)';
    }, 2000);
  }).catch(() => showToast('Copy failed — please copy manually.'));
}
 
/* ════════════════════════════════════════════════════════════
   TOAST NOTIFICATION
════════════════════════════════════════════════════════════ */
let toastTimer = null;
function showToast(msg) {
  DOM.toast.textContent = msg;
  DOM.toast.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    DOM.toast.style.display = 'none';
  }, CONFIG.toastDuration);
}
 
/* ════════════════════════════════════════════════════════════
   SYNTAX HIGHLIGHT (lightweight CSS-driven)
════════════════════════════════════════════════════════════ */
function syntaxHighlight(code) {
  // Escape HTML first
  let escaped = escapeHtml(code);
 
  // Apply pseudo-highlighting via span wrapping
  // Comments: // ... or # ...
  escaped = escaped.replace(/(\/\/[^\n]*|#[^\n]*)/g, '<span class="comment">$1</span>');
  // Strings
  escaped = escaped.replace(/(&quot;[^&]*&quot;|&#39;[^&]*&#39;)/g, '<span class="string">$1</span>');
  // Keywords
  const keywords = ['function','const','let','var','return','if','else','await',
    'async','import','from','export','class','new','true','false','null',
    'undefined','for','while','do','switch','case','break','continue',
    'try','catch','finally','throw','typeof','instanceof','of','in',
    'def','self','print','import','pass','yield','with','as','is','not',
    'and','or','lambda','del','global','nonlocal','raise','except',
    'You','your','Use','Do','If'];
  keywords.forEach(kw => {
    escaped = escaped.replace(
      new RegExp(`\\b(${kw})\\b`, 'g'),
      '<span class="keyword">$1</span>'
    );
  });
  // Numbers
  escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
 
  return escaped;
}
 
/* ════════════════════════════════════════════════════════════
   CANVAS ANIMATION — FLOATING PARTICLES
════════════════════════════════════════════════════════════ */
function initCanvas() {
  const canvas = DOM.canvas;
  const ctx = canvas.getContext('2d');
 
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
 
  // Create particles
  State.particles = Array.from({ length: CONFIG.canvasParticleCount }, () => createParticle(canvas));
 
  function createParticle(canvas) {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.4 + 0.05,
      color: Math.random() > 0.5
        ? `rgba(74, 143, 227, ` // blue
        : `rgba(201, 147, 61, `, // gold
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.02 + 0.005,
    };
  }
 
  let connectionDist = 120;
  let frameId;
 
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
 
    // Draw connections
    for (let i = 0; i < State.particles.length; i++) {
      for (let j = i + 1; j < State.particles.length; j++) {
        const a = State.particles[i];
        const b = State.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < connectionDist) {
          const alpha = (1 - dist / connectionDist) * 0.07;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(74, 143, 227, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
 
    // Draw & update particles
    State.particles.forEach(p => {
      p.pulse += p.pulseSpeed;
      const alphaMod = p.opacity + Math.sin(p.pulse) * 0.08;
 
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}${Math.max(0, Math.min(1, alphaMod)).toFixed(3)})`;
      ctx.fill();
 
      p.x += p.vx;
      p.y += p.vy;
 
      // Wrap
      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;
      if (p.y < -10) p.y = canvas.height + 10;
      if (p.y > canvas.height + 10) p.y = -10;
    });
 
    frameId = requestAnimationFrame(draw);
  }
 
  draw();
}
 
/* ════════════════════════════════════════════════════════════
   EVENT BINDING
════════════════════════════════════════════════════════════ */
function bindEvents() {
  // Button navigation
  DOM.prevBtn.addEventListener('click', () => goToSlide(State.currentSlide - 1));
  DOM.nextBtn.addEventListener('click', () => goToSlide(State.currentSlide + 1));
  DOM.toggleSidebarBtn.addEventListener('click', toggleSidebar);
  DOM.fullscreenBtn.addEventListener('click', toggleFullscreen);
 
  // Keyboard navigation
  document.addEventListener('keydown', e => {
    // Skip if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
 
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
      case 'PageDown':
        e.preventDefault();
        goToSlide(State.currentSlide + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault();
        goToSlide(State.currentSlide - 1);
        break;
      case 'Home':
        e.preventDefault();
        goToSlide(0);
        break;
      case 'End':
        e.preventDefault();
        goToSlide(State.totalSlides - 1);
        break;
      case 's':
      case 'S':
        toggleSidebar();
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
      case 'Escape':
        if (State.fullscreen) toggleFullscreen();
        // Also close mobile sidebar
        if (window.innerWidth <= 768 && DOM.sidebar.classList.contains('mobile-open')) {
          DOM.sidebar.classList.remove('mobile-open');
        }
        break;
    }
  });
 
  // Touch/swipe support
  let touchStartX = 0;
  let touchStartY = 0;
  DOM.slidesViewport.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  DOM.slidesViewport.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) goToSlide(State.currentSlide + 1);
      else         goToSlide(State.currentSlide - 1);
    }
  }, { passive: true });
 
  // Search
  DOM.searchInput.addEventListener('input', e => handleSearch(e.target.value));
  DOM.searchInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      DOM.searchInput.value = '';
      handleSearch('');
      DOM.searchInput.blur();
    }
  });
 
  // Fullscreen change
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      DOM.fullscreenBtn.textContent = '⤢';
      State.fullscreen = false;
    }
  });
 
  // Click outside sidebar on mobile to close
  DOM.mainArea.addEventListener('click', () => {
    if (window.innerWidth <= 768 && DOM.sidebar.classList.contains('mobile-open')) {
      DOM.sidebar.classList.remove('mobile-open');
    }
  });
 
  // Wheel navigation
  let wheelCooldown = false;
  DOM.slidesViewport.addEventListener('wheel', e => {
    // Only navigate if the slide isn't scrolled mid-content
    const slide = document.querySelector('.slide.active');
    if (slide) {
      const atTop = slide.scrollTop <= 0;
      const atBottom = slide.scrollTop + slide.clientHeight >= slide.scrollHeight - 5;
      if ((e.deltaY > 0 && atBottom) || (e.deltaY < 0 && atTop)) {
        if (!wheelCooldown) {
          wheelCooldown = true;
          if (e.deltaY > 0) goToSlide(State.currentSlide + 1);
          else              goToSlide(State.currentSlide - 1);
          setTimeout(() => { wheelCooldown = false; }, 700);
        }
        e.preventDefault();
      }
    }
  }, { passive: false });
 
  // Window resize — mobile sidebar handling
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      DOM.sidebar.classList.remove('mobile-open');
    }
  });
}
 
/* ════════════════════════════════════════════════════════════
   UTILITIES
════════════════════════════════════════════════════════════ */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
 
// Expose copyCode globally for inline onclick
window.copyCode = copyCode;
 
/* ════════════════════════════════════════════════════════════
   BOOT
════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', init);
