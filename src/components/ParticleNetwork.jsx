import { useRef, useEffect } from 'react';

const ParticleNetwork = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');

    const CFG = {
      densityFactor: 12000,
      minParticles: 60,
      maxParticles: 180,
      minRadius: 0.8,
      maxRadius: 2.4,
      minSpeed: 0.15,
      maxSpeed: 0.45,
      connectionDistance: 110,
      lineWidth: 0.5,
      maxLineOpacity: 0.18,
      mouseRadius: 160,
      mouseForce: 800,
      maxAccel: 2.5,
      damping: 0.96,
      colors: [
        { r: 173, g: 130, b: 49 },
        { r: 200, g: 160, b: 70 },
        { r: 228, g: 213, b: 189 },
        { r: 198, g: 156, b: 63 },
      ],
    };

    let W, H;
    let particles = [];
    let mouse = { x: -9999, y: -9999 };
    let gridCols, gridRows;
    let grid;
    let animationId;

    function rand(min, max) {
      return Math.random() * (max - min) + min;
    }

    function targetCount() {
      return Math.max(
        CFG.minParticles,
        Math.min(CFG.maxParticles, Math.floor((W * H) / CFG.densityFactor))
      );
    }

    function createParticle(x, y) {
      const color = CFG.colors[Math.floor(Math.random() * CFG.colors.length)];
      const brightness = rand(0.5, 1.0);
      const angle = rand(0, Math.PI * 2);
      const speed = rand(CFG.minSpeed, CFG.maxSpeed);
      return {
        x: x !== undefined ? x : rand(0, W),
        y: y !== undefined ? y : rand(0, H),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        baseSpeed: speed,
        radius: rand(CFG.minRadius, CFG.maxRadius),
        r: color.r,
        g: color.g,
        b: color.b,
        alpha: brightness * 0.7,
        pulseOffset: rand(0, Math.PI * 2),
      };
    }

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      const desired = targetCount();
      while (particles.length < desired) particles.push(createParticle());
      while (particles.length > desired) particles.pop();
      gridCols = Math.ceil(W / CFG.connectionDistance) || 1;
      gridRows = Math.ceil(H / CFG.connectionDistance) || 1;
    }

    function buildGrid() {
      grid = new Array(gridCols * gridRows);
      for (let i = 0; i < grid.length; i++) grid[i] = [];
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const col = Math.min(Math.floor(p.x / CFG.connectionDistance), gridCols - 1);
        const row = Math.min(Math.floor(p.y / CFG.connectionDistance), gridRows - 1);
        grid[row * gridCols + col].push(i);
      }
    }

    function updateParticles() {
      const mr = CFG.mouseRadius;
      const mr2 = mr * mr;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist2 = dx * dx + dy * dy;

        if (dist2 < mr2 && dist2 > 1) {
          const dist = Math.sqrt(dist2);
          const force = Math.min(CFG.mouseForce / dist2, CFG.maxAccel);
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > p.baseSpeed) {
          p.vx *= CFG.damping;
          p.vy *= CFG.damping;
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); }
        if (p.x > W) { p.x = W; p.vx = -Math.abs(p.vx); }
        if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); }
        if (p.y > H) { p.y = H; p.vy = -Math.abs(p.vy); }
      }
    }

    function render(time) {
      ctx.clearRect(0, 0, W, H);
      buildGrid();

      const cd = CFG.connectionDistance;
      const cd2 = cd * cd;

      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          const cellIdx = row * gridCols + col;
          const cell = grid[cellIdx];
          if (cell.length === 0) continue;

          for (let dr = 0; dr <= 1; dr++) {
            for (let dc = dr === 0 ? 0 : -1; dc <= 1; dc++) {
              const nr = row + dr;
              const nc = col + dc;
              if (nr < 0 || nr >= gridRows || nc < 0 || nc >= gridCols) continue;
              const neighborIdx = nr * gridCols + nc;
              const neighbor = grid[neighborIdx];
              if (neighbor.length === 0) continue;
              const sameCell = cellIdx === neighborIdx;

              for (let a = 0; a < cell.length; a++) {
                const pA = particles[cell[a]];
                const startB = sameCell ? a + 1 : 0;
                for (let b = startB; b < neighbor.length; b++) {
                  const pB = particles[neighbor[b]];
                  const ddx = pA.x - pB.x;
                  const ddy = pA.y - pB.y;
                  const d2 = ddx * ddx + ddy * ddy;

                  if (d2 < cd2) {
                    const d = Math.sqrt(d2);
                    const opacity = CFG.maxLineOpacity * (1 - d / cd);
                    ctx.beginPath();
                    ctx.moveTo(pA.x, pA.y);
                    ctx.lineTo(pB.x, pB.y);
                    ctx.strokeStyle =
                      'rgba(' +
                      ((pA.r + pB.r) >> 1) +
                      ',' +
                      ((pA.g + pB.g) >> 1) +
                      ',' +
                      ((pA.b + pB.b) >> 1) +
                      ',' +
                      opacity.toFixed(3) +
                      ')';
                    ctx.lineWidth = CFG.lineWidth;
                    ctx.stroke();
                  }
                }
              }
            }
          }
        }
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pulse = 0.85 + 0.15 * Math.sin(time * 0.001 + p.pulseOffset);
        const alpha = p.alpha * pulse;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + alpha.toFixed(3) + ')';
        ctx.fill();

        if (p.radius > 1.6) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
          ctx.fillStyle =
            'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + (alpha * 0.08).toFixed(3) + ')';
          ctx.fill();
        }
      }
    }

    function loop(time) {
      updateParticles();
      render(time);
      animationId = requestAnimationFrame(loop);
    }

    function onMouseMove(e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }

    function onMouseLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    function onTouchMove(e) {
      if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
      }
    }

    function onTouchEnd() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);

    window.addEventListener('resize', resize);
    resize();
    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="particle-network"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
};

export default ParticleNetwork;
