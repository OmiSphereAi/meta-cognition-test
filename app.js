/* ==========================================================
   MCIF 5.0 “Mind Core” — app.js
   ==========================================================
   Core engine for Meta-Cognitive Intelligence Framework
   Seamlessly integrated with index.html + style.css + schema
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const startBtn = document.getElementById("startBtn");
  const nextBtn = document.getElementById("nextBtn");
  const restartBtn = document.getElementById("restartBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const intro = document.getElementById("intro");
  const testSection = document.getElementById("test-section");
  const resultsSection = document.getElementById("results-section");
  const phaseTitle = document.getElementById("phase-title");
  const phasePrompt = document.getElementById("phase-prompt");
  const response = document.getElementById("response");
  const scoreSummary = document.getElementById("score-summary");
  const archetypeSummary = document.getElementById("archetype-summary");
  const careerSummary = document.getElementById("career-summary");

  /* -------------------------------------------
     Surprise Feature #1: Mind Mirror Display
  -------------------------------------------- */
  const mindMirror = document.createElement("div");
  mindMirror.id = "mind-mirror";
  mindMirror.className = "fade-in hidden";
  document.body.appendChild(mindMirror);

  /* -------------------------------------------
     Surprise Feature #2: Progress Spiral
  -------------------------------------------- */
  const spiralCanvas = document.createElement("canvas");
  spiralCanvas.id = "progress-spiral";
  spiralCanvas.width = 400;
  spiralCanvas.height = 400;
  document.body.appendChild(spiralCanvas);
  const ctx = spiralCanvas.getContext("2d");
  let spiralProgress = 0;

  /* -------------------------------------------
     Surprise Feature #3: Light/Dark Sync
  -------------------------------------------- */
  const hour = new Date().getHours();
  if (hour >= 19 || hour < 7) document.body.classList.add("dark-mode");

  /* -------------------------------------------
     Schema Integration
  -------------------------------------------- */
  const phases = [
    {
      id: 1,
      title: "Phase 1 — Perceptual Awareness",
      prompt: "Choose an everyday object and describe it as if seen for the first time.",
      weights: { detail: 0.5, emotion: 0.25, concept: 0.25 },
    },
    {
      id: 2,
      title: "Phase 2 — Cognitive Mechanics",
      prompt: "A team keeps missing deadlines. Without saying 'work harder,' design a sustainable solution.",
      weights: { logic: 0.4, systems: 0.3, creativity: 0.3 },
    },
    {
      id: 3,
      title: "Phase 3 — Emotive Intelligence",
      prompt: "You feel anxious before a speech and start scrolling your phone. Why does that soothe you?",
      weights: { identification: 0.3, causality: 0.4, compassion: 0.3 },
    },
    {
      id: 4,
      title: "Phase 4 — Meta-Cognitive Insight",
      prompt: "You understand your patterns but rarely act on them. What blocks that conversion?",
      weights: { awareness: 0.4, diagnosis: 0.4, clarity: 0.2 },
    },
    {
      id: 5,
      title: "Phase 5 — Creative Intelligence",
      prompt: "Invent a new kind of intelligence test more accurate than IQ and explain it.",
      weights: { novelty: 0.4, coherence: 0.3, integration: 0.3 },
    },
    {
      id: 6,
      title: "Phase 6 — Philosophical Depth",
      prompt: "Is human potential fixed or ever-expanding? Justify your reasoning.",
      weights: { depth: 0.4, consistency: 0.3, clarity: 0.3 },
    },
  ];

  const archetypes = [
    { name: "Reflective Architect", traits: ["Analytical", "Disciplined", "Pattern-Oriented"], gifts: ["Strategic planning", "Deep analysis"], careers: ["Engineer", "Researcher", "Analyst", "Architect", "Programmer"] },
    { name: "Empathic Inventor", traits: ["Imaginative", "Emotionally attuned", "Expressive"], gifts: ["Artistic synthesis", "Creative empathy"], careers: ["Therapist", "Writer", "Artist", "Educator", "Counselor"] },
    { name: "Visionary Synthesist", traits: ["Abstract thinker", "Innovative", "Holistic"], gifts: ["Connecting systems", "Predictive insight"], careers: ["Philosopher", "Scientist", "Entrepreneur", "Inventor", "Strategist"] },
    { name: "Grounded Operator", traits: ["Practical", "Organized", "Reliable"], gifts: ["Execution", "System management"], careers: ["Manager", "Engineer", "Technician", "Administrator", "Producer"] },
    { name: "Dreaming Idealist", traits: ["Emotional", "Reflective", "Ideal-driven"], gifts: ["Vision", "Empathy"], careers: ["Musician", "Poet", "Teacher", "Healer", "Counselor"] },
    { name: "Balanced Strategist", traits: ["Adaptive", "Calm", "Objective"], gifts: ["Harmony", "Balanced thinking"], careers: ["Mediator", "Project lead", "Consultant", "Coach", "Diplomat"] },
    { name: "Quantum Analyst", traits: ["Logical", "Non-linear thinker", "Curious"], gifts: ["Pattern decoding", "Insight through complexity"], careers: ["Data scientist", "Systems architect", "AI researcher", "Cryptographer", "Engineer"] },
    { name: "Symbolic Creator", traits: ["Visionary", "Metaphorical", "Imaginative"], gifts: ["Language synthesis", "Symbolic insight"], careers: ["Author", "Director", "Designer", "Philosopher", "Brand creator"] },
    { name: "Empirical Dreamer", traits: ["Scientific yet intuitive"], gifts: ["Bridging logic & intuition"], careers: ["Scientist", "Inventor", "Educator", "Psychologist", "Neuroscientist"] },
    { name: "Meta-Navigator", traits: ["Reflective", "Aware", "Transformative"], gifts: ["Teaching awareness", "Integrating wisdom"], careers: ["Teacher", "Coach", "Philosopher", "Leader", "Theologian"] }
  ];

  /* -------------------------------------------
     State Management
  -------------------------------------------- */
  let currentPhase = 0;
  let responses = [];
  let scores = [];

  /* -------------------------------------------
     Helper: Mind Mirror Update
  -------------------------------------------- */
  function updateMindMirror(text) {
    mindMirror.classList.remove("hidden");
    const words = text.split(" ").length;
    if (words < 20) mindMirror.textContent = "🌀 Reflect more deeply...";
    else if (words < 60) mindMirror.textContent = "✨ Balanced awareness forming...";
    else mindMirror.textContent = "🌌 Excellent flow — consciousness expanding.";
  }

  /* -------------------------------------------
     Helper: Spiral Progress
  -------------------------------------------- */
  function drawSpiral(progress) {
    ctx.clearRect(0, 0, 400, 400);
    ctx.beginPath();
    const turns = 4;
    for (let t = 0; t < progress * Math.PI * turns; t += 0.1) {
      const r = 20 + t * 5;
      const x = 200 + r * Math.cos(t);
      const y = 200 + r * Math.sin(t);
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `hsl(${progress * 360}, 80%, 50%)`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  /* -------------------------------------------
     Phase Logic
  -------------------------------------------- */
  function showPhase() {
    const phase = phases[currentPhase];
    phaseTitle.textContent = phase.title;
    phasePrompt.textContent = phase.prompt;
    response.value = "";
    updateMindMirror("");
    drawSpiral(currentPhase / phases.length);
  }

  function calculateScore(answer, weights) {
    const lengthFactor = Math.min(answer.split(" ").length / 50, 1);
    const coherenceFactor = /because|therefore|however|so|if/i.test(answer) ? 1 : 0.5;
    const creativityFactor = /imagine|new|create|invent|vision/i.test(answer) ? 1 : 0.5;
    const base = 100 * (0.5 * lengthFactor + 0.25 * coherenceFactor + 0.25 * creativityFactor);
    return Math.round(base * (weights.detail || weights.logic || 1));
  }

  function calculateFinalScores() {
    const total = scores.reduce((a, b) => a + b, 0);
    const avg = total / phases.length;
    const tier = avg < 350 ? "Explorer" : avg < 525 ? "Architect" : "Visionary";
    const archetype = archetypes[Math.floor((avg / 700) * archetypes.length)];
    const metaScore = Math.round((avg / 700) * 100);

    return { total, avg, tier, archetype, metaScore };
  }

  /* -------------------------------------------
     UI Event Flow
  -------------------------------------------- */
  startBtn.addEventListener("click", () => {
    intro.classList.add("hidden");
    testSection.classList.remove("hidden");
    currentPhase = 0;
    showPhase();
  });

  nextBtn.addEventListener("click", () => {
    const answer = response.value.trim();
    if (!answer) return alert("Please share your reflection before continuing.");
    responses.push(answer);
    const score = calculateScore(answer, phases[currentPhase].weights);
    scores.push(score);
    updateMindMirror(answer);

    if (currentPhase < phases.length - 1) {
      currentPhase++;
      setTimeout(showPhase, 600);
    } else {
      testSection.classList.add("hidden");
      renderResults();
    }
  });

  restartBtn.addEventListener("click", () => location.reload());

  /* -------------------------------------------
     Results Rendering
  -------------------------------------------- */
  function renderResults() {
    const { total, avg, tier, archetype, metaScore } = calculateFinalScores();

    resultsSection.classList.remove("hidden");
    scoreSummary.innerHTML = `
      <h3>Total Score: ${total} / 700</h3>
      <p>Meta-Score: ${metaScore}% | Tier: ${tier}</p>
    `;
    archetypeSummary.innerHTML = `
      <h3>Archetype: ${archetype.name}</h3>
      <p><strong>Traits:</strong> ${archetype.traits.join(", ")}</p>
      <p><strong>Special Gifts:</strong> ${archetype.gifts.join(", ")}</p>
    `;
    careerSummary.innerHTML = `
      <h3>Potential Career Paths</h3>
      <ul>${archetype.careers.map(c => `<li>${c}</li>`).join("")}</ul>
    `;
  }

  /* -------------------------------------------
     PDF Export
  -------------------------------------------- */
  downloadBtn.addEventListener("click", () => {
    const docContent = `
      MCIF 5.0 "Mind Core" Results
      =============================
      Total Score: ${scores.reduce((a, b) => a + b, 0)} / 700
      Archetype: ${calculateFinalScores().archetype.name}
      Meta-Score: ${calculateFinalScores().metaScore}%
      Tier: ${calculateFinalScores().tier}
    `;
    const blob = new Blob([docContent], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "MCIF_Results.txt";
    link.click();
  });
});
