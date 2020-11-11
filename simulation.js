// importScripts("https://d3js.org/d3-collection.v1.min.js");
// importScripts("https://d3js.org/d3-dispatch.v1.min.js");
// importScripts("https://d3js.org/d3-quadtree.v1.min.js");
// importScripts("https://d3js.org/d3-timer.v1.min.js");
// importScripts("https://d3js.org/d3-force.v1.min.js");

importScripts("lib/d3.v5.js");
importScripts("force.js");
importScripts("utils.js");
importScripts("lib/numeric-1.2.6.js");


let simulation;
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




function addNode(){
  console.log(`${progress}/${nodes.length}`);
  let start = progress;
  progress += 1;
  if(progress <= nodes.length){
    enabledNodes = initNodePosition(
      nodes.slice(start, progress), 
      enabledNodes, 
      nodes, 
      edges, 
      id2index, 
      true);
  }
  simulation.alpha(0.99);
  return;
};


onmessage = function(event) {
  dataObj = event.data;
  let type = event.data.type;
  console.log(type);
  if(type === 'restart'){
    simulation.alpha(0.85);
    train(niter, 10);
  }else if(type === 'add-node'){  
    addNode(self.progress);
    train(5);
  }else if(type === 'stop'){  
    simulation.stop();
  }else if(type === 'zoom'){  
    scales.sx = d3.scaleLinear().domain(dataObj.xDomain).range(dataObj.xRange);
    scales.sy = d3.scaleLinear().domain(dataObj.yDomain).range(dataObj.yRange);
  }else if(type === 'auto-add-nodes'){
    while(enabledNodes.size < nodes.length){
      addNode();
      if(enabledNodes.size % 2 == 0){
        train(1);
      }
    }
    train(10);

    // if(intervalId === undefined){
    //   console.log('adding nodes...');
    //   intervalId = setInterval(()=>{
    //     addNode();
    //     train(1);
    //     if(enabledNodes.size === nodes.length){
    //       console.log('paused adding');
    //       clearInterval(intervalId);
    //       intervalId = undefined;
    //       // setTimeout(()=>{
    //       //   simulation.stop();
    //       // }, 15000);
    //       train(10);
    //     }
    //   }, 1000);
    // }else{
    //   console.log('stop');
    //   clearInterval(intervalId);
    //   intervalId = undefined;
    // }
  }
  else{
    //default init event
    niter = 500;
    nodes = dataObj.nodes;
    edges = dataObj.edges;
    enabledNodes = dataObj.enabledNodes;
    id2index =  dataObj.id2index;
    virtualEdges =  dataObj.virtualEdges;
    scales =  {
      sx: d3.scaleLinear().domain(dataObj.xDomain).range(dataObj.xRange),
      sy: d3.scaleLinear().domain(dataObj.yDomain).range(dataObj.yRange),
    };
    progress = dataObj.progress;
    maxEdgeWeight = d3.max(edges, e=>e.weight);
    minEdgeWeight = d3.min(edges, e=>e.weight);

    self.progress = progress;
    // def force
    simulation = d3
    .forceSimulation(nodes)
    // .velocityDecay(0.4)
    // .alphaDecay(1 - Math.pow(0.001, 1 / niter))
    .force('pre', forcePre(scales))
    .force('central', 
     d3.forceRadial(0, 0, 0)
     .strength(0.001)
    )
    .force('charge', 
     d3.forceManyBody()
     .strength(d=>-250 * (10 - d.level + 1))
    )
    .force('collide', 
     d3.forceCollide()
     .radius(d=>{
       return scales.sx.invert(122.6875) - scales.sx.invert(0);
     })
     .strength(0.1)
    )
    .force('link-virtual',
      d3.forceLink(virtualEdges)
      .distance(e=>e.weight)
      .strength(e=>1 / Math.pow(e.weight, 2) * Math.pow(minEdgeWeight, 2) )
      // .strength(e=>0.02 / e.hops )
    )
    .force('link-real',
      d3.forceLink(edges)
      .distance(e=>e.weight)
      .strength(e=>1)
    )
    // 

    // .force('ideal-edge-length', 
    //   forceStress(nodes, edges, enabledNodes, id2index)
    //   // .strength(e=>50/Math.pow(e.weight, 1))
    //   .strength(e=>0.1 / e.weight * minEdgeWeight )
    //   .distance(e=>e.weight)
    // )
    // .force('stress', 
    //   forceStress(nodes, virtualEdges, enabledNodes, id2index)
    //   // .strength(e=>1.6 / Math.pow(e.weight, 1.3) * Math.pow(minEdgeWeight, 1.3) )
    //   .strength(e=>0.1 / Math.pow(e.weight, 2) * Math.pow(minEdgeWeight, 2) )
    //   .distance(e=>e.weight )
    // )
    // // .force('node-edge-repulsion', 
    // //   forceNodeEdgeRepulsion(nodes, edges, enabledNodes)
    // // )
    // .force('label-collide', 
    //   forceEllipse({
    //     nodes: nodes, 
    //     scales: scales,
    //     strength: 3,
    //     b: 2.0,
    //     c: 1.0,
    //   })
    // )
    .force('post', forcePost(edges, 500, enabledNodes, id2index, 0))
    .stop();

    // train(1);
  }
};




function updateBbox(d, bbox, scales){
  let marginLeft = bbox.width * 0;
  let marginTop = bbox.height * 0;
  let x = scales.sx(d.x);
  let y = scales.sy(d.y);
  d.bbox = {
    width: bbox.width,
    height: bbox.height,
    left: x - bbox.width/2 - marginLeft,
    top: y - bbox.height/2 - marginTop,
    right: x + bbox.width/2 + marginLeft,
    bottom: y + bbox.height/2 + marginTop,
  };
}





  


function train(niter, tick=1e9){
  simulation
  .velocityDecay(0.4)
  .alphaDecay(1 - Math.pow(0.001, 1 / niter))
  for (var i = 0; i<niter; i+=1) {
    simulation.tick(10);
    if(i % tick == 0){
      postMessage({
        type: 'tick', 
        progress: (i+1) / niter,
        nodes, 
        edges,
        enabledNodes,
      });
    }
  }
  postMessage({
    type: "end",
    progress: (i+1) / niter,
    nodes, 
    edges,
    enabledNodes,
  });
}