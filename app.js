<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Meta-Cognition Test | MCIF LucidFlow</title>
    <link rel="stylesheet" href="style.css" />
    <script defer src="app.js"></script>

    <!-- LucidFlow Core Variables -->
    <style>
        :root {
            --background-hue: 200;
            --lucid-text: #f4f4f4;
            --lucid-accent: #00ffff;
            --lucid-glow: rgba(0, 255, 255, 0.4);
        }

        body {
            margin: 0;
            font-family: "Inter", sans-serif;
            background: linear-gradient(135deg, hsl(var(--background-hue), 45%, 12%), hsl(calc(var(--background-hue) + 60), 50%, 10%));
            color: var(--lucid-text);
            overflow: hidden;
            transition: background 3s linear;
        }

        #intro-screen, #app {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            text-align: center;
        }

        #intro-screen {
            animation: fadeIn 2s ease forwards;
        }

        h1 {
            font-weight: 600;
            font-size: 2.4rem;
            text-shadow: 0 0 15px var(--lucid-glow);
        }

        p {
            max-width: 600px;
            line-height: 1.6;
            opacity: 0.85;
        }

        button {
            padding: 14px 28px;
            margin-top: 20px;
            background: linear-gradient(90deg, #00ffff, #0077ff);
            border: none;
            border-radius: 30px;
            font-size: 1.1rem;
            color: #fff;
            cursor: pointer;
            box-shadow: 0 0 15px var(--lucid-glow);
            transition: all 0.25s ease;
        }

        button:hover {
            transform: scale(1.05);
            box-shadow: 0 0 25px var(--lucid-glow);
        }

        select {
            background: #111;
            border: 1px solid #00ffff77;
            color: var(--lucid-text);
            border-radius: 10px;
            padding: 8px;
            margin-top: 15px;
        }

        textarea, input[type="range"] {
            width: 80%;
            margin: 10px 0;
        }

        .question-container {
            padding: 40px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 20px;
            box-shadow: 0 0 15px rgba(0, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            transition: all 0.4s ease;
        }

        .question-text {
            font-size: 1.5rem;
            margin-bottom: 20px;
        }

        .options {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .progress-bar {
            width: 80%;
            height: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            margin-top: 30px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #00ffff, #00ff99);
            width: 0%;
            transition: width 0.5s ease;
        }

        .lucid-pulse {
            animation: pulse 0.6s ease;
        }

        @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 0 10px var(--lucid-glow); }
            50% { transform: scale(1.07); box-shadow: 0 0 25px var(--lucid-glow); }
            100% { transform: scale(1); box-shadow: 0 0 10px var(--lucid-glow); }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .results-screen {
            animation: fadeIn 1s ease forwards;
        }

        audio {
            display: none;
        }
    </style>
</head>
<body>
    <!-- 🎬 Intro Screen -->
    <div id="intro-screen">
        <h1>Meta-Cognition Interactive Framework</h1>
        <p>Welcome to the LucidFlow edition of the MCIF test — designed to reveal your unique cognitive architecture, strengths, and synthesis profile.</p>
        <label for="frequency-selector">Choose Background Frequency:</label>
        <select id="frequency-selector">
            <option value="432">432 Hz — Natural Harmony</option>
            <option value="528">528 Hz — Transformation</option>
            <option value="852">852 Hz — Intuition</option>
            <option value="963">963 Hz — Divine Consciousness</option>
        </select>
        <button id="begin-button">Acknowledge & Begin</button>
    </div>

    <!-- 🧩 App Content -->
    <div id="app" style="display:none;"></div>

    <!-- 🔊 Frequency Background Audio -->
    <audio id="background-audio"></audio>
</body>
</html>
