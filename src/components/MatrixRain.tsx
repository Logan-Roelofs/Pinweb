import { useEffect, useRef } from "react";

/**
 * Faint falling-code background ("digital rain"). Decorative only: it sits
 * behind content at low opacity, never behind body text, and is static
 * (one drawn frame) on phones, with "reduce motion" on, or in a hidden tab.
 */
export default function MatrixRain({ className = "" }: { className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;

    const glyphs = "01アイウエオカキクケコサシスセソ<>=+*#".split("");
    const size = 16;
    let columns: number[] = [];
    let raf = 0;
    let last = 0;

    const resize = () => {
      const { width, height } = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = width * dpr;
      el.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Array.from({ length: Math.ceil(width / size) }, () => Math.random() * -(height / size));
    };

    const step = (fade: boolean) => {
      const { width, height } = el.getBoundingClientRect();
      if (fade) {
        ctx.fillStyle = "rgba(5, 8, 6, 0.12)";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.font = `${size}px "JetBrains Mono", monospace`;
      columns.forEach((y, i) => {
        const char = glyphs[Math.floor(Math.random() * glyphs.length)];
        ctx.fillStyle = Math.random() > 0.97 ? "#d7ffe6" : "#00ff66";
        ctx.fillText(char, i * size, y * size);
        columns[i] = y * size > height && Math.random() > 0.975 ? 0 : y + 1;
      });
    };

    const animate = (t: number) => {
      raf = requestAnimationFrame(animate);
      if (document.hidden || t - last < 70) return;
      last = t;
      step(true);
    };

    resize();
    const still =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(pointer: coarse)").matches;
    if (still) {
      // One static frame: draw a screen's worth of trails without animating.
      for (let i = 0; i < 60; i++) step(true);
    } else {
      raf = requestAnimationFrame(animate);
    }
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvas} aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
