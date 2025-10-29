// app.js — MCIF-5 Lucid Flow (Production)
// Loads MCIF_5_MasterSchema.json (or uses embedded fallback) and runs the whole test flow.
// Requires index.html to have: #start-btn, #frequency-control, #app
// Author: OmiSphere / Andrew Carr

document.addEventListener("DOMContentLoaded", () => {
  // DOM refs
  const startBtn = document.getElementById("start-btn");
  const freqControl = document.getElementById("frequency-control");
  const app = document.getElementById("app");

  // State
  let schema = null;
  let phaseIndex = 0;            // index into schema.phases
  let qIndex = 0;                // index into current phase.questions
  let phaseInProgress = false;
  let responses = {};            // { questionId: value }
  let selectedFrequency = null;
  let audioCtx = null;
  let oscillators = [];         // support layering if needed
  const maxTotalPoints = 700;   // for scaling composite

  // ---------- Utilities ----------
  function log(...args) { console.log("[MCIF]", ...args); }
  function safeText(s){ return String(s==null ? "" : s); }

  // Fade helper
  function fadeReplace(container, contentEl) {
    container.style.opacity = 0;
    setTimeout(() => {
      container.innerHTML = "";
      container.appendChild(contentEl);
      container.style.opacity = 1;
    }, 220);
  }

  // Numeric parse helper
  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  // Evaluate a condition string from schema (simple safe replacement)
  // It replaces tokens like p1_q1 with a JSON-safe representation of the response.
  // Supported ops: >, >=, <, <=, ==, ===, !=, !==, &&, ||, parentheses, numbers and string equality.
  function evaluateCondition(condStr) {
    if (!condStr || typeof condStr !== "string") return false;

    // Replace each token that looks like an identifier (letters, numbers, underscore) with its value
    // We will wrap string values in quotes, numeric values as-is, missing as null
    const tokenized = condStr.replace(/\b([a-zA-Z0-9_]+)\b/g, (match) => {
      // Avoid replacing boolean literals or operators
      if (["true","false","null","undefined","and","or"].includes(match)) return match;
      // If token is a number, allow it
      if (/^\d+(\.\d+)?$/.test(match)) return match;
      const val = responses[match];
      if (val === undefined) return "null";
      // number?
      const asNum = Number(val);
      if (!Number.isNaN(asNum)) return asNum;
      // otherwise escape string
      return JSON.stringify(String(val));
    });

    // Very small safety: only allow certain characters after token replacement
    // Permit digits, letters, quotes, whitespace and common operators
    if (!/^[0-9\s<>=!&|()"'\.\,\-+*\/%a-zA-Z:]*$/.test(tokenized)) {
      console.warn("Unsafe condition prevented:", condStr, "->", tokenized);
      return false;
    }

    try {
      // eslint-disable-next-line no-eval
      return !!eval(tokenized);
    } catch (err) {
      console.warn("Condition eval failed:", condStr, "->", tokenized, err);
      return false;
    }
  }

  // ---------- Audio / Frequency ----------
  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function startTone(freq, options = {}) {
    ensureAudio();
    // create oscillator + gain node
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = options.type || "sine";
    osc.frequency.value = freq;
    gain.gain.value = options.gain || 0.03;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    oscillators.push({ osc, gain, freq });
    return osc;
  }

  function stopAllTones() {
    oscillators.forEach(o => {
      try { o.osc.stop(); } catch(e) {}
      try { o.osc.disconnect(); } catch(e) {}
      try { o.gain.disconnect(); } catch(e) {}
    });
    oscillators = [];
  }

  // ---------- Schema loading ----------
  async function loadSchema() {
    const path = "MCIF_5_MasterSchema.json";
    try {
      const resp = await fetch(path);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const j = await resp.json();
      if (!j || !j.test || !Array.isArray(j.test.phases)) {
        throw new Error("Schema missing expected structure (test.phases)");
      }
      log("Loaded schema from file.");
      return j.test;
    } catch (err) {
      console.warn("Failed to load external schema:", err);
      log("Falling back to embedded full schema.");
      return embeddedSchema();
    }
  }

  // ---------- Embedded fallback schema (large, faithful to your vision) ----------
  function embeddedSchema() {
    // This is a compact but full implementation of the last schema you approved.
    // Contains phases: intro, frequency_select, orientation, phase_1..phase_5, results.
    return {
      title: "MCIF-5 (Embedded Fallback)",
      description: "Fallback embedded MCIF-5 schema.",
      theme: {
        color_scheme: "lucid-blue-gold",
        sound_frequencies: [432, 528, 852, 963]
      },
      phases: [
        {
          id: "intro",
          title: "Lucid Entry",
          content: "Welcome to MCIF-5. Breathe. Select a tone and proceed when ready.",
          action_label: "Begin Calibration"
        },
        {
          id: "frequency_select",
          title: "Frequency Calibration",
          type: "multiple_choice",
          options: [
            { label: "432 Hz", value: 432 },
            { label: "528 Hz", value: 528 },
            { label: "852 Hz", value: 852 },
            { label: "963 Hz", value: 963 }
          ],
          action_label: "Continue"
        },
        {
          id: "orientation",
          title: "Orientation",
          content: "This framework measures how you think — not what you know. Answer honestly and freely.",
          action_label: "Start Assessment"
        },
        {
          id: "phase_1",
          title: "Phase 1 — Thought Velocity (Perceptual Awareness)",
          questions: [
            { id: "p1_q1", type: "slider", question: "How quickly do your thoughts move compared to others?", min: 0, max: 10 },
            { id: "p1_q2", type: "text", question: "Describe what it feels like when you are 'in flow'." },
            { id: "p1_q3", type: "multiple_choice", question: "When your mind moves too fast, what happens?", options: ["I get tangled", "I internalize", "I write/sketch", "I feel fragmented"] }
          ]
        },
        {
          id: "phase_2",
          title: "Phase 2 — Pattern Synthesis (Cognitive Mechanics)",
          questions: [
            { id: "p2_q1", type: "multiple_choice", question: "What do you notice first with new data?", options: ["Hidden pattern", "Inconsistencies", "Meaning", "Connections"] },
            { id: "p2_q2", type: "slider", question: "Rate your ability to see connections between unrelated subjects.", min: 0, max: 10 },
            { id: "p2_q3", type: "text", question: "Describe a time you synthesized many ideas into one concept." }
          ]
        },
        {
          id: "phase_3",
          title: "Phase 3 — Emotive Logic (Emotive Intelligence)",
          questions: [
            { id: "p3_q1", type: "multiple_choice", question: "When emotion and logic conflict, which guides you?", options: ["Emotion", "Logic", "Balanced", "Depends"] },
            { id: "p3_q2", type: "slider", question: "How emotionally attuned are you to others while processing your own thoughts?", min: 0, max: 10 },
            { id: "p3_q3", type: "text", question: "What role does emotion play in your creativity or reasoning?" }
          ]
        },
        {
          id: "phase_4",
          title: "Phase 4 — Meta-Reflection (Meta-Cognitive Insight)",
          questions: [
            { id: "p4_q1", type: "slider", question: "How often do you observe your own thoughts from a third-person perspective?", min: 0, max: 10 },
            { id: "p4_q2", type: "text", question: "What does 'awareness of awareness' mean to you?" },
            { id: "p4_q3", type: "multiple_choice", question: "Do your thoughts appear as words, images, energy, or multi-layered?", options: ["Words","Images","Energy","Multi-layered"] }
          ]
        },
        {
          id: "phase_5",
          title: "Phase 5 — Integration & Creative Intelligence",
          questions: [
            { id: "p5_q1", type: "multiple_choice", question: "After reflection, how do you recover?", options: ["Solitude","Creative expression","Movement","Social connection"] },
            { id: "p5_q2", type: "slider", question: "How easily do you translate inner insights into action?", min: 0, max: 10 }
          ]
        },
        {
          id: "results",
          title: "Results & Synthesis",
          feedback_rules: [
            { condition: "p1_q1 > 8", feedback: "High thought velocity — practice grounding before output." },
            { condition: "p2_q2 > 8", feedback: "Systems-level thinker — your synthesis sees structure others miss." },
            { condition: "p3_q2 > 7 && p3_q1 == 'Balanced'", feedback: "You use emotive logic — strong integrative capacity." },
            { condition: "p4_q1 > 8", feedback: "You have advanced meta-awareness — reflection is a core tool." },
            { condition: "p5_q2 > 7", feedback: "High integration — insights flow into action readily." }
          ],
          summary: "This profile is an embedded fallback summary. For full assessment use the canonical schema file."
        }
      ]
    };
  }

  // ---------- Rendering ----------
  function renderIntro(phase) {
    const el = document.createElement("div");
    el.className = "phase-card lucid-glow";
    const h = document.createElement("h2"); h.textContent = phase.title;
    const p = document.createElement("p"); p.textContent = phase.content || "";
    const btn = document.createElement("button"); btn.className = "start-btn"; btn.textContent = phase.action_label || "Continue";
    btn.onclick = () => advancePhase();
    el.appendChild(h); el.appendChild(p); el.appendChild(btn);
    fadeReplace(app, el);
  }

  function renderFrequencySelect(phase) {
    const el = document.createElement("div"); el.className = "phase-card lucid-glow";
    el.innerHTML = `<h2>${phase.title}</h2><p>${phase.content || ""}</p>`;
    const wrap = document.createElement("div");
    wrap.className = "freq-options";
    const options = phase.options || (schema.theme && schema.theme.sound_frequencies ? schema.theme.sound_frequencies.map(v=>({label:v+" Hz", value:v})) : []);
    options.forEach(opt => {
      const b = document.createElement("button");
      b.className = "freq-btn";
      b.textContent = opt.label || String(opt.value);
      b.onclick = () => {
        selectedFrequency = opt.value;
        stopAllTones();
        startTone(opt.value, { gain: 0.03 });
        // Visual feedback
        wrap.querySelectorAll("button").forEach(btn => btn.classList.remove("selected"));
        b.classList.add("selected");
      };
      wrap.appendChild(b);
    });
    const cont = document.createElement("div");
    const next = document.createElement("button");
    next.className = "next-phase-btn";
    next.textContent = phase.action_label || "Next";
    next.onclick = () => advancePhase();
    cont.appendChild(next);
    el.appendChild(wrap);
    el.appendChild(cont);
    fadeReplace(app, el);
  }

  function renderOrientation(phase) {
    renderIntro(phase); // identical behavior
  }

  // Render a phase that contains questions (sequential within phase)
  function renderPhaseWithQuestions(phase) {
    phaseInProgress = true;
    qIndex = 0;
    renderQuestionInPhase(phase);
  }

  function renderQuestionInPhase(phase) {
    const questions = phase.questions || [];
    if (qIndex >= questions.length) {
      // Phase complete -> show a short reflection / continue button
      phaseInProgress = false;
      renderPhaseSummary(phase);
      return;
    }

    const q = questions[qIndex];
    const el = document.createElement("div"); el.className = "phase-card lucid-glow";
    const h = document.createElement("h3"); h.textContent = phase.title;
    const qh = document.createElement("h4"); qh.textContent = q.question || "";
    el.appendChild(h); el.appendChild(qh);

    // Input area
    let inputArea = document.createElement("div"); inputArea.className = "input-area";

    if (q.type === "text") {
      const ta = document.createElement("textarea");
      ta.id = "input-text";
      ta.placeholder = "Write your response (detailed responses yield richer feedback)...";
      ta.value = responses[q.id] || "";
      inputArea.appendChild(ta);
    } else if (q.type === "slider") {
      const min = q.min != null ? q.min : 0;
      const max = q.max != null ? q.max : 10;
      const range = document.createElement("input");
      range.type = "range";
      range.min = min; range.max = max; range.value = responses[q.id] != null ? responses[q.id] : Math.round((min+max)/2);
      range.id = "input-range";
      const label = document.createElement("div"); label.className = "range-label"; label.textContent = `Value: ${range.value}`;
      range.oninput = () => label.textContent = `Value: ${range.value}`;
      inputArea.appendChild(range);
      inputArea.appendChild(label);
    } else if (q.type === "multiple_choice") {
      const optsWrap = document.createElement("div"); optsWrap.className = "mc-wrap";
      (q.options || []).forEach(opt => {
        const b = document.createElement("button");
        b.className = "option-btn";
        b.textContent = opt;
        b.onclick = () => {
          responses[q.id] = opt;
          // quick visual click, then next
          b.classList.add("selected");
          setTimeout(() => {
            qIndex++;
            renderQuestionInPhase(phase);
          }, 180);
        };
        optsWrap.appendChild(b);
      });
      inputArea.appendChild(optsWrap);
    } else {
      // unknown type: fallback to text
      const ta = document.createElement("textarea");
      ta.id = "input-text";
      inputArea.appendChild(ta);
    }

    // Next button for text/slider (multiple_choice advances on selection)
    if (q.type === "text" || q.type === "slider") {
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      const nextBtn = document.createElement("button");
      nextBtn.className = "next-btn";
      nextBtn.textContent = "Next";
      nextBtn.onclick = () => {
        // Validate / save
        if (q.type === "text") {
          const ta = document.getElementById("input-text");
          const val = safeText(ta.value).trim();
          if (val.length < 8) {
            // nudge user to expand for better feedback
            if (!confirm("Your answer is short — submit anyway? Longer answers give better feedback.")) return;
          }
          responses[q.id] = val;
        } else if (q.type === "slider") {
          const range = document.getElementById("input-range");
          const val = Number(range.value);
          responses[q.id] = val;
        }
        // next
        qIndex++;
        renderQuestionInPhase(phase);
      };
      btnRow.appendChild(nextBtn);
      inputArea.appendChild(btnRow);
    }

    el.appendChild(inputArea);
    fadeReplace(app, el);
  }

  function renderPhaseSummary(phase) {
    // short feedback (if schema contains something optionally)
    const el = document.createElement("div"); el.className = "phase-card lucid-glow";
    const h = document.createElement("h3"); h.textContent = `${phase.title} — Reflection`;
    el.appendChild(h);

    // show quick metrics for this phase (avg numeric score of sliders within phase)
    const sliders = (phase.questions || []).filter(q => q.type === "slider");
    if (sliders.length) {
      let sum = 0, count = 0;
      sliders.forEach(s => { const v = num(responses[s.id]); if (v != null) { sum += v; count++; }});
      const avg = count ? (sum / count) : null;
      const p = document.createElement("p");
      p.textContent = avg != null ? `Phase average (slider): ${avg.toFixed(2)}` : "Phase has no numeric sliders answered yet.";
      el.appendChild(p);
    }

    // a "continue" button
    const cont = document.createElement("button");
    cont.className = "next-phase-btn";
    cont.textContent = "Continue";
    cont.onclick = () => advancePhase();
    el.appendChild(cont);

    fadeReplace(app, el);
  }

  // ---------- Phase advancement ----------
  function advancePhase() {
    phaseIndex++;
    qIndex = 0;
    if (!schema || !schema.phases) {
      app.innerHTML = `<div class="phase-card lucid-glow"><h3>Error: No phases in schema.</h3></div>`;
      return;
    }
    if (phaseIndex >= schema.phases.length) {
      // Reached end -> show final results
      showResults();
      return;
    }
    const nextPhase = schema.phases[phaseIndex];
    dispatchPhase(nextPhase);
  }

  // ---------- Phase dispatcher ----------
  function dispatchPhase(phase) {
    if (!phase) return showResults();
    // handle types by phase id or explicit fields
    // common ids: intro, frequency_select, orientation, phase_1..phase_5, results
    if (phase.id === "intro") return renderIntro(phase);
    if (phase.id === "frequency_select") return renderFrequencySelect(phase);
    if (phase.id === "orientation") return renderOrientation(phase);
    if (phase.questions && Array.isArray(phase.questions)) return renderPhaseWithQuestions(phase);
    if (phase.id === "results") return showResults(); // if encountered early
    // fallback: render as information card
    const el = document.createElement("div"); el.className = "phase-card lucid-glow";
    el.innerHTML = `<h2>${phase.title || "Phase"}</h2><p>${phase.content || ""}</p><button class="next-phase-btn">Continue</button>`;
    el.querySelector(".next-phase-btn").onclick = () => advancePhase();
    fadeReplace(app, el);
  }

  // ---------- Results / Feedback ----------
  function computeComposite() {
    // Compute a composite score from numeric answers:
    // We'll sum all numeric slider-style answers (0-10) scaled, plus text lengths scaled,
    // then normalize to maxTotalPoints (700).
    let numericSum = 0;
    let countNums = 0;
    let textLen = 0;
    let countText = 0;

    Object.keys(responses).forEach(k => {
      const v = responses[k];
      if (v == null) return;
      const n = Number(v);
      if (!Number.isNaN(n)) {
        numericSum += n;
        countNums++;
      } else if (typeof v === "string") {
        const l = v.trim().length;
        textLen += l;
        countText++;
      }
    });

    // Basic heuristics:
    // - sliders often 0-10: aggregate numericSum
    // - text contributions normalized: textLen / 10
    const textScoreEquivalent = Math.min(300, textLen / 1.5); // cap contribution
    const base = (numericSum * 10) + textScoreEquivalent; // numeric scaled x10

    // Scale result into 0..maxTotalPoints roughly
    // Determine possible maximum: assume sliders count (~10 sliders * 10 *10=1000) but we'll normalize
    const scaled = Math.max(0, Math.min(maxTotalPoints, Math.round(base)));
    return scaled;
  }

  function evaluateFeedbackRules() {
    // Find results phase in schema
    const resultsPhase = schema.phases.find(p => p.id === "results");
    if (!resultsPhase || !Array.isArray(resultsPhase.feedback_rules)) return [];
    const feedback = [];
    for (const rule of resultsPhase.feedback_rules) {
      try {
        if (evaluateCondition(rule.condition)) feedback.push(rule.feedback);
      } catch (e) {
        console.warn("Rule evaluation error", rule, e);
      }
    }
    return feedback;
  }

  function matchArchetype(totalScore) {
    // Basic archetype heuristic using numeric responses in key questions.
    // This is a simple rule-based mapping (improvable).
    const archetypes = [
      { name: "Reflective Architect", condition: () => (num(responses["p4_q1"]) || 0) > 6 && (num(responses["p2_q2"]) || 0) > 6 },
      { name: "Empathic Inventor", condition: () => (num(responses["p3_q2"]) || 0) > 6 && (responses["p5_q1"] && String(responses["p5_q1"]).toLowerCase().includes("creative")) },
      { name: "Visionary Synthesist", condition: () => (num(responses["p2_q2"]) || 0) > 7 && (num(responses["p5_q2"]) || 0) > 6 },
      { name: "Grounded Operator", condition: () => (num(responses["p2_q2"]) || 0) > 6 && (num(responses["p4_q1"]) || 0) < 5 },
      { name: "Dreaming Idealist", condition: () => (num(responses["p3_q2"]) || 0) > 7 && (num(responses["p2_q2"]) || 0) < 5 },
      { name: "Balanced Strategist", condition: () => true } // fallback
    ];
    for (const a of archetypes) if (a.condition()) return a.name;
    return "Balanced Strategist";
  }

  function showResults() {
    stopAllTones();
    // Compute composite and tier
    const total = computeComposite();
    const tier = (total <= 350) ? "Explorer" : (total <= 525) ? "Architect" : "Visionary";
    const feedbackList = evaluateFeedbackRules();
    const archetype = matchArchetype(total);

    // Build result UI
    const el = document.createElement("div"); el.className = "phase-card lucid-glow result-card";
    const h = document.createElement("h2"); h.textContent = "MCIF-5 — Full Assessment";
    el.appendChild(h);

    const p1 = document.createElement("p");
    p1.innerHTML = `<strong>Composite Score:</strong> ${total} / ${maxTotalPoints} &nbsp; <strong>Tier:</strong> ${tier}`;
    el.appendChild(p1);

    const p2 = document.createElement("p");
    p2.innerHTML = `<strong>Archetype:</strong> ${archetype}`;
    el.appendChild(p2);

    // Feedback list
    const fbh = document.createElement("h3"); fbh.textContent = "Phase Feedback";
    el.appendChild(fbh);
    if (feedbackList.length) {
      const ul = document.createElement("ul");
      feedbackList.forEach(f => {
        const li = document.createElement("li"); li.textContent = f;
        ul.appendChild(li);
      });
      el.appendChild(ul);
    } else {
      const none = document.createElement("p"); none.textContent = (schema.phases.find(p=>p.id==='results') && schema.phases.find(p=>p.id==='results').summary) || "No specific feedback generated.";
      el.appendChild(none);
    }

    // Show user responses (collapsible)
    const respBtn = document.createElement("button"); respBtn.className = "toggle-resp-btn"; respBtn.textContent = "Show Responses";
    const respDiv = document.createElement("div"); respDiv.className = "responses"; respDiv.style.display = "none";
    respBtn.onclick = () => {
      respDiv.style.display = respDiv.style.display === "none" ? "block" : "none";
      respBtn.textContent = respDiv.style.display === "none" ? "Show Responses" : "Hide Responses";
    };
    el.appendChild(respBtn);

    // populate responses
    const dl = document.createElement("dl");
    Object.keys(responses).forEach(k => {
      const dt = document.createElement("dt"); dt.textContent = k;
      const dd = document.createElement("dd"); dd.textContent = safeText(responses[k]);
      dl.appendChild(dt); dl.appendChild(dd);
    });
    respDiv.appendChild(dl);
    el.appendChild(respDiv);

    // Restart & export
    const btnRow = document.createElement("div"); btnRow.className = "btn-row";
    const restart = document.createElement("button"); restart.className = "restart-btn"; restart.textContent = "Restart";
    restart.onclick = () => {
      // reset
      responses = {}; phaseIndex = 0; qIndex = 0; phaseInProgress = false;
      dispatchPhase(schema.phases[phaseIndex]);
    };
    const exportBtn = document.createElement("button"); exportBtn.className = "export-btn"; exportBtn.textContent = "Export JSON";
    exportBtn.onclick = () => {
      const out = { meta: { title: schema.title || "MCIF-5 Result" }, responses, score: total, tier, archetype, feedback: feedbackList };
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "mcif_results.json"; a.click();
      URL.revokeObjectURL(url);
    };
    btnRow.appendChild(restart); btnRow.appendChild(exportBtn);
    el.appendChild(btnRow);

    fadeReplace(app, el);

    // Optionally show a simple radar if Chart.js is available — build axes from slider averages per phase
    setTimeout(() => {
      if (window.Chart && schema) {
        // Build radar axes: map each phase to a numeric average from its sliders
        const labels = [];
        const data = [];
        schema.phases.forEach(p => {
          if (!p.questions) return;
          const sliders = p.questions.filter(q => q.type === "slider");
          if (!sliders.length) return;
          let sum=0, cnt=0;
          sliders.forEach(s => { const v = num(responses[s.id]); if (v!=null) { sum+=v; cnt++; } });
          if (cnt) {
            labels.push(p.title);
            data.push(Math.round((sum/cnt) * 10)); // scale 0-100
          }
        });
        if (labels.length) {
          const canvas = document.createElement("canvas"); canvas.id = "mcifRadar"; canvas.style.maxWidth="420px"; canvas.style.marginTop="18px";
          el.appendChild(canvas);
          new Chart(canvas.getContext("2d"), {
            type: "radar",
            data: {
              labels,
              datasets: [{ label: 'Phase averages', data, fill: true, backgroundColor: 'rgba(58,134,255,0.18)', borderColor: '#3A86FF' }]
            },
            options: { scales: { r: { suggestedMin: 0, suggestedMax: 100 } } }
          });
        }
      }
    }, 300);
  }

  // ---------- Start flow ----------
  async function start() {
    // load schema
    schema = await loadSchema();
    if (!schema) {
      app.innerHTML = `<div class="phase-card lucid-glow"><h3>Error loading schema</h3></div>`;
      return;
    }
    // initialize index
    phaseIndex = 0; qIndex = 0; responses = {}; phaseInProgress = false;
    // dispatch first phase
    const first = schema.phases[phaseIndex];
    dispatchPhase(first);
  }

  // ---------- Wire start button and init freq UI ----------
  (function initControls(){
    // build frequency UI top if schema theme defines sound frequencies, else default
    const freqs = (schema && schema.theme && schema.theme.sound_frequencies) || [432,528,852,963];
    // create buttons only after DOM loaded
    // but we will populate also when start called from frequency select phase
    // attach startBtn handler
    if (!startBtn) {
      console.error("Start button (#start-btn) missing in HTML");
      return;
    }
    startBtn.onclick = async () => {
      startBtn.disabled = true;
      await start();
    };

    // also create top-level quick frequency controls (non-invasive)
    freqControl.innerHTML = "";
    freqs.forEach(f => {
      const b = document.createElement("button"); b.className = "freq-btn"; b.textContent = `${f} Hz`;
      b.onclick = () => {
        // toggle: if same frequency already playing, stop; else start
        if (oscillators.some(o=>o.freq === f)) { stopAllTones(); return; }
        stopAllTones();
        startTone(f, { gain: 0.02 });
        b.classList.add("selected");
        setTimeout(()=>b.classList.remove("selected"), 500);
      };
      freqControl.appendChild(b);
    });
    const stopb = document.createElement("button"); stopb.className = "freq-stop"; stopb.textContent = "Stop";
    stopb.onclick = stopAllTones;
    freqControl.appendChild(stopb);
  })();

  // End of script
});



