// OcclusionY adds an initializer that shifts nodes vertically with a 2D D3 force simulation,
// automatically alternating label positions above (-12px) and below (+14px) dots when clustered to prevent collision.
function occlusionY({
  radius = 12,
  ticks = 100,
  strength = 0.5,
  dy,
  ...options
} = {}) {
  return Plot.initializer(options, (data, facets, { x, y: { value: Y }, text }, { x: sx, y: sy }) => {
    const X = x?.value;
    const T = text?.value;

    for (const index of facets) {
      const unique = new Set();

      // Step 1: Calculate initial screen coordinates for all nodes
      const rawNodes = Array.from(index, (i) => {
        const textVal = T ? T[i] : null;
        const visible = textVal != null ? (!unique.has(textVal) && !!unique.add(textVal)) : true;
        const px = X && sx && typeof sx === "function" ? sx(X[i]) : 0;
        const py = sy(Y[i]);
        return { px, py, visible, i };
      });

      const activeNodes = rawNodes.filter((d) => d.visible);

      // Step 2: Sort active nodes by X coordinate to identify spatial clusters
      activeNodes.sort((a, b) => a.px - b.px);

      // Step 3: Alternate offsets (above vs below) for neighboring/clustered nodes
      for (let idx = 0; idx < activeNodes.length; idx++) {
        const curr = activeNodes[idx];
        let isClustered = false;

        for (let j = 0; j < activeNodes.length; j++) {
          if (idx === j) continue;
          const other = activeNodes[j];
          const dx = Math.abs(curr.px - other.px);
          const dyDist = Math.abs(curr.py - other.py);
          // If another point is within 50px horizontally and 25px vertically
          if (dx < 50 && dyDist < 25) {
            isClustered = true;
            break;
          }
        }

        // Even index in cluster -> Above (-12px), Odd index in cluster -> Below (+14px)
        const offsetY = isClustered ? (idx % 2 === 0 ? -12 : 14) : -12;
        curr.targetY = curr.py + offsetY;
        curr.y = curr.targetY;
        curr.x = curr.px;
        curr.targetX = curr.px;
      }

      // Step 4: Run 2D D3 force simulation to fine-tune positions and resolve remaining overlaps
      const sim = d3.forceSimulation(activeNodes);

      if (X && sx && typeof sx === "function") {
        sim.force("x", d3.forceX((d) => d.targetX).strength(0.95));
      }

      sim.force("y", d3.forceY((d) => d.targetY).strength(strength))
         .force("collide", d3.forceCollide().radius(radius))
         .stop()
         .tick(ticks);

      // Write back adjusted Y positions
      for (const { y, i, visible } of rawNodes) {
        Y[i] = !visible ? NaN : y;
      }
    }

    return {
      data,
      facets,
      channels: {
        y: {
          value: Y
        }
      }
    };
  });
}