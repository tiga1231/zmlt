simulation
  .velocityDecay(0.4)
  .alphaDecay(1 - Math.pow(0.001, 1 / niter))
  .force('ideal-edge-length', 
    forceStress(edges, enabledNodes)
    .weight(e=>1/Math.pow(e.weight, 1))
    .targetDist(e=>e.weight)
    .strength(maxEdgeWeight * 0.5)
  )
  .force('stress', 
    forceStress(virtualEdges, enabledNodes)
    .weight(e=>1)
    // .weight(e=>1)
    .targetDist(e=>e.weight)
    .strength(10)
    // .schedule(alpha=>alpha*1.0)
    // .strength(5000/d3.max(virtualEdges, e=>e.weight))
  )
  .force('label-collide', 
    forceEllipse({
      nodes: nodes, 
      scales: scales,
      strength: 1,
      b: 5,
      c: 1.5,
    })
  )
  .force('post', forcePost(edges, 1e9, enabledNodes));
