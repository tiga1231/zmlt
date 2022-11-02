// importScripts("https://d3js.org/d3-collection.v1.min.js");
// importScripts("https://d3js.org/d3-dispatch.v1.min.js");
// importScripts("https://d3js.org/d3-quadtree.v1.min.js");
// importScripts("https://d3js.org/d3-timer.v1.min.js");
// importScripts("https://d3js.org/d3-force.v1.min.js");

// importScripts("lib/d3.v5.js");
// importScripts("lib/bentley-ottman.js");
// importScripts("force.js");
// importScripts("utils.js");
// importScripts("lib/numeric-1.2.6.js");


// function retrainWithSimulation(simulation, niter) {
//   simulation.alpha(0.99); //reset learning rate
//   trainWithSimulation(simulation, niter);
// }

// function trainWithSimulation(simulation, niter) {
//   simulation
//     .velocityDecay(0.2)
//     .alphaDecay(1 - Math.pow(0.001, 1 / niter));
//   simulation.restart();
// }

function initSimulation(dataObj, config) {
  nodes = dataObj.nodes;
  edges = dataObj.edges;
  dpr = dataObj.dpr;
  enabledNodes = dataObj.enabledNodes;
  id2index = dataObj.id2index;
  virtualEdges = dataObj.virtualEdges;
  scales = {
    sx: d3.scaleLinear().domain(dataObj.xDomain).range(dataObj.xRange),
    sy: d3.scaleLinear().domain(dataObj.yDomain).range(dataObj.yRange),
  };

  progress = dataObj.progress;
  [minEdgeWeight, maxEdgeWeight] = d3.extent(edges, e => e.weight);
  console.log('simulation.js: edge weight range = ', [minEdgeWeight, maxEdgeWeight]);

  let maxDist = d3.max(virtualEdges, e => e.weight);
  let [minHop, maxHop] = d3.extent(virtualEdges, e => e.hops);
  let maxLevel = d3.max(nodes, d => d.level);
  let cx = d3.mean(nodes, d => d.x);
  let cy = d3.mean(nodes, d => d.y);

  self.progress = progress;
  // def force
  simulation = d3.forceSimulation(nodes)
    .force('pre', forcePre(scales))
    .force('link',
      d3.forceLink(edges)
      .distance(e => e.weight / minEdgeWeight)
      /*.strength(e=>e.source.update && e.target.update ? 0.9:0)*/
    )
    .force('charge',
      d3.forceManyBody()
      // .theta(0.5)
      .strength(d => config.charge.strength)
    )
    .force('central',
      d3.forceRadial(config.central.r, cx, cy)
      .strength(config.central.strength) //tree-of-life-linear
    )
    .force('node-edge-repulsion',
      forceNodeEdgeRepulsion(nodes, edges, enabledNodes, config.nodeEdgeRepulsion.strength) // lastfm-linear
    )
    .stop();

  // label overlap removal
  const origin = scales.sx.invert(0);
  const margin = 2; //in pixel
  let scaleY = config.overlap.scaleY;
  for (let l in config.level2scale) {
    l = parseFloat(l);
    let s = config.level2scale[l];
    let n = nodes.filter(d => d.level <= l);
    simulation
      .force(`pre-scale`, forceScaleY(n, d => scaleY))
      .force(`collide-${l}`,
        d3.forceCollide()
        .radius(d => {
          if (d.update) {
            let [x0, y0] = [d.bbox.width / 2, d.bbox.height / 2];
            // let a = d.bbox.width/2;
            let a = Math.sqrt(x0 * x0 + y0 * y0 * scaleY * scaleY); //figure out the major axis (a) of the ellipse 
            let r = a / s + margin;
            r = scales.sx.invert(r) - origin;
            return r;
          } else {
            return 0;
          }
        })
        .strength(0.1)
        .iterations(1)
      )
      .force(`post-scale`, forceScaleY(n, d => 1 / scaleY))
      // .force('post', forcePost(nodes, edges))
      .stop();
  }
  return simulation;
}