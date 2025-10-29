// ===============================
// MCIF-5 Interactive Test Engine
// ===============================

// Global state
let schema = null;
let currentQuestionIndex = 0;
let userResponses = [];
let scoreSummary = {};
const app = document.getElementById('app');

// ===============================
// Load Schema
// ===============================
fetch('MCIF_5_MasterSchema.json')
  .then(res => res.json())
  .then(data => {
    schema = data;
    initTest();
  })
  .catch(err => {
    app.innerHTML = `<div class="error">⚠️ Error loading schema: ${err.message}</div>`;
  });

// ===============================
// Initialize Test
// ===============================
function initTest() {
  app.innerHTML = `
    <div class="intro fade-in">
      <h1>🧭 Meta-Cognition Intelligence Framework (MCIF-5)</h1>
      <p>Welcome to your metacognitive exploration journey. Stay present, breathe, and engage your awareness fully.</p>
      <button id="startBtn" class="primary">Begin</button>
    </div>
  `;
  document.getElementById('startBtn').addEventListener('click', startTest);
}

// ===============================
// Start Test
// ===============================
function startTest() {
  currentQuestionIndex = 0;
  userResponses = [];
  scoreSummary = {};
  renderQuestion();
}

// ===============================
// Render Question
// ===============================
function renderQuestion() {
  const questions = schema.questions;
  if (currentQuestionIndex >= questions.length) {
    finishTest();
    return;
  }

  const q = questions[currentQuestionIndex];

  app.innerHTML = `
    <div class="question-container fade-in">
      <div class="progress">
        Question ${currentQuestionIndex + 1} of ${questions.length}
        <div class="progress-bar">
          <div class="progress-fill" style="width:${((currentQuestionIndex + 1) / questions.length) * 100}%"></div>
        </div>
      </div>

      <h2>${q.domain}: ${q.prompt}</h2>
      <div class="options">
        ${q.options
          .map(
            (opt, i) => `
            <button class="option-btn" data-value="${opt.value}">
              ${opt.text}
            </button>
          `
          )
          .join('')}
      </div>
    </div>
  `;

  document.querySelectorAll('.option-btn').forEach(btn =>
    btn.addEventListener('click', () => handleResponse(q, btn.dataset.value))
  );
}

// ===============================
// Handle Response
// ===============================
function handleResponse(question, value) {
  const val = parseFloat(value);
  userResponses.push({ domain: question.domain, value: val });

  if (!scoreSummary[question.domain]) scoreSummary[question.domain] = [];
  scoreSummary[question.domain].push(val);

  currentQuestionIndex++;
  fadeTransition(renderQuestion, 400);
}

// ===============================
// Smooth Transition Helper
// ===============================
function fadeTransition(callback, delay) {
  app.classList.add('fade-out');
  setTimeout(() => {
    app.classList.remove('fade-out');
    callback();
  }, delay);
}

// ===============================
// Finish Test
// ===============================
function finishTest() {
  const domainScores = {};
  for (const domain in scoreSummary) {
    const values = scoreSummary[domain];
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    domainScores[domain] = Math.round(avg * 10) / 10;
  }

  const total = Object.values(domainScores).reduce((a, b) => a + b, 0);
  const overall = Math.round((total / Object.keys(domainScores).length) * 10) / 10;

  renderResults(domainScores, overall);
}

// ===============================
// Render Results
// ===============================
function renderResults(scores, overall) {
  app.innerHTML = `
    <div class="results fade-in">
      <h1>🧩 Your MCIF-5 Profile</h1>
      <p class="overall-score">Overall Meta-Cognitive Index: <strong>${overall}</strong></p>
      <canvas id="resultsChart"></canvas>
      <div class="domain-scores">
        ${Object.entries(scores)
          .map(([domain, score]) => `<p><strong>${domain}</strong>: ${score}</p>`)
          .join('')}
      </div>
      <button id="restartBtn" class="primary">Restart Test</button>
    </div>
  `;

  renderChart(scores);
  document.getElementById('restartBtn').addEventListener('click', initTest);
}

// ===============================
// Chart.js Radar Chart
// ===============================
function renderChart(scores) {
  const ctx = document.getElementById('resultsChart').getContext('2d');
  const labels = Object.keys(scores);
  const data = Object.values(scores);

  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Meta-Cognitive Profile',
          data: data,
          fill: true,
          backgroundColor: 'rgba(58, 134, 255, 0.3)',
          borderColor: '#3A86FF',
          pointBackgroundColor: '#3A86FF'
        }
      ]
    },
    options: {
      scales: {
        r: {
          angleLines: { color: '#555' },
          grid: { color: '#333' },
          pointLabels: { color: '#EEE', font: { size: 14 } },
          suggestedMin: 0,
          suggestedMax: 10
        }
      },
      plugins: { legend: { labels: { color: '#FFF' } } }
    }
  });
}
