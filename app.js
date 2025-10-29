// app.js — MCIF-5 Lucid Flow (Final Production)
// Author: OmiSphere / Andrew Carr
// Requirements: index.html must provide #start-btn, #frequency-control, #app, and style.css
// Optional: Chart.js for radar visualization

(function () {
  "use strict";

  // ---------- Utility helpers ----------
  const log = (...args) => console.log("[MCIF]", ...args);
  const warn = (...args) => console.warn("[MCIF]", ...args);
  const err = (...args) => console.error("[MCIF]", ...args);
  const safeText = (v) => (v == null ? "" : String(v));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const isObject = (x) => x && typeof x === "object" && !Array.isArray(x);

  // ---------- DOM refs will be assigned after DOMContentLoaded ----------
  let startBtn, freqControl, app, schema;
  let phaseIndex = 0, qIndex = 0, responses = {}, oscillators = [], audioCtx = null;

  // ---------- Configurable ----------
  const SCHEMA_FILENAME = "MCIF_5_MasterSchema.json";
  const MAX_COMPOSITE = 700;
  const DISTRESS_KEYWORDS = ["suicide", "kill myself", "end my life", "self-harm", "hurt myself"];

  // ---------- Safety: restricted-eval for feedback rule evaluation ----------
  // We replace tokens like p1_q1 with JSON-safe values (numbers or quoted strings), then allow only safe characters.
  function evaluateCondition(condStr, responsesMap) {
    if (!condStr || typeof condStr !== "string") return false;
    // Token replacement: identifiers are letters, numbers, underscore
    const tokenRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    const replaced = condStr.replace(tokenRegex, (token) => {
      // allow JS operators/keywords through
      const lower = token.toLowerCase();
      if (["and","or","true","false","null"].includes(lower)) return lower;
      if (/^(if|then|else|for|while|return|function)$/.test(lower)) return 'null';
      // numeric literal?
      if (/^\d+(\.\d+)?$/.test(token)) return token;
      // map to response value
      const v = responsesMap && Object.prototype.hasOwnProperty.call(responsesMap, token) ? responsesMap[token] : undefined;
      if (v === undefined || v === null) return "null";
      // numeric?
      const num = Number(v);
      if (!Number.isNaN(num)) return String(num);
      // otherwise JSON-escape string
      return JSON.stringify(String(v));
    });
    // Safety whitelist of characters
    if (!/^[0-9\s<>=!&|()"'.,:+\-*\/%a-zA-Z\[\]]*$/.test(replaced)) {
      warn("Condition contains unsafe characters after replacement:", condStr, "->", replaced);
      return false;
    }
    try {
      // eslint-disable-next-line no-eval
      return !!eval(replaced);
    } catch (e) {
      warn("Condition eval error:", condStr, replaced, e);
      return false;
    }
  }

  // ---------- Audio utilities ----------
  function ensureAudioCtx() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      warn("AudioContext not available:", e);
      audioCtx = null;
    }
  }

  function startTone(freq, opts = {}) {
    try {
      ensureAudioCtx();
      if (!audioCtx) return null;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = opts.type || "sine";
      osc.frequency.value = freq;
      gain.gain.value = typeof opts.gain === "number" ? opts.gain : 0.03;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      const obj = { osc, gain, freq };
      oscillators.push(obj);
      return obj;
    } catch (e) {
      warn("startTone failed:", e);
      return null;
    }
  }

  function stopAllTones() {
    try {
      oscillators.forEach(o => {
        try { o.osc.stop(); } catch (e) {}
        try { o.osc.disconnect(); } catch (e) {}
        try { o.gain.disconnect(); } catch (e) {}
      });
      oscillators = [];
    } catch (e) {
      warn("stopAllTones error:", e);
    }
  }

  // ---------- Schema loader with embedded fallback ----------
  async function loadSchema() {
    try {
      const res = await fetch(SCHEMA_FILENAME, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json || !json.test || !Array.isArray(json.test.phases)) {
        throw new Error("Schema missing test.phases");
      }
      log("Loaded schema from file.");
      return json.test;
    } catch (e) {
      warn("Failed loading schema file, using embedded fallback. Error:", e);
      return embeddedSchema();
    }
  }

  // ---------- Embedded fallback (full version, similar to the provided schema) ----------
  function embeddedSchema() {
    // For brevity here reuse a condensed version; it includes same phase IDs and feedback rules expected.
    // This fallback ensures the app always runs even without external JSON.
    return {
      title: "MCIF-5 Embedded Fallback",
      description: "Embedded fallback schema.",
      theme: { sound_frequencies: [432, 528, 852, 963] },
      phases: [
        { id: "intro", title: "Lucid Entry", type: "info", content: "Welcome to MCIF-5. Breathe. Click continue.", ui:{ actionLabel:"Begin" } },
        { id: "frequency_select", title: "Frequency Calibration", type: "multiple_choice",
          options: [{id:"f432",label:"432 Hz",value:432},{id:"f528",label:"528 Hz",value:528},{id:"f852",label:"852 Hz",value:852},{id:"f963",label:"963 Hz",value:963}],
          ui:{ allowMultiSelect:true, actionLabel:"Continue" } },
        { id: "orientation", title: "Orientation", type: "info", content: "Orientation text...", ui:{ actionLabel:"Start" } },
        {
          id: "phase_1", title: "Phase 1 — Perceptual Awareness", type: "question_block",
          questions:[
            { id:"p1_q1", type:"text", prompt:"Choose an object... describe in detail.", ui:{minChars:120} },
            { id:"p1_q2", type:"multiple_choice", prompt:"Which fits your focus?", options:["I notice texture","Color/Light","Function","Symbolic"] },
            { id:"p1_q3", type:"slider", prompt:"Rate vividness (0-10)", min:0, max:10 }
          ]
        },
        {
          id: "phase_2", title: "Phase 2 — Cognitive Mechanics", type:"question_block",
          questions:[
            { id:"p2_q1", type:"text", prompt:"Design a sustainable process to fix missed deadlines.", ui:{minChars:160} },
            { id:"p2_q2", type:"slider", prompt:"Rate system modeling (0-10)", min:0, max:10 },
            { id:"p2_q3", type:"multiple_choice", prompt:"When diagnosing a process you...", options:["Trace","Ask stakeholders","Prototype","Rebuild"] }
          ]
        },
        {
          id: "phase_3", title: "Phase 3 — Emotive Intelligence", type:"question_block",
          questions:[
            { id:"p3_q1", type:"text", prompt:"Why does scrolling soothe you before a speech? (trace causal chain)", ui:{minChars:120} },
            { id:"p3_q2", type:"multiple_choice", prompt:"Your go-to stress strategy:", options:["Distraction","Social","Breathing","Journaling"] },
            { id:"p3_q3", type:"slider", prompt:"Turn emotion into insight (0-10)", min:0, max:10 }
          ]
        },
        {
          id: "phase_4", title: "Phase 4 — Meta-Reflection", type:"question_block",
          questions:[
            { id:"p4_q1", type:"slider", prompt:"Observe your thoughts 3rd-person (0-10)", min:0, max:10 },
            { id:"p4_q2", type:"text", prompt:"What blocks conversion from insight to action? (describe steps)", ui:{minChars:140} },
            { id:"p4_q3", type:"multiple_choice", prompt:"Thoughts appear as:", options:["Words","Images","Somatic","Layered"] }
          ]
        },
        {
          id: "phase_5", title: "Phase 5 — Creative Integration", type:"question_block",
          questions:[
            { id:"p5_q1", type:"text", prompt:"Invent a new intelligence metric. How would it work?", ui:{minChars:200} },
            { id:"p5_q2", type:"slider", prompt:"Translate insight into action (0-10)", min:0, max:10 }
          ]
        },
        {
          id: "phase_6", title: "Phase 6 — Philosophical Depth", type:"question_block",
          questions:[
            { id:"p6_q1", type:"text", prompt:"Is human potential fixed or expanding? Defend & counter-argue.", ui:{minChars:160} },
            { id:"p6_q2", type:"slider", prompt:"Worldview coherence (0-10)", min:0, max:10 }
          ]
        },
        {
          id: "results", title: "Results & Feedback", type:"results",
          feedback_rules:[
            { id:"r1", condition:"p1_q3 > 8", feedback:"High vividness detected — consider grounding before output." },
            { id:"r2", condition:"p2_q2 > 8", feedback:"Systems thinker — mapping tools recommended." },
            { id:"r3", condition:"p4_q1 > 8", feedback:"Strong meta-awareness — convert to experiment design." },
            { id:"r4", condition:"p5_q2 > 7", feedback:"High integration — sprint to prototype." }
          ],
          summary:"Embedded fallback summary. For full assessment, supply the official MCIF_5_MasterSchema.json."
        }
      ]
    };
  }

  // ---------- Rendering helpers ----------
  function fadeReplace(container, newEl) {
    try {
      container.style.transition = "opacity 180ms ease";
      container.style.opacity = 0;
      setTimeout(() => {
        container.innerHTML = "";
        container.appendChild(newEl);
        container.style.opacity = 1;
      }, 200);
    } catch (e) {
      container.innerHTML = "";
      container.appendChild(newEl);
    }
  }

  function createPhaseCard(title, contentHtml) {
    const root = document.createElement("div");
    root.className = "phase-card lucid-glow";
    const h = document.createElement("h2"); h.textContent = title;
    root.appendChild(h);
    if (contentHtml) {
      const div = document.createElement("div");
      if (typeof contentHtml === "string") div.innerHTML = `<p>${contentHtml}</p>`;
      else div.appendChild(contentHtml);
      root.appendChild(div);
    }
    return root;
  }

  // ---------- Phase renderers ----------
  function renderIntro(phase) {
    const card = createPhaseCard(phase.title, phase.content || "");
    const btn = document.createElement("button"); btn.className = "start-btn"; btn.textContent = (phase.ui && phase.ui.actionLabel) || "Continue";
    btn.onclick = () => advancePhase();
    card.appendChild(btn);
    fadeReplace(app, card);
  }

  function renderFrequencySelect(phase) {
    const card = createPhaseCard(phase.title, phase.content || "");
    const wrap = document.createElement("div"); wrap.className = "freq-wrap";
    const opts = (phase.options && phase.options.length) ? phase.options : (schema.theme && schema.theme.sound_frequencies || []).map(v => ({id: `f${v}`, label: `${v} Hz`, value: v}));
    opts.forEach(opt => {
      const b = document.createElement("button"); b.className = "freq-btn"; b.textContent = opt.label || String(opt.value);
      b.onclick = () => {
        // layering allowed: toggle presence
        const existing = oscillators.some(o => o.freq === opt.value);
        if (existing) {
          // stop that freq
          oscillators = oscillators.filter(o => {
            if (o.freq === opt.value) {
              try { o.osc.stop(); } catch (e) {}
              try { o.osc.disconnect(); } catch (e) {}
              try { o.gain.disconnect(); } catch (e) {}
              return false;
            }
            return true;
          });
          b.classList.remove("selected");
        } else {
          startTone(opt.value, { gain: 0.02 });
          b.classList.add("selected");
        }
      };
      wrap.appendChild(b);
    });
    const cont = document.createElement("div");
    const next = document.createElement("button"); next.className = "next-phase-btn"; next.textContent = (phase.ui && phase.ui.actionLabel) || "Continue";
    next.onclick = () => advancePhase();
    cont.appendChild(next);
    card.appendChild(wrap); card.appendChild(cont);
    fadeReplace(app, card);
  }

  function renderInfo(phase) {
    const card = createPhaseCard(phase.title, phase.content || "");
    const btn = document.createElement("button"); btn.className = "next-phase-btn"; btn.textContent = (phase.ui && phase.ui.actionLabel) || "Continue";
    btn.onclick = () => advancePhase();
    card.appendChild(btn);
    fadeReplace(app, card);
  }

  function renderQuestionBlock(phase) {
    // start at question 0 within phase
    qIndex = 0;
    renderQuestionInPhase(phase);
  }

  function renderQuestionInPhase(phase) {
    const questions = Array.isArray(phase.questions) ? phase.questions : [];
    if (qIndex >= questions.length) {
      // show phase summary & optionally quick feedback
      renderPhaseSummary(phase);
      return;
    }
    const q = questions[qIndex];
    const card = createPhaseCard(phase.title, "");
    const qh = document.createElement("h4"); qh.textContent = q.prompt || q.question || "";
    card.appendChild(qh);

    const inputArea = document.createElement("div"); inputArea.className = "input-area";

    if (q.type === "text") {
      const ta = document.createElement("textarea"); ta.id = `resp_${q.id}`;
      ta.placeholder = (q.ui && q.ui.placeholder) || "Write a thoughtful answer...";
      if (responses[q.id]) ta.value = responses[q.id];
      inputArea.appendChild(ta);
    } else if (q.type === "slider") {
      const min = Number.isFinite(q.min) ? q.min : 0;
      const max = Number.isFinite(q.max) ? q.max : 10;
      const range = document.createElement("input"); range.type = "range"; range.min = min; range.max = max; range.value = (responses[q.id] != null ? responses[q.id] : Math.round((min + max) / 2)); range.id = `resp_${q.id}`;
      const label = document.createElement("div"); label.className = "range-label"; label.textContent = `Value: ${range.value}`;
      range.oninput = () => label.textContent = `Value: ${range.value}`;
      inputArea.appendChild(range); inputArea.appendChild(label);
    } else if (q.type === "multiple_choice") {
      const opts = q.options || [];
      const optsWrap = document.createElement("div"); optsWrap.className = "mc-wrap";
      opts.forEach(optRaw => {
        // options may be strings or objects
        const label = typeof optRaw === "string" ? optRaw : (optRaw.label || optRaw.text || String(optRaw));
        const btn = document.createElement("button"); btn.className = "option-btn"; btn.textContent = label;
        btn.onclick = () => {
          responses[q.id] = (typeof optRaw === "string") ? optRaw : (optRaw.value || optRaw.label || optRaw.text || label);
          // small visual nudge
          btn.classList.add("selected");
          setTimeout(() => {
            qIndex++;
            renderQuestionInPhase(phase);
          }, 160);
        };
        optsWrap.appendChild(btn);
      });
      inputArea.appendChild(optsWrap);
    } else {
      // unknown: default to textarea
      const ta = document.createElement("textarea"); ta.id = `resp_${q.id}`;
      inputArea.appendChild(ta);
    }

    // Next button for text & slider
    if (q.type === "text" || q.type === "slider") {
      const btn = document.createElement("button"); btn.className = "next-btn"; btn.textContent = "Next";
      btn.onclick = () => {
        // save response
        if (q.type === "text") {
          const ta = document.getElementById(`resp_${q.id}`);
          const val = safeText(ta && ta.value).trim();
          if ((q.ui && Number.isFinite(q.ui.minChars) && val.length < q.ui.minChars) && !confirm("Your answer is short. Submit anyway?")) return;
          responses[q.id] = val;
          // distress check
          detectDistress(val);
        } else if (q.type === "slider") {
          const range = document.getElementById(`resp_${q.id}`);
          responses[q.id] = Number(range.value);
        }
        qIndex++;
        renderQuestionInPhase(phase);
      };
      inputArea.appendChild(btn);
    }

    card.appendChild(inputArea);
    fadeReplace(app, card);
  }

  function renderPhaseSummary(phase) {
    const card = createPhaseCard(`${phase.title} — Reflection`, "");
    // quick numeric summary for sliders in the phase
    const sliders = (phase.questions || []).filter(q => q.type === "slider");
    if (sliders.length) {
      let total = 0, count = 0;
      sliders.forEach(s => { const v = responses[s.id]; if (v != null && !isNaN(Number(v))) { total += Number(v); count++; }});
      const avg = count ? (total / count) : null;
      const p = document.createElement("p"); p.textContent = avg != null ? `Phase numeric average: ${avg.toFixed(2)}` : "No numeric inputs answered.";
      card.appendChild(p);
    } else {
      const p = document.createElement("p"); p.textContent = "Phase complete. Continue when ready.";
      card.appendChild(p);
    }
    const cont = document.createElement("button"); cont.className = "next-phase-btn"; cont.textContent = "Continue"; cont.onclick = () => advancePhase();
    card.appendChild(cont);
    fadeReplace(app, card);
  }

  // ---------- Distress detection ----------
  function detectDistress(text) {
    if (!text || typeof text !== "string") return;
    const t = text.toLowerCase();
    for (const kw of DISTRESS_KEYWORDS) {
      if (t.includes(kw)) {
        showSafetyResources();
        return true;
      }
    }
    return false;
  }

  function showSafetyResources() {
    stopAllTones();
    const card = createPhaseCard("Safety Notice", "Your response included language that may indicate distress. If you are in immediate danger, please call local emergency services. If you're in the U.S., call or text 988 for the Suicide & Crisis Lifeline. Consider pausing the test and seeking professional support.");
    const cont = document.createElement("button"); cont.textContent = "Continue Test (I am safe)"; cont.onclick = () => fadeReplace(app, card);
    card.appendChild(cont);
    fadeReplace(app, card);
  }

  // ---------- Phase control ----------
  function dispatchPhase(phase) {
    if (!phase) return showResults();
    try {
      if (phase.id === "intro") return renderIntro(phase);
      if (phase.id === "frequency_select") return renderFrequencySelect(phase);
      if (phase.id === "orientation") return renderInfo(phase);
      if (phase.type === "question_block") return renderQuestionBlock(phase);
      if (phase.type === "info") return renderInfo(phase);
      if (phase.type === "multiple_choice" && phase.options) return renderFrequencySelect(phase);
      // fallback info
      const card = createPhaseCard(phase.title || "Phase", phase.content || "");
      const btn = document.createElement("button"); btn.textContent = (phase.ui && phase.ui.actionLabel) || "Continue";
      btn.onclick = () => advancePhase();
      card.appendChild(btn);
      fadeReplace(app, card);
    } catch (e) {
      err("dispatchPhase error:", e);
      const card = createPhaseCard("Error", "An unexpected error occurred while rendering the phase. Please restart the test.");
      fadeReplace(app, card);
    }
  }

  function advancePhase() {
    phaseIndex++;
    qIndex = 0;
    if (!schema || !Array.isArray(schema.phases)) {
      err("Schema missing phases. Aborting.");
      app.innerHTML = "<div class='phase-card lucid-glow'><h3>Error: Test schema missing phases.</h3></div>";
      return;
    }
    if (phaseIndex >= schema.phases.length) return showResults();
    const next = schema.phases[phaseIndex];
    dispatchPhase(next);
  }

  // ---------- Scoring heuristics ----------
  function computeCompositeScore() {
    // Build axis scores (0-100) per metrics.axes using mapping rules and scoring heuristics.
    const axes = (schema.metrics && schema.metrics.axes) || ["Perception","Logic_and_Reasoning","Creativity","Emotional_Regulation","Adaptability","Meta_Awareness","Philosophical_Depth"];
    const axisScores = {};
    // Simple heuristic: for each axis, average relevant slider values from mapped phases, plus text contributions
    const phaseMap = (schema.scoring && schema.scoring.phaseToAxisMapping) || {
      phase_1: "Perception",
      phase_2: "Logic_and_Reasoning",
      phase_3: "Emotional_Regulation",
      phase_4: "Meta_Awareness",
      phase_5: "Creativity",
      phase_6: "Philosophical_Depth"
    };

    // initialize
    axes.forEach(a => axisScores[a] = { total: 0, weightSum: 0 });

    // For each phase in schema, compute a phase score (0-100)
    (schema.phases || []).forEach(p => {
      if (!p || !p.id) return;
      // only question blocks contribute
      if (!Array.isArray(p.questions)) return;
      // sliders avg
      let sliderSum = 0, sliderCount = 0;
      let textLengthSum = 0, textCount = 0;
      let optionScoreSum = 0, optionCount = 0;
      p.questions.forEach(q => {
        const v = responses[q.id];
        if (q.type === "slider") {
          if (v != null && !isNaN(Number(v))) { sliderSum += Number(v); sliderCount++; }
        } else if (q.type === "text") {
          if (v && typeof v === "string") { textLengthSum += v.trim().length; textCount++; }
        } else if (q.type === "multiple_choice") {
          // if options include explicit score mapping, find matching option and use score; else treat as neutral
          const opts = q.options || [];
          const chosen = v;
          if (chosen != null) {
            // try to find score in options (if options are objects)
            let scoreFound = null;
            for (const o of opts) {
              if (typeof o === "string" && o === chosen) { scoreFound = null; break; }
              if (isObject(o) && (o.label === chosen || o.value === chosen || o.text === chosen)) { scoreFound = Number.isFinite(o.score) ? o.score : (o.value && typeof o.value === "number" ? o.value : null); break; }
            }
            if (scoreFound != null) { optionScoreSum += scoreFound; optionCount++; }
          }
        }
      });

      // Normalize contributions:
      // slider scale often 0..10 — convert to 0..100 by *10
      const sliderAvg = sliderCount ? (sliderSum / sliderCount) * 10 : null;
      // text heuristic: length scaling
      const textScore = textCount ? Math.min((textLengthSum / (textCount || 1)) * (schema.scoring && schema.scoring.textHeuristics && schema.scoring.textHeuristics.lengthScalingFactor || 0.6), (schema.scoring && schema.scoring.textHeuristics && schema.scoring.textHeuristics.maxTextContribution) || 300) : null;
      // option score average (if present) scale to 0..100 if options used 0..100
      const optionAvg = optionCount ? (optionScoreSum / optionCount) : null;

      // heuristic phase score:
      let phaseScore = 0;
      let contribs = 0;
      if (sliderAvg != null) { phaseScore += sliderAvg; contribs++; }
      if (optionAvg != null) { phaseScore += optionAvg; contribs++; }
      if (textScore != null) {
        // map textScore (raw) into 0..100 by dividing by maxTextContribution * 100
        const maxText = (schema.scoring && schema.scoring.textHeuristics && schema.scoring.textHeuristics.maxTextContribution) || 300;
        const mapped = clamp((textScore / maxText) * 100, 0, 100);
        phaseScore += mapped; contribs++;
      }

      if (contribs === 0) phaseScore = 50; else phaseScore = phaseScore / contribs;
      // map phase id to axis
      const axisKey = phaseMap[p.id] || null;
      if (axisKey) {
        axisScores[axisKey].total += phaseScore;
        axisScores[axisKey].weightSum += 1;
      }
    });

    // finalize axis scores 0..100
    const finalAxisScores = {};
    Object.keys(axisScores).forEach(k => {
      const rec = axisScores[k];
      finalAxisScores[k] = rec.weightSum ? clamp(Math.round(rec.total / rec.weightSum), 0, 100) : 50;
    });

    // composite: weighted sum per schema.metrics.weights scaled to MAX_COMPOSITE
    const weights = (schema.metrics && schema.metrics.weights) || {
      Perception: 0.15, Logic_and_Reasoning: 0.15, Creativity: 0.15, Emotional_Regulation: 0.15, Adaptability: 0.10, Meta_Awareness: 0.15, Philosophical_Depth: 0.15
    };
    let composite = 0;
    let weightSum = 0;
    Object.keys(finalAxisScores).forEach(axis => {
      const w = weights[axis] != null ? weights[axis] : 0;
      composite += finalAxisScores[axis] * w;
      weightSum += w;
    });
    // normalize to 0..MAX_COMPOSITE (axis scores 0..100)
    if (weightSum > 0) composite = (composite / weightSum) * (MAX_COMPOSITE / 100);
    composite = Math.round(clamp(composite, 0, MAX_COMPOSITE));
    return { axisScores: finalAxisScores, compositeScore: composite };
  }

  // ---------- Archetype matching ----------
  // Uses euclidean + cosine similarity combined (alpha = 0.5) as per vision
  function matchArchetypeFromPrototypes(axisScores) {
    const prototypes = (schema.archetypes || []).map(a => ({ id: a.id, name: a.name, vector: a.prototype_vector || {} }));
    if (!prototypes.length) return { id: "balanced_strategist", name: "Balanced Strategist" };
    // Build axis list consistent with axisScores keys
    const axes = Object.keys(axisScores);
    // Build vectors
    const userVec = axes.map(a => Number(axisScores[a] || 0));
    const results = prototypes.map(p => {
      const protoVec = axes.map(a => Number(p.vector && p.vector[a] != null ? p.vector[a] : 75));
      // euclidean
      let euclid = 0;
      for (let i = 0; i < axes.length; i++) euclid += Math.pow(userVec[i] - protoVec[i], 2);
      euclid = Math.sqrt(euclid);
      // cosine similarity
      const dot = userVec.reduce((s, v, i) => s + v * protoVec[i], 0);
      const magA = Math.sqrt(userVec.reduce((s, v) => s + v * v, 0));
      const magB = Math.sqrt(protoVec.reduce((s, v) => s + v * v, 0));
      const cosine = (magA && magB) ? (dot / (magA * magB)) : 0;
      // combine: normalize euclid (smaller better) to similarity-like measure
      const maxEuclid = Math.sqrt(axes.length * Math.pow(100, 2));
      const euclidScore = 1 - (euclid / maxEuclid); // 0..1
      // alpha combine
      const alpha = (schema.prototypeMatching && typeof schema.prototypeMatching.euclideanWeight === "number") ? schema.prototypeMatching.euclideanWeight : 0.5;
      const combined = (alpha * euclidScore) + ((1 - alpha) * cosine);
      return { id: p.id, name: p.name, combined, protoVec };
    });
    // softmax to confidences
    const temp = (schema.prototypeMatching && typeof schema.prototypeMatching.softmaxTemperature === "number") ? schema.prototypeMatching.softmaxTemperature : 0.7;
    const exps = results.map(r => Math.exp(r.combined / temp));
    const sumExps = exps.reduce((s, v) => s + v, 0) || 1;
    const confidences = results.map((r, i) => ({ id: r.id, name: r.name, score: r.combined, confidence: exps[i] / sumExps }));
    confidences.sort((a, b) => b.confidence - a.confidence);
    // if top two similar within threshold, return blend
    const top = confidences[0];
    const second = confidences[1];
    const threshold = (schema.prototypeMatching && typeof schema.prototypeMatching.mixtureThreshold === "number") ? schema.prototypeMatching.mixtureThreshold : 0.15;
    if (second && (top.confidence - second.confidence) < threshold) {
      return { name: `${top.name} / ${second.name}`, confidences: confidences.slice(0, 2) };
    }
    return { name: top.name, confidences: [top] };
  }

  // ---------- Feedback rules evaluation ----------
  function evaluateFeedbackRules() {
    const resultsPhase = (schema.phases || []).find(p => p.id === "results");
    if (!resultsPhase || !Array.isArray(resultsPhase.feedback_rules)) return [];
    const out = [];
    for (const rule of resultsPhase.feedback_rules) {
      try {
        if (evaluateCondition(rule.condition, responses)) out.push(rule.feedback);
      } catch (e) {
        warn("Feedback rule error:", rule, e);
      }
    }
    return out;
  }

  // ---------- Results UI ----------
  function showResultsUI() {
    try {
      stopAllTones();
      const { axisScores, compositeScore } = computeCompositeScore();
      const archetypeMatch = matchArchetypeFromPrototypes(axisScores);
      const feedback = evaluateFeedbackRules();
      const tier = (compositeScore <= (schema.tierThresholds && schema.tierThresholds.Explorer ? schema.tierThresholds.Explorer[1] : 350)) ? "Explorer" : (compositeScore <= (schema.tierThresholds && schema.tierThresholds.Architect ? schema.tierThresholds.Architect[1] : 525)) ? "Architect" : "Visionary";

      // Build elements
      const root = document.createElement("div"); root.className = "phase-card lucid-glow result-card";
      const h = document.createElement("h2"); h.textContent = "MCIF-5 — Full Assessment";
      root.appendChild(h);

      const meta = document.createElement("p"); meta.innerHTML = `<strong>Composite Score:</strong> ${compositeScore} / ${MAX_COMPOSITE} &nbsp; <strong>Tier:</strong> ${tier}`;
      root.appendChild(meta);

      const arch = document.createElement("p"); arch.innerHTML = `<strong>Archetype:</strong> ${archetypeMatch.name}`;
      root.appendChild(arch);

      // Axis table
      const table = document.createElement("table"); table.className = "axis-table";
      const thead = document.createElement("thead"); thead.innerHTML = "<tr><th>Axis</th><th>Score (0-100)</th></tr>";
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      Object.keys(axisScores).forEach(axis => {
        const tr = document.createElement("tr");
        const tdA = document.createElement("td"); tdA.textContent = axis.replace(/_/g, " ");
        const tdB = document.createElement("td"); tdB.textContent = String(axisScores[axis]);
        tr.appendChild(tdA); tr.appendChild(tdB); tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      root.appendChild(table);

      // Feedback list
      const ftitle = document.createElement("h3"); ftitle.textContent = "Feedback";
      root.appendChild(ftitle);
      if (feedback.length) {
        const ul = document.createElement("ul");
        feedback.forEach(f => { const li = document.createElement("li"); li.textContent = f; ul.appendChild(li); });
        root.appendChild(ul);
      } else {
        const p = document.createElement("p"); p.textContent = (schema.phases.find(p=>p.id==='results') && schema.phases.find(p=>p.id==='results').summary) || "No specific feedback generated.";
        root.appendChild(p);
      }

      // Responses collapse
      const respBtn = document.createElement("button"); respBtn.className = "toggle-resp-btn"; respBtn.textContent = "Show Responses";
      const respDiv = document.createElement("div"); respDiv.className = "responses"; respDiv.style.display = "none";
      respBtn.onclick = () => {
        respDiv.style.display = respDiv.style.display === "none" ? "block" : "none";
        respBtn.textContent = respDiv.style.display === "none" ? "Show Responses" : "Hide Responses";
      };
      root.appendChild(respBtn);
      const dl = document.createElement("dl");
      Object.keys(responses).forEach(k => {
        const dt = document.createElement("dt"); dt.textContent = k;
        const dd = document.createElement("dd"); dd.textContent = safeText(responses[k]);
        dl.appendChild(dt); dl.appendChild(dd);
      });
      respDiv.appendChild(dl);
      root.appendChild(respDiv);

      // Export & restart
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      const restart = document.createElement("button"); restart.className = "restart-btn"; restart.textContent = "Restart";
      restart.onclick = () => {
        responses = {}; phaseIndex = 0; qIndex = 0; dispatchPhase(schema.phases[phaseIndex]);
      };
      const exportBtn = document.createElement("button"); exportBtn.className = "export-btn"; exportBtn.textContent = "Export JSON";
      exportBtn.onclick = () => {
        const out = { meta:{title: schema.title||"MCIF-5 Result"}, responses, axisScores, compositeScore, tier, archetypeMatch, feedback };
        const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "mcif_results.json"; a.click();
        setTimeout(()=>URL.revokeObjectURL(url), 5000);
      };
      btnRow.appendChild(restart); btnRow.appendChild(exportBtn);
      root.appendChild(btnRow);

      fadeReplace(app, root);

      // Radar chart if Chart.js loaded
      setTimeout(() => {
        if (window.Chart) {
          try {
            const labels = Object.keys(axisScores).map(k => k.replace(/_/g, " "));
            const data = Object.keys(axisScores).map(k => axisScores[k]);
            const canvas = document.createElement("canvas"); canvas.id = "mcifRadar"; canvas.style.maxWidth = "480px"; canvas.style.marginTop = "18px";
            root.appendChild(canvas);
            new Chart(canvas.getContext("2d"), {
              type: "radar",
              data: { labels, datasets: [{ label: 'Axis profile', data, backgroundColor: 'rgba(10,120,255,0.15)', borderColor: '#0A78FF' }] },
              options: { scales: { r: { suggestedMin: 0, suggestedMax: 100 } } }
            });
          } catch (e) { warn("Chart render failed:", e); }
        }
      }, 240);
      // auto-save to local
      try {
        if (schema.ui && schema.ui.autoSaveLocal) {
          localStorage.setItem((schema.safety && schema.safety.dataRetention && schema.safety.dataRetention.localStorageKey) || "MCIF_5_RESULTS", JSON.stringify({ timestamp: Date.now(), responses, axisScores, compositeScore, tier, archetypeMatch, feedback }));
        }
      } catch (e) { warn("localStorage save failed:", e); }

    } catch (e) {
      err("showResultsUI error:", e);
      app.innerHTML = "<div class='phase-card lucid-glow'><h3>Error generating results. See console.</h3></div>";
    }
  }

  // ---------- Begin sequence ----------
  async function startSequence() {
    try {
      schema = await loadSchema();
      if (!schema || !Array.isArray(schema.phases) || schema.phases.length === 0) {
        app.innerHTML = "<div class='phase-card lucid-glow'><h3>Schema invalid or empty.</h3></div>";
        return;
      }
      // init indices
      phaseIndex = 0; qIndex = 0; responses = {};
      dispatchPhase(schema.phases[phaseIndex]);
    } catch (e) {
      err("startSequence error:", e);
      app.innerHTML = "<div class='phase-card lucid-glow'><h3>Fatal error starting test. See console.</h3></div>";
    }
  }

  // ---------- dispatchPhase wrapper ----------
  function dispatchPhase(phase) {
    if (!phase) return showResultsUI();
    // ensure app exists
    try {
      if (phase.id === "intro") return renderIntro(phase);
      if (phase.id === "frequency_select") return renderFrequencySelect(phase);
      if (phase.id === "orientation") return renderInfo(phase);
      if (phase.type === "question_block") return renderQuestionBlock(phase);
      if (phase.type === "results") return showResultsUI();
      // otherwise fallback
      const card = createPhaseCard(phase.title || "Phase", phase.content || "");
      const btn = document.createElement("button"); btn.textContent = (phase.ui && phase.ui.actionLabel) || "Continue";
      btn.onclick = () => advancePhase();
      card.appendChild(btn);
      fadeReplace(app, card);
    } catch (e) {
      err("dispatchPhase fatal:", e);
      app.innerHTML = "<div class='phase-card lucid-glow'><h3>Rendering error. Check console.</h3></div>";
    }
  }

  // ---------- Initializer: wire up DOM and start button ----------
  document.addEventListener("DOMContentLoaded", () => {
    // assign DOM refs
    startBtn = document.getElementById("start-btn");
    freqControl = document.getElementById("frequency-control");
    app = document.getElementById("app");

    if (!app) {
      err("#app element missing. Please include <div id='app'></div> in your index.html");
      return;
    }
    if (!startBtn) {
      err("#start-btn missing. Please include a button with id='start-btn' that the user clicks to begin.");
      // auto-start if start button missing to avoid dead UI
      (async () => { await startSequence(); })();
      return;
    }
    // populate small quick frequency UI (non-blocking)
    try {
      freqControl && (freqControl.innerHTML = "");
      const freqs = (schema && schema.theme && schema.theme.sound_frequencies) || [432, 528, 852, 963];
      if (freqControl) {
        freqs.forEach(f => {
          const b = document.createElement("button"); b.className = "freq-btn"; b.textContent = `${f} Hz`;
          b.onclick = () => {
            // toggle layer
            const exists = oscillators.some(o => o.freq === f);
            if (exists) {
              // stop that one
              oscillators = oscillators.filter(o => {
                if (o.freq === f) {
                  try { o.osc.stop(); } catch (e) {}
                  try { o.osc.disconnect(); } catch (e) {}
                  try { o.gain.disconnect(); } catch (e) {}
                  return false;
                }
                return true;
              });
            } else {
              startTone(f, { gain: 0.02 });
            }
          };
          freqControl.appendChild(b);
        });
        const stop = document.createElement("button"); stop.className = "freq-stop"; stop.textContent = "Stop";
        stop.onclick = stopAllTones;
        freqControl.appendChild(stop);
      }
    } catch (e) { warn("freqControl init problem:", e); }

    startBtn.onclick = async function () {
      try {
        startBtn.disabled = true;
        startBtn.textContent = "Loading...";
        await startSequence();
      } catch (e) {
        err("Start button handler error:", e);
        startBtn.disabled = false;
        startBtn.textContent = "Begin";
      }
    };
  });

  // Expose small API for debugging
  window.MCIF = {
    computeCompositeScore,
    evaluateCondition,
    getResponses: () => responses,
    loadSchema // for manual trigger in console
  };
})();



