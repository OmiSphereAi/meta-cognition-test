/* script.js — MCIF web runner (local-first, no backend) */
/* Assumptions:
   - MCIF_5_MasterSchema.json is at repo root
   - This is a demo-friendly scoring system: self-ratings + simple heuristics
*/

(async function(){
  // DOM refs
  const consent = id('consent'), setup = id('setup'), calibration = id('calibration');
  const qpanel = id('question-panel'), microRef = id('micro-reflection'), completion = id('completion'), report = id('report');
  const btnYes = id('btn-consent-yes'), btnNo = id('btn-consent-no');
  const modesDiv = id('modes'), calPromptsDiv = id('calibration-prompts');
  const btnCalNext = id('btn-calibration-next');
  const qIndexEl = id('q-index'), qTotalEl = id('q-total'), qDomainEl = id('question-domain'), qPromptEl = id('question-prompt');
  const responseText = id('response-text');
  const btnSubmit = id('btn-submit'), btnSkip = id('btn-skip');
  const adaptiveHint = id('adaptive-hint');
  const microPrompt = id('micro-prompt'), microResponse = id('micro-response'), btnMicroSubmit = id('btn-micro-submit');
  const btnGenerate = id('btn-generate'), btnStartOver = id('btn-start-over');
  const dashboardBlock = id('dashboard-json');
  const btnDownloadDashboard = id('btn-download-dashboard'), btnDownloadTranscript = id('btn-download-transcript');

  // rating inputs
  const rateDepth = id('rate-depth'), rateOrig = id('rate-originality'), rateClarity = id('rate-clarity'),
        rateSA = id('rate-selfawareness'), rateAdapt = id('rate-adaptability');

  // app state
  let schema = null;
  let selectedMode = null;
  let questionList = [];
  let currentIndex = 0;
  let transcript = [];
  let calibrationData = [];
  let startTime = null;

  // load schema
  try {
    schema = await (await fetch('MCIF_5_MasterSchema.json')).json();
  } catch (e) {
    alert('Error loading MCIF_5_MasterSchema.json. Make sure the file is in repo root.');
    throw e;
  }

  // show modes
  btnYes.onclick = () => { consent.classList.add('hidden'); setup.classList.remove('hidden'); renderModes(); };
  btnNo.onclick = () => { alert('No problem — come back when ready.'); };

  function renderModes(){
    modesDiv.innerHTML = '';
    const presets = schema.interaction_presets;
    for (const k of Object.keys(presets)){
      const m = presets[k];
      const div = elt('div','mode-card');
      div.innerHTML = `<h3>${k.replace(/_/g,' ')}</h3>
        <p class="small muted">${m.goal}</p>
        <p class="small">Time: ${m.duration_minutes} min · ${m.question_count[0]}–${m.question_count[1]} q</p>
        <div style="margin-top:8px;"><button class="btn" data-mode="${k}">Choose</button></div>`;
      modesDiv.appendChild(div);
    }

    // attach listeners
    modesDiv.querySelectorAll('button').forEach(b=>{
      b.onclick = (ev) => {
        const sel = ev.target.dataset.mode;
        selectedMode = sel;
        // compute question count target, mapping modes to tiers:
        setup.classList.add('hidden');
        calibration.classList.remove('hidden');
        renderCalibration();
      };
    });
  }

  // calibration
  function renderCalibration(){
    calPromptsDiv.innerHTML = '';
    const prompts = schema.segment_3_ai_flow.flow_steps.find(s=>s.step_id==='calibration').sample_prompts;
    prompts.forEach((p,idx)=>{
      const block = elt('div');
      block.innerHTML = `<label class="small muted">Warm-up ${idx+1}</label>
        <p>${p}</p>
        <textarea data-warmup-index="${idx}" rows="3" placeholder="Type a short answer..."></textarea>`;
      calPromptsDiv.appendChild(block);
    });
  }

  btnCalNext.onclick = () => {
    // capture calibration
    calibrationData = Array.from(calPromptsDiv.querySelectorAll('textarea')).map(t=>{
      return {text:t.value.trim(), length:t.value.trim().length, ts: Date.now()};
    });
    calibration.classList.add('hidden');
    startQuestionFlow();
  };

  // start questions flow
  function startQuestionFlow(){
    // pick tier from selectedMode
    let tierCode = 'Tier_1';
    if(selectedMode.includes('Deep')) tierCode = 'Tier_2';
    if(selectedMode.includes('Full')) tierCode = 'Tier_3';
    // gather question list
    questionList = schema.question_bank[tierCode] ? [...schema.question_bank[tierCode]] : [];
    // If selectedMode Quick but Tier_1 has many questions, trim to minimal
    const qcountRange = schema.interaction_presets[selectedMode].question_count;
    if(questionList.length > qcountRange[1]) questionList = questionList.slice(0, qcountRange[1]);
    currentIndex = 0;
    transcript = []; // reset
    qTotalEl.textContent = questionList.length;
    qpanel.classList.remove('hidden');
    renderQuestion();
  }

  function renderQuestion(){
    if(currentIndex >= questionList.length){
      // move to micro reflection
      qpanel.classList.add('hidden');
      runMicroReflection();
      return;
    }
    const q = questionList[currentIndex];
    qIndexEl.textContent = currentIndex+1;
    qDomainEl.textContent = `${q.domain}`;
    qPromptEl.textContent = q.prompt;
    responseText.value = '';
    // reset ratings
    [rateDepth, rateOrig, rateClarity, rateSA, rateAdapt].forEach(r=>r.value=3);
    adaptiveHint.textContent = '';
    startTime = Date.now();
  }

  // simple adaptive hint engine (minimal)
  function computeAdaptiveHintForPrev(resp){
    // If user answer short (<40 chars) and slider originality high → suggest expand
    const len = (resp || '').length;
    const hint = [];
    if(len < 40) hint.push('Try adding an example or concrete detail to deepen the answer.');
    if(len > 400) hint.push('Nice detail — consider summarizing the key insight in 1-2 sentences.');
    return hint.join(' ');
  }

  btnSubmit.onclick = () => {
    submitCurrent(false);
  };
  btnSkip.onclick = () => {
    submitCurrent(true);
  };

  function submitCurrent(skipped=false){
    const q = questionList[currentIndex];
    const respText = responseText.value.trim();
    const endTime = Date.now();
    const latencySec = Math.round((endTime - startTime)/1000);
    // collect self-ratings
    const selfRatings = {
      Depth: +rateDepth.value,
      Originality: +rateOrig.value,
      Clarity: +rateClarity.value,
      Self_Awareness: +rateSA.value,
      Adaptability: +rateAdapt.value
    };

    // autoscore heuristics (simple and transparent)
    // heuristic: length and sentence count boost depth & clarity; use self-ratings as primary
    const heuristics = {
      length: respText.length,
      sentences: respText.split(/[.!?]+/).filter(s=>s.trim()).length
    };
    // weighted score combine self-ratings + a small heuristic boost
    const combined = Object.fromEntries(Object.keys(selfRatings).map(k=>{
      // heuristic boost: if sentences > 2 add 0.3, if length>200 add 0.4
      let boost = 0;
      if(heuristics.sentences > 2) boost += 0.3;
      if(heuristics.length > 200) boost += 0.4;
      const raw = selfRatings[k] + boost;
      const clipped = Math.max(1, Math.min(5, raw));
      return [k, Number(clipped.toFixed(2))];
    }));

    const record = {
      question_id: q.id,
      domain: q.domain,
      prompt: q.prompt,
      user_response: respText,
      skipped: skipped,
      timestamp: new Date().toISOString(),
      latency_seconds: latencySec,
      self_ratings: selfRatings,
      combined_ratings: combined,
      heuristics
    };

    // append to transcript
    transcript.push(record);

    // adaptive hint
    const adhint = computeAdaptiveHintForPrev(respText);
    adaptiveHint.textContent = adhint;

    // store and next
    currentIndex++;
    // minimal adaptive branching: if combined originality >=4 and clarity <=2 => insert a clarifying prompt
    if(record.combined_ratings.Originality >= 4 && record.combined_ratings.Clarity <= 2){
      // insert a clarifying short prompt right after current index
      questionList.splice(currentIndex, 0, {
        id: `${q.id}_clarify`,
        domain: q.domain,
        prompt: "I noticed strong novelty. Could you give a concrete example that illustrates your idea?"
      });
      qTotalEl.textContent = questionList.length;
    }

    renderQuestion();
  }

  // micro reflection loop: pick two prior answers
  function runMicroReflection(){
    microRef.classList.remove('hidden');
    const picks = transcript.length >= 2 ? [transcript[0], transcript[Math.max(0, transcript.length-1)]] : transcript.slice(-2);
    const excerpt = picks.map(p=>`• ${p.question_id}: ${p.user_response ? p.user_response.slice(0,140) : '[skipped]'}`).join('\n\n');
    microPrompt.textContent = `Earlier you wrote:\n\n${excerpt}\n\nWith what we've done so far, choose one of the above and briefly re-describe it (what changed or what you'd emphasize now).`;
  }

  btnMicroSubmit.onclick = () => {
    const x = microResponse.value.trim();
    if(!x){
      alert('A short reflection helps the report—type 1–3 sentences.');
      return;
    }
    // store reflection as a transcript item
    transcript.push({
      question_id: 'MICRO_REFLECTION',
      domain: 'Meta_Awareness',
      prompt: 'Micro reflection',
      user_response: x,
      timestamp: new Date().toISOString(),
      latency_seconds: 0,
      self_ratings: null,
      combined_ratings: null,
      heuristics: {}
    });
    microRef.classList.add('hidden');
    completion.classList.remove('hidden');
    id('completion-text').textContent = 'You completed the session. Generate your personalized dashboard and transcript when ready.';
  };

  btnGenerate.onclick = () => {
    // compute domain aggregates (from combined_ratings where available)
    const domains = {};
    const counts = {};
    const metricKeys = ['Depth','Originality','Clarity','Self_Awareness','Adaptability'];
    transcript.forEach(item=>{
      if(!item.combined_ratings) return;
      const dom = item.domain;
      if(!domains[dom]) { domains[dom] = {Depth:0,Originality:0,Clarity:0,Self_Awareness:0,Adaptability:0}; counts[dom]=0; }
      metricKeys.forEach(k=> domains[dom][k] += (item.combined_ratings[k] || 0));
      counts[dom] ++;
    });
    // compute averages scaled to 0-100
    const domain_scores = {};
    for(const dom of Object.keys(schema.domains)){
      if(!domains[dom] || counts[dom]===0){
        domain_scores[dom] = {score: null, details: null, confidence: 0};
        continue;
      }
      const avgMetrics = {};
      Object.keys(domains[dom]).forEach(k=> avgMetrics[k] = domains[dom][k] / counts[dom]);
      // use weighting_by_domain to compute domain score
      const weights = schema.scoring_logic.weighting_by_domain[dom] || {Depth:0.25,Originality:0.25,Clarity:0.25,Self_Awareness:0.25,Adaptability:0};
      let weightedSum = 0;
      let totalW = 0;
      for(const m of Object.keys(avgMetrics)){
        const w = weights[m] || 0;
        weightedSum += (avgMetrics[m] * w);
        totalW += w;
      }
      const norm = totalW > 0 ? (weightedSum / totalW) : 0; // 1-5 scale
      const scaled = Math.round(((norm - 1) / 4) * 100); // map 1..5 -> 0..100
      domain_scores[dom] = {score: scaled, details: avgMetrics, confidence: Math.min(0.99, 0.5 + (counts[dom]*0.05))};
    }

    // MCQ: mean of available domain scores, apply tier factor
    const availableScores = Object.values(domain_scores).map(d=>d.score).filter(v=>v !== null);
    const meanDomain = availableScores.length ? (availableScores.reduce((a,b)=>a+b,0)/availableScores.length) : 0;
    // pick tier factor from difficulty_tiers mapping using selectedMode
    let tierFactor = 1.0;
    if(selectedMode.includes('Quick')) tierFactor = schema.difficulty_tiers.Tier_1.tier_scaling_factor;
    if(selectedMode.includes('Deep')) tierFactor = schema.difficulty_tiers.Tier_2.tier_scaling_factor;
    if(selectedMode.includes('Full')) tierFactor = schema.difficulty_tiers.Tier_3.tier_scaling_factor;
    const MCQ = Math.round(Math.max(0, Math.min(100, meanDomain * tierFactor)));

    // archetype mapping (simple buckets)
    const archeRanges = schema.scoring_logic.archetype_mapping.ranges;
    let archetypeLabel = 'Unknown';
    const r = MCQ;
    if(r <= 39) archetypeLabel = archeRanges['0-39'];
    else if(r <= 59) archetypeLabel = archeRanges['40-59'];
    else if(r <= 79) archetypeLabel = archeRanges['60-79'];
    else archetypeLabel = archeRanges['80-100'];

    const dashboard = {
      generated_at: new Date().toISOString(),
      mode: selectedMode,
      MCQ,
      domain_scores,
      dominant_archetype: archetypeLabel,
      developmental_level: archetypeLabel,
      overall_confidence: Math.round((availableScores.length>0? (availableScores.reduce((a,b)=>a+b,0)/availableScores.length)/100 : 0)*100),
      recommended_actions: generateRecommendations(domain_scores)
    };

    // show dashboard
    dashboardBlock.textContent = JSON.stringify(dashboard, null, 2);
    completion.classList.add('hidden');
    report.classList.remove('hidden');

    // store for downloads
    window.__mcif_report = {dashboard, transcript};
  };

  btnDownloadDashboard.onclick = () => {
    const blob = new Blob([JSON.stringify(window.__mcif_report.dashboard, null, 2)], {type:'application/json'});
    downloadBlob(blob, 'dashboard.json');
  };
  btnDownloadTranscript.onclick = () => {
    const blob = new Blob([JSON.stringify(window.__mcif_report.transcript, null, 2)], {type:'application/json'});
    downloadBlob(blob, 'transcript.json');
  };

  btnStartOver.onclick = () => location.reload();

  // utilities
  function id(s){ return document.getElementById(s); }
  function elt(tag, cls){ const e=document.createElement(tag); if(cls) e.className=cls; return e; }
  function downloadBlob(blob, filename){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function generateRecommendations(domain_scores){
    const rec = [];
    for(const [dom, info] of Object.entries(domain_scores)){
      if(info.score === null){
        rec.push({domain: dom, note: 'Insufficient data — try answering more questions in this domain.'});
        continue;
      }
      if(info.score < 40) rec.push({domain: dom, note: 'Practice micro-reflection: re-describe one of your recent answers in 3 sentences.'});
      else if(info.score < 70) rec.push({domain: dom, note: 'Try targeted micro-exercises: 10-minute focused creation or reverse-engineering tasks.'});
      else rec.push({domain: dom, note: 'Strength — maintain by deliberate practice: teach your idea to someone in 5 minutes.'});
    }
    return rec;
  }

})();