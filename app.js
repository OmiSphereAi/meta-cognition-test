console.log("MCIF app.js loaded");

// DOM Elements
const startBtn = document.getElementById("startBtn");
const testSection = document.getElementById("testSection");
const questionContainer = document.getElementById("questionContainer");
const nextBtn = document.getElementById("nextBtn");

let currentQuestion = 0;
let schema = null;
let answers = [];

// Fetch schema safely with absolute GitHub path fallback
async function loadSchema() {
  const localPath = "MCIF_5_MasterSchema.json";
  const githubPath = `${window.location.origin}/MCIF_5_MasterSchema.json`;
  const pathsToTry = [localPath, githubPath];

  for (const path of pathsToTry) {
    try {
      console.log("Attempting to load:", path);
      const res = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log("Schema loaded successfully:", data);
      return data;
    } catch (err) {
      console.warn(`Failed to load from ${path}:`, err);
    }
  }
  throw new Error("Could not load schema — check file name and path.");
}

// Render current question
function showQuestion() {
  const q = schema.questions[currentQuestion];
  questionContainer.innerHTML = `
    <div class="question">
      <h2>${q.domain} Domain</h2>
      <p>${q.prompt}</p>
      ${q.options.map((opt, i) => `
        <div class="option" data-value="${opt.value}">${opt.text}</div>
      `).join("")}
    </div>
  `;

  document.querySelectorAll(".option").forEach(opt => {
    opt.addEventListener("click", (e) => {
      const val = parseInt(e.target.getAttribute("data-value"));
      answers.push({ question: currentQuestion, value: val });
      console.log("Answer recorded:", val);
      nextBtn.classList.remove("hidden");
    });
  });
}

// Go to next question or finish
function nextQuestion() {
  currentQuestion++;
  if (currentQuestion < schema.questions.length) {
    nextBtn.classList.add("hidden");
    showQuestion();
  } else {
    finishTest();
  }
}

function finishTest() {
  questionContainer.innerHTML = `<h2>Test Complete</h2><p>Thank you for completing the MCIF test.</p>`;
  nextBtn.classList.add("hidden");
  console.log("User answers:", answers);
}

startBtn.addEventListener("click", async () => {
  try {
    schema = await loadSchema();
    startBtn.classList.add("hidden");
    document.getElementById("intro").classList.add("hidden");
    testSection.classList.remove("hidden");
    showQuestion();
  } catch (err) {
    questionContainer.innerHTML = `<p style="color:red;">⚠️ Error: ${err.message}</p>`;
  }
});

nextBtn.addEventListener("click", nextQuestion);


