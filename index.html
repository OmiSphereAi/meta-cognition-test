<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>MCIF v5 — Mind Core (Meta-Cognitive Intelligence Framework)</title>
  <link rel="stylesheet" href="style.css" />
  <!-- app.js should be deferred so DOM elements exist when it runs -->
  <script src="app.js" defer></script>
</head>
<body class="lucid-flow" data-stage="intro" aria-live="polite">

  <!-- BACKGROUND + AURORA (visual layers for lucid flow) -->
  <div id="bgLayer" class="bg-layer" aria-hidden="true">
    <div class="bg-gradient"></div>
    <div id="bgAurora" class="bg-aurora" aria-hidden="true"></div>
    <canvas id="backgroundSpiral" class="background-spiral" width="1200" height="1200" aria-hidden="true"></canvas>
  </div>

  <!-- APP SHELL -->
  <div id="appShell" class="ui-shell">

    <!-- TOPBAR -->
    <header class="topbar" role="banner">
      <div class="brand" aria-hidden="false">
        <div class="logo" aria-hidden="true">
          <!-- small svg emblem -->
          <svg width="40" height="40" viewBox="0 0 64 64" aria-hidden="true">
            <defs><linearGradient id="lg1" x1="0" x2="1"><stop offset="0" stop-color="#1de9b6"/><stop offset="1" stop-color="#0A78FF"/></linearGradient></defs>
            <rect x="6" y="6" width="52" height="52" rx="10" fill="url(#lg1)"></rect>
            <path d="M16 32c6-12 24-12 30 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="title">
          <div class="product">MCIF v5 — Mind Core</div>
          <div class="subtitle">Meta-Cognitive Intelligence Framework</div>
        </div>
      </div>

      <div class="top-actions" role="toolbar" aria-label="Top controls">
        <label for="accessibilitySize" class="sr-only">Text size</label>
        <select id="accessibilitySize" class="compact-select" title="Text size" aria-label="Text size">
          <option value="base">Normal</option>
          <option value="large">Large</option>
          <option value="xlarge">XL</option>
        </select>

        <button id="saveButton" class="icon-btn" title="Save session" aria-label="Save session">💾</button>
        <button id="restoreButton" class="icon-btn" title="Restore session" aria-label="Restore session">♻️</button>
      </div>
    </header>

    <!-- MAIN GRID -->
    <main id="appMain" class="main-grid" role="main">

      <!-- LEFT: Primary flow (Intro -> Test -> Results) -->
      <section id="leftColumn" class="left-column">

        <!-- INTRO SCREEN -->
        <article id="introScreen" class="card intro-card" role="region" aria-labelledby="introHeading">
          <div class="card-inner">
            <h1 id="introHeading" class="page-title">Welcome — MCIF v5 “Mind Core”</h1>
            <p class="lead">
              This assessment maps <strong>how you think</strong> — perception, reasoning, creativity, emotion and reflection.
              It's a reflective research tool (not a clinical diagnosis). Breathe, relax, and answer openly.
            </p>

            <div class="tier-row" role="radiogroup" aria-label="Choose difficulty tier" id="tierRow">
              <label class="tier-card">
                <input type="radio" name="tier" value="Explorer" checked />
                <div class="tier-title">Explorer</div>
                <div class="tier-sub">15–25 min — Quick insight</div>
              </label>
              <label class="tier-card">
                <input type="radio" name="tier" value="Architect" />
                <div class="tier-title">Architect</div>
                <div class="tier-sub">30–45 min — Balanced</div>
              </label>
              <label class="tier-card">
                <input type="radio" name="tier" value="Visionary" />
                <div class="tier-title">Visionary</div>
                <div class="tier-sub">60–90 min — Deep</div>
              </label>
            </div>

            <div class="controls-row">
              <div class="frequency-control">
                <label for="frequencyControl">Ambient Frequency</label>
                <select id="frequencyControl" aria-label="Ambient frequency" title="Ambient frequency">
                  <option value="432">432 Hz — Ground</option>
                  <option value="528">528 Hz — Harmony</option>
                  <option value="852">852 Hz — Vision</option>
                  <option value="963">963 Hz — Unity</option>
                </select>
              </div>

              <div class="soundscape-control">
                <label for="soundscapeSelect">Soundscape</label>
                <select id="soundscapeSelect" aria-label="Soundscape">
                  <option value="none">None</option>
                  <option value="ocean">Ocean</option>
                  <option value="wind">Wind</option>
                  <option value="space">Space pad</option>
                  <option value="pure">Pure tone</option>
                </select>
              </div>
            </div>

            <p class="safety-note">If you feel distressed at any time, the tool will offer safety resources. You may pause or exit.</p>

            <div class="intro-actions">
              <button id="beginButton" class="primary-btn" aria-label="Begin test">Begin</button>
              <button id="tutorialButton" class="secondary-btn" aria-label="Open tutorial">Tutorial</button>
              <button id="demoButton" class="tertiary-btn" aria-label="2-question demo">2-Question Demo</button>
            </div>

            <div class="disclaimer">
              <small>Open for research & education. Not a medical or clinical diagnosis tool.</small>
            </div>
          </div>
        </article>

        <!-- TEST CONTAINER -->
        <article id="testContainer" class="card test-card" role="region" aria-live="assertive" hidden>
          <div class="card-inner">

            <!-- Top row: progress + resonance + controls -->
            <div class="top-row">
              <div class="progress-wrap" aria-hidden="false">
                <div class="progress-label">Progress</div>
                <div class="progress-track">
                  <div id="progressBar" class="progress-bar" style="width:0%">0%</div>
                </div>
              </div>

              <div class="resonance-wrap">
                <div class="resonance-label">Flow Resonance</div>
                <div class="resonance-track"><div id="resonanceMeter" class="resonance-meter" style="width:0%"></div></div>
                <div class="resonance-help muted">Live non-diagnostic feedback on cognitive flow.</div>
              </div>

              <div class="controls-mini">
                <button id="pauseBtn" class="icon-btn" title="Pause test" aria-label="Pause">⏸</button>
                <button id="restartBtn" class="icon-btn" title="Restart test" aria-label="Restart">🔁</button>
              </div>
            </div>

            <!-- Frequency visualizer canvas -->
            <div class="visualizer-wrap" aria-hidden="false">
              <canvas id="frequencyVisualizer" width="900" height="140" role="img" aria-label="Frequency visualizer"></canvas>
            </div>

            <!-- Question area (app.js will populate) -->
            <form id="questionContainer" class="question-area" role="form" aria-describedby="phaseHelp"></form>
            <div id="phaseHelp" class="phase-help">Answer fully; longer answers yield richer feedback. Use sliders for quick ratings.</div>

          </div>
        </article>

        <!-- RESULTS CARD -->
        <article id="resultContainer" class="card results-card" role="region" hidden>
          <div class="card-inner">
            <div class="results-header">
              <h2 id="resultsTitle">Your MCIF Synthesis</h2>
              <div class="result-actions">
                <button id="exportJsonBtn" class="primary-btn" aria-label="Export JSON">Export JSON</button>
                <button id="exportTxtBtn" class="secondary-btn" aria-label="Export TXT">Export TXT</button>
                <button id="restartAfterResultBtn" class="tertiary-btn" aria-label="Restart">Restart</button>
              </div>
            </div>

            <div id="resultBody" class="result-body" aria-live="polite">
              <!-- app.js populates final dashboard, narrative, and archetype map -->
            </div>

            <div class="result-footer">
              <button id="openMentorBtn" class="primary-btn">Activate Mentor Mode</button>
              <button id="downloadProfileBtn" class="secondary-btn">Download Profile</button>
            </div>
          </div>
        </article>

      </section>

      <!-- RIGHT: Reflection, micro-feedback, and extra UI -->
      <aside id="rightColumn" class="right-column" aria-labelledby="reflectionHeading">

        <!-- Reflection panel (surprise feature) -->
        <div id="reflectionPanel" class="card reflection-card" role="complementary" aria-live="polite">
          <div class="card-inner">
            <h3 id="reflectionHeading">Dimensional Reflection</h3>
            <div id="reflectionContent" class="reflection-content">
              <p class="muted">Your mirrored insights will appear here as you progress.</p>
            </div>
          </div>
        </div>

        <!-- Quick controls: save/restore/export -->
        <div class="card quick-controls">
          <div class="card-inner">
            <h4>Quick Controls</h4>
            <div class="controls-grid">
              <button id="saveBtn" class="secondary-btn" aria-label="Save session">Save</button>
              <button id="restoreBtn" class="secondary-btn" aria-label="Restore session">Restore</button>
              <button id="exportSummaryBtn" class="secondary-btn" aria-label="Export summary">Export Summary</button>
            </div>
          </div>
        </div>

        <!-- Frequency / Sound Controls (visible at all times) -->
        <div class="card frequency-card" role="region" aria-label="Frequency controls">
          <div class="card-inner">
            <h4>Frequency & Sound</h4>
            <label for="freqControl" class="muted">Background frequency</label>
            <select id="freqControl" aria-label="Background frequency">
              <option value="432">432 Hz — Ground</option>
              <option value="528">528 Hz — Harmony</option>
              <option value="852">852 Hz — Vision</option>
              <option value="963">963 Hz — Unity</option>
            </select>

            <label for="ambientSelect" class="muted" style="margin-top:10px;">Ambient sound</label>
            <select id="ambientSelect" aria-label="Ambient soundscape">
              <option value="none">None</option>
              <option value="ocean">Ocean</option>
              <option value="wind">Wind</option>
              <option value="space">Space pad</option>
              <option value="pure">Pure tone</option>
            </select>

            <div style="margin-top:12px;display:flex;gap:8px">
              <button id="playAmbience" class="primary-btn small">Play</button>
              <button id="stopAmbience" class="secondary-btn small">Stop</button>
            </div>
          </div>
        </div>

      </aside>

    </main>

    <!-- SAFETY MODAL (distress detection) -->
    <div id="safetyModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="safetyTitle" hidden>
      <div class="modal-inner" role="document">
        <h3 id="safetyTitle">Safety resources</h3>
        <div class="modal-body">
          <p>We detected language that suggests distress. If you're in immediate danger, call local emergency services now.</p>
          <ul>
            <li>If you're in the U.S., call or text <strong>988</strong> (Suicide & Crisis Lifeline).</li>
            <li>Consider pausing the test and seeking professional support.</li>
          </ul>
        </div>
        <div class="modal-actions">
          <button id="modalCloseBtn" class="primary-btn">Acknowledge & Pause</button>
        </div>
      </div>
    </div>

    <!-- SCREEN READER ANNOUNCE -->
    <div id="srAnnounce" class="sr-only" aria-live="assertive"></div>

    <!-- FOOTER -->
    <footer class="footer" role="contentinfo">
      <div class="footer-inner">
        <div class="license">MCIF v5 — Open for research & education. No medical claims.</div>
        <div class="version">Schema v5.0 • Frontend v1.0</div>
      </div>
    </footer>

  </div>

  <!-- Minimal inline accessibility helper -->
  <style>
    .sr-only{position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden}
  </style>
</body>
</html>
