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
    while(enabledNodes.size < nodes.length){
      addNode();
      train(1);
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
    const idealZoomScale = 10; //for 2588-node lastfm
    console.log('target non-overlap scale', idealZoomScale);
    const idealZoomScales = [1,2,3,4,5,6,7,8]; //for 2588-node lastfm
    const origin = scales.sx.invert(0);
    const sr = d3.range(8).map((_,i)=>{
      return d=>{
        if (d.level <= i+1){
          return scales.sx.invert( (d.bbox.width+8) / idealZoomScales[i] ) - origin;
        }else{
          return 0;
        }
      };
    });

    let aspectRatio = 3;
    nodes = dataObj.nodes;
    edges = dataObj.edges;
    enabledNodes = dataObj.enabledNodes;
    id2index =  dataObj.id2index;
    virtualEdges = dataObj.virtualEdges;

    scales =  {
      sx: d3.scaleLinear().domain(dataObj.xDomain).range(dataObj.xRange),
      sy: d3.scaleLinear().domain(dataObj.yDomain).range(dataObj.yRange),
    };
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



    .force('link-real',
      d3.forceLink(edges)
      .distance(e=>e.weight)
      .strength(e=>2)
    )
    // // .force('link-virtual',
    // //   d3.forceLink(virtualEdges)
    // //   .distance(e=>Math.pow(e.weight, 0.5+1/e.hops))
    // //   .strength(e=>0.01 / Math.pow(e.weight, 1.3) * Math.pow(minEdgeWeight, 1.3) )
    // //   // .strength(e=>0.02 / e.hops )
    // // )
    // // .force('ideal-edge-length', 
    // //   forceStress(nodes, edges, enabledNodes, id2index)
    // //   // .strength(e=>50/Math.pow(e.weight, 1))
    // //   .strength(e=>0.1 / e.weight * minEdgeWeight )
    // //   .distance(e=>Math.pow(e.weight, 0.5))
    // // )
    .force('stress', 
      forceStress(nodes, virtualEdges, enabledNodes, id2index)
      // .strength(e=>10 / Math.pow(e.weight, 2) * Math.pow(minEdgeWeight, 2) )
      // .strength(e=>0.1)
      .strength(e=>1.6 / Math.pow(e.weight, 1.3) * Math.pow(minEdgeWeight, 1.3) )
      // .distance(e=>e.weight)
      // .distance(e=>Math.pow(e.weight, 0.7+1/e.hops))
      // .distance(e=>Math.pow(e.weight, Math.min(1, 0.8+1/e.hops)))
      .distance(e=>Math.pow(e.weight, 0.95+1/e.hops))
      // .distance(e=>e.weight/(Math.PI/2))
      // .distance(e=>{
      //   let r = 45000 / Math.PI;
      //   let a = e.weight / 45000 * Math.PI / 2;
      //   let l = 2 * r * Math.sin(a);
      //   return l;
      // })
      // 
    )



    // // //other aesthetics
    .force('central', 
     d3.forceRadial(0, 0, 0)
     .strength(0.005)
    )
    .force('charge', 
     d3.forceManyBody()
     .strength(d=> -6*(d.weight+100))
    )
    .force('node-edge-repulsion', 
      forceNodeEdgeRepulsion(nodes, edges, enabledNodes)
    )
    

    // //label overlap removal
    .force('pre-collide', forceScaleY(nodes, aspectRatio))
    .force('collide', 
      d3.forceCollide()
      .radius(d=>scales.sx.invert( (d.bbox.width+8) / idealZoomScale ) - scales.sx.invert(0))
      .strength(0.05)
      .iterations(2)
    )
    // .force('collide', 
    //   d3.forceCollide()
    //   .radius(sr[sr.length])
    //   .strength(0.05)
    //   .iterations(2)
    // )
    .force('post-collide', forceScaleY(nodes, 1/aspectRatio))

    // // // .force('label-collide', 
    // // //   forceEllipse({
    // // //     nodes: nodes, 
    // // //     scales: scales,
    // // //     strength: 3,
    // // //     b: 2.0,
    // // //     c: 1.0,
    // // //   })
    // // // )

    .force('post', forcePost(edges, 500, enabledNodes, id2index, 0))
    .stop();

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