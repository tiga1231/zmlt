// importScripts("https://d3js.org/d3-collection.v1.min.js");
// importScripts("https://d3js.org/d3-dispatch.v1.min.js");
// importScripts("https://d3js.org/d3-quadtree.v1.min.js");
// importScripts("https://d3js.org/d3-timer.v1.min.js");
// importScripts("https://d3js.org/d3-force.v1.min.js");

importScripts("lib/d3.v5.js");
importScripts("lib/bentley-ottman.js");
importScripts("force.js");
importScripts("utils.js");
importScripts("lib/numeric-1.2.6.js");


//// globals 
let simulation, collision_sims;
let niter = 500;
let dataObj;
let nodes;
let edges;
let enabledNodes;
let id2index;
let virtualEdges;
let scales = {};
let progress;
let maxEdgeWeight;
let minEdgeWeight;
let intervalId;
let dpr;
let iter = 0;


function addNode(){
  console.log(`${progress}/${nodes.length}`);
  let start = progress;
  progress += 1;
  root = nodes[0];
  if(progress <= nodes.length){
    enabledNodes = initNodePosition(
      nodes.slice(start, progress),
      root, 
      enabledNodes, 
      nodes, 
      edges, 
      id2index
    );
    //updateforce
    updateForce(
      nodes.slice(0, progress), 
      edges.filter(e=>e.source.update && e.target.update),
      virtualEdges.filter(e=>e.source.update && e.target.update),
    );
  }
  simulation.alpha(0.99);
  return;
};

function updateForce(nodes, edges, virtualEdges){
  simulation.force('charge').initialize(nodes);
  simulation.force('central').initialize(nodes);

  simulation.force('link').initialize(edges);
  simulation.force('stress-edge').initialize(edges);

  simulation.force('stress').initialize(virtualEdges);

  simulation.force('node-edge-repulsion').initialize(nodes, edges);
  simulation.force('post').initialize(nodes, edges);

  for (let l in dataObj.level2scale){
    simulation.force(`collide-${l}`).initialize(nodes);
  }
}

onmessage = function(event) {
  dataObj = event.data;
  let type = event.data.type;
  console.log('type', type);
  if(type === 'restart'){
    collision_sims.forEach(sim=>sim.alpha(0.99));
    simulation.alpha(0.99);
    train(niter);
  }else if(type === 'stop'){
    collision_sims.forEach(sim=>sim.stop());
    simulation.stop();
  }else if(type === 'zoom'){  
    scales.sx = d3.scaleLinear().domain(dataObj.xDomain).range(dataObj.xRange);
    scales.sy = d3.scaleLinear().domain(dataObj.yDomain).range(dataObj.yRange);
  }
  else if(type === 'add-node'){  
    addNode();
    train(10);
    post();
  }else if(type === 'auto-add-nodes'){
    let niter = 4;
    let freq = 2;
    while(enabledNodes.size < nodes.length){
      addNode();
      //for every <freq> nodes added, restart the simulation and train for <niter> iterations
      if(enabledNodes.size % freq == 0){
        simulation
        .alpha(0.90)
        .velocityDecay(0.4)
        .alphaDecay(1 - Math.pow(0.001, 1 / niter))
        .restart();
        simulation.tick(niter);
        post();
      }
    }
    train(10);
  }
  else{
    //default init event
    nodes = dataObj.nodes;
    edges = dataObj.edges;
    dpr = dataObj.dpr;
    enabledNodes = dataObj.enabledNodes;
    id2index =  dataObj.id2index;
    virtualEdges = dataObj.virtualEdges;
    scales =  {
      sx: d3.scaleLinear().domain(dataObj.xDomain).range(dataObj.xRange),
      sy: d3.scaleLinear().domain(dataObj.yDomain).range(dataObj.yRange),
    };
    
    progress = dataObj.progress;
    [minEdgeWeight, maxEdgeWeight] = d3.extent(edges, e=>e.weight);
    console.log([minEdgeWeight, maxEdgeWeight]);
    let maxDist = d3.max(virtualEdges, e=>e.weight);
    let [minHop, maxHop] = d3.extent(virtualEdges, e=>e.hops);
    let maxLevel = d3.max(nodes, d=>d.level);
    let cx = d3.mean(nodes, d=>d.x);
    let cy = d3.mean(nodes, d=>d.y);

    self.progress = progress;
    // def force
    simulation = d3.forceSimulation(nodes)
    .velocityDecay(0.4)
    .alphaDecay(1 - Math.pow(0.001, 1 / niter))
    .force('pre', forcePre(scales))
    .force('link',
      d3.forceLink(edges)
      .distance(e=>e.weight/minEdgeWeight)
      .strength(e=>e.source.update && e.target.update ? 0.2:0)
    )
    .force('stress', 
      // lastfm-uniform
      // forceStress(nodes, virtualEdges.filter(e=>e.hops >= 6), nodes.length*6)
      // .distance(e=>Math.pow(e.weight/minEdgeWeight, 0.95+1/e.hops))
      // .strength(e=>0.01 / Math.pow(e.weight/minEdgeWeight, 1.3))
      // lastfm-linear
      // forceStress(nodes, virtualEdges.filter(e=>e.hops >= 6), nodes.length*6)
      // .distance(e=>Math.pow(e.weight/minEdgeWeight, 0.95+1/e.hops))
      // .strength(e=>0.1 / Math.pow(e.weight/minEdgeWeight, 1.3))
      
      // topics-refined-uniform
      // forceStress(nodes, virtualEdges.filter(e=>e.hops >= 6), nodes.length*6)
      // // .distance(e=>Math.pow(e.weight/minEdgeWeight, 0.95+1/e.hops))
      // // .strength(e=>0.01 / Math.pow(e.weight/minEdgeWeight, 1.3))
      // .distance(e=>e.weight/minEdgeWeight)
      // .strength(e=>0.01 / Math.pow(e.weight/minEdgeWeight, 1))
      // topics-refined-linear
      // forceStress(nodes, virtualEdges.filter(e=>e.hops >= 6), nodes.length*6)
      // .distance(e=>Math.pow(e.weight/minEdgeWeight, 1))
      // .strength(e=>0.01 / Math.pow(e.weight/minEdgeWeight, 2))
      // .strength(e=>0.01)
      //topics-steiner-uniform
      // forceStress(nodes, virtualEdges.filter(e=>e.hops >= 6), nodes.length*6)
      // // .distance(e=>Math.pow(e.weight/minEdgeWeight, 0.95+1/e.hops))
      // // .strength(e=>0.01 / Math.pow(e.weight/minEdgeWeight, 1.3))
      // .distance(e=>e.weight/minEdgeWeight)
      // .strength(e=>0.01 / Math.pow(e.weight/minEdgeWeight, 1))
      // //tree-of-life-uniform
      // forceStress(nodes, virtualEdges.filter(e=>e.hops >= 6), nodes.length*6)
      // .distance(e=>Math.pow(e.weight/minEdgeWeight, 0.95+1/e.hops))
      // .strength(e=>0.04 / Math.pow(e.weight/minEdgeWeight, 1.3))
      // //tree-of-life-linear
      // forceStress(nodes, virtualEdges.filter(e=>e.hops >= 6), nodes.length*6)
      // .distance(e=>Math.pow(e.weight/minEdgeWeight, 0.95+1/e.hops))
      // .strength(e=>0.04 / Math.pow(e.weight/minEdgeWeight, 1.3))
      // //math-genealogy-uniform
      // forceStress(nodes, virtualEdges.filter(e=>e.hops >= 6), nodes.length*6)
      // .distance(e=>Math.pow(e.weight/minEdgeWeight, 0.95+1/e.hops))
      // .strength(e=>0.01 / Math.pow(e.weight/minEdgeWeight, 2))
      // math-genealogy-linear
      forceStress(nodes, virtualEdges, nodes.length*6)
      .distance(e=>Math.pow(e.weight/minEdgeWeight, 0.95+1/e.hops))
      .strength(e=>0.03 / Math.pow(e.weight/minEdgeWeight, 2))
    )
    .force('stress-edge', 
      // topics-refined-linear
      forceStress(nodes, edges, nodes.length, false)
      .distance(e=>e.weight/minEdgeWeight)
      .strength(e=>0)
    )
    // .force('stress-local', 
    //   // //lastfm-uniform
    //   // forceStress(nodes, virtualEdges.filter(e=>e.hops < 6))
    //   // .distance(e=>e.weight/minEdgeWeight)
    //   // .strength(e=>0.3 / Math.pow(e.weight/minEdgeWeight, 2))
    //   // //lastfm-linear
    //   // forceStress(nodes, virtualEdges.filter(e=>e.hops < 6), nodes.length)
    //   // .distance(e=>e.weight/minEdgeWeight)
    //   // .strength(e=>0.1 / Math.pow(e.weight/minEdgeWeight, 2))
    //   // topics-refined-uniform
    //   // forceStress(nodes, virtualEdges.filter(e=>e.hops < 6 && e.hops !== 2))
    //   // .distance(e=>e.weight/minEdgeWeight)
    //   // .strength(e=>0.2 / Math.pow(e.weight/minEdgeWeight, 2))
    //   // topics-refined-linear
    //   // forceStress(nodes, virtualEdges.filter(e=>e.hops < 6 && e.hops > 1))
    //   // .distance(e=>e.weight/minEdgeWeight)
    //   // .strength(e=>0.2 / Math.pow(e.weight/minEdgeWeight, 2))
    //   //topics-steiner-uniform
    //   // forceStress(nodes, virtualEdges.filter(e=>e.hops < 6 && e.hops !== 2))
    //   // .distance(e=>e.weight/minEdgeWeight)
    //   // .strength(e=>0.2 / Math.pow(e.weight/minEdgeWeight, 2))
      
    //   // tree-of-life-uniform
    //   // forceStress(nodes, virtualEdges.filter(e=>e.hops < 6 && e.hops !== 2), nodes.length)
    //   // .distance(e=>e.weight/minEdgeWeight)
    //   // .strength(e=>0.2 / Math.pow(e.weight/minEdgeWeight, 2))
    //   // // tree-of-life-linear
    //   // forceStress(nodes, virtualEdges.filter(e=>e.hops < 6), nodes.length)
    //   // .distance(e=>e.weight/minEdgeWeight)
    //   // .strength(e=>0.2 / Math.pow(e.weight/minEdgeWeight, 2))
    //   // 
    //   // //math-genealogy-uniform
    //   // forceStress(nodes, virtualEdges.filter(e=>e.hops < 6), nodes.length)
    //   // .distance(e=>e.weight/minEdgeWeight)
    //   // .strength(e=>0.3 / Math.pow(e.weight/minEdgeWeight, 2))
    //   // //math-genealogy-linear
    //   forceStress(nodes, virtualEdges.filter(e=>e.hops < 6 && e.hops > 1), nodes.length)
    //   .distance(e=>e.weight/minEdgeWeight)
    //   .strength(e=>0.4 / Math.pow(e.weight/minEdgeWeight, 2))
    // )
    // // // // // // //other aesthetics
    .force('central', 
     d3.forceRadial(cx, cy, 0)
     // .strength(0.0005)//lastfm-uniform
     // .strength(0.0005)//lastfm-linear
     // .strength(0.0005)//topics-refined-uniform
     // .strength(0.001)//topics-refined-linear
     // .strength(0.0001)//topics-steiner-uniform
     // .strength(0.0005)//tree-of-life-uniform
     // .strength(0.002)//tree-of-life-linear
     // .strength(0.0001)//math-genealogy-uniform
     .strength(0.0001)//math-genealogy-linear
    )
    .force('charge', 
     d3.forceManyBody()
     // .distanceMin(0.1)
     // .distanceMax(10)
     // .strength(d=> -0.01)//lastfm-uniform
     // .strength(d=> -0.01)//lastfm-linear
     // .strength(d=> -0.001)//topics-refined-uniform
     // .strength(d=> -0.04)//topics-refined-linear
     // .strength(d=> -0.01) // topics-steiner-uniform
     // .strength(d=> -0.05)//tree-of-life-uniform
     // .strength(d=> -0.05)//tree-of-life-linear
     // .strength(d=> -0.001)//math-genealogy-uniform
     // .strength(-0.01)//math-genealogy-linear
     .strength(d => d.update?-0.1:0)//math-genealogy-linear
    )
    .force('node-edge-repulsion', 
      // forceNodeEdgeRepulsion(nodes, edges, enabledNodes, 0.5)// lastfm-uniform
      // forceNodeEdgeRepulsion(nodes, edges, enabledNodes, 0.1)// lastfm-linear
      // forceNodeEdgeRepulsion(nodes, edges, enabledNodes, 0.1)// topics-refined-uniform
      // forceNodeEdgeRepulsion(nodes, edges, enabledNodes, 0.2)// topics-refined-linear
      // forceNodeEdgeRepulsion(nodes, edges, enabledNodes, 0.01)// topics-steiner-uniform
      // forceNodeEdgeRepulsion(nodes, edges, enabledNodes, 0.1)// tree-of-life-uniform
      // forceNodeEdgeRepulsion(nodes, edges, enabledNodes, 0.3)// tree-of-life-linear
      // forceNodeEdgeRepulsion(nodes, edges, enabledNodes, 0.02)//math-genealogy-uniform
      forceNodeEdgeRepulsion(nodes, edges, enabledNodes, 0.1)//math-genealogy-linear
    )
    .stop();


    // // //label overlap removal
    const origin = scales.sx.invert(0);
    const margin = 2;//in pixel
    collision_sims = [];
    let scaleY = 5;
    for (let l in dataObj.level2scale){
      l = parseFloat(l);
      let s = dataObj.level2scale[l];
      let n = nodes.filter(d=>d.level <= l);
      // let sim = d3.forceSimulation(n)
      simulation
      .force(`pre-scale`, forceScaleY(n, d=>scaleY))
      .force(`collide-${l}`, 
        d3.forceCollide()
        .radius(d=>{
          if(d.update){
            let [x0, y0] = [d.bbox.width/2, d.bbox.height/2];
            // let a = d.bbox.width/2;
            let a = Math.sqrt(x0*x0 + y0*y0*scaleY*scaleY); //figure out the major axis (a) of the ellipse 
            let r = a / s + margin;
            r = scales.sx.invert(r) - origin;
            return r;
          }else{
            return 0;
          }
        })
        .strength(0.1)
        .iterations(1)
      )
      .force(`post-scale`, forceScaleY(n, d=>1/scaleY ))
      // .force('post', forcePost(edges));
      // .stop();
      // collision_sims.push(sim);
    }
    simulation.force('post', forcePost(nodes, edges));



    simulation.on('tick', (arg)=>{
      iter += 1;
      if(iter % 5 == 0){
        postMessage({
          type: 'tick', 
          progress: iter / niter,
          nodes, 
          edges,
          enabledNodes,
        });
      }
    })
    .on('end', ()=>{
      postMessage({
        type: 'end',
        progress: iter / niter,
        nodes, 
        edges,
        enabledNodes,
      });
    })

    // train(1);
  }
};


function post(){
  postMessage({
    type: 'tick', 
    progress: niter / niter,
    nodes, 
    edges,
    enabledNodes,
  });
}

function train(niter, wait=false){
  iter = 0;

  simulation
  .velocityDecay(0.4)
  .alphaDecay(1 - Math.pow(0.001, 1 / niter));
  

  // if(!wait){
    collision_sims.forEach(sim=>sim.restart());
    simulation.restart();
  // }else{
  //   for(let i = 0; i<niter; i++){
  //     collision_sims.forEach(sim=>sim.tick());
  //     simulation.tick();
  //   }

  //   postMessage({
  //     type: 'tick', 
  //     progress: niter / niter,
  //     nodes, 
  //     edges,
  //     enabledNodes,
  //   });
  // }
  
  // for (var i = 0; i<niter; i+=1) {
  //   simulation.tick(10);
  //   if(i % tick == 0){
  //     postMessage({
  //       type: 'tick', 
  //       progress: (i+1) / niter,
  //       nodes, 
  //       edges,
  //       enabledNodes,
  //     });
  //   }
  // }
  // postMessage({
  //   type: "end",
  //   progress: (i+1) / niter,
  //   nodes, 
  //   edges,
  //   enabledNodes,
  // });
}