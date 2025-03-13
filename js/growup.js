function growUp({
  delay = 0,
  duration = 250,
  stagger = duration * 2,
  ease = d3.easeCubicInOut,
  ...options
} = {}) {
  return {
    ...options,
    render(index, scales, values, dimensions, context, next) {
      const g = next(index, scales, values, dimensions, context);
      const R = g.querySelectorAll("rect");
      const T = Float64Array.from(R, () => 1);
      const Y = Float64Array.from(R, (r) => r.getAttribute("y"));
      const H = Float64Array.from(R, (r) => r.getAttribute("height"));

      g.style.opacity = "0";
      g.style.transition = "opacity 0.8s ease-out";

      function startAnimation() {
        g.style.opacity ="1"; // Fade in
        const start = performance.now();

        (function tick(now) {
          let tt = false;
          for (let i = 0, n = R.length; i < n; ++i) {
            const t = ease(Math.max(0, Math.min(1, (now - start - (delay + stagger * i / n)) / duration)));
            if (t < 1) tt = true;
            if (T[i] === t) continue; // don’t touch if unchanged
            R[i].setAttribute("y", Y[i] + H[i] * (1 - t));
            R[i].setAttribute("height", H[i] * t);
            T[i] = t;
          }
          if (tt) requestAnimationFrame(tick);
        })(start);
      }

      // Intersection Observer to detect when in viewport
      const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if(entry.isIntersecting) {
            startAnimation();
            observer.unobserve(entry.target);
          }
        });
      }, {threshold: 0.3 });
      observer.observe(g);
      return g;
    }
  };
}