/* MyCuisine — Voice Cook Mode Add-On
   Commands: next page, next, back, previous, speak, repeat, ingredients,
   timer 5 minutes, stop speaking, stop listening, close cook mode.
*/
(function () {
  const AUTO_KEY = "mycuisine.voice.autoSpeak";
  let recognition = null;
  let listening = false;
  let restart = false;
  let timerId = null;
  let lastCommand = "";

  const numberWords = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15,
    twenty: 20, thirty: 30, forty: 40, "forty five": 45, fortyfive: 45,
    sixty: 60
  };

  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  function clean(v) { return String(v || "").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim(); }

  function setStatus(msg) {
    const el = qs("#mcVoiceStatus");
    if (el) el.innerHTML = `<span class="mc-voice-dot ${listening ? "on" : ""}"></span>${msg}`;
  }

  function injectStyles() {
    if (qs("#mcVoiceStyles")) return;
    const style = document.createElement("style");
    style.id = "mcVoiceStyles";
    style.textContent = `
      .mc-voice-panel{margin-top:18px;border:1px solid var(--border,rgba(255,255,255,.14));background:var(--card,rgba(255,255,255,.04));border-radius:22px;padding:16px;box-shadow:var(--shadow,0 18px 60px rgba(0,0,0,.24))}
      .mc-voice-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}
      .mc-voice-title{font-family:"Cormorant Garamond",serif;font-size:28px;line-height:1;color:var(--text,inherit)}
      .mc-voice-sub{margin-top:5px;font-size:12px;line-height:1.55;color:var(--muted,rgba(255,255,255,.62))}
      .mc-voice-controls{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
      .mc-voice-status{border-radius:14px;padding:10px 12px;background:var(--card2,rgba(255,255,255,.06));color:var(--muted,rgba(255,255,255,.68));font-size:12px;line-height:1.5;margin-top:10px}
      .mc-voice-commands{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
      .mc-command-pill{border:1px solid var(--border,rgba(255,255,255,.10));background:var(--card2,rgba(255,255,255,.06));color:var(--muted,rgba(255,255,255,.68));border-radius:999px;padding:6px 9px;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
      .mc-voice-toggle{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,rgba(255,255,255,.68));user-select:none}
      .mc-voice-toggle input{width:16px;height:16px;accent-color:var(--terracotta,#b66a3c)}
      .mc-voice-dot{width:9px;height:9px;border-radius:50%;display:inline-block;background:var(--soft,rgba(255,255,255,.34));margin-right:7px}
      .mc-voice-dot.on{background:#22c55e;box-shadow:0 0 0 6px rgba(34,197,94,.10)}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    const cookMode = qs("#cookMode");
    if (!cookMode) return;
    injectStyles();
    if (qs("#mcVoicePanel")) return;

    const panel = document.createElement("section");
    panel.id = "mcVoicePanel";
    panel.className = "mc-voice-panel";
    panel.innerHTML = `
      <div class="mc-voice-top">
        <div>
          <div class="mc-voice-title">Voice Cook Mode</div>
          <div class="mc-voice-sub">Start voice control while cooking, then talk to MyCuisine hands-free.</div>
        </div>
        <label class="mc-voice-toggle"><input type="checkbox" id="mcAutoSpeak"> Auto Speak</label>
      </div>
      <div class="mc-voice-controls">
        <button class="btn btn-primary" type="button" id="mcVoiceStart">Start Voice</button>
        <button class="btn btn-soft" type="button" id="mcVoiceStop">Stop Voice</button>
        <button class="btn btn-gold" type="button" id="mcSpeakStep">Speak Step</button>
        <button class="btn btn-soft" type="button" id="mcSpeakIngredients">Ingredients</button>
      </div>
      <div class="mc-voice-status" id="mcVoiceStatus"><span class="mc-voice-dot"></span>Voice control is off.</div>
      <div class="mc-voice-commands">
        <span class="mc-command-pill">next page</span>
        <span class="mc-command-pill">back</span>
        <span class="mc-command-pill">speak</span>
        <span class="mc-command-pill">repeat</span>
        <span class="mc-command-pill">ingredients</span>
        <span class="mc-command-pill">timer 5 minutes</span>
        <span class="mc-command-pill">stop speaking</span>
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

    qs("#mcVoiceStart")?.addEventListener("click", startListening);
    qs("#mcVoiceStop")?.addEventListener("click", stopListening);
    qs("#mcSpeakStep")?.addEventListener("click", speakStep);
    qs("#mcSpeakIngredients")?.addEventListener("click", speakIngredients);

    qs("#cookNext")?.addEventListener("click", () => setTimeout(() => { if (autoSpeak()) speakStep(); }, 250));
    qs("#cookPrev")?.addEventListener("click", () => setTimeout(() => { if (autoSpeak()) speakStep(); }, 250));
    qs("#cookClose")?.addEventListener("click", () => { stopListening(); stopSpeaking(); });
  }

  function autoSpeak() { return qs("#mcAutoSpeak")?.checked === true; }

  function speak(text) {
    if (!("speechSynthesis" in window)) {
      setStatus("Text-to-speech is not supported in this browser.");
      return;
    }
    const msg = String(text || "").replace(/\s+/g, " ").trim();
    if (!msg) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(msg);
    utter.rate = 0.94;
    utter.pitch = 1;
    utter.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => /english/i.test(v.lang) && /samantha|victoria|google us english|female/i.test(v.name)) || voices.find(v => /english/i.test(v.lang));
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setStatus("Speaking stopped.");
  }

  function currentStepText() {
    const title = qs("#cookTitle")?.textContent?.trim() || "Recipe";
    const counter = qs("#cookCounter")?.textContent?.trim() || "";
    const step = qs("#cookStep")?.textContent?.trim() || "";
    return step ? `${title}. ${counter}. ${step}` : `${title}. I do not see a current step yet.`;
  }

  function speakStep() {
    ensurePanel();
    speak(currentStepText());
    setStatus("Reading the current step.");
  }

  function getIngredients() {
    const modal = qs("#modalBody");
    const fromModal = modal ? qsa(".ingredient,.ingredient-pill,[data-ingredient]", modal).map(x => x.textContent.trim()).filter(Boolean) : [];
    if (fromModal.length) return [...new Set(fromModal)];
    return [...new Set(qsa(".ingredient,.ingredient-pill,[data-ingredient]").map(x => x.textContent.trim()).filter(Boolean))].slice(0, 20);
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
    setStatus("Next step.");
    if (autoSpeak()) setTimeout(speakStep, 250);
  }

  function previousStep() {
    qs("#cookPrev")?.click();
    setStatus("Previous step.");
    if (autoSpeak()) setTimeout(speakStep, 250);
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

  function startTimer(command) {
    const parsed = parseTimer(command);
    if (!parsed || !parsed.amount) {
      speak("Tell me a timer amount, like timer five minutes.");
      setStatus("Timer command needs a time amount.");
      return;
    }
    if (timerId) clearTimeout(timerId);
    const ms = parsed.unit === "seconds" ? parsed.amount * 1000 : parsed.amount * 60000;
    const label = `${parsed.amount} ${parsed.unit}`;
    speak(`Timer started for ${label}.`);
    setStatus(`Timer started for ${label}.`);
    timerId = setTimeout(() => {
      timerId = null;
      speak(`Your ${label} timer is done.`);
      setStatus(`Timer done: ${label}.`);
      alert(`MyCuisine timer done: ${label}`);
    }, ms);
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
    if (command.includes("timer")) return startTimer(command);
    if (command.includes("close cook mode") || command === "close" || command.includes("exit cook mode")) return closeCookMode();
    if (command.includes("commands") || command.includes("what can i say")) {
      speak("You can say next page, back, speak, repeat, ingredients, timer five minutes, stop speaking, stop listening, or close cook mode.");
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
          if (autoSpeak()) speakStep();
        }, 350);
      }
    });

    const cookMode = qs("#cookMode");
    if (cookMode) {
      const observer = new MutationObserver(() => ensurePanel());
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
