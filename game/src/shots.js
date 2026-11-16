// The scenes behind ?shot=start|play|end. Each one plays Meteor Miner's real rules forward from
// a fresh world for a fixed stretch, steered by a look-ahead autopilot: it tries a fan of
// headings, rolls each one forward a short while, and picks the heading that stays clear of
// meteors while ending nearest the next crystal. The play scene's pilot looks far ahead and
// flies well; the end scene's barely looks at all and never dodges, so the storm catches it, as
// it catches a greedy player. Same seed, same scene, every time.
import { CRYSTAL, FIELD, POD, STEP } from './config.js';
import { EVENT_OVER, KIND_CRYSTAL, KIND_METEOR } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 4.5;
const PLAY_SECONDS = 20;
const END_LIMIT_SECONDS = 600;
const HORIZON_PLAY = 0.55;
const HORIZON_END = 0.15;
const SAMPLE = 0.09;
/** Breathing room the careful pilot insists on around every meteor, in px. */
const MARGIN = 26;

const HEADINGS = [{ x: 0, y: 0 }];
for (let index = 0; index < 16; index += 1) {
  const angle = (index / 16) * Math.PI * 2;
  HEADINGS.push({ x: Math.cos(angle), y: Math.sin(angle) });
}

function nearestCrystal(state) {
  let best = null;
  let bestDistance = Infinity;
  for (const item of state.items) {
    if (!item.active || item.kind !== KIND_CRYSTAL) continue;
    const distance = Math.hypot(item.x - state.pod.x, item.y - state.pod.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = item;
    }
  }
  return best;
}

/** How bad one heading is: a big penalty for a forecast collision, plus the distance it ends from the target. */
function gradeHeading(state, heading, horizon, dodge) {
  const pod = state.pod;
  const target = nearestCrystal(state);
  const targetX = target === null ? FIELD.width / 2 : target.x;
  const targetY = target === null ? FIELD.height * 0.55 : target.y;
  let penalty = 0;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const px = Math.min(FIELD.width - pod.radius, Math.max(pod.radius, pod.x + heading.x * POD.speed * t));
    const py = Math.min(FIELD.floorY - pod.radius, Math.max(pod.radius, pod.y + heading.y * POD.speed * t));
    if (!dodge) break;
    for (const item of state.items) {
      if (!item.active || item.kind !== KIND_METEOR) continue;
      const mx = item.x + item.drift * t;
      const my = item.y + item.speed * t;
      const reach = item.radius + pod.radius + MARGIN;
      const dx = mx - px;
      const dy = my - py;
      if (dx * dx + dy * dy < reach * reach) penalty += (horizon - t + SAMPLE) * 4000;
    }
  }
  const endX = Math.min(FIELD.width - pod.radius, Math.max(pod.radius, pod.x + heading.x * POD.speed * horizon));
  const endY = Math.min(FIELD.floorY - pod.radius, Math.max(pod.radius, pod.y + heading.y * POD.speed * horizon));
  return penalty + Math.hypot(targetX - endX, targetY - endY);
}

function autopilot(state, horizon, dodge) {
  let best = HEADINGS[0];
  let bestGrade = Infinity;
  for (const heading of HEADINGS) {
    const grade = gradeHeading(state, heading, horizon, dodge);
    if (grade < bestGrade) {
      bestGrade = grade;
      best = heading;
    }
  }
  return best;
}

/** Guarantee the play frame is worth a screenshot: top up meteors or crystals if the run left few. */
function topUpScene(world) {
  const state = world.state;
  let meteors = 0;
  let crystals = 0;
  for (const item of state.items) {
    if (!item.active) continue;
    if (item.kind === KIND_METEOR) meteors += 1;
    else crystals += 1;
  }
  const away = (x, y) => Math.hypot(x - state.pod.x, y - state.pod.y) > 150;
  if (meteors < 3) {
    const spots = [
      [state.pod.x - 280, 140],
      [state.pod.x + 320, 90],
      [FIELD.width * 0.68, 250],
    ];
    for (const [x, y] of spots) {
      if (meteors >= 4) break;
      const cx = Math.min(FIELD.width - 40, Math.max(40, x));
      if (away(cx, y)) {
        world.placeItem(KIND_METEOR, cx, y, 300, 22);
        meteors += 1;
      }
    }
  }
  if (crystals < 2) {
    const spots = [
      [state.pod.x - 180, 330],
      [state.pod.x + 200, 430],
    ];
    for (const [x, y] of spots) {
      if (crystals >= 2) break;
      const cx = Math.min(FIELD.width - 30, Math.max(30, x));
      world.placeItem(KIND_CRYSTAL, cx, y, CRYSTAL.speed, CRYSTAL.radius);
      crystals += 1;
    }
  }
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    const still = { x: 0, y: 0 };
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, still, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
      if (world.step(STEP, autopilot(world.state, HORIZON_PLAY, true), false) & EVENT_OVER) break;
    }
    topUpScene(world);
    return { screen: world.state.lives === 0 ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
    if (world.step(STEP, autopilot(world.state, HORIZON_END, false), false) & EVENT_OVER) break;
  }
  return { screen: SCREEN_OVER, best: world.state.score };
}
