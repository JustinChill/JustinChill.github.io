// OcclusionY adds an initializer that shifts nodes vertically with a tiny force simulation. From https://observablehq.com/@observablehq/plot-slope-chart
    occlusionY = ({
      radius = 6.5,
      ...options
    } = {}) => Plot.initializer(options, (data, facets, {
      y: {
        value: Y
      },
      text: {
        value: T
      }
    }, {
      y: sy
    }, dimensions, context) => {
      for (const index of facets) {
        const unique = new Set();
        const nodes = Array.from(index, (i) => ({
          fx: 0,
          y: sy(Y[i]),
          visible: unique.has(T[i]) // remove duplicate labels
            ?
            false :
            !!unique.add(T[i]),
          i
        }));
        d3.forceSimulation(nodes.filter((d) => d.visible))
          .force("y", d3.forceY(({
            y
          }) => y)) // gravitate towards the original y
          .force("collide", d3.forceCollide().radius(radius)) // collide
          .stop()
          .tick(20);
        for (const {
            y,
            node,
            i,
            visible
          }
          of nodes) Y[i] = !visible ? NaN : y;
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