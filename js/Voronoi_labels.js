voronoiCentroids = (options) =>
Plot.initializer(
  options,
  function (
    data,
    facets,
    { x: X0, y: Y0, x2: X = X0, y2: Y = Y0 },
    { x, y },
    { width, height, marginLeft, marginRight, marginTop, marginBottom },
    { projection }
  ) {
    const n = X.value.length;
    const P = new Float64Array(2 * n).fill(NaN);
    let i;
    if (projection) {
      const stream = projection.stream({
        point(x, y) {
          P[2 * i] = x;
          P[2 * i + 1] = y;
        }
      });
      for (i = 0; i < n; ++i) stream.point(X.value[i], Y.value[i]);
    } else {
      for (i = 0; i < n; ++i) P[2 * i] = x ? x(X.value[i]) : X.value[i];
      for (i = 0; i < n; ++i) P[2 * i + 1] = y ? y(Y.value[i]) : Y.value[i];
    }

    for (const I of facets) {
      const v = new d3.Delaunay(P).voronoi([
        marginLeft,
        marginTop,
        width - marginRight,
        height - marginBottom
      ]);
      for (const [i, k] of I.entries())
        [X.value[i], Y.value[i]] = d3.polygonCentroid(v.cellPolygon(k) ?? []);
    }
    delete X.scale;
    delete Y.scale;
    return { data, facets };
  }
)