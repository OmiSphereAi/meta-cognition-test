document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("start-btn");
  const appDiv = document.getElementById("app");
  const introDiv = document.getElementById("intro");
  const freqControl = document.getElementById("frequency-control");

  let schemaData = null;
  let currentPhaseIndex = 0;
  let totalScore = 0;
  let currentPhase = null;
  let audioCtx = null;
  let osc = null;

  // 🎵 Frequency buttons
  const frequencies = [432, 528, 852, 963];
  frequencies.forEach(freq => {
    const btn = document.createElement("button");
    btn.className = "freq-btn";
    btn.textContent = `${freq} Hz`;
    btn.onclick = () => toggleFrequency(freq);
    freqControl.appendChild(btn);
  });
  const stopBtn = document.createElement("button");
  stopBtn.className = "freq-stop";
  stopBtn.textContent = "Stop";
  stopBtn.onclick = stopFrequency;
  freqControl.appendChild(stopBtn);

  function toggleFrequency(freq) {
    stopFrequency();
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    osc = audioCtx.createOscillator();
    osc.frequency.value = freq;
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.05;
    osc.connect(gainNode).connect(audioCtx.destination);
    osc.start();
  }

  function stopFrequency() {
    if (osc) {
      osc.stop();
      osc.disconnect();
      osc = null;
    }
  }

  // 🔹 Load JSON Schema (with fallback)
  async function loadSchema() {
    try {
      const res = await fetch("MCIF_5_MasterSchema.json");
      if (!res.ok) throw new Error("JSON not found");
      schemaData = await res.json();
      console.log("✅ Schema loaded successfully from file.");
    } catch (err) {
      console.warn("⚠️ Could not load MCIF_5_MasterSchema.json, using fallback schema.");
      schemaData = fallbackSchema();
    }
  }

  // 🔹 Fallback Schema
  function fallbackSchema() {
    return {
      phases: [
        {
          name: "Perceptual Awareness",
          prompt: "Choose an everyday object. Describe it as if perceived for the first time.",
        },
        {
          name: "Cognitive Mechanics",
          prompt: "A team keeps missing deadlines. Without saying 'work harder,' design a sustainable fix.",
        },
        {
          name: "Emotive Intelligence",
          prompt: "You feel anxious before a speech and start scrolling your phone. Why does this soothe you?",
        },
        {
          name: "Meta-Cognitive Insight",
          prompt: "You understand your patterns but rarely act on them. What blocks that conversion?",
        },
        {
          name: "Creative Intelligence",
          prompt: "Invent a new kind of intelligence measurement more accurate than IQ. Explain it.",
        },
        {
          name: "Philosophical Depth",
          prompt: "Is human potential fixed or ever-expanding? Justify your reasoning.",
        }
      ]
    };
  }

  // 🔹 Start Button Listener
  if (startBtn) {
    startBtn.addEventListener("click", async () => {
      introDiv.style.display = "none";
      appDiv.innerHTML = "<p>Loading MCIF Test...</p>";
      await loadSchema();
      if (schemaData) {
        startTest();
      } else {
        appDiv.innerHTML = "<p>Error: Schema could not be loaded.</p>";
      }
    });
  } else {
    console.error("❌ Start button not found on DOM load");
  }

  // 🔹 Test Flow
  function startTest() {
    currentPhaseIndex = 0;
    totalScore = 0;
    showPhase();
  }

  function showPhase() {
    if (!schemaData || !schemaData.phases) {
      appDiv.innerHTML = "<p>Error: Schema missing phases.</p>";
      return;
    }

    currentPhase = schemaData.phases[currentPhaseIndex];
    appDiv.innerHTML = `
      <div class="question-box lucid-glow">
        <h2>${currentPhase.name}</h2>
        <p>${currentPhase.prompt}</p>
        <textarea id="user-answer" placeholder="Type your answer here..."></textarea><br>
        <button id="next-btn" class="next-btn">Next</button>
      </div>
    `;

    document.getElementById("next-btn").addEventListener("click", nextPhase);
  }

  function nextPhase() {
    const answer = document.getElementById("user-answer").value.trim();
    if (answer.length < 10) {
      alert("Please expand your answer for more accurate feedback.");
      return;
    }

    // Simple scoring heuristic
    const score = Math.min(100, answer.length / 3);
    totalScore += score;

    currentPhaseIndex++;
    if (currentPhaseIndex < schemaData.phases.length) {
      showPhase();
    } else {
      showResults();
    }
  }

  function showResults() {
    const tier =
      totalScore < 350 ? "Explorer" :
      totalScore < 525 ? "Architect" : "Visionary";

    appDiv.innerHTML = `
      <div class="result-box lucid-glow">
        <h2>MCIF-5 Results</h2>
        <p><strong>Total Score:</strong> ${totalScore.toFixed(1)} / 700</p>
        <p><strong>Tier:</strong> ${tier}</p>
        <button class="restart-btn" id="restart-btn">Restart</button>
      </div>
    `;

    document.getElementById("restart-btn").addEventListener("click", () => {
      introDiv.style.display = "block";
      appDiv.innerHTML = "";
      totalScore = 0;
      currentPhaseIndex = 0;
    });
  }
});


