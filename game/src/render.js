// Drawing only: world state and the current screen in, pixels out. The 1280x720 cavern is
// scaled to fit the window and centred, the margin filled with the backdrop colour. The cavern
// dressing (stars, rock walls, the jagged floor) is generated once from a fixed seed, so every
// frame and every screenshot shows the same mine. Text holding a number is rebuilt only when
// the number changes, so a frame allocates (almost) nothing.
import { COMBO, FIELD, FONT, LIVES, PALETTE } from './config.js';
import { KIND_CRYSTAL, multiplierFor } from './world.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 660, top: 128, line: 36, bottom: 76 };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

/** Dressing for the cavern, rolled once from a seed that never changes. */
function buildScenery() {
  const random = createRandom(20261116);
  const stars = [];
  for (let index = 0; index < 130; index += 1) {
    stars.push({ x: random() * FIELD.width, y: random() * FIELD.floorY, r: 0.8 + random() * 1.7, phase: random() * Math.PI * 2 });
  }
  const wall = (mirror) => {
    const points = [];
    for (let y = 0; y <= FIELD.height; y += 56) {
      const inset = 14 + random() * 66;
      points.push({ x: mirror ? FIELD.width - inset : inset, y });
    }
    return points;
  };
  const floorEdge = [];
  for (let x = 0; x <= FIELD.width; x += 64) {
    floorEdge.push({ x, y: FIELD.floorY + (random() * 12 - 6) });
  }
  const shards = [];
  for (let index = 0; index < 9; index += 1) {
    shards.push({ x: 40 + random() * (FIELD.width - 80), y: FIELD.floorY + 16 + random() * 22, r: 4 + random() * 5 });
  }
  return { stars, leftWall: wall(false), rightWall: wall(true), floorEdge, shards };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scenery = buildScenery();
  const sky = context.createLinearGradient(0, 0, 0, FIELD.height);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(1, PALETTE.skyBottom);

  const scoreLabel = cachedLabel('SCORE ');
  const levelLabel = cachedLabel('LEVEL ');
  const comboLabel = cachedLabel('COMBO x');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function diamond(x, y, radius, color) {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(x, y - radius);
    context.lineTo(x + radius, y);
    context.lineTo(x, y + radius);
    context.lineTo(x - radius, y);
    context.closePath();
    context.fill();
  }

  function roundedRect(x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  function drawScenery(state) {
    context.fillStyle = sky;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const star of scenery.stars) {
      context.globalAlpha = 0.4 + 0.35 * (0.5 + 0.5 * Math.sin(state.elapsed * 1.4 + star.phase));
      context.fillStyle = PALETTE.text;
      context.fillRect(star.x, star.y, star.r, star.r);
    }
    context.globalAlpha = 1;
    for (const wall of [scenery.leftWall, scenery.rightWall]) {
      context.fillStyle = PALETTE.rock;
      context.beginPath();
      const fromLeft = wall === scenery.leftWall;
      context.moveTo(fromLeft ? 0 : FIELD.width, 0);
      for (const point of wall) context.lineTo(point.x, point.y);
      context.lineTo(fromLeft ? 0 : FIELD.width, FIELD.height);
      context.closePath();
      context.fill();
      context.strokeStyle = PALETTE.rockEdge;
      context.lineWidth = 3;
      context.beginPath();
      wall.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.stroke();
    }
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, FIELD.floorY, FIELD.width, FIELD.height - FIELD.floorY);
    context.strokeStyle = PALETTE.floorEdge;
    context.lineWidth = 3;
    context.beginPath();
    scenery.floorEdge.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.stroke();
    for (const shard of scenery.shards) diamond(shard.x, shard.y, shard.r, PALETTE.rockEdge);
  }

  function drawCrystal(item, state) {
    const bob = 1 + 0.09 * Math.sin(state.elapsed * 3 + item.phase);
    const radius = item.radius * bob;
    context.globalAlpha = 0.16;
    diamond(item.x, item.y, radius * 2, PALETTE.crystal);
    context.globalAlpha = 1;
    diamond(item.x, item.y, radius, PALETTE.crystal);
    diamond(item.x, item.y, radius * 0.52, PALETTE.crystalCore);
  }

  function drawMeteor(item) {
    const radius = item.radius;
    context.globalAlpha = 0.3;
    context.fillStyle = PALETTE.meteorGlow;
    context.beginPath();
    context.moveTo(item.x - radius * 0.55, item.y - radius * 0.4);
    context.lineTo(item.x + radius * 0.55, item.y - radius * 0.4);
    context.lineTo(item.x, item.y - radius * 2.4);
    context.closePath();
    context.fill();
    context.globalAlpha = 1;
    context.fillStyle = PALETTE.meteor;
    context.beginPath();
    context.arc(item.x, item.y, radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.meteorDark;
    const craters = [
      [-0.3, -0.2, 0.3],
      [0.28, 0.12, 0.22],
      [-0.05, 0.38, 0.18],
    ];
    for (const [ox, oy, oradius] of craters) {
      const angle = item.spin + ox * 4;
      const cx = item.x + Math.cos(angle) * radius * 0.45 + ox * radius * 0.4;
      const cy = item.y + Math.sin(angle) * radius * 0.45 + oy * radius * 0.4;
      context.beginPath();
      context.arc(cx, cy, radius * oradius, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawPod(state) {
    const pod = state.pod;
    // Blink while invulnerable after a hit: hidden on every other tenth of a second.
    if (pod.invulnerable > 0 && Math.floor(pod.invulnerable * 10) % 2 === 0) return;
    const flicker = 13 + 5 * Math.sin(state.elapsed * 31);
    context.globalAlpha = 0.85;
    context.fillStyle = PALETTE.flame;
    context.beginPath();
    context.moveTo(pod.x - 7, pod.y + 15);
    context.lineTo(pod.x + 7, pod.y + 15);
    context.lineTo(pod.x, pod.y + 15 + flicker);
    context.closePath();
    context.fill();
    context.globalAlpha = 1;
    context.fillStyle = PALETTE.podDark;
    context.beginPath();
    context.moveTo(pod.x - 6, pod.y + 17);
    context.lineTo(pod.x + 6, pod.y + 17);
    context.lineTo(pod.x, pod.y + 27);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.pod;
    roundedRect(pod.x - 23, pod.y - 12, 46, 27, 9);
    context.fill();
    context.fillStyle = PALETTE.dome;
    context.beginPath();
    context.arc(pod.x, pod.y - 10, 11, Math.PI, 0);
    context.fill();
    context.fillStyle = PALETTE.text;
    context.beginPath();
    context.arc(pod.x - 4, pod.y - 15, 3, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.podDark;
    context.fillRect(pod.x - 23, pod.y + 9, 46, 4);
  }

  function drawItems(state) {
    for (const item of state.items) {
      if (!item.active) continue;
      if (item.kind === KIND_CRYSTAL) drawCrystal(item, state);
      else drawMeteor(item);
    }
  }

  function drawHud(state, muted) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 26, 20, 30, PALETTE.text, 'left');
    text(levelLabel(state.level), FIELD.width / 2, 20, 30, PALETTE.text, 'center');
    if (state.combo >= 2 && state.comboTimer > 0) {
      text(comboLabel(multiplierFor(state.combo)), 26, 58, 22, PALETTE.accent, 'left');
      context.fillStyle = PALETTE.panel;
      context.fillRect(26, 88, 130, 6);
      context.fillStyle = PALETTE.accent;
      context.fillRect(26, 88, 130 * (state.comboTimer / COMBO.window), 6);
    }
    const podY = 40;
    for (let life = 0; life < LIVES; life += 1) {
      const cx = FIELD.width - 34 - (LIVES - 1 - life) * 42;
      context.fillStyle = life < state.lives ? PALETTE.pod : PALETTE.rock;
      context.beginPath();
      context.arc(cx, podY, 13, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = life < state.lives ? PALETTE.dome : PALETTE.rockEdge;
      context.beginPath();
      context.arc(cx, podY - 3, 6, Math.PI, 0);
      context.fill();
    }
    text('LIVES', FIELD.width - 26, 58, 16, PALETTE.muted, 'right');
    if (muted) text('MUTED — M TO UNMUTE', FIELD.width - 26, FIELD.height - 30, 16, PALETTE.muted, 'right');
  }

  function drawPanel(title, lines, prompt, titleSize = 52) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    roundedRect(x, y, PANEL.width, height, 14);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    roundedRect(x, y, PANEL.width, height, 14);
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 80, titleSize, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 24, PALETTE.accent, 'center');
  }

  const TITLE_LINES = [
    'Steer the pod with the arrow keys, WASD, or the mouse.',
    'Gather teal crystals — chain them fast to grow your combo.',
    'Dodge the meteors. Three hits and the pod is scrap.',
    '',
  ];
  const PAUSED_LINES = ['The storm will wait for you.'];
  const OVER_LINES = ['', ''];

  /** Paint one frame: cavern, falling things, pod, then the HUD or a panel for the screen. */
  function draw(state, screen, best, muted) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawScenery(state);
    drawItems(state);
    drawPod(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[3] = bestLabel(best);
      drawPanel('METEOR MINER', TITLE_LINES, 'Click or press Enter to start');
      return;
    }
    drawHud(state, muted);
    if (screen === SCREEN_PAUSED) drawPanel('PAUSED', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      drawPanel('GAME OVER', OVER_LINES, 'Press R or click to fly again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
