import { useEffect, useRef } from "react";

/**
 * Faint falling-code background ("digital rain") of digits and letters.
 * Decorative only: it sits behind content at low opacity. To save battery it
 * pauses while scrolled out of view or while the app is in the background,
 * and it's a still frame when the device asks for reduced motion.
 */
export default function MatrixRain({ className = "" }: { className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;

    const glyphs = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const size = 16;
    let columns: number[] = [];
    let raf = 0;
    let last = 0;
    let onScreen = true;

    const resize = () => {
      const { width, height } = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = width * dpr;
      el.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Array.from({ length: Math.ceil(width / size) }, () => Math.random() * -(height / size));
      // Run it ahead so the rain is already falling when it first appears.
      for (let i = 0; i < Math.ceil(height / size) + 10; i++) step();
    };

    const step = () => {
      const { width, height } = el.getBoundingClientRect();
      ctx.fillStyle = "rgba(5, 8, 6, 0.12)";
      ctx.fillRect(0, 0, width, height);
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
      if (document.hidden || !onScreen || t - last < 70) return;
      last = t;
      step();
    };

    resize();
    const observer = new IntersectionObserver(([entry]) => (onScreen = entry.isIntersecting));
    observer.observe(el);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // One still frame: draw a screen's worth of trails without animating.
      for (let i = 0; i < 60; i++) step();
    } else {
      raf = requestAnimationFrame(animate);
    }
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvas} aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
