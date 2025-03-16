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
      const rects = Array.from(g.querySelectorAll("rect"));

      g.style.opacity = "0";
      g.style.transition = "opacity 0.8s ease-out";
      
      const rectData = rects.map(r => ({
        rect: r,
        originalY: parseFloat(r.getAttribute("y")),
        originalHeight: parseFloat(r.getAttribute("height"))
      }));

      function startAnimation() {
        g.style.opacity ="1"; // Fade in
        const start = performance.now();

        (function tick(now) {
          const elapsed = now - start;
          rectData.forEach(({ rect, originalY, originalHeight }, i) => {
            const t = ease(Math.min(1, Math.max(0, (elapsed - delay - (stagger * i / rects.length)) / duration)));
            rect.setAttribute("y", originalY + originalHeight * (1 -t));
            rect.setAttribute("height", originalHeight * t);
          });
            
          if (elapsed < duration + delay + stagger){
            requestAnimationFrame(tick);
          }
        })(start);
      }
      
      if('IntersectionObserver' in window) {
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
      } else {
          startAnimation();
      }

      return g;
    }
  };
}