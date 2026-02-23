/**
 * Confetti burst utility — zero external dependencies.
 *
 * Creates a short canvas-based particle shower and removes itself from
 * the DOM when the animation completes.
 */

const COLORS = ['#f97316', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899'];
const PARTICLE_COUNT = 130;
const DURATION_MS = 3200;

/**
 * Returns a random number in [min, max).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Fire a single-burst confetti shower originating near the top of the viewport.
 * Safe to call multiple times — each call creates and manages its own canvas.
 */
export function fireConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:100%',
    'height:100%',
    'pointer-events:none',
    'z-index:9999',
  ].join(';');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
    // Spread confetti across the upper quarter of the screen width
    x: rand(0.1, 0.9) * canvas.width,
    y: rand(-20, -5),
    vx: rand(-5, 5),
    vy: rand(3, 8),
    rotation: rand(0, Math.PI * 2),
    rotationSpeed: rand(-0.12, 0.12),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    w: rand(9, 18),
    h: rand(4, 9),
    opacity: 1,
  }));

  const start = performance.now();

  function frame(now) {
    const elapsed = now - start;
    const progress = elapsed / DURATION_MS;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.18; // gravity
      p.vx *= 0.99; // subtle air resistance
      p.rotation += p.rotationSpeed;
      p.opacity = Math.max(0, 1 - progress * 1.4);

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (elapsed < DURATION_MS) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(frame);
}
