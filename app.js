/* app.js — MCIF v5 "Mind Core" — Industry-grade interactive engine
   Features:
   - Loads MCIF_5_MasterSchema.json (fallback if missing)
   - Phase/question rendering for text, multiple_choice, slider
   - Smooth transitions, progress, start/pause/restart
   - localStorage save/restore with schema version
   - Ambient frequencies (432/528/852/963 Hz) via WebAudio (user-gesture)
   - Results generation: meta score, archetype mapping, career suggestions
   - Export JSON + printable summary (user can print → Save as PDF)
   - Defensive checks and friendly console messages
*/

(() => {
  'use strict';

  /**************************************************************************
   * Configuration & Constants
   **************************************************************************/
  const SCHEMA_FILE = 'MCIF_5_MasterSchema.json';
  const STORAGE_KEY = 'mcif_v5_session_v1';
  const APP_VERSION = 'MCIF_v5_engine_2025.10';
  const DEFAULT_AMBIENT_GAIN = 0.02; // very soft
  const AMBIENT_FREQS = [432, 528, 852, 963];

  /**************************************************************************
   * DOM Shortcuts (defensive)
   **************************************************************************/
  const $ = (id) => document.getElementById(id);
  const safeQuery = (selector) => document.querySelector(selector);

  // main containers
  const startBtn = $('startBtn') || $('begin-btn') || $('beginBtn') || safeQuery('button#startBtn') || null;
  const introSection = $('intro') || safeQuery('#intro') || null;
  const testSection = $('test-section') || $('test-area') || null;
  const resultsSection = $('results-section') || $('resultContainer') || null;

  // test UI elements
  const phaseTitleEl = $('phase-title') || safeQuery('#phaseTitle') || null;
  const phasePromptEl = $('phase-prompt') || safeQuery('#phaseSub') || null;
  const responseEl = $('response') || safeQuery('textarea#response') || null;
  const nextBtn = $('nextBtn') || $('next-btn') || $('nextButton') || null;
  const prevBtn = $('prevBtn') || $('prev-btn') || null;
  const downloadBtn = $('downloadBtn') || $('downloadBtn') || null;
  const restartBtn = $('restartBtn') || $('restart-btn') || null;

  const progressFillEl = $('progressFill') || null;
  const progressTextEl = $('progressText') || null;
  const frequencySelector = $('frequency-selector') || $('freqControl') || null;
  const playAmbienceBtn = $('playAmbience') || null;
  const stopAmbienceBtn = $('stopAmbience') || null;
  const saveButton = $('saveButton') || $('saveBtn') || null;
  const restoreButton = $('restoreButton') || $('restoreBtn') || null;

  const resultsBodyEl = $('resultsBody') || safeQuery('#resultsBody') || $('score-summary') || null;

  // fallback messages
  const WARN = (msg) => console.warn('MCIF WARN:', msg);
  const INFO = (msg) => console.info('MCIF INFO:', msg);
  const ERROR = (msg) => console.error('MCIF ERROR:', msg);

  /**************************************************************************
   * App State
   **************************************************************************/
  let schema = null;               // raw schema object
  let phases = [];                 // normalized phases
  let currentPhaseIndex = 0;       // current phase index
  let currentQuestionIndex = 0;    // index within current phase
  let answers = {};                // structured answers: { phaseIndex: { qIndex: {type, value, raw, timestamp, reflection}}}
  let inProgress = false;
  let audioCtx = null;             // WebAudio context
  let ambientOsc = null;           // oscillator node
  let ambientGainNode = null;
  let ambientPlaying = false;
  let schemaVersion = null;
  let lastSaveTimestamp = null;

  /**************************************************************************
   * Utility helpers
   **************************************************************************/
  function elExists(el, name = '') {
    if (!el) WARN(`Missing element: ${name || '(unnamed)'}`);
    return !!el;
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function q(selector, root = document) {
    return root.querySelector(selector);
  }

  // safe element creation
  function mk(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else e.setAttribute(k, v);
    });
    (children || []).forEach(c => e.appendChild(c));
    return e;
  }

  // format a numeric score into 0-100
  function normScore(v) {
    if (typeof v !== 'number') return 0;
    return Math.round(clamp(v, 0, 100));
  }

  // debounce utility for UI events
  function debounce(fn, delay = 150) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  // animate css class toggle (fade out then in)
  function crossfade(container, updateFn, duration = 360) {
    if (!container) { updateFn(); return; }
    container.classList.add('fade-out');
    setTimeout(() => {
      updateFn();
      container.classList.remove('fade-out');
      container.classList.add('fade-in');
      setTimeout(() => container.classList.remove('fade-in'), duration);
    }, duration);
  }

  /**************************************************************************
   * Schema Loading & Normalization
   *
   * Accepts a schema that ideally has:
   * { title, version, phases: [ { title, description, questions: [ { id, type, prompt, options, min, max } ] } ] }
   *
   * Normalizes into internal structure `phases`.
   **************************************************************************/
  async function loadSchema() {
    // try to fetch the schema file
    try {
      const resp = await fetch(SCHEMA_FILE, { cache: 'no-store' });
      if (resp.ok) {
        const json = await resp.json();
        // basic validation
        if (!json || !Array.isArray(json.phases) || json.phases.length === 0) {
          WARN('Schema file found but invalid structure; falling back to built-in schema.');
          useFallbackSchema();
          return;
        }
        schema = json;
        schemaVersion = json.version || json.schemaVersion || ('v?' + Math.random().toString(36).slice(2,6));
        normalizeSchema();
        INFO('Loaded schema from ' + SCHEMA_FILE + ' (version ' + schemaVersion + ')');
        return;
      } else {
        WARN('Schema file not found at ' + SCHEMA_FILE + ' (HTTP ' + resp.status + ') — using fallback.');
        useFallbackSchema();
        return;
      }
    } catch (err) {
      WARN('Error fetching schema: ' + (err && err.message) + ' — using fallback schema.');
      useFallbackSchema();
    }
  }

  function useFallbackSchema() {
    // compact fallback schema tailored to MCIF phases (6 core phases)
    schema = {
      title: 'MCIF v5 Fallback Schema',
      version: 'fallback-1',
      phases: [
        {
          id: 'phase1',
          title: 'Perceptual Awareness',
          description: 'Describe an ordinary object with fresh attention — sensory detail and emotional resonance.',
          colorTone: '#FFD580',
          questions: [
            { id: 'p1q1', type: 'text', prompt: 'Choose an everyday object. Describe it as if perceived for the very first time.' },
            { id: 'p1q2', type: 'slider', prompt: 'How strongly are you aware of subtle sensory changes? (0–100)', min: 0, max: 100, default: 60 }
          ]
        },
        {
          id: 'phase2',
          title: 'Cognitive Mechanics',
          description: 'Design a sustainable process for a team that misses deadlines; focus on structure over exhortation.',
          colorTone: '#8CC0FF',
          questions: [
            { id: 'p2q1', type: 'text', prompt: 'Explain a process change (brief).' },
            { id: 'p2q2', type: 'multiple_choice', prompt: 'When solving problems you:', options: [
              { id: 'p2o1', label: 'Break into pieces', value: 3, tag: 'logic' },
              { id: 'p2o2', label: 'Prototype quickly', value: 2, tag: 'practical' },
              { id: 'p2o3', label: 'Wait for insight', value: 1, tag: 'intuitive' }
            ] }
          ]
        },
        {
          id: 'phase3',
          title: 'Emotive Intelligence',
          description: 'Reflect on emotional patterning and self-compassion.',
          colorTone: '#FF9BB0',
          questions: [
            { id: 'p3q1', type: 'text', prompt: 'Why does scrolling soothe anxiety before a speech?' },
            { id: 'p3q2', type: 'slider', prompt: 'How forgiving are you with yourself after mistakes? (0–100)', min: 0, max: 100 }
          ]
        },
        {
          id: 'phase4',
          title: 'Meta-Cognitive Insight',
          description: 'Investigate the gap between knowing and doing.',
          colorTone: '#CDA0FF',
          questions: [
            { id: 'p4q1', type: 'text', prompt: 'You understand your patterns but rarely act. What blocks conversion to action?' },
            { id: 'p4q2', type: 'multiple_choice', prompt: 'When your beliefs are challenged you:', options: [
              { id: 'p4o1', label: 'Reflect & test', value: 3, tag: 'meta' },
              { id: 'p4o2', label: 'Defend strongly', value: 1, tag: 'defend' },
              { id: 'p4o3', label: 'Ask clarifying Qs', value: 3, tag: 'meta' }
            ] }
          ]
        },
        {
          id: 'phase5',
          title: 'Creative Intelligence',
          description: 'Invent a new intelligence metric more accurate than IQ and explain it.',
          colorTone: '#9AFFD0',
          questions: [
            { id: 'p5q1', type: 'text', prompt: 'Describe a new intelligence measurement that matters more than IQ.' },
            { id: 'p5q2', type: 'slider', prompt: 'How cross-disciplinary is your thinking? (0–100)', min: 0, max: 100 }
          ]
        },
        {
          id: 'phase6',
          title: 'Philosophical Depth',
          description: 'Consider whether human potential is fixed or ever-expanding.',
          colorTone: '#FFE0A0',
          questions: [
            { id: 'p6q1', type: 'text', prompt: 'Is human potential fixed or ever-expanding? Justify briefly.' },
            { id: 'p6q2', type: 'multiple_choice', prompt: 'Your view of potential is:', options: [
              { id: 'p6o1', label: 'Evolving', value: 3, tag: 'growth' },
              { id: 'p6o2', label: 'Some fixed traits', value: 2, tag: 'hybrid' },
              { id: 'p6o3', label: 'Mostly fixed', value: 1, tag: 'fixed' }
            ] }
          ]
        }
      ]
    };

    schemaVersion = schema.version || 'fallback';
    normalizeSchema();
    INFO('Using fallback internal schema.');
  }

  function normalizeSchema() {
    phases = (schema.phases || []).map((p, pi) => {
      const questions = (p.questions || []).map((q, qi) => {
        return {
          id: q.id || `p${pi}q${qi}`,
          type: q.type || (q.options ? 'multiple_choice' : 'text'),
          prompt: q.prompt || q.text || '',
          options: (q.options || q.choices || []).map(opt => ({
            id: opt.id || ('opt_' + Math.random().toString(36).slice(2,8)),
            label: opt.label || opt.text || String(opt),
            value: typeof opt.value === 'number' ? opt.value : (opt.score || 1),
            tag: opt.tag || opt.meta || null
          })),
          min: (typeof q.min === 'number') ? q.min : 0,
          max: (typeof q.max === 'number') ? q.max : 100,
          default: (typeof q.default === 'number') ? q.default : null,
          placeholder: q.placeholder || ''
        };
      });
      return {
        id: p.id || `phase_${pi}`,
        title: p.title || p.name || `Phase ${pi + 1}`,
        description: p.description || p.desc || '',
        colorTone: p.colorTone || p.color || null,
        questions
      };
    });

    // safety: ensure at least one phase
    if (!Array.isArray(phases) || phases.length === 0) {
      WARN('Schema normalized to empty phases; falling back to minimal built-in structure.');
      useFallbackSchema();
    }
  }

  /**************************************************************************
   * Local Storage: save / restore
   **************************************************************************/
  function saveSession() {
    try {
      const payload = {
        schemaVersion,
        appVersion: APP_VERSION,
        timestamp: Date.now(),
        currentPhaseIndex,
        currentQuestionIndex,
        answers,
        inProgress
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      lastSaveTimestamp = Date.now();
      showToast('Session saved locally');
      INFO('Session saved to localStorage');
      return true;
    } catch (e) {
      WARN('Failed to save session: ' + (e && e.message));
      showToast('Save failed');
      return false;
    }
  }

  function restoreSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { showToast('No saved session'); return false; }
      const payload = JSON.parse(raw);
      // optionally check schema version
      if (payload.schemaVersion && payload.schemaVersion !== schemaVersion) {
        WARN('Saved session schema version differs from current schema. Attempting best-effort restore.');
      }
      currentPhaseIndex = payload.currentPhaseIndex || 0;
      currentQuestionIndex = payload.currentQuestionIndex || 0;
      answers = payload.answers || {};
      inProgress = payload.inProgress || false;
      showToast('Session restored');
      INFO('Session restored from localStorage');
      renderCurrentQuestion();
      showTestSection();
      return true;
    } catch (e) {
      WARN('Failed to restore session: ' + (e && e.message));
      showToast('Restore failed');
      return false;
    }
  }

  function clearSession() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      answers = {};
      currentPhaseIndex = 0;
      currentQuestionIndex = 0;
      inProgress = false;
      showToast('Session cleared');
      renderIntro();
      INFO('Session cleared from localStorage');
      return true;
    } catch (e) {
      WARN('Failed to clear session: ' + (e && e.message));
      return false;
    }
  }

  /**************************************************************************
   * UI Rendering: phases & questions
   **************************************************************************/
  function renderIntro() {
    if (!introSection) return;
    // show intro, hide test/results
    introSection.classList.remove('hidden');
    testSection && testSection.classList.add('hidden');
    resultsSection && resultsSection.classList.add('hidden');
  }

  function showTestSection() {
    introSection && introSection.classList.add('hidden');
    if (testSection) testSection.classList.remove('hidden');
    resultsSection && resultsSection.classList.add('hidden');
  }

  function showResultsSection() {
    introSection && introSection.classList.add('hidden');
    testSection && testSection.classList.add('hidden');
    resultsSection && resultsSection.classList.remove('hidden');
  }

  // Render the current question inside the testSection
  function renderCurrentQuestion() {
    if (!testSection) {
      WARN('Test section element not found. Aborting render.');
      return;
    }
    // validate indices
    currentPhaseIndex = clamp(currentPhaseIndex, 0, Math.max(0, phases.length - 1));
    const phase = phases[currentPhaseIndex];
    if (!phase) {
      WARN('Phase missing at index ' + currentPhaseIndex);
      return;
    }
    currentQuestionIndex = clamp(currentQuestionIndex, 0, Math.max(0, phase.questions.length - 1));
    const question = phase.questions[currentQuestionIndex];
    if (!question) {
      WARN('Question missing at phase ' + currentPhaseIndex + ' qIndex ' + currentQuestionIndex);
      return;
    }

    // update header and description
    if (phaseTitleEl) phaseTitleEl.textContent = `${phase.title} (${currentPhaseIndex + 1} / ${phases.length})`;
    if (phasePromptEl) phasePromptEl.textContent = phase.description || '';

    // anchor container for the prompt/inputs
    const container = q('#phase-display') || testSection;
    if (!container) {
      WARN('No phase display container found');
      return;
    }

    // crossfade update
    crossfade(container, () => {
      // clear existing content
      container.innerHTML = '';

      // header
      const header = mk('div', { class: 'phase-header' });
      header.appendChild(mk('h3', { text: question.prompt || '—' }));
      container.appendChild(header);

      // interactive input area
      const inputArea = mk('div', { class: 'input-area' });

      // restore any saved answer
      const saved = ((answers[currentPhaseIndex] || {})[currentQuestionIndex]) || null;

      if (question.type === 'multiple_choice') {
        // sanity
        const opts = question.options && question.options.length ? question.options : [];
        const list = mk('div', { class: 'options-list' });
        opts.forEach((opt, idx) => {
          const btn = mk('button', { class: 'option-btn', text: opt.label });
          btn.type = 'button';
          // mark selected if matches saved
          if (saved && saved.type === 'multiple_choice' && String(saved.raw || '') === String(opt.label || '')) {
            btn.classList.add('selected');
          }
          btn.addEventListener('click', () => {
            // deselect siblings
            Array.from(list.querySelectorAll('.option-btn')).forEach(el => el.classList.remove('selected'));
            btn.classList.add('selected');
            // store answer
            recordAnswer(currentPhaseIndex, currentQuestionIndex, {
              type: 'multiple_choice',
              value: Number(opt.value || 1),
              raw: opt.label || String(opt),
              tag: opt.tag || null
            });
          });
          list.appendChild(btn);
        });
        inputArea.appendChild(list);
      } else if (question.type === 'slider') {
        // slider input
        const sliderRow = mk('div', { class: 'slider-row' });
        const valLabel = mk('div', { class: 'slider-value', text: String(saved && saved.value !== undefined ? saved.value : (question.default ?? Math.round((question.min + question.max) / 2))) });
        const range = mk('input', { type: 'range', min: question.min.toString(), max: question.max.toString(), value: String(saved && saved.value !== undefined ? saved.value : (question.default ?? Math.round((question.min + question.max) / 2))) });
        range.addEventListener('input', (e) => {
          valLabel.textContent = e.target.value;
        });
        range.addEventListener('change', (e) => {
          recordAnswer(currentPhaseIndex, currentQuestionIndex, {
            type: 'slider',
            value: Number(e.target.value),
            raw: e.target.value
          });
        });
        sliderRow.appendChild(valLabel);
        sliderRow.appendChild(range);
        inputArea.appendChild(sliderRow);
      } else { // text (default)
        const ta = mk('textarea', { class: 'response-area', placeholder: question.placeholder || 'Type your response...' });
        if (saved && saved.type === 'text' && saved.raw) ta.value = saved.raw;
        // autosave while typing (debounced)
        ta.addEventListener('input', debounce((e) => {
          recordAnswer(currentPhaseIndex, currentQuestionIndex, {
            type: 'text',
            value: (e.target.value || '').length,
            raw: e.target.value || ''
          });
        }, 450));
        inputArea.appendChild(ta);
      }

      // reflection prompt area (optional, small)
      const reflection = mk('div', { class: 'reflection' });
      reflection.appendChild(mk('label', { text: 'Reflection (optional)' }));
      const reflTA = mk('textarea', { class: 'reflection-input', placeholder: 'Short reflective note (saved locally)' });
      if (saved && saved.reflection) reflTA.value = saved.reflection;
      reflTA.addEventListener('input', debounce((e) => {
        // attach reflection to the existing saved answer or create minimal
        const current = (answers[currentPhaseIndex] || {})[currentQuestionIndex] || { type: 'text', value: 0, raw: '' };
        current.reflection = e.target.value;
        current.t = Date.now();
        answers[currentPhaseIndex] = answers[currentPhaseIndex] || {};
        answers[currentPhaseIndex][currentQuestionIndex] = current;
        saveSession();
      }, 600));
      reflection.appendChild(reflTA);

      inputArea.appendChild(reflection);

      // nav hint / optional examples
      const hint = mk('div', { class: 'hint', html: `<small>Phase ${currentPhaseIndex + 1} of ${phases.length} — Question ${currentQuestionIndex + 1} of ${phase.questions.length}</small>` });
      inputArea.appendChild(hint);

      // attach to container
      container.appendChild(inputArea);

      // update progress UI
      updateProgressUI();
      // update visual tone for the phase
      setVisualTone(phase.colorTone || null);
    }, 360); // duration aligns with CSS fade
  }

  function updateProgressUI() {
    // compute absolute progress across phases
    const totalQuestions = phases.reduce((acc, p) => acc + (p.questions ? p.questions.length : 0), 0) || 1;
    let completedCount = 0;
    for (let pi = 0; pi < phases.length; pi++) {
      for (let qi = 0; qi < (phases[pi].questions || []).length; qi++) {
        if ((answers[pi] || {})[qi]) completedCount++;
      }
    }
    const completedSoFar = (() => {
      let c = 0;
      for (let pi = 0; pi < currentPhaseIndex; pi++) c += (phases[pi].questions || []).length;
      c += currentQuestionIndex;
      return c;
    })();

    const percent = Math.round(((completedSoFar) / Math.max(1, totalQuestions - 1)) * 100);
    if (progressFillEl) progressFillEl.style.width = `${percent}%`;
    if (progressTextEl) progressTextEl.textContent = `${completedSoFar} / ${totalQuestions}`;
  }

  /**************************************************************************
   * Answer management
   **************************************************************************/
  function recordAnswer(phaseIdx, qIdx, answer) {
    answers[phaseIdx] = answers[phaseIdx] || {};
    answers[phaseIdx][qIdx] = Object.assign({}, answer, { t: Date.now() });
    saveSession(); // auto-save
  }

  /**************************************************************************
   * Navigation logic
   **************************************************************************/
  function goNext() {
    const phase = phases[currentPhaseIndex];
    if (!phase) return;

    // If not last question in phase, move to next question
    if (currentQuestionIndex < (phase.questions.length - 1)) {
      currentQuestionIndex++;
      renderCurrentQuestion();
      return;
    }

    // else if next phase exists, move to first question
    if (currentPhaseIndex < (phases.length - 1)) {
      currentPhaseIndex++;
      currentQuestionIndex = 0;
      renderCurrentQuestion();
      return;
    }

    // finished all phases — compute and show results
    finalizeAndShowResults();
  }

  function goPrev() {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      renderCurrentQuestion();
      return;
    }
    if (currentPhaseIndex > 0) {
      currentPhaseIndex--;
      currentQuestionIndex = Math.max(0, (phases[currentPhaseIndex].questions || []).length - 1);
      renderCurrentQuestion();
      return;
    }
    // already at start — show intro
    renderIntro();
  }

  /**************************************************************************
   * Results: scoring engine & archetype mapping
   *
   * We'll compute:
   * - domain scores (perception, logic, creativity, emotion, meta, adaptability)
   * - meta composite score (0-700 scaled)
   * - archetype mapping (nearest rules-based prototypes)
   * - career/gift suggestions (based on archetype)
   **************************************************************************/
  function computeResults() {
    // initialize domain totals
    const domains = {
      perception: 0,
      logic: 0,
      creativity: 0,
      emotion: 0,
      meta: 0
    };
    let countContributions = 0;

    // heuristic rules for mapping answer tags / types to domains
    for (let pi = 0; pi < phases.length; pi++) {
      const phase = phases[pi];
      for (let qi = 0; qi < (phase.questions || []).length; qi++) {
        const a = (answers[pi] || {})[qi];
        if (!a) continue;
        countContributions++;
        if (a.type === 'multiple_choice') {
          const v = Number(a.value || 0);
          const tag = a.tag || null;
          if (tag === 'logic' || tag === 'analysis') domains.logic += v * 1.2;
          else if (tag === 'meta') domains.meta += v * 1.3;
          else if (tag === 'creative' || tag === 'practical') domains.creativity += v * 1.1;
          else if (tag === 'emotion' || tag === 'compassion') domains.emotion += v * 1.2;
          else domains.perception += v * 0.9;
        } else if (a.type === 'slider') {
          const v = Number(a.value || 0);
          // distribute slider value across domains (more neutral)
          domains.perception += v * 0.18;
          domains.logic += v * 0.18;
          domains.creativity += v * 0.18;
          domains.emotion += v * 0.18;
          domains.meta += v * 0.18;
        } else if (a.type === 'text') {
          // textual responses: use length as a weak proxy, but also inspect content for some keywords (simple)
          const text = String(a.raw || '').toLowerCase();
          const len = Math.min(300, (text.length || 0));
          domains.meta += len * 0.06; // more length → more meta content likely
          // quick keyword heuristics
          if (text.includes('feel') || text.includes('emotion') || text.includes('anx')) domains.emotion += Math.min(12, len * 0.04);
          if (text.includes('system') || text.includes('process') || text.includes('logic')) domains.logic += Math.min(14, len * 0.05);
          if (text.includes('imagine') || text.includes('create') || text.includes('invent')) domains.creativity += Math.min(16, len * 0.05);
          if (text.includes('notice') || text.includes('observe') || text.includes('perceive')) domains.perception += Math.min(12, len * 0.04);
        }
      }
    }

    // normalization: scale domain totals to 0-100 roughly
    const normalizer = Math.max(1, countContributions * 10); // rough scaling factor
    const scores = {
      perception: normScore((domains.perception / normalizer) * 100),
      logic: normScore((domains.logic / normalizer) * 100),
      creativity: normScore((domains.creativity / normalizer) * 100),
      emotion: normScore((domains.emotion / normalizer) * 100),
      meta: normScore((domains.meta / normalizer) * 100)
    };

    // compute adaptability as std deviation across domain scores (higher = more variance -> less adaptability)
    const arr = Object.values(scores);
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / arr.length;
    const stddev = Math.sqrt(variance);
    const adaptability = Math.round(100 - normScore(stddev * 1.6)); // invert: lower stddev -> higher adaptability

    // composite meta-score = weighted sum (per user's whitepaper style):
    // Perception 15%, Logic 15%, Creativity 15%, Emotion 15%, Meta 15%, Adaptability 10% => sum = 85%? adjust to total 100
    // We'll scale each to their weight and normalize to 700 scale as earlier spec (700 total)
    const weights = {
      perception: 0.15,
      logic: 0.15,
      creativity: 0.15,
      emotion: 0.15,
      meta: 0.15,
      adaptability: 0.25 // increase slightly to ensure sum = 1.0
    };
    // sum to 1.0? adjust: current sum = 1.0
    const compositeScorePercent = normScore(
      scores.perception * weights.perception +
      scores.logic * weights.logic +
      scores.creativity * weights.creativity +
      scores.emotion * weights.emotion +
      scores.meta * weights.meta +
      adaptability * weights.adaptability
    );

    // scale to 0-700 (as specified)
    const composite700 = Math.round((compositeScorePercent / 100) * 700);

    return {
      domainScores: scores,
      adaptability,
      compositePercent: compositeScorePercent,
      composite700
    };
  }

  // map to archetype with summary + careers (10 suggestions)
  function pickArchetype(results) {
    const s = results.domainScores;
    // basic rule-based mapping (expandable)
    // determine top 2 domains
    const entries = Object.entries(s).sort((a, b) => b[1] - a[1]); // [ [domain,score], ... ]
    const top = entries[0][0];
    const second = entries[1][0];

    // prototypes
    const prototypes = [
      {
        id: 'reflective_architect',
        name: 'Reflective Architect',
        match: (d) => (d.meta >= 55 && d.logic >= 50),
        summary: 'Analytical, system-oriented, and unusually self-aware. You build mental scaffolding for ideas.',
        careers: ['Systems Designer','Research Architect','Strategic Planner','Product Architect','Data Scientist','Policy Designer','Academic Researcher','Enterprise Architect','Systems Engineer','Operations Strategist']
      },
      {
        id: 'empathic_inventor',
        name: 'Empathic Inventor',
        match: (d) => (d.creativity >= 60 && d.emotion >= 50),
        summary: 'Combines deep empathy with imaginative creation — solutions that touch people.',
        careers: ['Product Designer','Creative Director','UX Researcher','Social Innovator','Artist','Therapeutic Designer','Community Builder','Design Researcher','Social Entrepreneur','Experience Architect']
      },
      {
        id: 'visionary_synthesist',
        name: 'Visionary Synthesist',
        match: (d) => (d.creativity >= 60 && d.meta >= 60),
        summary: 'Cross-domain synthesizer who draws large-scale patterns and future trajectories.',
        careers: ['Futurist','Chief Innovation Officer','R&D Lead','Inventor','Think Tank Director','Innovation Strategist','Chief Strategy Officer','Product Futurist','Conceptual Designer','Systems Thinker']
      },
      {
        id: 'grounded_operator',
        name: 'Grounded Operator',
        match: (d) => (d.logic >= 65 && d.meta < 55),
        summary: 'Execution-focused, pragmatic and reliable. You convert plans into working systems.',
        careers: ['Operations Manager','Project Manager','Program Manager','Logistics Director','Implementation Lead','Operations Researcher','Infrastructure Lead','Supply Chain Strategist','Delivery Manager','Business Operations']
      },
      {
        id: 'dreaming_idealist',
        name: 'Dreaming Idealist',
        match: (d) => (d.emotion >= 60 && d.logic < 45),
        summary: 'Meaning-first thinker — guided by values and imagination more than method.',
        careers: ['Writer','Philosopher','Counselor','Spiritual Educator','Poet','Community Organizer','Creative Writer','Nonprofit Founder','Vision-driven Artist','Public Speaker']
      },
      {
        id: 'balanced_strategist',
        name: 'Balanced Strategist',
        match: (d) => true, // fallback catches balance or mixed profiles
        summary: 'Well-rounded and adaptable — a reliable strategist who balances multiple strengths.',
        careers: ['Consultant','Entrepreneur','Strategy Lead','Program Director','Policy Consultant','Business Analyst','Product Manager','Management Consultant','Change Agent','Portfolio Manager']
      }
    ];

    // find first matching prototype
    const domainSnapshot = Object.assign({}, s);
    let chosen = prototypes.find(p => p.match(domainSnapshot)) || prototypes[prototypes.length - 1];

    // compute confidence score naive: based on top domain difference
    const confidence = Math.round(((entries[0][1] - entries[1][1]) + 50) * 0.9);
    return {
      id: chosen.id,
      name: chosen.name,
      summary: chosen.summary,
      careers: chosen.careers,
      confidence: clamp(confidence, 20, 98)
    };
  }

  /**************************************************************************
   * Finalization: build report, render results, download/print options
   **************************************************************************/
  function finalizeAndShowResults() {
    // compute
    const results = computeResults();
    const arche = pickArchetype(results);
    // create narrative
    const narrativeHtml = `
      <div class="report-block">
        <h3>Composite Score</h3>
        <p><strong>${results.composite700} / 700</strong> — ${Math.round(results.compositePercent)}%</p>
      </div>

      <div class="report-block">
        <h3>Domain Scores</h3>
        <ul>
          <li>Perception: ${results.domainScores.perception}</li>
          <li>Logic & Reasoning: ${results.domainScores.logic}</li>
          <li>Creativity: ${results.domainScores.creativity}</li>
          <li>Emotional Regulation: ${results.domainScores.emotion}</li>
          <li>Meta-Awareness: ${results.domainScores.meta}</li>
          <li>Adaptability: ${results.adaptability}</li>
        </ul>
      </div>

      <div class="report-block">
        <h3>Archetype</h3>
        <p><strong>${arche.name}</strong> (confidence ${arche.confidence}%)</p>
        <p>${arche.summary}</p>
      </div>

      <div class="report-block">
        <h3>Suggested Career Fields & Gifts</h3>
        <p>${arche.careers.slice(0, 10).join(', ')}</p>
      </div>
    `;

    // set results DOM
    if (resultsBodyEl) {
      resultsBodyEl.innerHTML = narrativeHtml;
    } else {
      // fallback: show results-section body
      const rs = $('results-section') || resultsSection || document.body;
      const container = mk('div', { class: 'inline-report', html: narrativeHtml });
      rs && rs.appendChild(container);
    }

    // show results
    showResultsSection();
    // provide download link via JSON and prompt to print
    // attach handlers for download
    // We'll attach these only once
    attachResultActions({ results, archetype: arche });
  }

  let resultActionsAttached = false;
  function attachResultActions(context) {
    if (resultActionsAttached) return;
    resultActionsAttached = true;
    // JSON export
    const exportJsonBtn = $('exportJsonBtn') || $('downloadBtn') || safeQuery('#exportJsonBtn');
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => {
        const payload = {
          schemaTitle: schema && schema.title,
          schemaVersion,
          generatedAt: (new Date()).toISOString(),
          context
        };
        const blob = new Blob([JSON.stringify({ answers, payload }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = mk('a', { href: url });
        a.download = 'mcif_results.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast('Results exported (JSON).');
      });
    }

    // printable summary (user prints page → Save as PDF via browser print)
    const printBtn = $('downloadBtn') || $('downloadBtn') || safeQuery('#downloadBtn');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        // Build a printable report in a new window
        const doc = window.open('', '_blank', 'noopener');
        if (!doc) {
          showToast('Unable to open print window (popup blocked). Use browser print to save PDF.');
          return;
        }
        const html = `
          <html>
            <head>
              <title>MCIF Report</title>
              <style>
                body{font-family: Arial, Helvetica, sans-serif; padding:24px; color:#111}
                h1,h2,h3{color:#111}
                .report-block{margin-bottom:16px}
              </style>
            </head>
            <body>
              <h1>MCIF v5 — Your Report</h1>
              <p>Generated: ${new Date().toLocaleString()}</p>
              ${resultsBodyEl ? resultsBodyEl.innerHTML : '<p>No results captured.</p>'}
              <hr/>
              <p>MCIF v5 — Open for research & education. Not a medical or diagnostic tool.</p>
            </body>
          </html>
        `;
        doc.document.write(html);
        doc.document.close();
        // give it a moment then trigger print
        setTimeout(() => {
          try {
            doc.print();
          } catch (e) {
            WARN('Print failed: ' + (e && e.message));
            showToast('Print not permitted by browser. Use manual Save as PDF.');
          }
        }, 450);
      });
    }

    // restart button
    const rBtn = $('restartBtn') || $('restart-btn') || safeQuery('#restart-btn');
    if (rBtn) {
      rBtn.addEventListener('click', () => {
        if (confirm('Restart the MCIF test? This will clear your local session.')) {
          clearSession();
          renderIntro();
        }
      });
    }
  }

  /**************************************************************************
   * Ambient audio (soft tones)
   **************************************************************************/
  function ensureAudioContext() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        INFO('AudioContext created.');
      } catch (e) {
        WARN('WebAudio not supported in this browser.');
      }
    }
  }

  function startAmbient(freq) {
    try {
      ensureAudioContext();
      if (!audioCtx) return;
      stopAmbient();
      ambientOsc = audioCtx.createOscillator();
      ambientGainNode = audioCtx.createGain();
      ambientOsc.type = 'sine';
      ambientOsc.frequency.value = Number(freq) || AMBIENT_FREQS[0];
      ambientGainNode.gain.value = 0.0001;
      ambientOsc.connect(ambientGainNode);
      ambientGainNode.connect(audioCtx.destination);
      ambientOsc.start(audioCtx.currentTime + 0.01);
      // gentle fade in
      ambientGainNode.gain.linearRampToValueAtTime(DEFAULT_AMBIENT_GAIN, audioCtx.currentTime + 0.6);
      ambientPlaying = true;
      showToast('Ambient started');
      INFO('Ambient tone started at ' + ambientOsc.frequency.value + 'Hz');
    } catch (e) {
      WARN('Failed to start ambient: ' + (e && e.message));
    }
  }

  function stopAmbient() {
    try {
      if (ambientOsc) {
        // gentle fade out then stop
        if (ambientGainNode) {
          ambientGainNode.gain.linearRampToValueAtTime(0.00001, audioCtx.currentTime + 0.2);
        }
        ambientOsc.stop(audioCtx.currentTime + 0.25);
        try { ambientOsc.disconnect(); } catch (e) {}
        ambientOsc = null;
      }
      if (ambientGainNode) {
        try { ambientGainNode.disconnect(); } catch (e) {}
        ambientGainNode = null;
      }
      ambientPlaying = false;
      showToast('Ambient stopped');
      INFO('Ambient stopped');
    } catch (e) {
      WARN('Error stopping ambient: ' + (e && e.message));
    }
  }

  /**************************************************************************
   * Small UI helpers: toast messages, focus ring, visual tone
   **************************************************************************/
  function showToast(msg, ms = 1400) {
    const t = mk('div', { class: 'mcif-toast', text: msg });
    Object.assign(t.style, { position: 'fixed', bottom: '18px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '10px 14px', borderRadius: '10px', zIndex: 9999 });
    document.body.appendChild(t);
    setTimeout(() => t.style.opacity = '0', ms - 250);
    setTimeout(() => t.remove(), ms);
  }

  function setVisualTone(hex) {
    // subtle background / accent manipulation to keep engagement
    if (!hex) return;
    document.documentElement.style.setProperty('--accent-color', hex);
    // optionally animate a soft glow on the body using CSS var --accent-color
    // Requires matching CSS that uses --accent-color (style.css should include)
  }

  /**************************************************************************
   * Wiring: DOM event handlers (safe attachment)
   **************************************************************************/
  function attachEventHandlers() {
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        // resume audio context on user gesture if needed
        try { audioCtx && audioCtx.state === 'suspended' && audioCtx.resume(); } catch (e) {}
        inProgress = true;
        currentPhaseIndex = 0;
        currentQuestionIndex = 0;
        renderCurrentQuestion();
        showTestSection();
        saveSession();
      });
    } else {
      WARN('Start button not found; users must trigger test via UI.');
    }

    if (nextBtn) nextBtn.addEventListener('click', () => {
      goNext();
    });
    if (prevBtn) prevBtn.addEventListener('click', () => {
      goPrev();
    });

    if (saveButton) saveButton.addEventListener('click', () => saveSession());
    if (restoreButton) restoreButton.addEventListener('click', () => restoreSession());

    if (playAmbienceBtn && frequencySelector) {
      playAmbienceBtn.addEventListener('click', () => {
        // user gesture ensures audio allowed
        const freq = Number(frequencySelector.value || AMBIENT_FREQS[0]) || AMBIENT_FREQS[0];
        startAmbient(freq);
      });
    }
    if (stopAmbienceBtn) stopAmbienceBtn.addEventListener('click', () => stopAmbient());

    // keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    });

    // restart / clear session
    if (restartBtn) restartBtn.addEventListener('click', () => {
      if (confirm('Clear progress and restart the MCIF test?')) {
        clearSession();
      }
    });

    // defensive: if user navigates away, autosave
    window.addEventListener('beforeunload', () => {
      saveSession();
    });
  }

  /**************************************************************************
   * Init application
   **************************************************************************/
  async function initApp() {
    INFO('Initializing MCIF v5 app');
    // attach early handlers
    attachEventHandlers();

    // load schema (attempt)
    await loadSchema();

    // make sure rendering works even if schema empty
    if (!Array.isArray(phases) || phases.length === 0) {
      WARN('No phases available after schema load — fallback schema was used.');
    }

    // prefill progress UI if present
    updateProgressUI();

    // prompt restore if saved session exists
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEY);
      if (savedRaw) {
        // friendly prompt: check if user wants to restore
        setTimeout(() => {
          if (confirm('A saved MCIF session was found. Restore it?')) {
            restoreSession();
          }
        }, 600);
      }
    } catch (e) { /* ignore */ }

    // final log
    INFO('MCIF app ready — UI bound, schema loaded.');
  }

  // run
  initApp();

  // expose some testing API on window (debugging safe)
  window.MCIF = window.MCIF || {};
  window.MCIF._debug = {
    getState: () => ({ schemaVersion, currentPhaseIndex, currentQuestionIndex, answers }),
    loadSchemaNow: loadSchema,
    saveSession,
    restoreSession,
    computeResults
  };

})(); // end IIFE
