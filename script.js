// Secuencia de escenas y audio ambiental original.
// La banda sonora es sintetizada por el navegador; no utiliza una grabación comercial.
const movie = document.getElementById("movie");
const scenes = [...document.querySelectorAll(".scene")];
const replayBtn = document.getElementById("replayBtn");
const soundBtn = document.getElementById("soundBtn");
const openingBlack = document.getElementById("openingBlack");
const progressBar = document.getElementById("progressBar");

const sceneDurations = [7200, 7800, 10000, 9000, 7800, 7800, 32000];
const transitionDuration = 700;
const totalDuration = sceneDurations.reduce((total, duration) => total + duration, 0);
let currentScene = 0;
let sequenceTimer = null;
let progressTimer = null;
let audioContext = null;
let masterGain = null;
let musicTimer = null;
let soundEnabled = false;
let musicStep = 0;

function showScene(index) {
  scenes.forEach((scene, i) => {
    scene.classList.toggle("active", i === index);
    scene.classList.remove("leaving");
  });
  currentScene = index;
}

function advanceScene() {
  if (currentScene < scenes.length - 1) {
    const previousScene = scenes[currentScene];
    previousScene.classList.remove("active");
    previousScene.classList.add("leaving");
    currentScene++;
    scenes[currentScene].classList.add("active");
    movie.classList.remove("comic-hit");
    void movie.offsetWidth;
    movie.classList.add("comic-hit");
    setTimeout(() => movie.classList.remove("comic-hit"), transitionDuration);
    sequenceTimer = setTimeout(advanceScene, sceneDurations[currentScene]);
    setTimeout(() => previousScene.classList.remove("leaving"), transitionDuration);
    if (soundEnabled) playImpact();
  } else {
    sequenceTimer = null;
    clearInterval(progressTimer);
    progressBar.style.width = "100%";
  }
}

function startSequence() {
  clearTimeout(sequenceTimer);
  clearInterval(progressTimer);
  showScene(0);
  movie.classList.remove("comic-hit");
  openingBlack.style.animation = "none";
  void openingBlack.offsetWidth;
  openingBlack.style.animation = "";
  progressBar.style.width = "0%";

  // Reinicia animaciones internas de cada escena.
  document.querySelectorAll(".scene-credit,.city-bats,.signal-disc,.blueprint-sheet .blueprint-line,.blueprint-sheet .blueprint-detail,.blueprint-sheet .blueprint-dimension,.blueprint-heading,.blueprint-stamp,.batmobile,.speed-streaks,.batarang,.belt,.cowl,.alley-shadow,.alley-credit,.final-haze,.final-credits,.final-bat,.final-title,.final-subtitle,.credits-roll").forEach(el => {
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
  });

  if (soundEnabled) {
    startScore();
    setTimeout(playImpact, 900);
  }

  sequenceTimer = setTimeout(advanceScene, sceneDurations[0]);
  const startedAt = performance.now();
  progressTimer = setInterval(() => {
    const percent = Math.min(100, ((performance.now() - startedAt) / totalDuration) * 100);
    progressBar.style.width = percent + "%";
  }, 100);
}

// Audio original: capas graves, pulsos y golpes de impacto.
function setupAudio() {
  if (audioContext) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.0001;
  masterGain.connect(audioContext.destination);
}

function startScore() {
  setupAudio();
  if (audioContext.state === "suspended") audioContext.resume();
  masterGain.gain.cancelScheduledValues(audioContext.currentTime);
  masterGain.gain.setTargetAtTime(0.24, audioContext.currentTime, 1.1);
  clearInterval(musicTimer);

  const chordRoots = [55, 65.41, 73.42, 49];
  function chord() {
    if (!soundEnabled) return;
    const now = audioContext.currentTime;
    const root = chordRoots[musicStep % chordRoots.length];
    [root, root * 1.5, root * 2].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const filter = audioContext.createBiquadFilter();
      const gain = audioContext.createGain();
      oscillator.type = index === 0 ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, now);
      filter.type = "lowpass";
      filter.frequency.value = index === 0 ? 170 : 430;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.16 : 0.035, now + 1.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.3);
      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      oscillator.start(now);
      oscillator.stop(now + 4.4);
    });
    musicStep++;
  }
  chord();
  musicTimer = setInterval(chord, 3600);
}

function playImpact() {
  if (!soundEnabled || !audioContext) return;
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(105, now);
  osc.frequency.exponentialRampToValueAtTime(29, now + 0.75);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.28, now + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.92);

  // Breve ráfaga de ruido filtrado para simular trueno/impacto.
  const length = Math.floor(audioContext.sampleRate * 0.65);
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) channel[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const noise = audioContext.createBufferSource();
  const lowpass = audioContext.createBiquadFilter();
  const noiseGain = audioContext.createGain();
  noise.buffer = buffer;
  lowpass.type = "lowpass";
  lowpass.frequency.value = 550;
  noiseGain.gain.setValueAtTime(0.12, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
  noise.connect(lowpass);
  lowpass.connect(noiseGain);
  noiseGain.connect(masterGain);
  noise.start(now);
}

soundBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = soundEnabled ? "♫ SILENCIAR AUDIO" : "♫ ACTIVAR AUDIO";
  soundBtn.setAttribute("aria-pressed", String(soundEnabled));
  if (soundEnabled) {
    startScore();
    playImpact();
  } else {
    clearInterval(musicTimer);
    if (masterGain && audioContext) {
      masterGain.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.25);
    }
  }
});

replayBtn.addEventListener("click", startSequence);
startSequence();
