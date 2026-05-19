var API_BASE = window.API_BASE || '';

const STATE = { IDLE: 0, WAITING: 1, READY: 2, CLICKED: 3, FINISHED: 4 };

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const setupEl = document.getElementById('setup');
const gameEl = document.getElementById('game');
const resultEl = document.getElementById('result');
const overlayEl = document.getElementById('gameOverlay');
const nameInput = document.getElementById('nameInput');
const startBtn = document.getElementById('startBtn');
const submitBtn = document.getElementById('submitBtn');
const retryBtn = document.getElementById('retryBtn');

let gameState = STATE.IDLE;
let round = 0;
let times = [];
let bestTime = Infinity;
let roundStartTime = 0;
let readyTime = 0;
let timeoutId = null;
let playerName = '';

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawText(text, size, color, yOffset = 0) {
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.font = `${size}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + yOffset);
}

function drawTarget(x, y) {
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Ripple
  const time = Date.now() / 1000;
  const ripple = 30 + Math.sin(time * 6) * 8;
  ctx.beginPath();
  ctx.arc(x * w, y * h, ripple + 20, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fill();

  // Outer ring
  ctx.beginPath();
  ctx.arc(x * w, y * h, 55, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fill();

  // Inner circle
  ctx.beginPath();
  ctx.arc(x * w, y * h, 40, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();

  // Center dot
  ctx.beginPath();
  ctx.arc(x * w, y * h, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#e94560';
  ctx.fill();
}

function setOverlay(text) {
  overlayEl.textContent = text;
  overlayEl.classList.remove('hidden');
}

function hideOverlay() {
  overlayEl.classList.add('hidden');
}

function startRound() {
  if (round >= 5) {
    finishGame();
    return;
  }

  gameState = STATE.WAITING;
  canvas.className = 'waiting';
  hideOverlay();
  resizeCanvas();
  drawText('Wait...', 32, 'rgba(255,255,255,0.8)');

  roundStartTime = performance.now();
  const delay = 1000 + Math.random() * 3000; // 1-4s random
  timeoutId = setTimeout(() => {
    gameState = STATE.READY;
    canvas.className = 'ready';
    readyTime = performance.now();
    const x = 0.2 + Math.random() * 0.6;
    const y = 0.2 + Math.random() * 0.6;
    canvas.dataset.tx = x;
    canvas.dataset.ty = y;
    drawTarget(x, y);
    setOverlay('TAP!');
  }, delay);
}

function handleClick() {
  if (gameState === STATE.WAITING) {
    // Too early!
    clearTimeout(timeoutId);
    gameState = STATE.CLICKED;
    canvas.className = 'clicked';
    resizeCanvas();
    drawText('Too early!', 28, '#fff', -20);
    hideOverlay();
    times.push(0); // 0 = foul
    setTimeout(() => {
      round++;
      document.getElementById('roundNum').textContent = round + 1;
      startRound();
    }, 1200);
    return;
  }

  if (gameState !== STATE.READY) return;

  const reaction = Math.round(performance.now() - readyTime);
  gameState = STATE.CLICKED;
  canvas.className = 'clicked';
  hideOverlay();

  resizeCanvas();
  drawText(`${reaction}ms`, 40, '#fff', -16);

  times.push(reaction);
  if (reaction < bestTime) {
    bestTime = reaction;
    document.getElementById('bestTime').textContent = bestTime;
  }

  round++;
  document.getElementById('roundNum').textContent = Math.min(round + 1, 5);

  setTimeout(() => startRound(), 1000);
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handleClick();
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
});

startBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    nameInput.style.borderColor = '#e94560';
    setTimeout(() => { nameInput.style.borderColor = ''; }, 600);
    return;
  }
  playerName = name;
  startGame();
});

nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startBtn.click();
});

function startGame() {
  setupEl.classList.add('hidden');
  gameEl.classList.remove('hidden');
  resultEl.classList.add('hidden');
  round = 0;
  times = [];
  bestTime = Infinity;
  document.getElementById('roundNum').textContent = '1';
  document.getElementById('bestTime').textContent = '--';
  resizeCanvas();
  startRound();
}

function finishGame() {
  gameState = STATE.FINISHED;
  gameEl.classList.add('hidden');
  resultEl.classList.remove('hidden');
  submitBtn.disabled = false;

  const validTimes = times.filter((t) => t > 0);
  const avg = validTimes.length
    ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
    : 0;

  const timesEl = document.getElementById('times');
  timesEl.innerHTML = times
    .map((t, i) => {
      const cls = t === 0 ? 'style="color:#e94560"' : '';
      const label = t === 0 ? 'Foul' : `${t}ms`;
      return `<span ${cls}>R${i + 1}: ${label}</span>`;
    })
    .join('');

  document.getElementById('avgTime').textContent = avg || '--';
  canvas.dataset.avg = avg || '0';
}

function saveScoreLocal(name, score) {
  const scores = JSON.parse(localStorage.getItem('rs_scores') || '[]');
  scores.push({ name, score, date: new Date().toISOString() });
  scores.sort((a, b) => a.score - b.score);
  localStorage.setItem('rs_scores', JSON.stringify(scores.slice(0, 50)));
}

function getLocalLeaderboard() {
  return JSON.parse(localStorage.getItem('rs_scores') || '[]').slice(0, 20);
}

submitBtn.addEventListener('click', async () => {
  const avg = parseInt(canvas.dataset.avg) || 0;
  if (avg === 0) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    const res = await fetch(`${API_BASE}/api/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: playerName, score: avg }),
    });
    if (res.ok) {
      submitBtn.textContent = 'Submitted!';
      loadLeaderboard();
      return;
    }
  } catch {
    // Server unavailable, fall back to local storage
  }

  saveScoreLocal(playerName, avg);
  submitBtn.textContent = 'Saved Locally';
  renderLeaderboard(getLocalLeaderboard());
});

retryBtn.addEventListener('click', () => {
  resultEl.classList.add('hidden');
  setupEl.classList.remove('hidden');
  nameInput.focus();
});

function renderLeaderboard(scores) {
  const tbody = document.getElementById('leaderboardBody');
  const empty = document.getElementById('leaderboardEmpty');
  if (!scores.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  tbody.innerHTML = scores
    .map(
      (s, i) =>
        `<tr><td>${i + 1}</td><td>${escapeHtml(s.name)}</td><td>${s.score}</td></tr>`
    )
    .join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadLeaderboard() {
  try {
    const res = await fetch(`${API_BASE}/api/leaderboard`);
    const data = await res.json();
    renderLeaderboard(data);
  } catch {
    renderLeaderboard(getLocalLeaderboard());
  }
}

window.addEventListener('resize', () => {
  if (gameState === STATE.WAITING || gameState === STATE.CLICKED) {
    resizeCanvas();
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

loadLeaderboard();
resizeCanvas();
