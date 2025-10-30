/****************************************************
 * MCIF Cognitive Test Engine - Lucid Flow Edition
 * Version: 5.0
 * Integrated with: MCIF_5_MasterSchema.json
 * --------------------------------------------------
 * Features:
 * - Fixed "Begin" button logic
 * - Smooth Lucid UI transitions
 * - Cognitive Flow Meter
 * - Progress Reflection Tracker
 * - Frequency-Synced Background Controls
 ****************************************************/

document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");
  const beginBtn = document.getElementById("begin-btn");
  const frequencySelector = document.getElementById("frequency-selector");
  const audioPlayer = document.getElementById("audio-player");

  let schema = null;
  let currentPhase = 0;
  let currentQuestion = 0;
  let userResponses = [];
  let currentFrequency = 432;

  // ✅ Surprise UI Features
  const lucidBackground = document.createElement("div");
  lucidBackground.classList.add("lucid-background");
  app.appendChild(lucidBackground);

  const progressMeter = document.createElement("div");
  progressMeter.classList.add("progress-meter");
  app.appendChild(progressMeter);

  const flowMeter = document.createElement("div");
  flowMeter.classList.add("flow-meter");
  app.appendChild(flowMeter);

  // Lucid animation
  function startLucidAnimation() {
    lucidBackground.classList.add("active");
  }

  function stopLucidAnimation() {
    lucidBackground.classList.remove("active");
  }

  // 🧠 Load Schema
  async function loadSchema() {
    try {
      const res = await fetch("MCIF_5_MasterSchema.json");
      if (!res.ok) throw new Error(`Failed to load schema: ${res.status}`);
      schema = await res.json();
      console.log("Schema loaded successfully.");
    } catch (err) {
      console.error(err);
      alert("Error loading test schema. Please ensure MCIF_5_MasterSchema.json is in the same folder.");
    }
  }

  // 🎶 Frequency Audio Handling
  function playFrequency(frequency) {
    if (audioPlayer) {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      const gainNode = context.createGain();
      gainNode.gain.value = 0.03; // soft background
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 2); // smooth pulse
    }
  }

  frequencySelector.addEventListener("change", (e) => {
    currentFrequency = parseInt(e.target.value);
    playFrequency(currentFrequency);
  });

  // ✨ Start Test
  async function beginTest() {
    await loadSchema();
    if (!schema || !schema.phases || schema.phases.length === 0) {
      alert("Schema missing or invalid phases.");
      return;
    }

    beginBtn.style.display = "none";
    startLucidAnimation();
    renderPhase();
  }

  beginBtn.addEventListener("click", beginTest);

  // 🧩 Render Phase
  function renderPhase() {
    const phase = schema.phases[currentPhase];
    if (!phase) {
      renderResults();
      return;
    }

    app.innerHTML = `
      <div class="phase-container fade-in">
        <h2>${phase.title}</h2>
        <p class="phase-description">${phase.description}</p>
        <div id="question-container"></div>
      </div>
    `;

    currentQuestion = 0;
    renderQuestion();
  }

  // 🧭 Render Question
  function renderQuestion() {
    const phase = schema.phases[currentPhase];
    const question = phase.questions[currentQuestion];
    const container = document.getElementById("question-container");

    if (!question) {
      currentPhase++;
      renderPhase();
      return;
    }

    progressMeter.innerHTML = `Phase ${currentPhase + 1}/${schema.phases.length} — Question ${currentQuestion + 1}/${phase.questions.length}`;

    let inputElement = "";
    switch (question.type) {
      case "multiple_choice":
        inputElement = question.options
          .map(opt => `<button class="option-btn" data-value="${opt}">${opt}</button>`)
          .join("");
        break;
      case "slider":
        inputElement = `
          <input type="range" min="${question.min}" max="${question.max}" value="${(question.min + question.max) / 2}" class="slider" id="slider-${question.id}">
          <label for="slider-${question.id}" class="slider-label">${(question.min + question.max) / 2}</label>
        `;
        break;
      case "text":
      default:
        inputElement = `<textarea id="response-${question.id}" placeholder="Type your response here..." rows="4"></textarea>`;
    }

    container.innerHTML = `
      <div class="question-card">
        <h3>${question.prompt}</h3>
        <div class="input-container">${inputElement}</div>
        <button id="next-btn" class="lucid-btn">Next</button>
      </div>
    `;

    // 🎚️ Slider feedback
    const slider = container.querySelector(".slider");
    if (slider) {
      const label = container.querySelector(".slider-label");
      slider.addEventListener("input", () => (label.textContent = slider.value));
    }

    // 💬 Multiple choice logic
    const optionButtons = container.querySelectorAll(".option-btn");
    optionButtons.forEach(btn =>
      btn.addEventListener("click", (e) => {
        const value = e.target.getAttribute("data-value");
        recordResponse(question.id, value);
      })
    );

    document.getElementById("next-btn").addEventListener("click", () => {
      let value = "";
      if (slider) value = slider.value;
      else {
        const textarea = document.getElementById(`response-${question.id}`);
        value = textarea ? textarea.value.trim() : "";
      }
      if (value === "") {
        alert("Please enter a response before proceeding.");
        return;
      }
      recordResponse(question.id, value);
    });
  }

  // 🧾 Record Response
  function recordResponse(questionId, value) {
    userResponses.push({
      phase: currentPhase,
      questionId,
      value,
      timestamp: new Date().toISOString()
    });
    currentQuestion++;
    updateFlowMeter();
    renderQuestion();
  }

  // 🌊 Flow Meter
  function updateFlowMeter() {
    const totalQuestions = schema.phases.reduce((sum, p) => sum + p.questions.length, 0);
    const progress = (userResponses.length / totalQuestions) * 100;
    flowMeter.style.width = `${progress}%`;
  }

  // 🧩 Render Results
  function renderResults() {
    stopLucidAnimation();
    const metaScore = calculateMetaScore();
    app.innerHTML = `
      <div class="results-container fade-in">
        <h2>Your Cognitive Profile</h2>
        <p class="meta-score">Meta Score: <strong>${metaScore}</strong></p>
        <div id="insight-list">${generateInsights(metaScore)}</div>
        <button class="lucid-btn" onclick="window.location.reload()">Restart Test</button>
      </div>
    `;
  }

  // 🧠 Meta Score Logic
  function calculateMetaScore() {
    let score = 0;
    userResponses.forEach(r => {
      const val = parseFloat(r.value);
      if (!isNaN(val)) score += val;
    });
    return Math.round(score / (userResponses.length || 1));
  }

  // 🌟 Generate Insights
  function generateInsights(metaScore) {
    const archetypes = [
      "Visionary", "Architect", "Empath", "Innovator", "Guardian",
      "Explorer", "Seeker", "Catalyst", "Healer", "Strategist"
    ];
    const archetype = archetypes[metaScore % archetypes.length];
    return `
      <h3>Primary Archetype: ${archetype}</h3>
      <p>Your responses suggest a ${archetype}-type mind — uniquely capable of merging abstract and practical reasoning. You display resilience, creative synthesis, and distinct intuitive logic.</p>
      <ul>
        <li>Core Strength: ${metaScore > 75 ? "High Synthesis Ability" : "Reflective Insight"}</li>
        <li>Growth Edge: ${metaScore < 50 ? "Develop Consistency and Focus" : "Channel Energy into Structure"}</li>
        <li>Suggested Pathways: Cognitive Strategy, Innovation Labs, Mentorship, Design Thinking</li>
      </ul>
    `;
  }
});
