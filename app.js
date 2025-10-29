/* ==========================================================
   MCIF 5 — Meta Cognition Interactive Framework WebApp
   Author: OmiSphere AI
   Version: 2.0 | Offline-Ready | Lucid Focus UI
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");
  const STATE = {
    started: false,
    current: 0,
    answers: [],
    schema: null,
    complete: false,
  };

  // 🎨 Utility: smooth fade transition
  const fadeIn = (el) => {
    el.style.opacity = 0;
    el.style.display = "block";
    let op = 0;
    const timer = setInterval(() => {
      if (op >= 1) clearInterval(timer);
      el.style.opacity = op;
      op += 0.05;
    }, 16);
  };

  // 🧠 Load schema (from JSON)
  async function loadSchema() {
    try {
      const response = await fetch("MCIF_5_MasterSchema.json");
      STATE.schema = await response.json();

      if (!STATE.schema.questions || !Array.isArray(STATE.schema.questions)) {
        throw new Error("Invalid MCIF schema format");
      }

      renderIntro();
    } catch (err) {
      app.innerHTML = `
        <div class="error">
          <h2>⚠️ Error Loading Test</h2>
          <p>${err.message}</p>
          <p>Ensure MCIF_5_MasterSchema.json is in the same folder as index.html.</p>
        </div>`;
    }
  }

  // 🏁 Intro screen
  function renderIntro() {
    app.innerHTML = `
      <div class="intro fade">
        <h1 class="title">🧩 MCIF Cognitive Profile Test</h1>
        <p class="subtitle">A lucid cognitive immersion designed to map your synthesis profile.</p>
        <button id="beginBtn" class="btn-primary">Begin</button>
      </div>
    `;

    const beginBtn = document.getElementById("beginBtn");
    beginBtn.addEventListener("click", () => {
      STATE.started = true;
      STATE.current = 0;
      STATE.answers = [];
      renderQuestion();
    });
    fadeIn(app);
  }

  // ❓ Render Question
  function renderQuestion() {
    const q = STATE.schema.questions[STATE.current];
    if (!q) return renderResults();

    const progress = Math.round(((STATE.current + 1) / STATE.schema.questions.length) * 100);
    app.innerHTML = `
      <div class="question fade">
        <div class="progress"><div class="bar" style="width:${progress}%;"></div></div>
        <h2 class="domain">${q.domain}</h2>
        <p class="prompt">${q.prompt}</p>
        <div class="options">
          ${q.options
            .map(
              (opt, i) => `
            <button class="option-btn" data-value="${opt.value}">
              ${opt.text}
            </button>
          `
            )
            .join("")}
        </div>
        <div class="status">${STATE.current + 1} / ${STATE.schema.questions.length}</div>
      </div>
    `;

    document.querySelectorAll(".option-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const value = parseInt(e.target.getAttribute("data-value"));
        STATE.answers.push({
          id: q.id || STATE.current,
          domain: q.domain,
          value,
        });

        if (STATE.current + 1 < STATE.schema.questions.length) {
          STATE.current++;
          renderQuestion();
        } else {
          renderResults();
        }
      });
    });

    fadeIn(app);
  }

  // 📊 Results Screen
  function renderResults() {
    STATE.complete = true;
    const avgByDomain = {};
    STATE.answers.forEach((ans) => {
      if (!avgByDomain[ans.domain]) avgByDomain[ans.domain] = [];
      avgByDomain[ans.domain].push(ans.value);
    });

    const domainScores = Object.entries(avgByDomain).map(([domain, vals]) => {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return { domain, avg: avg.toFixed(2) };
    });

    const total = (
      STATE.answers.reduce((sum, a) => sum + a.value, 0) / STATE.answers.length
    ).toFixed(2);

    app.innerHTML = `
      <div class="results fade">
        <h2 class="title">✨ Cognitive Synthesis Profile</h2>
        <p class="subtitle">Your personalized metacognitive map</p>
        <div class="score-display">
          <div class="total-score">Overall: <span>${total}</span></div>
          ${domainScores
            .map(
              (d) => `
            <div class="domain-score">
              <strong>${d.domain}</strong>: ${d.avg}
            </div>
          `
            )
            .join("")}
        </div>
        <canvas id="chart"></canvas>
        <button id="restartBtn" class="btn-primary">Restart</button>
      </div>
    `;

    fadeIn(app);

    // Restart
    document.getElementById("restartBtn").addEventListener("click", () => {
      STATE.started = false;
      STATE.current = 0;
      STATE.answers = [];
      STATE.complete = false;
      renderIntro();
    });

    // 🎨 Chart Visualization (Radar)
    const ctx = document.getElementById("chart");
    if (window.Chart) {
      new Chart(ctx, {
        type: "radar",
        data: {
          labels: domainScores.map((d) => d.domain),
          datasets: [
            {
              label: "Cognitive Balance",
              data: domainScores.map((d) => d.avg),
              backgroundColor: "rgba(0, 255, 255, 0.2)",
              borderColor: "#00FFFF",
              borderWidth: 2,
              pointBackgroundColor: "#00FFFF",
            },
          ],
        },
        options: {
          scales: {
            r: {
              angleLines: { color: "#333" },
              grid: { color: "#555" },
              pointLabels: { color: "#00FFFF" },
              suggestedMin: 0,
              suggestedMax: 10,
            },
          },
          plugins: { legend: { display: false } },
        },
      });
    }
  }

  // 🚀 Init app
  loadSchema();
});
