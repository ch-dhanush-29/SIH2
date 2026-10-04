import React, { useRef, useEffect } from 'react';

interface IntroParticlesProps {
  theme: 'dark' | 'light';
  smoothX: number;
  smoothY: number;
  isAccelerating?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  isSignal?: boolean; // Signal packet traveling towards center
}

export const IntroParticles: React.FC<IntroParticlesProps> = ({
  theme,
  smoothX,
  smoothY,
  isAccelerating = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const prefersReducedMotion =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Generate ~60 lightweight particles
    const count = window.innerWidth < 768 ? 32 : 64;
    const particles: Particle[] = [];

    const colorsDark = [
      'rgba(32, 214, 232, 0.7)',  // cyan
      'rgba(56, 189, 248, 0.6)',  // sky
      'rgba(255, 176, 32, 0.65)', // amber
      'rgba(148, 163, 184, 0.4)', // slate
    ];

    const colorsLight = [
      'rgba(8, 126, 164, 0.7)',   // aerospace blue
      'rgba(2, 132, 199, 0.6)',   // sky
      'rgba(217, 119, 6, 0.6)',   // amber
      'rgba(100, 116, 139, 0.4)', // slate
    ];

    const activeColors = isDark ? colorsDark : colorsLight;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.2 + 0.8,
        alpha: Math.random() * 0.6 + 0.2,
        color: activeColors[Math.floor(Math.random() * activeColors.length)],
        isSignal: i % 4 === 0, // 25% of particles drift inward toward center
      });
    }

    let animId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Pointer influence offset
      const offsetX = smoothX * 18;
      const offsetY = smoothY * 18;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!prefersReducedMotion) {
          if (isAccelerating) {
            // Rapid inward warp towards center on Start click
            const dx = centerX - p.x;
            const dy = centerY - p.y;
            p.x += dx * 0.08;
            p.y += dy * 0.08;
            p.size = Math.max(0.5, p.size * 0.96);
          } else {
            // Normal gentle telemetry drift
            p.x += p.vx;
            p.y += p.vy;

            // Signal packets gently pull inward towards central AI engine
            if (p.isSignal) {
              const dx = centerX - p.x;
              const dy = centerY - p.y;
              p.x += dx * 0.0008;
              p.y += dy * 0.0008;
            }

            // Wrap boundaries
            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;
            if (p.y < -10) p.y = height + 10;
            if (p.y > height + 10) p.y = -10;
          }
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x + offsetX * 0.5, p.y + offsetY * 0.5, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Connect nearby signal particles with faint telemetry lines
        if (p.isSignal) {
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            if (p2.isSignal) {
              const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
              if (dist < 110) {
                ctx.beginPath();
                ctx.moveTo(p.x + offsetX * 0.5, p.y + offsetY * 0.5);
                ctx.lineTo(p2.x + offsetX * 0.5, p2.y + offsetY * 0.5);
                ctx.strokeStyle = isDark
                  ? `rgba(32, 214, 232, ${(1 - dist / 110) * 0.15})`
                  : `rgba(8, 126, 164, ${(1 - dist / 110) * 0.12})`;
                ctx.lineWidth = 0.75;
                ctx.stroke();
              }
            }
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [isDark, smoothX, smoothY, isAccelerating]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ opacity: 0.85 }}
    />
  );
};
export default IntroParticles;
