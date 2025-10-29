// app.js — MCIF v5 interactive system
// Author: OmiSphere AI Lab
// Optimized for GitHub Pages — No backend required

document.addEventListener("DOMContentLoaded", () => {
    const beginButton = document.getElementById("begin-btn");
    const introSection = document.getElementById("intro");
    const testSection = document.getElementById("test");
    const questionContainer = document.getElementById("question-container");
    const progressBar = document.getElementById("progress");
    const resultSection = document.getElementById("result");
    const resultText = document.getElementById("result-text");

    let questions = [];
    let currentIndex = 0;
    let answers = [];

    // ✅ Fetch schema file with graceful fallback
    async function loadSchema() {
        const schemaFile = "MCIF_5_MasterSchema.json";
        try {
            const response = await fetch(schemaFile);
            if (!response.ok) throw new Error(`Schema load failed: ${response.status}`);
            const data = await response.json();

            if (!data.questions || !Array.isArray(data.questions)) {
                throw new Error("Invalid schema format: Missing 'questions' array.");
            }

            questions = data.questions;
            console.log(`✅ Loaded ${questions.length} questions from schema`);
            return true;
        } catch (error) {
            console.error("❌ Error loading schema:", error);
            alert("Error loading test schema. Please check the console or ensure MCIF_5_MasterSchema.json is in the same folder.");
            return false;
        }
    }

    // ✅ Show intro / start test
    beginButton.addEventListener("click", async () => {
        beginButton.disabled = true;
        beginButton.innerText = "Loading...";
        const loaded = await loadSchema();

        if (loaded) {
            introSection.style.display = "none";
            testSection.style.display = "block";
            currentIndex = 0;
            answers = [];
            showQuestion();
        } else {
            beginButton.disabled = false;
            beginButton.innerText = "Begin Test";
        }
    });

    // ✅ Display current question
    function showQuestion() {
        if (currentIndex >= questions.length) {
            endTest();
            return;
        }

        const q = questions[currentIndex];
        questionContainer.innerHTML = `
            <div class="question-card fade-in">
                <h2>${q.title || `Question ${currentIndex + 1}`}</h2>
                <p class="question-text">${q.prompt || "No prompt provided."}</p>
                <div class="options">
                    ${q.options.map((opt, i) => `
                        <button class="option-btn" data-index="${i}">
                            ${opt}
                        </button>`).join("")}
                </div>
            </div>
        `;

        updateProgress();
        attachOptionListeners();
    }

    // ✅ Option click behavior
    function attachOptionListeners() {
        document.querySelectorAll(".option-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const answerIndex = parseInt(e.target.dataset.index);
                answers.push({
                    question: questions[currentIndex].title,
                    answer: questions[currentIndex].options[answerIndex]
                });
                currentIndex++;
                showQuestion();
            });
        });
    }

    // ✅ Progress bar update
    function updateProgress() {
        const percent = ((currentIndex / questions.length) * 100).toFixed(0);
        progressBar.style.width = `${percent}%`;
        progressBar.innerText = `${percent}%`;
    }

    // ✅ End of test
    function endTest() {
        testSection.style.display = "none";
        resultSection.style.display = "block";

        let summary = `
            <h2>Test Complete</h2>
            <p>You completed the MCIF cognitive mapping protocol.</p>
            <ul>${answers.map(a => `<li><strong>${a.question}:</strong> ${a.answer}</li>`).join("")}</ul>
        `;
        resultText.innerHTML = summary;

        // Optionally save results locally
        localStorage.setItem("mcif_results", JSON.stringify(answers));
        console.log("✅ Results saved locally:", answers);
    }

});
