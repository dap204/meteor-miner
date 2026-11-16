// Meteor Miner's rules and state, with no drawing and no browser in it: the pod, a shared pool
// of falling meteors and crystals, spawning, collisions, the combo chain, lives and levels.
// step() advances one fixed step and reports what happened as bit flags, so the caller can play
// sounds and announce events without the world knowing about screens. Nothing here allocates
// after createWorld returns.
import { COMBO, CRYSTAL, FIELD, LEVEL, LIVES, METEOR, POD, POOL_SIZE } from './config.js';

export const KIND_METEOR = 0;
export const KIND_CRYSTAL = 1;

export const EVENT_COLLECT = 1;
export const EVENT_HIT = 2;
export const EVENT_LEVEL = 4;
export const EVENT_OVER = 8;

/** The score multiplier a chain of `combo` quick crystals earns, capped by the config. */
export function multiplierFor(combo) {
  return Math.min(Math.max(combo, 1), COMBO.max);
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

export function createWorld(random) {
  const pod = { x: 0, y: 0, radius: POD.radius, invulnerable: 0 };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({ active: false, kind: KIND_METEOR, x: 0, y: 0, radius: 0, speed: 0, drift: 0, spin: 0, phase: 0 });
  }
  const state = {
    pod,
    items,
    score: 0,
    lives: LIVES,
    level: 1,
    elapsed: 0,
    combo: 0,
    comboTimer: 0,
    meteorTimer: 0,
    crystalTimer: 0,
  };

  function reset() {
    pod.x = FIELD.width / 2;
    pod.y = FIELD.height * 0.62;
    pod.invulnerable = 0;
    for (const item of items) item.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.elapsed = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.meteorTimer = METEOR.interval;
    state.crystalTimer = CRYSTAL.interval * 0.5;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) if (!items[index].active) return items[index];
    return null;
  }

  function spawnMeteor() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_METEOR;
    item.radius = METEOR.minRadius + random() * (METEOR.maxRadius - METEOR.minRadius);
    item.x = item.radius + random() * (FIELD.width - item.radius * 2);
    item.y = -item.radius;
    item.speed = METEOR.speed + METEOR.speedPerLevel * (state.level - 1) + random() * METEOR.speedJitter;
    item.drift = (random() * 2 - 1) * METEOR.drift;
    item.spin = random() * Math.PI * 2;
    item.phase = 0;
  }

  function spawnCrystal() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_CRYSTAL;
    item.radius = CRYSTAL.radius;
    item.x = item.radius + random() * (FIELD.width - item.radius * 2);
    item.y = -item.radius;
    item.speed = CRYSTAL.speed + CRYSTAL.speedPerLevel * (state.level - 1);
    item.drift = 0;
    item.spin = 0;
    item.phase = random() * Math.PI * 2;
  }

  function meteorInterval() {
    return Math.max(METEOR.minInterval, METEOR.interval * METEOR.intervalScale ** (state.level - 1));
  }

  /**
   * Put one item of `kind` at an exact spot with an exact fall speed. The live game never calls
   * this; the screenshot scenes use it to guarantee a frame worth looking at.
   */
  function placeItem(kind, x, y, speed, radius) {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = kind;
    item.x = x;
    item.y = y;
    item.speed = speed;
    item.radius = radius;
    item.drift = 0;
    item.spin = 0.6;
    item.phase = 1.1;
  }

  /**
   * One fixed step. `steer` is the wanted direction, each axis -1..1 (the pod flies freely in
   * the cavern). With `harmless` set (the title screen's backdrop) things fall and drift but
   * nothing can touch the pod and nothing scores.
   */
  function step(dt, steer, harmless) {
    let events = 0;
    state.elapsed += dt;

    const newLevel = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));
    if (newLevel !== state.level) {
      state.level = newLevel;
      events |= EVENT_LEVEL;
    }

    if (state.comboTimer > 0) {
      state.comboTimer = Math.max(0, state.comboTimer - dt);
      if (state.comboTimer === 0) state.combo = 0;
    }
    if (pod.invulnerable > 0) pod.invulnerable = Math.max(0, pod.invulnerable - dt);

    let moveX = steer.x;
    let moveY = steer.y;
    const length = Math.hypot(moveX, moveY);
    if (length > 1) {
      moveX /= length;
      moveY /= length;
    }
    pod.x = clamp(pod.x + moveX * POD.speed * dt, pod.radius, FIELD.width - pod.radius);
    pod.y = clamp(pod.y + moveY * POD.speed * dt, pod.radius, FIELD.floorY - pod.radius);

    state.meteorTimer -= dt;
    if (state.meteorTimer <= 0) {
      spawnMeteor();
      state.meteorTimer += meteorInterval();
    }
    state.crystalTimer -= dt;
    if (state.crystalTimer <= 0) {
      spawnCrystal();
      state.crystalTimer += CRYSTAL.interval + random() * CRYSTAL.intervalJitter;
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.y += item.speed * dt;
      if (item.kind === KIND_METEOR) {
        item.x += item.drift * dt;
        item.spin += dt * 1.7;
        if (item.x < item.radius) {
          item.x = item.radius;
          item.drift = Math.abs(item.drift);
        } else if (item.x > FIELD.width - item.radius) {
          item.x = FIELD.width - item.radius;
          item.drift = -Math.abs(item.drift);
        }
      } else {
        item.x = clamp(item.x + Math.sin(state.elapsed * 2.2 + item.phase) * CRYSTAL.sway * dt, item.radius, FIELD.width - item.radius);
      }
      if (item.y - item.radius > FIELD.floorY) {
        item.active = false;
        continue;
      }
      if (harmless) continue;
      const dx = item.x - pod.x;
      const dy = item.y - pod.y;
      const reach = item.radius + pod.radius;
      if (dx * dx + dy * dy >= reach * reach) continue;
      if (item.kind === KIND_CRYSTAL) {
        item.active = false;
        state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
        state.comboTimer = COMBO.window;
        state.score += CRYSTAL.basePoints * multiplierFor(state.combo);
        events |= EVENT_COLLECT;
      } else if (pod.invulnerable === 0) {
        item.active = false;
        state.lives -= 1;
        state.combo = 0;
        state.comboTimer = 0;
        pod.invulnerable = POD.invulnerable;
        events |= EVENT_HIT;
        if (state.lives === 0) {
          events |= EVENT_OVER;
          break;
        }
      }
    }
    return events;
  }

  reset();
  return { state, reset, step, placeItem };
}
