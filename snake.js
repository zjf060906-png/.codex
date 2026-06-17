const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const COLORS = {
  bg: '#f6f2e8',
  board: '#fffdf6',
  grid: '#e7dcc6',
  text: '#202124',
  muted: '#706a5f',
  snake: '#2d7d46',
  snakeHead: '#1d5f36',
  food: '#d94a38',
  button: '#202124',
  buttonText: '#ffffff',
  panel: 'rgba(255, 253, 246, 0.9)'
};

const GRID_COUNT = 20;
const STEP_MS = 125;
const START_LENGTH = 4;
const BEST_KEY = 'snake-h5-best-score';

let width = 0;
let height = 0;
let dpr = 1;
let cell = 16;
let boardSize = 320;
let boardX = 0;
let boardY = 96;
let buttons = {};

let state = 'ready';
let score = 0;
let bestScore = Number(localStorage.getItem(BEST_KEY) || 0);
let snake = [];
let food = { x: 12, y: 10 };
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let lastStepAt = 0;
let pointerStart = null;

resize();
resetGame();
bindInput();
requestAnimationFrame(loop);

function resize() {
  dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
  width = Math.floor(window.innerWidth);
  height = Math.floor(window.innerHeight);

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const topBar = Math.max(86, Math.floor(height * 0.12));
  const bottomBar = Math.max(116, Math.floor(height * 0.16));
  cell = Math.floor(Math.min(width - 24, height - topBar - bottomBar) / GRID_COUNT);
  cell = Math.max(12, cell);
  boardSize = cell * GRID_COUNT;
  boardX = Math.floor((width - boardSize) / 2);
  boardY = Math.floor(topBar);

  const buttonGap = 10;
  const buttonX = 18;
  const buttonW = Math.floor((width - buttonX * 2 - buttonGap * 2) / 3);
  const buttonY = Math.min(height - 82, boardY + boardSize + 28);
  buttons = {
    pause: rect(buttonX, buttonY, buttonW, 46, 'PAUSE'),
    start: rect(buttonX + buttonW + buttonGap, buttonY, buttonW, 46, 'START'),
    restart: rect(buttonX + (buttonW + buttonGap) * 2, buttonY, buttonW, 46, 'RESTART')
  };
}

function rect(x, y, w, h, label) {
  return { x, y, w, h, label };
}

function resetGame() {
  const startX = 8;
  const startY = 10;
  snake = [];

  for (let i = 0; i < START_LENGTH; i += 1) {
    snake.push({ x: startX - i, y: startY });
  }

  score = 0;
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  spawnFood();
  lastStepAt = 0;
}

function startGame() {
  if (state === 'gameover') {
    resetGame();
  }

  state = 'running';
}

function pauseGame() {
  if (state === 'running') {
    state = 'paused';
  } else if (state === 'paused') {
    state = 'running';
  }
}

function restartGame() {
  resetGame();
  state = 'running';
}

function bindInput() {
  window.addEventListener('resize', resize);

  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    pointerStart = { x: event.clientX, y: event.clientY };
    handleButtonPress(event.clientX, event.clientY);
  });

  canvas.addEventListener('pointerup', (event) => {
    event.preventDefault();
    if (!pointerStart) return;

    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      setDirection(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
    } else {
      setDirection(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
    }
  });

  window.addEventListener('keydown', (event) => {
    const keyMap = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      w: { x: 0, y: -1 },
      s: { x: 0, y: 1 },
      a: { x: -1, y: 0 },
      d: { x: 1, y: 0 }
    };

    if (keyMap[event.key]) {
      event.preventDefault();
      setDirection(keyMap[event.key]);
    } else if (event.key === ' ') {
      event.preventDefault();
      pauseGame();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      startGame();
    }
  });
}

function handleButtonPress(x, y) {
  if (hit(buttons.start, x, y)) {
    startGame();
  } else if (hit(buttons.pause, x, y)) {
    pauseGame();
  } else if (hit(buttons.restart, x, y)) {
    restartGame();
  }
}

function hit(button, x, y) {
  return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h;
}

function setDirection(next) {
  if (state !== 'running') return;
  if (next.x + direction.x === 0 && next.y + direction.y === 0) return;
  nextDirection = next;
}

function loop(timestamp) {
  if (state === 'running' && timestamp - lastStepAt >= STEP_MS) {
    step();
    lastStepAt = timestamp;
  }

  draw();
  requestAnimationFrame(loop);
}

function step() {
  direction = nextDirection;

  const head = snake[0];
  const nextHead = {
    x: head.x + direction.x,
    y: head.y + direction.y
  };

  if (isWallCollision(nextHead) || isSnakeCollision(nextHead)) {
    state = 'gameover';
    saveBestScore();
    return;
  }

  snake.unshift(nextHead);

  if (nextHead.x === food.x && nextHead.y === food.y) {
    score += 1;
    saveBestScore();
    spawnFood();
  } else {
    snake.pop();
  }
}

function saveBestScore() {
  bestScore = Math.max(bestScore, score);
  localStorage.setItem(BEST_KEY, String(bestScore));
}

function isWallCollision(cellPos) {
  return cellPos.x < 0 || cellPos.x >= GRID_COUNT || cellPos.y < 0 || cellPos.y >= GRID_COUNT;
}

function isSnakeCollision(cellPos) {
  return snake.some((part) => part.x === cellPos.x && part.y === cellPos.y);
}

function spawnFood() {
  const freeCells = [];

  for (let y = 0; y < GRID_COUNT; y += 1) {
    for (let x = 0; x < GRID_COUNT; x += 1) {
      if (!snake.some((part) => part.x === x && part.y === y)) {
        freeCells.push({ x, y });
      }
    }
  }

  food = freeCells[Math.floor(Math.random() * freeCells.length)] || { x: 0, y: 0 };
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, height);

  drawHeader();
  drawBoard();
  drawSnake();
  drawFood();
  drawButtons();
  drawOverlay();
}

function drawHeader() {
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 28px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Snake', 24, Math.max(20, boardY - 68));

  ctx.font = '600 16px sans-serif';
  ctx.fillStyle = COLORS.muted;
  ctx.textAlign = 'right';
  ctx.fillText(`Score ${score}`, width - 24, Math.max(22, boardY - 66));
  ctx.fillText(`Best ${bestScore}`, width - 24, Math.max(48, boardY - 40));
}

function drawBoard() {
  roundRect(boardX, boardY, boardSize, boardSize, 8, COLORS.board);

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;

  for (let i = 1; i < GRID_COUNT; i += 1) {
    const x = boardX + i * cell;
    ctx.beginPath();
    ctx.moveTo(x, boardY);
    ctx.lineTo(x, boardY + boardSize);
    ctx.stroke();

    const y = boardY + i * cell;
    ctx.beginPath();
    ctx.moveTo(boardX, y);
    ctx.lineTo(boardX + boardSize, y);
    ctx.stroke();
  }
}

function drawSnake() {
  snake.forEach((part, index) => {
    const padding = index === 0 ? 2 : 3;
    ctx.fillStyle = index === 0 ? COLORS.snakeHead : COLORS.snake;
    roundRect(
      boardX + part.x * cell + padding,
      boardY + part.y * cell + padding,
      cell - padding * 2,
      cell - padding * 2,
      5,
      ctx.fillStyle
    );
  });
}

function drawFood() {
  const cx = boardX + food.x * cell + cell / 2;
  const cy = boardY + food.y * cell + cell / 2;
  ctx.fillStyle = COLORS.food;
  ctx.beginPath();
  ctx.arc(cx, cy, cell * 0.34, 0, Math.PI * 2);
  ctx.fill();
}

function drawButtons() {
  buttons.start.label = state === 'ready' || state === 'gameover' ? 'START' : 'PLAYING';
  buttons.pause.label = state === 'paused' ? 'RESUME' : 'PAUSE';

  drawButton(buttons.start, state === 'running');
  drawButton(buttons.pause, state === 'ready' || state === 'gameover');
  drawButton(buttons.restart, false);
}

function drawButton(button, disabled) {
  ctx.globalAlpha = disabled ? 0.42 : 1;
  roundRect(button.x, button.y, button.w, button.h, 8, COLORS.button);
  ctx.globalAlpha = 1;

  ctx.fillStyle = COLORS.buttonText;
  ctx.font = '700 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(button.label, button.x + button.w / 2, button.y + button.h / 2);
}

function drawOverlay() {
  if (state === 'running') return;

  const messages = {
    ready: ['Ready?', 'Swipe to steer. Tap START.'],
    paused: ['Paused', 'Tap RESUME to continue.'],
    gameover: ['Game Over', 'Tap START or RESTART.']
  };

  const [title, subtitle] = messages[state] || messages.ready;
  const panelW = Math.min(width - 48, 286);
  const panelH = 112;
  const panelX = (width - panelW) / 2;
  const panelY = boardY + boardSize / 2 - panelH / 2;

  roundRect(panelX, panelY, panelW, panelH, 10, COLORS.panel);
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, width / 2, panelY + 42);

  ctx.fillStyle = COLORS.muted;
  ctx.font = '500 14px sans-serif';
  ctx.fillText(subtitle, width / 2, panelY + 74);
}

function roundRect(x, y, w, h, r, fillStyle) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
  ctx.fill();
}
