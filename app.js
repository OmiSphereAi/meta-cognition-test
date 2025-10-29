// app.js — Meta-Cognition Interactive Framework (MCIF v5 Pro)
// Author: OmiSphere AI Lab | Production Version for GitHub Pages
// Works fully offline with schema file in same folder.

document.addEventListener("DOMContentLoaded", () => {
    const beginBtn = document.getElementById("begin-btn");
    const intro = document.getElementById("intro");
    const test = document.getElementById("test");
    const questionContainer = document.getElementById("question-container");
    const progressBar = document.getElementById("progress");
    const resultSection = document.getElementById("result");
    const resultText = document.getElementById("result-text");
    const restartBtn = document.getElementById("restart-btn");

    let questions = [];
    let current = 0;
    let answers = [];

    // 🔹 Load Schema File
    async function loadSchema() {
        const schemaFile = "MCIF_5_MasterSchema.json";
        try {
            const response = await fetch(schemaFile);
            if (!response.ok) throw new Error(`Schema load failed (${response.status})`);
            const data = await response.json();

            if (!data.questions || !Array.isArray(data.questions)) {
                throw new Error("Invalid schema: missing 'questions' array");
            }

            questions = data.questions;
            console.log(`✅ Schema loaded: ${questions.length} questions`);
            return true;
        } catch (err) {
            console.error("❌ Error loading schema:", err);
            alert("Couldn't load MCIF_5_MasterSchema.json. Make sure it’s in the same folder.");
            return false;
        }
    }

    // 🔹 Start Test
    beginBtn.addEventListener("click", async () => {
        beginBtn.disabled = true;
        beginBtn.innerText = "Loading...";
        const ok = await loadSchema();

        if (ok) {
            intro.style.display = "none";
            test.style.display = "block";
            document.body.classList.add("test-active");
            current = 0;
            answers = [];
            showQuestion();
        } else {
            beginBtn.disabled = false;
            beginBtn.innerText = "Begin Test";
        }
    });

    // 🔹 Render Question
    function showQuestion() {
        if (current >= questions.length) {
            endTest();
            return;
        }

        const q = questions[current];
        const optionsHtml = q.options
            .map((opt, i) => `<button class="option-btn" data-index="${i}">${opt}</button>`)
            .join("");

        questionContainer.innerHTML = `
            <div class="question-card fade-in">
                <h2 class="question-title">${q.title || `Question ${current + 1}`}</h2>
                <p class="question-text">${q.prompt || ""}</p>
                <div class="options">${optionsHtml}</div>
            </div>
        `;

        updateProgress();
        attachOptionEvents();
    }

    // 🔹 Handle Answer Selection
    function attachOptionEvents() {
        const buttons = questionContainer.querySelectorAll(".option-btn");
        buttons.forEach(btn => {
            btn.addEventListener("click", e => {
                const index = parseInt(e.target.dataset.index);
                answers.push({
                    question: questions[current].title,
                    answer: questions[current].options[index],
                });

                current++;
                questionContainer.classList.add("fade-out");
                setTimeout(() => {
                    questionContainer.classList.remove("fade-out");
                    showQuestion();
                }, 250);
            });
        });
    }

    // 🔹 Progress Bar
    function updateProgress() {
        const percent = ((current / questions.length) * 100).toFixed(0);
        progressBar.style.width = `${percent}%`;
        progressBar.innerText = `${percent}%`;
    }

    // 🔹 End Test + Results
    function endTest() {
        test.style.display = "none";
        resultSection.style.display = "block";

        const html = answers
            .map(a => `<li><strong>${a.question}</strong>: ${a.answer}</li>`)
            .join("");

        resultText.innerHTML = `
            <h2>Test Complete</h2>
            <p>You’ve completed the MCIF Protocol.</p>
            <ul>${html}</ul>
        `;

        localStorage.setItem("MCIF_Results", JSON.stringify(answers));
        console.log("✅ Results saved:", answers);
    }

    // 🔹 Restart
    restartBtn?.addEventListener("click", () => {
        resultSection.style.display = "none";
        intro.style.display = "block";
        beginBtn.disabled = false;
        beginBtn.innerText = "Begin Test";
        progressBar.style.width = "0%";
        progressBar.innerText = "0%";
        answers = [];
        current = 0;
    });
});

