// The "world" is a large shared coordinate space. It has no visible boundary —
// these dimensions just set a sensible extent for "fit" / "reset" operations
// and keep coordinates bounded enough to feel anchored.
export const WORLD_WIDTH = 4000;
export const WORLD_HEIGHT = 3000;

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 5;

export type Viewport = {
  scale: number;
  x: number;
  y: number;
};

export function clampScale(scale: number): number {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
}

// Default view: 1:1 scale, screen centered on the middle of the world.
// This means every client starts looking at the same shared region.
export function defaultViewport(viewWidth: number, viewHeight: number): Viewport {
  return {
    scale: 1,
    x: viewWidth / 2 - WORLD_WIDTH / 2,
    y: viewHeight / 2 - WORLD_HEIGHT / 2,
  };
}

// "Fit": zoom out so the whole world fits in the viewport.
export function fitViewport(viewWidth: number, viewHeight: number): Viewport {
  const scale = clampScale(Math.min(viewWidth / WORLD_WIDTH, viewHeight / WORLD_HEIGHT));
  return {
    scale,
    x: (viewWidth - WORLD_WIDTH * scale) / 2,
    y: (viewHeight - WORLD_HEIGHT * scale) / 2,
  };
}
