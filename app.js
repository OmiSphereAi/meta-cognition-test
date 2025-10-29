console.log("✅ MCIF app.js loaded");

// DOM elements
const startBtn = document.getElementById("startBtn");
const testSection = document.getElementById("testSection");
const questionContainer = document.getElementById("questionContainer");
const nextBtn = document.getElementById("nextBtn");

let currentQuestion = 0;
let schema = null;
let answers = [];

// 🧭 Try multiple paths for the JSON file
async function loadSchema() {
  const repoPath = window.location.pathname.split("/").filter(Boolean)[0];
  const basePath = window.location.origin + "/" + (repoPath ? repoPath + "/" : "");
  const paths = [
    "MCIF_5_MasterSchema.json",
    basePath + "MCIF_5_MasterSchema.json"
  ];

  for (const path of paths) {
    console.log(`🔍 Trying to load schema from: ${path}`);
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      console.log("✅ Schema loaded successfully!", data);
      return data;
    } catch (err) {
      console.warn(`⚠️ Failed loading from ${path}:`, err);
    }
  }
  throw new Error("❌ Schema could not be loaded. Check file name/path or CORS.");
}

function showQuestion() {
  const q = schema.questions[currentQuestion];
  if (!q) {
    questionContainer.innerHTML = "<p>❌ Error: No question found.</p>";
    return;
  }
  questionContainer.innerHTML = `
    <div class="question">
      <h2>${q.domain}</h2>
      <p>${q.prompt}</p>
      ${q.options.map(opt => `<div class="option" data-value="${opt.value}">${opt.text}</div>`).join("")}
    </div>
  `;
  document.querySelectorAll(".option").forEach(opt => {
    opt.addEventListener("click", e => {
      const val = parseInt(e.target.dataset.value);
      answers.push({ q: currentQuestion, v: val });
      console.log("🟩 Answer recorded:", val);
      nextBtn.classList.remove("hidden");
    });
  });
}

function nextQuestion() {
  currentQuestion++;
  if (currentQuestion < schema.questions.length) {
    nextBtn.classList.add("hidden");
    showQuestion();
  } else {
    questionContainer.innerHTML = "<h2>✅ Test Complete</h2><p>Thanks for participating!</p>";
    nextBtn.classList.add("hidden");
    console.log("📊 All answers:", answers);
  }
}

startBtn.addEventListener("click", async () => {
  console.log("▶️ Begin button clicked");
  startBtn.disabled = true;
  startBtn.innerText = "Loading...";
  try {
    schema = await loadSchema();
    console.log("🚀 Schema ready, rendering test");
    startBtn.classList.add("hidden");
    document.getElementById("intro").classList.add("hidden");
    testSection.classList.remove("hidden");
    showQuestion();
  } catch (err) {
    console.error("❌ Load error:", err);
    questionContainer.innerHTML = `<p style="color:red;">${err.message}</p>`;
  }
});

nextBtn.addEventListener("click", nextQuestion);
