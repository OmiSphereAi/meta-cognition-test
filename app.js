// === MCIF 5 Lucid Flow App ===
// By: Andrew Carr (Visionary Test System)
// Dependencies: MCIF_5_MasterSchema.json in same folder

// ==== Global Elements ====
const startBtn = document.getElementById('start-btn');
const appContainer = document.getElementById('app');
const audioControl = document.getElementById('frequency-control');

let schema = null;
let currentQuestionIndex = 0;
let userResponses = {};
let audioContext, oscillator;

// ==== Load Schema ====
async function loadSchema() {
  try {
    const res = await fetch('./MCIF_5_MasterSchema.json');
    schema = await res.json();
    console.log('Schema loaded successfully.');
  } catch (err) {
    console.error('Error loading schema:', err);
    alert('Could not load MCIF_5_MasterSchema.json. Please make sure it’s in the same folder.');
  }
}

// ==== Audio (Frequency Background) ====
function startFrequency(freq) {
  stopFrequency(); // stop any existing sound
  if (!freq) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  oscillator = audioContext.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.value = freq;
  oscillator.connect(audioContext.destination);
  oscillator.start();
}

function stopFrequency() {
  if (oscillator) {
    oscillator.stop();
    oscillator.disconnect();
    oscillator = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}

// ==== UI Setup ====
function fadeIn(element) {
  element.style.opacity = 0;
  element.style.display = 'block';
  let opacity = 0;
  const interval = setInterval(() => {
    opacity += 0.05;
    element.style.opacity = opacity;
    if (opacity >= 1) clearInterval(interval);
  }, 30);
}

function showQuestion() {
  const questionData = schema.questions[currentQuestionIndex];
  if (!questionData) return showResults();

  appContainer.innerHTML = '';

  const questionBox = document.createElement('div');
  questionBox.classList.add('question-box', 'lucid-glow');

  const question = document.createElement('h2');
  question.textContent = questionData.text;
  questionBox.appendChild(question);

  let inputEl;
  switch (questionData.type) {
    case 'text':
      inputEl = document.createElement('textarea');
      inputEl.placeholder = 'Type your thoughts here...';
      break;
    case 'multiple-choice':
      inputEl = document.createElement('div');
      questionData.options.forEach(option => {
        const btn = document.createElement('button');
        btn.classList.add('option-btn');
        btn.textContent = option;
        btn.onclick = () => handleAnswer(option);
        inputEl.appendChild(btn);
      });
      break;
    case 'slider':
      inputEl = document.createElement('input');
      inputEl.type = 'range';
      inputEl.min = questionData.min || 0;
      inputEl.max = questionData.max || 100;
      inputEl.value = (questionData.min + questionData.max) / 2 || 50;
      inputEl.classList.add('slider');
      const sliderLabel = document.createElement('p');
      sliderLabel.textContent = `Value: ${inputEl.value}`;
      inputEl.oninput = e => (sliderLabel.textContent = `Value: ${e.target.value}`);
      questionBox.appendChild(sliderLabel);
      break;
  }

  if (inputEl && questionData.type !== 'multiple-choice') {
    questionBox.appendChild(inputEl);
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next →';
    nextBtn.classList.add('next-btn');
    nextBtn.onclick = () => handleAnswer(inputEl.value);
    questionBox.appendChild(nextBtn);
  }

  appContainer.appendChild(questionBox);
  fadeIn(questionBox);
}

function handleAnswer(answer) {
  userResponses[schema.questions[currentQuestionIndex].id] = answer;
  currentQuestionIndex++;
  showQuestion();
}

function showResults() {
  appContainer.innerHTML = '';

  const resultBox = document.createElement('div');
  resultBox.classList.add('result-box', 'lucid-glow');

  const heading = document.createElement('h2');
  heading.textContent = 'Your Mind Assessment Results';
  resultBox.appendChild(heading);

  const summary = document.createElement('p');
  summary.textContent =
    'This profile reflects a synthesis of your introspective patterns, tendencies, and core psychological strengths.';
  resultBox.appendChild(summary);

  const ul = document.createElement('ul');
  Object.entries(userResponses).forEach(([id, val]) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${id}</strong>: ${val}`;
    ul.appendChild(li);
  });
  resultBox.appendChild(ul);

  const restartBtn = document.createElement('button');
  restartBtn.textContent = 'Restart Test';
  restartBtn.classList.add('restart-btn');
  restartBtn.onclick = () => {
    userResponses = {};
    currentQuestionIndex = 0;
    showQuestion();
  };

  resultBox.appendChild(restartBtn);
  appContainer.appendChild(resultBox);
  fadeIn(resultBox);
}

// ==== Frequency Control ====
function setupFrequencyUI() {
  if (!audioControl) return;
  const freqs = [
    { label: '432 Hz (Healing)', value: 432 },
    { label: '528 Hz (DNA Repair)', value: 528 },
    { label: '852 Hz (Awakening)', value: 852 },
    { label: '963 Hz (Divine)', value: 963 }
  ];

  freqs.forEach(f => {
    const btn = document.createElement('button');
    btn.classList.add('freq-btn');
    btn.textContent = f.label;
    btn.onclick = () => startFrequency(f.value);
    audioControl.appendChild(btn);
  });

  const stopBtn = document.createElement('button');
  stopBtn.textContent = 'Stop Frequency';
  stopBtn.classList.add('freq-stop');
  stopBtn.onclick = stopFrequency;
  audioControl.appendChild(stopBtn);
}

// ==== Init ====
startBtn.onclick = async () => {
  startBtn.style.display = 'none';
  await loadSchema();
  showQuestion();
  setupFrequencyUI();
};

// ==== Lucid Flow Styling (Dynamic) ====
document.body.style.background =
  'linear-gradient(135deg, rgba(15,15,40,0.95), rgba(40,10,60,0.95))';
document.body.style.fontFamily = 'Inter, system-ui, sans-serif';
document.body.style.color = '#e8e8ff';
document.body.style.overflow = 'hidden';
document.body.style.transition = 'background 1s ease';

