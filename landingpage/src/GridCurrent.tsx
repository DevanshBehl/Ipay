import { useEffect, useRef } from 'react';

/**
 * Animated white "current" sparks that travel along the hero background grid.
 * Each spark rides the 64px grid lines, occasionally turning at intersections,
 * dragging a glowing fading tail behind a bright head — like light running
 * through circuitry. Aligned to the same grid + radial mask as the hero.
 */

const CELL = 64;          // must match the hero grid background-size (64px)
const TRAIL = 190;        // tail length in px
const SPEED_MIN = 90;     // px / second
const SPEED_MAX = 190;
const TURN_CHANCE = 0.28; // odds of turning 90° at an intersection

type Dir = { dx: -1 | 0 | 1; dy: -1 | 0 | 1 };
const DIRS: Dir[] = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
];

type Spark = {
  x: number;            // head position (css px)
  y: number;
  dir: Dir;
  speed: number;
  trail: { x: number; y: number }[]; // vertices, head last
  life: number;         // seconds remaining
};

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export default function GridCurrent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let sparks: Spark[] = [];
    let raf = 0;
    let last = performance.now();

    const snap = (v: number) => Math.round(v / CELL) * CELL;

    const spawn = (): Spark => {
      const dir = DIRS[(Math.random() * DIRS.length) | 0];
      // start on a grid intersection somewhere inside the viewport
      const x = snap(rand(0, w));
      const y = snap(rand(0, h));
      return {
        x,
        y,
        dir,
        speed: rand(SPEED_MIN, SPEED_MAX),
        trail: [{ x, y }],
        life: rand(6, 14),
      };
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // density scales with area, kept modest
      const count = Math.max(6, Math.min(20, Math.round((w * h) / 90000)));
      sparks = Array.from({ length: count }, spawn);
    };

    // advance a spark's head, handling grid-node turns
    const step = (s: Spark, dt: number) => {
      let remaining = s.speed * dt;

      while (remaining > 0) {
        // next grid intersection ahead along the current direction
        const nx = s.dir.dx !== 0
          ? (s.dir.dx > 0 ? Math.floor(s.x / CELL) + 1 : Math.ceil(s.x / CELL) - 1) * CELL
          : s.x;
        const ny = s.dir.dy !== 0
          ? (s.dir.dy > 0 ? Math.floor(s.y / CELL) + 1 : Math.ceil(s.y / CELL) - 1) * CELL
          : s.y;

        const dist = s.dir.dx !== 0 ? Math.abs(nx - s.x) : Math.abs(ny - s.y);

        if (remaining < dist) {
          s.x += s.dir.dx * remaining;
          s.y += s.dir.dy * remaining;
          remaining = 0;
        } else {
          // arrive exactly at the node
          s.x = s.dir.dx !== 0 ? nx : s.x;
          s.y = s.dir.dy !== 0 ? ny : s.y;
          remaining -= dist;
          s.trail.push({ x: s.x, y: s.y });

          // decide next direction at the intersection
          if (Math.random() < TURN_CHANCE) {
            const perpendicular: Dir[] =
              s.dir.dx !== 0
                ? [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }]
                : [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
            s.dir = perpendicular[(Math.random() * 2) | 0];
          }
        }
      }

      // record head into trail & trim to TRAIL length
      s.trail.push({ x: s.x, y: s.y });
      let acc = 0;
      const kept: { x: number; y: number }[] = [{ x: s.x, y: s.y }];
      for (let i = s.trail.length - 2; i >= 0; i--) {
        const a = s.trail[i];
        const b = s.trail[i + 1];
        acc += Math.hypot(a.x - b.x, a.y - b.y);
        kept.unshift(a);
        if (acc > TRAIL) break;
      }
      s.trail = kept;
    };

    const draw = (s: Spark) => {
      const pts = s.trail;
      if (pts.length < 2) return;

      // fade out over the final ~1.2s so sparks dissolve gracefully
      const lifeFade = Math.min(1, s.life / 1.2);

      // draw trail as fading segments (head = bright, tail = transparent)
      // walk from head backward accumulating distance for alpha
      let acc = 0;
      for (let i = pts.length - 1; i > 0; i--) {
        const a = pts[i];
        const b = pts[i - 1];
        const seg = Math.hypot(a.x - b.x, a.y - b.y);
        const t0 = 1 - acc / TRAIL;
        acc += seg;
        const t1 = 1 - acc / TRAIL;
        const alpha = Math.max(0, ((t0 + t1) / 2)) * 0.9 * lifeFade;
        if (alpha <= 0.003) break;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 1.4 * t0 + 0.4;
        ctx.stroke();
      }

      // glowing head
      const head = pts[pts.length - 1];
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.9)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 1.7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.95 * lifeFade})`;
      ctx.fill();
      ctx.restore();
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';

      for (let i = 0; i < sparks.length; i++) {
        const s = sparks[i];
        s.life -= dt;
        step(s, dt);
        draw(s);
        // respawn when life ends or head wanders far off-screen
        if (
          s.life <= 0 ||
          s.x < -CELL * 2 || s.x > w + CELL * 2 ||
          s.y < -CELL * 2 || s.y > h + CELL * 2
        ) {
          sparks[i] = spawn();
        }
      }

      // Quiet the sparks over the hero copy so text stays readable.
      // Sparks still travel through this zone identically — we just fade
      // their rendered alpha with a soft feathered eraser (destination-out).
      const wide = w >= 1024;                 // lg: two-column layout, copy on the left
      const cx = wide ? w * 0.26 : w * 0.5;
      const cy = h * 0.5;
      const rx = wide ? w * 0.3 : w * 0.62;
      const ry = wide ? h * 0.4 : h * 0.34;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.translate(cx, cy);
      ctx.scale(rx, ry);
      const eraser = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      eraser.addColorStop(0, 'rgba(0,0,0,0.9)');    // strongest fade over the text
      eraser.addColorStop(0.55, 'rgba(0,0,0,0.65)');
      eraser.addColorStop(1, 'rgba(0,0,0,0)');       // feather out — full sparks resume
      ctx.fillStyle = eraser;
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();

      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);

    if (reduce) {
      // static: draw one calm frame, no animation loop
      ctx.clearRect(0, 0, w, h);
    } else {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none z-[1] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
    />
  );
}
