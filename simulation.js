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
let iter = 0;
let dpr = 1;


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
    simulation.alpha(0.99);
    train(niter);
  }else if(type === 'add-node'){  
    addNode();
    train(1);
  }else if(type === 'stop'){  
    simulation.stop();
  }else if(type === 'zoom'){  
    scales.sx = d3.scaleLinear().domain(dataObj.xDomain).range(dataObj.xRange);
    scales.sy = d3.scaleLinear().domain(dataObj.yDomain).range(dataObj.yRange);
  }else if(type === 'auto-add-nodes'){
    let niter = 40;
    while(enabledNodes.size < nodes.length){
      addNode();
      if(enabledNodes.size % 50 == 0){
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
    // const idealZoomScale = 25; //for 5000-node topics
    // let aspectRatio = 3;
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
    const idealZoomScale = 10; //for 2588-node lastfm
    
    progress = dataObj.progress;
    maxEdgeWeight = d3.max(edges, e=>e.weight);
    minEdgeWeight = d3.min(edges, e=>e.weight);

    let maxLevel = d3.max(nodes, d=>d.level);

    self.progress = progress;
    // def force
    simulation = d3.forceSimulation(nodes)
    .velocityDecay(0.4)
    .alphaDecay(1 - Math.pow(0.001, 1 / niter))
    .force('pre', forcePre(scales))

    .force('link',
      d3.forceLink(edges)
      .distance(e=>e.weight)
      .strength(e=>1)
    )
    .force('stress', 
      forceStress(nodes, virtualEdges, enabledNodes, id2index)
      // .distance(e=>Math.pow(e.weight, 0.95+1/e.hops))
      // .strength(e=>1 / Math.pow(e.weight, 1.3) * Math.pow(minEdgeWeight, 1.3) )
      // .distance(e=>e.weight)
      // .strength(e=>1 / Math.pow(e.weight, 1.4) * Math.pow(minEdgeWeight, 1.4) )//lastfm
      .distance(e=>e.weight)
      .strength(e=>1 / Math.pow(e.weight, 2.0) * Math.pow(minEdgeWeight, 2.0) )
    )

    // // // //other aesthetics
    // .force('central', 
    //  d3.forceRadial(0, 0, 0)
    //  .strength(0.005)
    // )
    .force('charge', 
     d3.forceManyBody()
     .strength(d=> -1*(d.weight+50))
    )
    .force('node-edge-repulsion', 
      forceNodeEdgeRepulsion(nodes, edges, enabledNodes)
    )
    .stop();


    // //label overlap removal
    // simulation
    // .force('pre-collide', forceScaleY(nodes, aspectRatio))
    // .force('collide', 
    //   d3.forceCollide()
    //   .radius(d=>scales.sx.invert( (d.bbox.width+8) / idealZoomScale ) - scales.sx.invert(0))
    //   .strength(0.05)
    //   .iterations(2)
    // )
    // .force('post-collide', forceScaleY(nodes, 1/aspectRatio))
    // 
    
    // const levelCount = Array.from(new Set(nodes.map(d=>[d.level, d.nodeCount]))).sort((a,b)=>a-b);
    // let idealCount = 40;
    
    // // for(let lc of levelCount){
    // //   let [l,c] = lc;
    // //   level2scale[l] = 1.5*Math.sqrt(c / idealCount);
    // // }
    let level2scale = dataObj.level2scale;
    console.log(level2scale);
    const origin = scales.sx.invert(0);
    const margin = 2;//in pixel
    for (let l in level2scale){
      l = parseFloat(l);
      let s = level2scale[l];
      let aspectRatio = 4;
      simulation
      .force('pre-collide', forceScaleY(nodes, aspectRatio))
      .force(`collide-${l}`, 
        d3.forceCollide()
        .radius(d=>{
          if(d.level <= l){
            let r = d.bbox.width/2 / s + margin;
            r = scales.sx.invert(r) - origin;
            return r;
          }else{
            return 0;
          }
        })
        // .strength(0.03)
        // .strength(0.5/(maxLevel+1-l))//lastfm
        // .strength(0.02 + 0.06/(maxLevel+1-l))//topics
        .strength(0.02 + 0.06/(maxLevel+1-l))//topics
        .iterations(2)
      )
      .force('post-collide', forceScaleY(nodes, 1/aspectRatio))
    }   
    simulation.force('post', forcePost(edges, 500, enabledNodes, id2index, 0));



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

  if(!wait){
    simulation.restart();
  }else{
    simulation.tick(niter);
    postMessage({
      type: 'tick', 
      progress: niter / niter,
      nodes, 
      edges,
      enabledNodes,
    });
  }
  
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