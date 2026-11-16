// Meteor Miner's tuning sheet. The playfield is a fixed 1280x720 logical cavern; the renderer
// scales it to whatever window it finds, so nothing below cares about the real screen size.

export const FIELD = { width: 1280, height: 720, floorY: 678 };

/** The simulation's fixed step, in seconds: 60 updates a second at any display rate. */
export const STEP = 1 / 60;

export const POD = {
  radius: 20,
  speed: 430,
  /** Seconds of blinking safety after a meteor connects. */
  invulnerable: 1.6,
};

export const LIVES = 3;

export const METEOR = {
  minRadius: 13,
  maxRadius: 30,
  speed: 250,
  speedPerLevel: 26,
  speedJitter: 110,
  /** Meteors do not fall quite straight: each one drifts sideways by up to this much. */
  drift: 46,
  interval: 0.62,
  intervalScale: 0.9,
  minInterval: 0.16,
};

export const CRYSTAL = {
  radius: 13,
  speed: 120,
  speedPerLevel: 8,
  interval: 1.15,
  intervalJitter: 0.7,
  /** Points for a crystal before the combo multiplier is applied. */
  basePoints: 10,
  /** How fast a falling crystal sways from side to side, in px per second at the sway's peak. */
  sway: 20,
};

/** Chain crystals quickly: each one gathered while the timer runs raises the multiplier. */
export const COMBO = { window: 2.6, max: 8 };

/** A new level every 20 seconds: the storm thickens until the last level, then holds. */
export const LEVEL = { seconds: 20, max: 15 };

/** Meteors and crystals share one pool, allocated once at boot; nothing spawns garbage later. */
export const POOL_SIZE = 72;

export const PALETTE = {
  backdrop: '#070a12',
  skyTop: '#0d1626',
  skyBottom: '#131126',
  rock: '#1c1530',
  rockEdge: '#2a2142',
  floor: '#241a30',
  floorEdge: '#3a2b4d',
  pod: '#ffb347',
  podDark: '#d97f26',
  dome: '#a8dcf0',
  flame: '#ff7847',
  meteor: '#8a5a3b',
  meteorDark: '#5f3d26',
  meteorGlow: '#ff9a5c',
  crystal: '#2fe8c4',
  crystalCore: '#c2fff2',
  panel: '#151f30',
  panelEdge: '#2e4258',
  text: '#f2f5f9',
  muted: '#93a1b5',
  accent: '#ffd166',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score sleeps between visits (this browser only). */
export const BEST_KEY = 'meteor-miner.best';
