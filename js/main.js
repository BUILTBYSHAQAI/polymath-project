(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────
     PORTAL INTERACTION
  ───────────────────────────────────────────────────────────── */
  let animating = false;

  document.querySelectorAll('.portal-card').forEach(card => {
    card.addEventListener('click', () => handlePortalActivate(card));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handlePortalActivate(card);
      }
    });
  });

  function handlePortalActivate(card) {
    if (animating) return;
    const url = card.dataset.href;
    if (!url) return;

    // Use the card's center as the vortex origin point
    const rect   = card.getBoundingClientRect();
    const originX = rect.left + rect.width  / 2;
    const originY = rect.top  + rect.height / 2;

    triggerVortex(url, originX, originY);
  }

  /* ─────────────────────────────────────────────────────────────
     VORTEX ENGINE
  ───────────────────────────────────────────────────────────── */
  function triggerVortex(url, cx, cy) {
    animating = true;

    const canvas  = document.getElementById('vortex-canvas');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';

    const ctx = canvas.getContext('2d');
    const w   = canvas.width;
    const h   = canvas.height;

    // Radius must reach the farthest canvas corner from the origin
    const maxR = Math.max(
      Math.hypot(cx,     cy),
      Math.hypot(w - cx, cy),
      Math.hypot(cx,     h - cy),
      Math.hypot(w - cx, h - cy)
    ) * 1.08;

    const state = { progress: 0, spin: 0 };

    gsap.to(state, {
      progress : 1,
      spin     : Math.PI * 10,   // 5 full rotations over the duration
      duration : 1.75,
      ease     : 'power2.in',    // slow start → rapid acceleration
      onUpdate()  { renderFrame(ctx, w, h, cx, cy, maxR, state); },
      onComplete() { window.location.href = url; }
    });
  }

  /* ─────────────────────────────────────────────────────────────
     CANVAS DRAW PASS
     Layers (back → front):
       1. Concentric rings   — spiral inward with differential rotation
       2. Radial warp streaks — appear and lengthen as speed builds
       3. Black collapse      — fills from edges, completes the cut
  ───────────────────────────────────────────────────────────── */
  function renderFrame(ctx, w, h, cx, cy, maxR, { progress: p, spin }) {
    ctx.clearRect(0, 0, w, h);

    /* ── 1. Spiraling rings ── */
    const NUM_RINGS = 18;

    for (let i = NUM_RINGS; i >= 1; i--) {
      const t      = i / NUM_RINGS;          // 1 = outermost ring
      const baseR  = maxR * t;

      /*
        Contraction: outer rings shrink faster (higher t = faster collapse).
        Power curve on progress so rings hold briefly then rush inward.
      */
      const collapse = Math.pow(p, 1.3) * (0.50 + t * 0.50);
      const r        = baseR * (1 - collapse);
      if (r < 1) continue;

      /*
        Differential rotation: inner rings lead (spin faster).
        Creates the visual "spiral" illusion with plain circles.
      */
      const angle = spin * (0.7 + (1 - t) * 1.8);
      const alpha = Math.max(0, (0.72 - p * 0.62) * (0.38 + t * 0.62));

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.scale(1, 0.60);   // perspective squeeze — suggests a tilted disc

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(45,90,61,${alpha})`;
      ctx.lineWidth   = 0.8 + (1 - t) * 1.8;
      ctx.stroke();
      ctx.restore();
    }

    /* ── 2. Warp-speed radial streaks ── */
    if (p > 0.06) {
      const NUM_STREAKS = 40;
      const streakReach = maxR * Math.pow(p, 0.60);

      for (let i = 0; i < NUM_STREAKS; i++) {
        const angle  = (i / NUM_STREAKS) * Math.PI * 2 + spin * 0.55;
        const len    = streakReach * (0.22 + (i % 6) * 0.14);  // varied lengths
        const sAlpha = p * 0.42;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        const grad = ctx.createLinearGradient(5, 0, len, 0);
        grad.addColorStop(0, `rgba(45,90,61,${sAlpha})`);
        grad.addColorStop(1, `rgba(45,90,61,0)`);

        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(len, 0);
        ctx.strokeStyle = grad;
        ctx.lineWidth   = 0.4 + (i % 4) * 0.25;
        ctx.stroke();
        ctx.restore();
      }
    }

    /* ── 3. Black collapse ── */
    /*
      Starts fading in at p=0.32 and reaches full black at p=1.
      The screen is fully opaque by the time the animation completes.
    */
    const blackAlpha = Math.max(0, (p - 0.32) / 0.68);
    if (blackAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${blackAlpha * 0.98})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

})();
