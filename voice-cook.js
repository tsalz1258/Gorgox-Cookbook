/* MyCuisine — Enhanced Voice Cook Mode Add-On
   Adds: better voice selection, hands-free timers, progress bar,
   better speak controls, and voice commands for cook mode.

   Commands:
   next page, next step, back, previous, speak, repeat, ingredients,
   timer 5 minutes, how much time left, cancel timer, stop speaking,
   stop listening, close cook mode.
*/
(function () {
  const AUTO_KEY = "mycuisine.voice.autoSpeak";
  const VOICE_RATE_KEY = "mycuisine.voice.rate";
  const VOICE_PITCH_KEY = "mycuisine.voice.pitch";

  let recognition = null;
  let listening = false;
  let restart = false;
  let timerId = null;
  let timerEnd = null;
  let timerLabel = "";
  let timerInterval = null;
  let lastCommand = "";
  let preferredVoice = null;

  const numberWords = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
    fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
    nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
    "twenty five": 25, twentyfive: 25, "thirty five": 35, thirtyfive: 35,
    "forty five": 45, fortyfive: 45
  };

  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  function clean(v) { return String(v || "").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim(); }

  function injectStyles() {
    if (qs("#mcVoiceStyles")) return;
    const style = document.createElement("style");
    style.id = "mcVoiceStyles";
    style.textContent = `
      .mc-voice-panel{margin-top:18px;border:1px solid var(--border,rgba(255,255,255,.14));background:linear-gradient(145deg,var(--card,rgba(255,255,255,.04)),var(--card2,rgba(255,255,255,.06)));border-radius:24px;padding:16px;box-shadow:var(--shadow,0 18px 60px rgba(0,0,0,.24))}
      .mc-voice-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}
      .mc-voice-title{font-family:"Cormorant Garamond",serif;font-size:30px;line-height:1;color:var(--text,inherit)}
      .mc-voice-sub{margin-top:5px;font-size:12px;line-height:1.55;color:var(--muted,rgba(255,255,255,.62))}
      .mc-voice-controls{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
      .mc-voice-status{border-radius:14px;padding:10px 12px;background:var(--card2,rgba(255,255,255,.06));color:var(--muted,rgba(255,255,255,.68));font-size:12px;line-height:1.5;margin-top:10px}
      .mc-voice-commands{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
      .mc-command-pill{border:1px solid var(--border,rgba(255,255,255,.10));background:var(--card2,rgba(255,255,255,.06));color:var(--muted,rgba(255,255,255,.68));border-radius:999px;padding:6px 9px;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
      .mc-voice-toggle{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,rgba(255,255,255,.68));user-select:none;white-space:nowrap}
      .mc-voice-toggle input{width:16px;height:16px;accent-color:var(--terracotta,#b66a3c)}
      .mc-voice-dot{width:9px;height:9px;border-radius:50%;display:inline-block;background:var(--soft,rgba(255,255,255,.34));margin-right:7px}
      .mc-voice-dot.on{background:#22c55e;box-shadow:0 0 0 6px rgba(34,197,94,.10)}
      .mc-progress-wrap{margin:16px 0 12px;border:1px solid var(--border,rgba(255,255,255,.12));background:var(--card2,rgba(255,255,255,.06));border-radius:999px;height:13px;overflow:hidden;position:relative}
      .mc-progress-bar{height:100%;width:0%;background:linear-gradient(90deg,var(--wine,#661f2c),var(--terracotta,#b66a3c),var(--gold,#c9a86a));border-radius:999px;transition:width .35s cubic-bezier(.22,1,.36,1)}
      .mc-progress-label{display:flex;justify-content:space-between;gap:12px;color:var(--muted);font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
      .mc-timer-dock{display:none;margin-top:12px;border:1px solid rgba(201,168,106,.32);background:rgba(201,168,106,.10);border-radius:18px;padding:13px 14px;align-items:center;justify-content:space-between;gap:14px;color:var(--text)}
      .mc-timer-dock.show{display:flex}
      .mc-timer-main{font-family:"Cormorant Garamond",serif;font-size:28px;line-height:1}
      .mc-timer-sub{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-top:4px;font-weight:800}
      .mc-slider-row{display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap}
      .mc-slider-row label{font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
      .mc-slider-row input[type="range"]{width:120px;accent-color:var(--terracotta,#b66a3c)}
      @media(max-width:700px){.mc-voice-top,.mc-timer-dock{flex-direction:column;align-items:stretch}.mc-voice-controls .btn{flex:1}}
    `;
    document.head.appendChild(style);
  }

  function setStatus(msg) {
    const el = qs("#mcVoiceStatus");
    if (el) el.innerHTML = `<span class="mc-voice-dot ${listening ? "on" : ""}"></span>${msg}`;
  }

  function loadVoices() {
    if (!("speechSynthesis" in window)) return [];
    const voices = window.speechSynthesis.getVoices() || [];
    const preferredNames = [
      "Samantha", "Karen", "Moira", "Tessa", "Victoria", "Google US English",
      "Google UK English Female", "Microsoft Jenny", "Microsoft Aria", "Microsoft Emma",
      "Microsoft Ava", "Microsoft Guy", "Daniel", "Alex"
    ];

    preferredVoice = preferredNames
      .map(name => voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()) && /^en/i.test(v.lang)))
      .find(Boolean) || voices.find(v => /^en-US/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang)) || voices[0] || null;

    return voices;
  }

  if ("speechSynthesis" in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  function voiceRate() {
    return Number(localStorage.getItem(VOICE_RATE_KEY) || "0.92");
  }

  function voicePitch() {
    return Number(localStorage.getItem(VOICE_PITCH_KEY) || "1.03");
  }

  function speak(text, options = {}) {
    if (!("speechSynthesis" in window)) {
      setStatus("Text-to-speech is not supported in this browser.");
      return;
    }

    const msg = String(text || "").replace(/\s+/g, " ").trim();
    if (!msg) return;

    window.speechSynthesis.cancel();
    loadVoices();

    const utter = new SpeechSynthesisUtterance(msg);
    utter.rate = options.rate || voiceRate();
    utter.pitch = options.pitch || voicePitch();
    utter.volume = 1;
    if (preferredVoice) utter.voice = preferredVoice;
    window.speechSynthesis.speak(utter);
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setStatus("Speaking stopped.");
  }

  function ensurePanel() {
    const cookMode = qs("#cookMode");
    if (!cookMode) return;
    injectStyles();
    ensureProgress();
    ensureTimerDock();
    if (qs("#mcVoicePanel")) return;

    const panel = document.createElement("section");
    panel.id = "mcVoicePanel";
    panel.className = "mc-voice-panel";
    panel.innerHTML = `
      <div class="mc-voice-top">
        <div>
          <div class="mc-voice-title">Voice Cook Mode</div>
          <div class="mc-voice-sub">Hands-free cooking with better voice reading, timers, and step control.</div>
        </div>
        <label class="mc-voice-toggle"><input type="checkbox" id="mcAutoSpeak"> Auto Speak</label>
      </div>
      <div class="mc-voice-controls">
        <button class="btn btn-primary" type="button" id="mcVoiceStart">Start Voice</button>
        <button class="btn btn-soft" type="button" id="mcVoiceStop">Stop Voice</button>
        <button class="btn btn-gold" type="button" id="mcSpeakStep">Speak Step</button>
        <button class="btn btn-soft" type="button" id="mcSpeakIngredients">Ingredients</button>
      </div>
      <div class="mc-slider-row">
        <label for="mcVoiceRate">Voice speed</label>
        <input id="mcVoiceRate" type="range" min="0.75" max="1.15" step="0.01" value="${voiceRate()}">
        <label for="mcVoicePitch">Tone</label>
        <input id="mcVoicePitch" type="range" min="0.85" max="1.2" step="0.01" value="${voicePitch()}">
      </div>
      <div class="mc-voice-status" id="mcVoiceStatus"><span class="mc-voice-dot"></span>Voice control is off.</div>
      <div class="mc-voice-commands">
        <span class="mc-command-pill">next page</span>
        <span class="mc-command-pill">back</span>
        <span class="mc-command-pill">speak</span>
        <span class="mc-command-pill">ingredients</span>
        <span class="mc-command-pill">timer 5 minutes</span>
        <span class="mc-command-pill">time left</span>
        <span class="mc-command-pill">cancel timer</span>
        <span class="mc-command-pill">close</span>
      </div>
    `;

    const actions = qs(".cook-actions", cookMode) || cookMode;
    actions.insertAdjacentElement("afterend", panel);

    const auto = qs("#mcAutoSpeak");
    if (auto) {
      auto.checked = localStorage.getItem(AUTO_KEY) === "yes";
      auto.addEventListener("change", () => localStorage.setItem(AUTO_KEY, auto.checked ? "yes" : "no"));
    }

    qs("#mcVoiceRate")?.addEventListener("input", e => localStorage.setItem(VOICE_RATE_KEY, e.target.value));
    qs("#mcVoicePitch")?.addEventListener("input", e => localStorage.setItem(VOICE_PITCH_KEY, e.target.value));
    qs("#mcVoiceStart")?.addEventListener("click", startListening);
    qs("#mcVoiceStop")?.addEventListener("click", stopListening);
    qs("#mcSpeakStep")?.addEventListener("click", speakStep);
    qs("#mcSpeakIngredients")?.addEventListener("click", speakIngredients);

    qs("#cookNext")?.addEventListener("click", () => setTimeout(() => { updateProgress(); if (autoSpeak()) speakStep(); }, 150));
    qs("#cookPrev")?.addEventListener("click", () => setTimeout(() => { updateProgress(); if (autoSpeak()) speakStep(); }, 150));
    qs("#cookClose")?.addEventListener("click", () => { stopListening(); stopSpeaking(); });
  }

  function ensureProgress() {
    const cookStep = qs("#cookStep");
    if (!cookStep || qs("#mcProgressBlock")) return;
    const block = document.createElement("div");
    block.id = "mcProgressBlock";
    block.innerHTML = `
      <div class="mc-progress-label"><span>Cooking Progress</span><span id="mcProgressText">Step 1</span></div>
      <div class="mc-progress-wrap"><div class="mc-progress-bar" id="mcProgressBar"></div></div>
    `;
    cookStep.insertAdjacentElement("beforebegin", block);
    updateProgress();
  }

  function parseCounter() {
    const raw = qs("#cookCounter")?.textContent || "";
    const m = raw.match(/(\d+)\s*\/\s*(\d+)/);
    if (m) return { current: Number(m[1]), total: Number(m[2]) };
    return { current: 1, total: 1 };
  }

  function updateProgress() {
    const { current, total } = parseCounter();
    const pct = total ? Math.max(0, Math.min(100, (current / total) * 100)) : 0;
    const bar = qs("#mcProgressBar");
    const text = qs("#mcProgressText");
    if (bar) bar.style.width = `${pct}%`;
    if (text) text.textContent = `Step ${current} of ${total}`;
  }

  function ensureTimerDock() {
    const panel = qs("#cookMode");
    if (!panel || qs("#mcTimerDock")) return;
    const dock = document.createElement("div");
    dock.id = "mcTimerDock";
    dock.className = "mc-timer-dock";
    dock.innerHTML = `
      <div><div class="mc-timer-main" id="mcTimerTime">00:00</div><div class="mc-timer-sub" id="mcTimerLabel">Timer</div></div>
      <div class="mc-voice-controls" style="margin:0"><button class="btn btn-soft" id="mcTimerSpeak" type="button">Time Left</button><button class="btn btn-danger" id="mcTimerCancel" type="button">Cancel</button></div>
    `;
    const progress = qs("#mcProgressBlock") || qs("#cookStep") || panel;
    progress.insertAdjacentElement("beforebegin", dock);
    qs("#mcTimerSpeak")?.addEventListener("click", speakTimeLeft);
    qs("#mcTimerCancel")?.addEventListener("click", cancelTimer);
  }

  function autoSpeak() { return qs("#mcAutoSpeak")?.checked === true; }

  function currentStepText() {
    const { current, total } = parseCounter();
    const step = qs("#cookStep")?.textContent?.trim() || "";
    return step ? `Step ${current} of ${total}. ${step}` : `I do not see a current step yet.`;
  }

  function speakStep() {
    ensurePanel();
    updateProgress();
    speak(currentStepText());
    setStatus("Reading the current step.");
  }

  function getIngredients() {
    const modal = qs("#modalBody");
    const fromModal = modal ? qsa(".ingredient,.ingredient-pill,[data-ingredient],.ingredient-list li", modal).map(x => x.textContent.trim()).filter(Boolean) : [];
    if (fromModal.length) return [...new Set(fromModal)].slice(0, 30);
    return [...new Set(qsa(".ingredient,.ingredient-pill,[data-ingredient],.ingredient-list li").map(x => x.textContent.trim()).filter(Boolean))].slice(0, 30);
  }

  function speakIngredients() {
    const ingredients = getIngredients();
    if (!ingredients.length) {
      speak("I do not see the ingredient list right now. Open the recipe first, then start cook mode.");
      setStatus("Ingredient list was not found.");
      return;
    }
    speak(`Ingredients. ${ingredients.join(". ")}.`);
    setStatus("Reading ingredients.");
  }

  function nextStep() {
    qs("#cookNext")?.click();
    setTimeout(updateProgress, 80);
    setStatus("Next step.");
    if (autoSpeak()) setTimeout(speakStep, 180);
  }

  function previousStep() {
    qs("#cookPrev")?.click();
    setTimeout(updateProgress, 80);
    setStatus("Previous step.");
    if (autoSpeak()) setTimeout(speakStep, 180);
  }

  function closeCookMode() {
    stopListening();
    stopSpeaking();
    qs("#cookClose")?.click();
  }

  function parseTimer(command) {
    let m = command.match(/timer(?: for)? (\d+) (second|seconds|sec|secs|minute|minutes|min|mins)/);
    if (m) return { amount: Number(m[1]), unit: m[2].startsWith("sec") ? "seconds" : "minutes" };
    m = command.match(/timer(?: for)? ([a-z\s]+?) (second|seconds|sec|secs|minute|minutes|min|mins)/);
    if (m) {
      const word = m[1].trim();
      return { amount: numberWords[word] || numberWords[word.replace(/\s+/g, "")] || null, unit: m[2].startsWith("sec") ? "seconds" : "minutes" };
    }
    return null;
  }

  function formatRemaining(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const min = Math.floor(total / 60);
    const sec = total % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  function updateTimerDock() {
    ensureTimerDock();
    const dock = qs("#mcTimerDock");
    if (!timerEnd) {
      dock?.classList.remove("show");
      return;
    }
    const remaining = timerEnd - Date.now();
    qs("#mcTimerTime").textContent = formatRemaining(remaining);
    qs("#mcTimerLabel").textContent = timerLabel || "Timer";
    dock?.classList.add("show");
  }

  function startTimer(command) {
    const parsed = parseTimer(command);
    if (!parsed || !parsed.amount) {
      speak("Tell me a timer amount, like timer five minutes.");
      setStatus("Timer command needs a time amount.");
      return;
    }

    cancelTimer(false);
    const ms = parsed.unit === "seconds" ? parsed.amount * 1000 : parsed.amount * 60000;
    timerLabel = `${parsed.amount} ${parsed.unit}`;
    timerEnd = Date.now() + ms;
    speak(`Timer started for ${timerLabel}.`);
    setStatus(`Timer started for ${timerLabel}.`);
    updateTimerDock();

    timerInterval = setInterval(updateTimerDock, 500);
    timerId = setTimeout(() => {
      timerId = null;
      timerEnd = null;
      clearInterval(timerInterval);
      timerInterval = null;
      updateTimerDock();
      ringTimer();
      speak(`Your ${timerLabel} timer is done.`);
      setStatus(`Timer done: ${timerLabel}.`);
      alert(`MyCuisine timer done: ${timerLabel}`);
    }, ms);
  }

  function speakTimeLeft() {
    if (!timerEnd) {
      speak("No timer is running.");
      setStatus("No timer is running.");
      return;
    }
    const remaining = timerEnd - Date.now();
    const total = Math.max(0, Math.ceil(remaining / 1000));
    const min = Math.floor(total / 60);
    const sec = total % 60;
    const text = min > 0 ? `${min} minutes and ${sec} seconds left.` : `${sec} seconds left.`;
    speak(text);
    setStatus(text);
  }

  function cancelTimer(announce = true) {
    if (timerId) clearTimeout(timerId);
    if (timerInterval) clearInterval(timerInterval);
    timerId = null;
    timerInterval = null;
    timerEnd = null;
    timerLabel = "";
    updateTimerDock();
    if (announce) {
      speak("Timer canceled.");
      setStatus("Timer canceled.");
    }
  }

  function ringTimer() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      [0, 0.18, 0.36].forEach(offset => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        gain.gain.value = 0.12;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.12);
      });
    } catch (_) {}
  }

  function handleCommand(transcript) {
    const command = clean(transcript);
    if (!command || command === lastCommand) return;
    lastCommand = command;
    setTimeout(() => { if (lastCommand === command) lastCommand = ""; }, 1200);

    if (command.includes("stop speaking") || command.includes("stop reading") || command === "quiet") return stopSpeaking();
    if (command.includes("stop listening") || command.includes("voice off") || command.includes("turn off mic")) return stopListening();
    if (command.includes("next page") || command.includes("next step") || command === "next" || command.includes("continue")) return nextStep();
    if (command.includes("previous") || command.includes("go back") || command.includes("last step") || command === "back") return previousStep();
    if (command.includes("speak") || command.includes("read step") || command.includes("read this") || command.includes("repeat")) return speakStep();
    if (command.includes("ingredients") || command.includes("ingredient list")) return speakIngredients();
    if (command.includes("how much time") || command.includes("time left") || command.includes("timer left")) return speakTimeLeft();
    if (command.includes("cancel timer") || command.includes("stop timer") || command.includes("clear timer")) return cancelTimer();
    if (command.includes("timer")) return startTimer(command);
    if (command.includes("close cook mode") || command === "close" || command.includes("exit cook mode")) return closeCookMode();
    if (command.includes("commands") || command.includes("what can i say")) {
      speak("You can say next page, back, speak, repeat, ingredients, timer five minutes, how much time is left, cancel timer, stop speaking, stop listening, or close cook mode.");
      return setStatus("Reading available commands.");
    }
    setStatus(`Heard: "${transcript}". Say next, back, speak, ingredients, or timer.`);
  }

  function makeRecognition() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return null;
    const rec = new Recognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = e => {
      const last = e.results[e.results.length - 1];
      if (last && last[0]) handleCommand(last[0].transcript);
    };
    rec.onerror = e => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        listening = false;
        setStatus("Microphone permission was blocked. Allow microphone access to use voice commands.");
      } else {
        setStatus(`Voice error: ${e.error || "unknown"}.`);
      }
    };
    rec.onend = () => {
      if (listening && !restart) {
        restart = true;
        setTimeout(() => {
          restart = false;
          try { rec.start(); } catch (_) {}
        }, 400);
      }
    };
    return rec;
  }

  function startListening() {
    ensurePanel();
    if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      setStatus("Voice commands are not supported in this browser. You can still use Speak Step.");
      speak("Voice commands are not supported in this browser. You can still use Speak Step.");
      return;
    }
    if (!recognition) recognition = makeRecognition();
    try {
      listening = true;
      recognition.start();
      setStatus("Listening. Say next, back, speak, ingredients, timer, or close.");
      speak("Voice control started.");
    } catch (_) {
      listening = true;
      setStatus("Listening. Say next, back, speak, ingredients, timer, or close.");
    }
  }

  function stopListening() {
    listening = false;
    restart = false;
    try { recognition && recognition.stop(); } catch (_) {}
    setStatus("Voice control is off.");
  }

  function init() {
    ensurePanel();

    document.addEventListener("click", e => {
      if (e.target?.id === "startCookMode" || e.target?.closest?.("#startCookMode")) {
        setTimeout(() => {
          ensurePanel();
          updateProgress();
          if (autoSpeak()) speakStep();
        }, 350);
      }
    });

    const cookMode = qs("#cookMode");
    if (cookMode) {
      const observer = new MutationObserver(() => {
        ensurePanel();
        updateProgress();
        updateTimerDock();
      });
      observer.observe(cookMode, { attributes: true, childList: true, subtree: true });
    }

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        stopListening();
        stopSpeaking();
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
