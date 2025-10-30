// app.js - MCIF v5 interactive test engine (robust, fallback schema, localStorage, audio)

(() => {
  // DOM elements
  const introScreen = document.getElementById('introScreen');
  const testArea = document.getElementById('test-area');
  const resultContainer = document.getElementById('resultContainer');
  const phaseTitle = document.getElementById('phaseTitle');
  const phaseSub = document.getElementById('phaseSub');
  const questionContainer = document.getElementById('questionContainer');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  const beginBtn = document.getElementById('begin-btn');
  const demoBtn = document.getElementById('demoButton');
  const tutorialBtn = document.getElementById('tutorialButton');
  const nextBtn = document.getElementById('next-btn');
  const prevBtn = document.getElementById('prev-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const saveBtn = document.getElementById('saveButton');
  const restoreBtn = document.getElementById('restoreButton');
  const restartBtn = document.getElementById('restart-btn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const exportTxtBtn = document.getElementById('exportTxtBtn');

  const tierSelect = document.getElementById('tierSelect');
  const frequencySelector = document.getElementById('frequency-selector');
  const playAmbience = document.getElementById('playAmbience');
  const stopAmbience = document.getElementById('stopAmbience');
  const reflectionNote = document.getElementById('reflectionNote');
  const reflectionBox = document.getElementById('reflectionBox');

  // local storage key
  const STORAGE_KEY = 'mcif_v5_progress_v1';

  // app state
  let schema = null;
  let phases = [];
  let flatQuestions = []; // for overall progress count
  let currentPhaseIndex = 0;
  let currentQuestionIndexInPhase = 0;
  let answers = {}; // { phaseIndex: { qIndex: {type, value, raw}}}
  let inDemo = false;
  let audioCtx = null;
  let osc = null;

  // fallback local schema (lightweight) used if MCIF_5_MasterSchema.json can't be fetched
  const fallbackSchema = {
    title: "MCIF v5 - Fallback Schema",
    phases: [
      {
        title: "Phase 1 — Perceptual Awareness",
        description: "Describe immediate sensory impressions and link them to meaning.",
        questions: [
          { id: "p1q1", type: "text", prompt: "Choose an everyday object and describe it as if perceived for the first time." },
          { id: "p1q2", type: "slider", prompt: "How aware are you of subtle sensory changes? (0–100)" }
        ]
      },
      {
        title: "Phase 2 — Cognitive Mechanics",
        description: "Assess systematic thinking and practical creativity.",
        questions: [
          { id: "p2q1", type: "text", prompt: "A team misses deadlines. Design a sustainable process (brief)." },
          { id: "p2q2", type: "multiple_choice", prompt: "When solving a problem you typically:", options: [
            { id:"opt1", label:"Break it into pieces", value:3, tag:"logic" },
            { id:"opt2", label:"Prototype quickly", value:2, tag:"creative" },
            { id:"opt3", label:"Wait for insight", value:1, tag:"intuitive" }
          ] }
        ]
      },
      {
        title: "Phase 3 — Emotive Intelligence",
        description: "Examine emotional insight and self-compassion.",
        questions: [
          { id: "p3q1", type: "text", prompt: "You feel anxious and scroll your phone. Why does this soothe you?" },
          { id: "p3q2", type: "slider", prompt: "How forgiving are you to yourself after mistakes? (0–100)" }
        ]
      },
      {
        title: "Phase 4 — Meta-Cognitive Insight",
        description: "Awareness of thought processes and conversion to action.",
        questions: [
          { id: "p4q1", type: "text", prompt: "You know patterns but rarely act. What blocks conversion to action?" },
          { id: "p4q2", type: "multiple_choice", prompt: "When you receive feedback you disagree with:", options:[
            {id:"o1", label:"Reflect & test it", value:3, tag:"meta"},
            {id:"o2", label:"Defend your position", value:1, tag:"defend"},
            {id:"o3", label:"Ask clarifying questions", value:3, tag:"meta"}
          ] }
        ]
      }
    ]
  };

  // try to fetch schema file if present (non-blocking)
  async function loadSchema() {
    const path = 'MCIF_5_MasterSchema.json';
    try {
      const resp = await fetch(path, {cache: "no-store"});
      if (!resp.ok) throw new Error('no schema');
      const data = await resp.json();
      // normalize to our runtime structure
      if (data && Array.isArray(data.phases) && data.phases.length) {
        schema = data;
        phases = data.phases.map(p => ({
          title: p.title || p.name || 'Phase',
          description: p.description || p.desc || '',
          questions: (p.questions || []).map(q => {
            // normalize minimal q structure
            return {
              id: q.id || q.key || ('q_' + Math.random().toString(36).slice(2,8)),
              type: q.type || 'text',
              prompt: q.prompt || q.text || '',
              options: q.options || q.choices || q.variants || []
            };
          })
        }));
        console.log('MCIF schema loaded from file.');
        return;
      }
      throw new Error('schema invalid');
    } catch (err) {
      // fallback
      console.warn('Falling back to internal schema:', err && err.message);
      schema = fallbackSchema;
      phases = fallbackSchema.phases;
    }
  }

  // build flatQuestions and initialize state
  function initPhases() {
    flatQuestions = [];
    phases.forEach((p, pi) => {
      p.questions.forEach((q, qi) => {
        flatQuestions.push({ pi, qi, q });
      });
    });
  }

  // UI helpers
  function showIntro() {
    introScreen.classList.remove('hide'); introScreen.classList.add('show');
    testArea.classList.remove('show'); testArea.classList.add('hide');
    resultContainer.classList.remove('show'); resultContainer.classList.add('hide');
  }
  function showTest() {
    introScreen.classList.remove('show'); introScreen.classList.add('hide');
    setTimeout(() => { introScreen.style.display = 'none'; }, 420);
    testArea.style.display = 'block';
    testArea.classList.remove('hide'); testArea.classList.add('show');
  }
  function showResults() {
    testArea.classList.remove('show'); testArea.classList.add('hide');
    setTimeout(() => { testArea.style.display = 'none'; }, 360);
    resultContainer.style.display = 'block';
    resultContainer.classList.remove('hide'); resultContainer.classList.add('show');
  }

  function updateProgress() {
    const total = flatQuestions.length;
    // compute overall index
    let index = 0;
    for (let i=0;i<currentPhaseIndex;i++) index += phases[i].questions.length;
    index += currentQuestionIndexInPhase + 1; // 1-based
    const percent = Math.round((index-1) / Math.max(1,total-1) * 100);
    progressText.textContent = `${index} / ${total}`;
    progressFill.style.width = `${percent}%`;
  }

  // Render current question
  function renderCurrent() {
    const phase = phases[currentPhaseIndex];
    const q = phase.questions[currentQuestionIndexInPhase];
    phaseTitle.textContent = phase.title;
    phaseSub.textContent = phase.description || '';
    updateProgress();

    // clear container
    questionContainer.innerHTML = '';
    reflectionBox.style.display = 'none';
    reflectionNote.value = '';

    const block = document.createElement('div');
    block.className = 'q-block';

    // question text
    const qtext = document.createElement('div');
    qtext.className = 'q-text';
    qtext.textContent = q.prompt || '...';
    block.appendChild(qtext);

    // input type handlers
    if (q.type === 'multiple_choice' || (q.options && q.options.length)) {
      // create option buttons
      q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option';
        btn.textContent = opt.label || opt;
        btn.dataset.value = opt.value ?? (idx+1);
        btn.dataset.id = opt.id ?? ('opt' + idx);
        btn.addEventListener('click', () => {
          // mark selected (single choice)
          Array.from(questionContainer.querySelectorAll('.option')).forEach(el=>el.classList.remove('selected'));
          btn.classList.add('selected');
          // record answer
          recordAnswer(currentPhaseIndex, currentQuestionIndexInPhase, {
            type: 'multiple_choice',
            value: Number(btn.dataset.value),
            raw: opt.label || opt,
            meta: opt.tag || null
          });
        });
        block.appendChild(btn);
      });
    } else if (q.type === 'slider') {
      const wrapper = document.createElement('div');
      wrapper.className = 'range-row';
      const range = document.createElement('input');
      range.type = 'range';
      range.min = q.min ?? 0;
      range.max = q.max ?? 100;
      range.value = q.default ?? Math.round((range.max - range.min)/2);
      const label = document.createElement('div');
      label.className = 'muted';
      label.textContent = range.value;
      range.addEventListener('input', (e)=> label.textContent = e.target.value);
      range.addEventListener('change', () => {
        recordAnswer(currentPhaseIndex, currentQuestionIndexInPhase, {
          type: 'slider',
          value: Number(range.value),
          raw: range.value
        });
      });
      wrapper.appendChild(label);
      wrapper.appendChild(range);
      block.appendChild(wrapper);
    } else {
      // text
      const ta = document.createElement('textarea');
      ta.placeholder = q.placeholder || 'Type your answer...';
      ta.addEventListener('input', () => {
        // auto-save but not score; store raw
        recordAnswer(currentPhaseIndex, currentQuestionIndexInPhase, {
          type: 'text',
          value: ta.value.length, // basic proxy
          raw: ta.value
        });
      });
      block.appendChild(ta);
      reflectionBox.style.display = 'block';
    }

    questionContainer.appendChild(block);

    // restore previously selected answer if exists
    const saved = (answers[currentPhaseIndex] || {})[currentQuestionIndexInPhase];
    if (saved) {
      if (saved.type === 'multiple_choice') {
        const opts = questionContainer.querySelectorAll('.option');
        opts.forEach(optEl => {
          if (optEl.dataset.value && Number(optEl.dataset.value) === Number(saved.value) && optEl.textContent.trim() === saved.raw.trim()) {
            optEl.classList.add('selected');
          }
        });
      } else if (saved.type === 'slider') {
        const range = questionContainer.querySelector('input[type=range]');
        const label = questionContainer.querySelector('.range-row .muted');
        if (range) {
          range.value = saved.value;
          label.textContent = saved.value;
        }
      } else if (saved.type === 'text') {
        const ta = questionContainer.querySelector('textarea');
        if (ta) ta.value = saved.raw || '';
        reflectionNote.value = saved.reflection || '';
      }
    }
  }

  function recordAnswer(pi, qi, answer) {
    answers[pi] = answers[pi] || {};
    answers[pi][qi] = Object.assign({}, answer, {
      t: Date.now(),
      reflection: reflectionNote ? reflectionNote.value : ''
    });
    // update localStorage automatically
    saveToLocal();
  }

  // navigation
  function goNext() {
    // if not last question in phase
    if (currentQuestionIndexInPhase < phases[currentPhaseIndex].questions.length - 1) {
      currentQuestionIndexInPhase++;
      renderCurrent();
      return;
    }
    // else move to next phase if possible
    if (currentPhaseIndex < phases.length - 1) {
      currentPhaseIndex++;
      currentQuestionIndexInPhase = 0;
      renderCurrent();
      return;
    }
    // finished test
    computeResultsAndShow();
  }
  function goPrev() {
    if (currentQuestionIndexInPhase > 0) {
      currentQuestionIndexInPhase--;
      renderCurrent();
      return;
    }
    if (currentPhaseIndex > 0) {
      currentPhaseIndex--;
      currentQuestionIndexInPhase = Math.max(0, phases[currentPhaseIndex].questions.length - 1);
      renderCurrent();
    }
  }

  // compute simple results from answers
  function computeResultsAndShow() {
    // simple scoring: aggregate numeric values; for text answers we use length weight
    const domainTotals = { perception:0, logic:0, creativity:0, emotion:0, meta:0 };
    let count = 0;

    Object.keys(answers).forEach(pi => {
      Object.keys(answers[pi]).forEach(qi => {
        const ans = answers[pi][qi];
        if (!ans) return;
        count++;
        // heuristic mapping
        if (ans.type === 'multiple_choice') {
          const v = Number(ans.value || 0);
          // map tags if present
          if (ans.meta === 'logic' || ans.meta === 'analysis') domainTotals.logic += v;
          else if (ans.meta === 'creative') domainTotals.creativity += v;
          else if (ans.meta === 'meta') domainTotals.meta += v;
          else if (ans.meta === 'emotion') domainTotals.emotion += v;
          else {
            // distribute
            domainTotals.perception += v * 0.4;
            domainTotals.logic += v * 0.3;
            domainTotals.creativity += v * 0.3;
          }
        } else if (ans.type === 'slider') {
          const v = Number(ans.value || 0);
          domainTotals.emotion += v * 0.2;
          domainTotals.perception += v * 0.2;
          domainTotals.creativity += v * 0.2;
          domainTotals.logic += v * 0.2;
          domainTotals.meta += v * 0.2;
        } else if (ans.type === 'text') {
          const len = (ans.raw || '').length;
          domainTotals.meta += len * 0.02;
          domainTotals.creativity += len * 0.01;
        }
      });
    });

    // normalize to 0-100 scale
    const maxEstimate = Math.max(1, count * 5);
    const normalized = {};
    Object.keys(domainTotals).forEach(k => {
      normalized[k] = Math.round(Math.min(100, (domainTotals[k] / maxEstimate) * 100));
    });

    // pick archetype simple mapping
    const archetype = pickArchetype(normalized);

    // build narrative
    const narrative = `
      <strong>Archetype:</strong> ${archetype.name} <br/>
      <strong>Summary:</strong> ${archetype.summary} <br/><br/>
      <strong>Scores</strong>: Perception ${normalized.perception}, Logic ${normalized.logic}, Creativity ${normalized.creativity}, Emotion ${normalized.emotion}, Meta ${normalized.meta} <br/><br/>
      <strong>Suggested gifts / careers</strong>: ${archetype.careers.join(', ')}
    `;
    document.getElementById('resultsBody').innerHTML = narrative;
    showResults();
  }

  // basic archetype picker
  function pickArchetype(scores) {
    // simple rule-based selection
    const { perception, logic, creativity, emotion, meta } = scores;
    if (meta >= 60 && logic >= 60) {
      return {
        id: 'reflective_architect',
        name: 'Reflective Architect',
        summary: 'High meta-awareness and logical structuring. You analyze systems and see patterns others miss.',
        careers: ['Systems Designer','Research Architect','Strategic Planner','Data Scientist','Product Architect']
      };
    }
    if (creativity >= 70 && emotion >= 60) {
      return {
        id: 'empathic_inventor',
        name: 'Empathic Inventor',
        summary: 'You combine empathy with invention — human-centered ideas that resonate and scale.',
        careers: ['Product Designer','Creative Director','UX Researcher','Social Innovator','Artist']
      };
    }
    if (creativity >= 80 && meta >= 60) {
      return {
        id: 'visionary_synthesist',
        name: 'Visionary Synthesist',
        summary: 'A cross-domain synthesizer: you form large-scale visions and unify diverse domains.',
        careers: ['Futurist','Chief Innovation Officer','R&D Lead','Inventor','Think Tank Director']
      };
    }
    if (logic >= 80) {
      return {
        id: 'grounded_operator',
        name: 'Grounded Operator',
        summary: 'Practical and execution-focused. You get systems running reliably and efficiently.',
        careers: ['Operations Manager','Project Manager','Logistics Director','Program Manager','Infrastructure Lead']
      };
    }
    // fallback balanced
    return {
      id: 'balanced_strategist',
      name: 'Balanced Strategist',
      summary: 'Even strengths across areas. Versatile, adaptive, and practical.',
      careers: ['Consultant','Entrepreneur','Strategy Lead','Program Director','Policy Consultant']
    };
  }

  // save / restore
  function saveToLocal() {
    try {
      const payload = {
        timestamp: Date.now(),
        currentPhaseIndex,
        currentQuestionIndexInPhase,
        answers,
        tier: tierSelect ? tierSelect.value : 'Explorer'
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      flashToast('Saved locally');
    } catch (e) {
      console.warn('Save failed', e);
    }
  }
  function restoreFromLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { flashToast('No saved session'); return false; }
      const payload = JSON.parse(raw);
      currentPhaseIndex = payload.currentPhaseIndex || 0;
      currentQuestionIndexInPhase = payload.currentQuestionIndexInPhase || 0;
      answers = payload.answers || {};
      if (payload.tier && tierSelect) tierSelect.value = payload.tier;
      renderCurrent();
      showTest();
      flashToast('Session restored');
      return true;
    } catch (e) {
      console.warn('Restore failed', e);
      flashToast('Restore error');
      return false;
    }
  }

  // minimal toast
  function flashToast(msg, ms = 1200) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.position = 'fixed';
    t.style.bottom = '22px';
    t.style.left = '50%';
    t.style.transform = 'translateX(-50%)';
    t.style.background = 'rgba(0,0,0,0.7)';
    t.style.padding = '8px 14px';
    t.style.borderRadius = '8px';
    t.style.color = '#fff';
    t.style.zIndex = '9999';
    document.body.appendChild(t);
    setTimeout(() => t.style.opacity = '0', ms - 200);
    setTimeout(() => t.remove(), ms);
  }

  // minimal ambience via WebAudio
  function startTone(freq) {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      stopTone();
      osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = Number(freq) || 432;
      gain.gain.value = 0.02; // very soft
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      // gentle fade-in
      gain.gain.linearRampToValueAtTime(0.02, audioCtx.currentTime + 0.3);
      // keep reference
      window._mcif_gain = gain;
    } catch (e) {
      console.warn('Audio start failed', e);
    }
  }
  function stopTone() {
    try {
      if (osc) {
        osc.stop();
        osc.disconnect();
        osc = null;
      }
      if (window._mcif_gain) {
        try { window._mcif_gain.disconnect(); } catch(e){}
        window._mcif_gain = null;
      }
    } catch (e) {}
  }

  // compute results and export
  function exportJSON() {
    const payload = { created: new Date().toISOString(), answers, meta: { schemaTitle: schema && schema.title } };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mcif_results.json'; a.click();
    URL.revokeObjectURL(url);
  }
  function exportTXT() {
    const lines = [];
    lines.push('MCIF Results');
    Object.keys(answers).forEach(pi => {
      lines.push(`Phase ${pi}:`);
      Object.keys(answers[pi]).forEach(qi => {
        const a = answers[pi][qi];
        lines.push(` Q${qi} (${a.type}): ${a.raw || a.value}`);
      });
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mcif_results.txt'; a.click();
    URL.revokeObjectURL(url);
  }

  // demo
  function startDemo() {
    inDemo = true;
    // demo uses first two questions
    currentPhaseIndex = 0; currentQuestionIndexInPhase = 0;
    renderCurrent();
    showTest();
    flashToast('Demo started');
  }

  // wiring
  beginBtn && beginBtn.addEventListener('click', (e) => {
    // resume audio context by user gesture
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
    // start with schema loaded
    currentPhaseIndex = 0; currentQuestionIndexInPhase = 0;
    renderCurrent();
    showTest();
    // if user wants ambient to start immediately
    if (frequencySelector && frequencySelector.value) {
      // not auto; start only because user clicked Begin
      startTone(frequencySelector.value);
    }
  });

  demoBtn && demoBtn.addEventListener('click', startDemo);
  tutorialBtn && tutorialBtn.addEventListener('click', () => {
    alert('Tutorial: This brief demo shows the flow. Use Next to proceed. You can save/restore anytime.');
  });

  nextBtn && nextBtn.addEventListener('click', goNext);
  prevBtn && prevBtn.addEventListener('click', goPrev);

  pauseBtn && pauseBtn.addEventListener('click', () => {
    // simple pause toggle: show intro screen as paused overlay
    if (testArea.classList.contains('show')) {
      testArea.style.display = 'none';
      introScreen.style.display = 'block';
      introScreen.classList.remove('hide'); introScreen.classList.add('show');
      flashToast('Paused');
    } else {
      showTest();
      flashToast('Resumed');
    }
  });

  saveBtn && saveBtn.addEventListener('click', saveToLocal);
  restoreBtn && restoreBtn.addEventListener('click', restoreFromLocal);
  exportJsonBtn && exportJsonBtn.addEventListener('click', exportJSON);
  exportTxtBtn && exportTxtBtn.addEventListener('click', exportTXT);
  restartBtn && restartBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    answers = {}; currentPhaseIndex = 0; currentQuestionIndexInPhase = 0;
    showIntro();
    flashToast('Session cleared');
  });

  // ambient controls
  playAmbience && playAmbience.addEventListener('click', () => {
    try {
      // ensure we start audio after user interaction
      startTone(frequencySelector.value);
      flashToast('Ambient started');
    } catch (e) {}
  });
  stopAmbience && stopAmbience.addEventListener('click', () => {
    stopTone(); flashToast('Ambient stopped');
  });

  // initialize app
  async function init() {
    await loadSchema();
    initPhases();
    // set default UI text
    phaseTitle.textContent = 'Welcome';
    phaseSub.textContent = 'Tap Begin to start the MCIF exploration.';
    // wire restore on load if available
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      // show restore affordance (already visible as button); optionally auto-restore prompt
    }
  }

  // kick off
  init();

  // expose a small API for debugging (optional)
  window.MCIF = window.MCIF || {};
  window.MCIF._internal = { phases, answers, renderCurrent, saveToLocal, restoreFromLocal };
})();
