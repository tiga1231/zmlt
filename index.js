// //--------code----------
const colorscheme = d3.schemeAccent;//schemePastel1
const OPACITY_NOT_UPDATE = 0.1;
const IS_PROGRESSIVE = true;
const IS_DYNAMIC = false;
const EDGE_COLOR = '#000';
// const EDGE_COLOR = d3.rgb(249,180,35);
const HIDE_OVERLAP = false;
const DPR = window.devicePixelRatio;
// const font = 'monospace';
const FONT = 'Times';
const HIDDEN_NODE_ALPHA = 0.0;
const HIDDEN_EDGE_ALPHA = 0.0;
const HIDDEN_LABEL_ALPHA = 0.0;

//globals
let shouldTick = true;

let darkMode = false;
let bg = darkMode ? '#322':'#fff';

let runtime = [];
let nodes;

let progress = undefined;
let enabledNodes = undefined;

let shouldDraw = true;
let shouldLabel = true;
let shouldMarkOverlap = false;

let forceLabel = true;
let forceLabelLevel = 99;


//--------data----------
let fns = [
    'out.json',
];




/// external layouts to show in figures
/// DELG
// let fns = [
//   `data/external/lastfm-DELG-min.json`,
//   `data/external/lastfm-DELG-nodes-0.json`,
// ];
// let fns = [
//   `./data/external/topics-DELG-min.json`,
//   `./data/external/topics-DELG-nodes-0.json`,
// ];
// let fns = [
//   `./data/external/tol-DELG-min.json`,
//   `./data/external/tol-DELG-nodes-0.json`,
// ];
// 
/// BT
// let fns = [
//   `data/external/lastfm-BT-min.json`,
//   `data/external/lastfm-BT-nodes-0.json`,
// ];
// let fns = [
//   `./data/external/topics-BT-min.json`,
//   `./data/external/topics-BT-nodes-0.json`,
// ];
// let fns = [
//   `./data/external/tol-BT-min.json`,
//   `./data/external/tol-BT-nodes-0.json`,
// ];



let promises = Promise.all(fns.map(fn=>d3.json(fn)))
.then((data)=>{
  let nodes;
  if(data.length == 1){
    data = data[0];
  }else{
    [data, nodes] = data;
  }
  window.data = data;
  window.progress = IS_PROGRESSIVE ? 1 : data.nodes.length;
  window.enabledNodes = new Set(data.node_id.slice(0, window.progress));
  preprocess(data, nodes);

  let maxLevel = d3.max(data.nodes, d=>d.level);
  data.level2scale = {};
  data.level2scale[maxLevel] = Math.sqrt(data.nodes.length) / 4; //default

  if(fns[0].includes('topics')){
    data.level2scale = {};
    data.level2scale[maxLevel] = 20;
  }else if(fns[0].includes('topics_steiner')){
    data.level2scale = {};
    data.level2scale[maxLevel-1] = 20;
    data.level2scale[maxLevel] = 200;
  }else if(fns[0].includes('lastfm')){
    let baseScale = 1;
    let scaleFactor = Math.pow(15, 1/(maxLevel-1));
    data.level2scale = {
      // 1:1,
      // 15:15,
    };
    for(let i=1; i<=maxLevel; i++){
      if(i==maxLevel){
        data.level2scale[i] = baseScale * Math.pow(scaleFactor, i-1);
      }
    }
  }else if(fns[0].includes('tol_graphs')){
    data.level2scale = {
      8:15,
      //7:50
    };
  }else if(fns[0].includes('math_genealogy')){
    data.level2scale = {
      8:15,
    };
  }


  console.log(data.level2scale);

  let canvas = init(data);
  if(shouldDraw){
    canvas.draw(shouldLabel, forceLabel);
  }

});


function init(data){
  //let virtualEdges = data.virtual_edges;
  // let id2index = data.id2index;

  let nodes = data.nodes; 
  let edges = data.edges;
  let canvasData = {nodes, edges};

  let width = window.innerWidth;
  let height = window.innerHeight;
  let scales = initScales(nodes, width, height);
  let canvas = initCanvas(width, height, canvasData, scales, draw);
  
  updateBbox(canvas.data.nodes, canvas);
  canvas.levelScalePairs = getNonOverlapLevels(canvas);
  markNonOverlapLevels(canvas);
  markLabelByLevel(canvas.data.nodes, canvas);
  let simData = {
    nodes, 
    edges, 
    virtualEdges: data.virtual_edges, 
    enabledNodes: window.enabledNodes, 
    id2index: data.id2index,
    xDomain: scales.sx.domain(),
    xRange: scales.sy.range(),
    yDomain: scales.sy.domain(),
    yRange: scales.sy.range(),
    progress: window.progress,
    dpr: DPR,
    level2scale: data.level2scale,
  };
  canvas.worker = initSimulationWorker(canvas, simData);
  canvas.worker.postMessage({
    type: 'auto-add-nodes'
  });

  initInteraction(canvas);


  // let svg = initOverlay();
  // initStyles();
  // initKeyboard();
  

  

  // let simData = {
  //   nodes, 
  //   edges, 
  //   virtualEdges, 
  //   enabledNodes: window.enabledNodes, 
  //   id2index,
  //   xDomain: scales.sx.domain(),
  //   xRange: scales.sy.range(),
  //   yDomain: scales.sy.domain(),
  //   yRange: scales.sy.range(),
  //   progress: progress,
  // };
  // let worker = initSimulationWorker(simData);
  
  

  return canvas;
}


function updateBbox(nodes, canvas){
  let scales = canvas.scales;//initScales(nodes, canvas.width, canvas.height);
  let sx = scales.sx;
  let sy = scales.sy;
  let sl = scales.sl;
  let sr = scales.sr;
  let ctx = canvas.context;
  for(let n of nodes){
    let x = sx(n.x);
    let y = sy(n.y);
    let l = sl(n.level);
    n.r = sr(n.level);
    n.l = l;
    if(n.bbox === undefined){

      ctx.font = `${l}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let m = ctx.measureText(n.label);
      let left = x - m.actualBoundingBoxLeft;
      let right = x + m.actualBoundingBoxRight;
      let top = y - m.actualBoundingBoxAscent;
      let bottom = y + m.actualBoundingBoxDescent;
      let width = right - left;
      let height = bottom - top;
      n.bbox = {
        x: left,
        y: top,
        cx: x*DPR,
        cy: y*DPR,

        width,
        height,
        left,
        right,
        top,
        bottom,
      }; 
    }else{
      // n.bbox.cx = Math.round(x * DPR);
      // n.bbox.cy = Math.round(y * DPR);
      n.bbox.cx = x*DPR;
      n.bbox.cy = y*DPR;
      n.bbox.x = x - n.bbox.width/2;
      n.bbox.y = y - n.bbox.height/2;
      n.bbox.left = x - n.bbox.width/2;
      n.bbox.right = x + n.bbox.width/2;
      n.bbox.top = y - n.bbox.height/2;
      n.bbox.bottom = y + n.bbox.height/2;
    }
    
  }
}


function getNonOverlapLevels(canvas){
  let nodes = canvas.data.nodes;
  updateBbox(nodes, canvas);
  let levels = Array.from(new Set(nodes.map(d=>d.level))).sort((a,b)=>a-b);
  let res = [];
  for (let l of levels){
    let bbox = nodes.filter(d=>d.level <= l).map(d=>d.bbox);
    let [s, a] = areaUtilization(bbox);
    res.push([l, s]);
  }
  console.log(res);
  return res;
}


// function areaUtilization(bboxes){
//   //binary search minimal non-overlap scale
//   //then compute area usage
//   bboxes.forEach((b,i)=>b.index=i);
//   let sx = (d)=>(d.x+d.x+d.width)/2;
//   let sy = (d)=>(d.y+d.y+d.height)/2;
//   let tree = d3.quadtree(bboxes, sx, sy);

//   const min0 = 1;
//   const max0 = 1000;
//   let lowerbound = min0;
//   let upperbound = min0;
//   for(let i=0; i<bboxes.length; i++){
//     let bi = bboxes[i];
//     let x = sx(bi);
//     let y = sy(bi);
//     let r = bi.width;
//     let neighbors = searchQuadtree(tree, sx, sy, x-r, x+r, y-r, y+r);
//     for(let j of neighbors){
//       if(i!==j){
//         let bj = bboxes[j];
//         let min = min0;
//         let max = max0;
//         for(let k=0; k<20; k++){
//           let tmp = (min+max)/2;
//           if(isRectCollide2(bi, bj, tmp)){
//             [min,max] = [tmp, max];
//           }else{
//             [min,max] = [min, tmp];
//           }
//         }
//         lowerbound = Math.max(min, lowerbound);
//         upperbound = Math.max(max, upperbound);
//       }
//     }
//   }
//   return [upperbound, areaCoverage(bboxes, upperbound)];
// }

function markScale(nodes, higher, all){
  let sx = d=>d.bbox.cx;
  let sy = d=>d.bbox.cy;
  let higherEqual = nodes.concat(higher);
  let tree = d3.quadtree(higherEqual, sx, sy);
  let rx = d3.max(higherEqual, d=>d.bbox.width) * 2;//depends on min zoom extent
  let ry = d3.max(higherEqual, d=>d.bbox.height) * 2;

  const min0 = 0.00001;
  const max0 = 1000;
  let current = new Set(higher.map(d=>d.index));
  for(let n of nodes){
    let bi = n.bbox;
    let [x,y] = [bi.cx, bi.cy];
    let neighbors = searchQuadtree(tree, sx, sy, x-rx, x+rx, y-ry, y+ry);
    // console.log(neighbors)
    neighbors = neighbors.filter(i=>current.has(i));
    let scale = min0;
    for(let j of neighbors){
      if(n.index === j){
        continue;
      }
      let min = min0;
      let max = max0;    
      let bj = all[j].bbox;
      let mid;// = (min+max)/2;
      for(let k=0; k<12; k++){
        mid = (min+max)/2;
        if(isRectCollide2(bi, bj, mid)){
          [min,max] = [mid, max];
        }else{
          [min,max] = [min, mid];
        }
      }
      scale = Math.max(scale, max);
    }
    n.labelScale = scale;
    // current.push(n.index);
    current.add(n.index);
    // console.log(n.level, n.labelScale);
  }
}


function markNonOverlapLevels(canvas){
  let nodes = canvas.data.nodes;
  updateBbox(nodes, canvas);
  let l0 = 0;
  // for (let l of [10, 20]){
  let levels = Array.from(new Set(nodes.map(d=>d.level))).sort((a,b)=>a-b);
  for (let l of levels){
    let nodes_l = nodes
    .filter(d=>l0 < d.level && d.level <= l)
    .sort((a,b)=>b.perplexity - a.perplexity);
    let higher = nodes.filter(d=>d.level <= l0);
    markScale(nodes_l, higher, nodes);
    l0 = l;
  }

  // for(let i=0; i<nodes.length; i++){
  //   markScale(nodes.slice(i ,i+1), nodes.slice(0,i), nodes);
  // }
}


function initSimulationWorker(canvas, simData){
  let worker = new Worker('simulation.js');
  worker.postMessage(simData);
  worker.onmessage = function(event) {
    let data = event.data;
    let type = data.type;
    if(type === 'tick'){
      let runtime = performance.now()-window.t0;//in ms
      console.log(`${(data.progress * 100).toFixed(2)}%, runtime: ${(runtime/1000).toFixed(2)} sec`, );
      canvas.data.nodes = data.nodes;
      canvas.data.edges = data.edges;
      canvas.simulation = data.simulation;
      
      window.data.nodes = data.nodes;
      window.data.edges = data.edges;
      window.enabledNodes = data.enabledNodes;
      
      updateBbox(canvas.data.nodes, canvas);
      markLabelByLevel(canvas.data.nodes, canvas);
      if(shouldDraw){
        canvas.draw(shouldLabel, forceLabel);
      }
    }
    // if(type === 'end'){
    //   // window.nodes = data.nodes;
    //   // window.edges = data.edges;
    //   // window.simulation = data.simulation;
    //   // window.enabledNodes = data.enabledNodes;
    //   draw(
    //     data.nodes, data.edges, 
    //     drawData.nodeCircles, drawData.linkLines, 
    //     drawData.labelTexts, drawData.labelBoxes,
    //     drawData.scales.sx, drawData.scales.sy, 
    //     drawData.transform
    //   );
    //   let t = performance.now() - window.t0;
    //   console.log('training time', t/1000, 'secs');
    // }
  };
  return worker;
}


function setCanvasSize(canvas, w, h){
  canvas.width = w * DPR;
  canvas.height = h * DPR;
  canvas.style.width = w;
  canvas.style.height = h;
}

function initCanvas(w,h, data, scales, draw){
  let canvas = document.getElementById('main');
  canvas.context = canvas.getContext('2d');
  setCanvasSize(canvas, w, h);

  canvas.data = data;
  canvas.scales = scales;
  canvas.draw = draw;
  canvas.clear = ()=>{
    canvas.context.clearRect(0,0, canvas.width, canvas.height);
  };
  canvas.transform = d3.zoomIdentity.scale(1);
  return canvas;
}


function initScales(nodes, w, h){  

  let xExtent = d3.extent(nodes, d=>d.x);
  let yExtent = d3.extent(nodes, d=>d.y);
  // let maxLevel = d3.max(nodes, d=>d.level);

  let scales = getCanvasScales(xExtent, yExtent, w, h);

  // scales.sc = d3.scaleLinear()
  // .domain([maxLevel,1])
  // // .range(['#ece7f2','#2b8cbe']);
  // .range(['#a6bddb','#023858']);

  let extentLevel = d3.extent(nodes, d=>d.level);
  scales.sr = d3.scaleLinear().domain(extentLevel).range([1,1]);
  scales.ss = d3.scaleLinear().domain(extentLevel).range([4,1]);
  // scales.sl = d3.scaleLinear().domain(extentLevel).range([18, 12]); //label font size;
  scales.sl = d3.scaleLinear().domain(extentLevel).range([16, 16]); //label font size;
  // scales.sc = d3.scaleLinear().domain(extentLevel).range(['#08306b', '#9ecae1']); //node & label color
  scales.sc = d3.scaleLinear().domain(extentLevel).range(['black', 'black']); //node & label color

  let levels = Array.from(new Set(nodes.map(d=>d.level))).sort((a,b)=>a-b);
  let fonts = levels.map(l=>`${Math.round(scales.sl(l)*DPR)}px ${FONT}`);
  scales.sf = d3.scaleLinear().domain(levels).range(fonts); //font size
  return scales;
}


function initOverlay(){
  let ax = d3.axisBottom(scales.sx);//.tickSize(-(sy.range()[1]-sy.range()[0]));
  let ay = d3.axisLeft(scales.sy);//.tickSize(-(sx.range()[1]-sx.range()[0]));
  let gx = svg.selectAll('.gx')
  .data([0,])
  .enter()
  .append('g')
  .attr('class', 'gx')
  .attr('transform', `translate(0,${scales.sy.range()[1]})`)
  .style('color', '#aaa')
  .call(ax);
  let gy = svg.selectAll('.gy')
  .data([0,])
  .enter()
  .append('g')
  .attr('class', 'gy')
  .attr('transform', 'translate(30,0)')
  .style('color', '#aaa')
  .call(ay);

}


function debugMsg(){
    let edgesTmp = window.edges.filter(e=>window.enabledNodes.has(e.source.id) && window.enabledNodes.has(e.target.id));
    let nodesTmp = window.nodes.filter(d=>window.enabledNodes.has(d.id));
    // let labelTextNodesTmp = labelTexts.filter(d=>window.enabledNodes.has(d.id)).nodes();
    // let labelTextNodesTmp = labelTexts.filter(d=>d.update).nodes();
    let labelTextNodesTmp = labelTexts.nodes();
    console.log(
      'zoom:', 
      parseFloat(transform.k.toFixed(2)),
      '\n',
      'overlap:', 
      // labelOverlap(labelTextNodesTmp),
      '\n',
      'crossings:', 
      countCrossings(edgesTmp),
      '\n',
      'edge length:', 
      parseFloat(
        idealEdgeLengthPreservation2(edgesTmp, edgesTmp.map(e=>e.weight))
        .toFixed(4)
      ),
      '\n',
      'label area:', 
      parseFloat(areaCoverage(labelTextNodesTmp).toFixed(6)),
      '\n',
    );
  }







function initInteraction(canvas){
  initZoom(canvas);
  // initDrag();
  initKeyboard(canvas);
}


function initZoom(canvas){
  let sx0, sy0;
  let scale0 = 1;
  // let transform = d3.zoomIdentity.scale(scale0 * dpr);

  let zoom = d3.zoom()
  .scaleExtent([0.1, 1000])
  .on('zoom', (transform0)=>{
    if(transform0 === undefined){
      canvas.transform = d3.event.transform.scale(scale0);
    }else{
      canvas.transform = transform0;
    }
    if(sx0 === undefined){
      sx0 = canvas.scales.sx;
      sy0 = canvas.scales.sy;
      canvas.scales.sx0 = sx0;
      canvas.scales.sy0 = sy0;
    }
    canvas.scales.sx = canvas.transform.rescaleX(sx0);
    canvas.scales.sy = canvas.transform.rescaleY(sy0);
    // ax.scale(scales.sx);
    // ay.scale(scales.sy);
    // gx.call(ax);
    // gy.call(ay);
    // 
    // 
    
    updateBbox(canvas.data.nodes, canvas);
    // Show label according to non-overlap zoom scale
    markLabelByLevel(canvas.data.nodes, canvas);
    // optional: greedy labeling
    // markLabelByOverlap(canvas.data.nodes, canvas);

    if(shouldDraw){
      canvas.draw(shouldLabel, forceLabel, shouldMarkOverlap);
    }
  })
  .on('end', ()=>{
    console.log('zoom', canvas.transform.k);
  });
  d3.select(canvas).call(zoom);

  d3.select('#resetButton')
  .on('click', ()=>{
    d3.select(canvas)
    .transition()
    .duration(700)
    .ease(d3.easeCubicInOut)
    .call(zoom.transform, d3.zoomIdentity);
  });
      

}


function initDrag(){
  let drag = simulation => {
    return d3.drag()
    .on('start', (d)=>{
      if (!d3.event.active){
        simulation.alpha(0.1).alphaTarget(0.0).restart();
      }
      if(d.type !== 'label'){
        d.fx = d.x;
        d.fy = d.y;
      }else{
        d.fx = d.for.x;
        d.fy = d.for.y;
      }
      
    })
    .on('drag', (d)=>{

      if(d.type !== 'label'){
        d.fx = scales.sx.invert(d3.event.sourceEvent.offsetX);
        d.fy = scales.sy.invert(d3.event.sourceEvent.offsetY);
      }else{
        d.for.fx = scales.sx.invert(d3.event.sourceEvent.offsetX);
        d.for.fy = scales.sy.invert(d3.event.sourceEvent.offsetY);
      }
    })
    .on('end', (d)=>{
      if (!d3.event.active){
        simulation.alpha(0.3).alphaTarget(0);
      }
      if(d.type !== 'label'){
        d.fx = null;
        d.fy = null;
      }else{
        d.for.fx = null;
        d.for.fy = null;
      }
    });
  };
}


function initKeyboard(canvas){
  let worker = canvas.worker;
  const digits = new Set(['1','2','3','4','5','6','7','8','9', '0']);


  window.addEventListener('keydown', (event)=>{
    let key = event.key;
    console.log(key);
    if(key === 'p'){//[P]ause
       worker.postMessage({
        type: 'stop'
      });
    }else if(key === 'r'){//[R]estart
      window.t0 = performance.now();
      console.log('t0', window.t0);
      worker.postMessage({
        type: 'restart'
      });
    }else if(key === 'c'){//show [C]ollision
      shouldMarkOverlap = !shouldMarkOverlap;
      if(shouldMarkOverlap){
        markLabelByOverlap(canvas.data.nodes.filter(d=>d.shouldShowLabel), canvas);
      }
      canvas.draw(shouldLabel, forceLabel, shouldMarkOverlap);
    }else if(key === 'l'){//hide [l]abel
      shouldLabel = !shouldLabel;
      canvas.context.clearRect(0,0, canvas.width, canvas.height);
      if(shouldDraw){
        canvas.draw(shouldLabel, forceLabel);
      }
    }else if(key === 'h'){//[h]ide all
      shouldDraw = !shouldDraw;
      canvas.context.clearRect(0,0, canvas.width, canvas.height);
      if(shouldDraw){
        canvas.draw(shouldLabel, forceLabel);
      }
    }else if(key === 'a'){//[A]dd a node
      window.t0 = performance.now();
      worker.postMessage({
        type: 'add-node',
      });
    }else if(key === 'd'){//show [D]ebug message
      debugMsg();
    }else if(key === 'b'){//background
      darkMode = !darkMode;
      bg = darkMode ? '#322':'#fff';
      svg.style('background', bg); 
    }else if(key === 's'){
      worker.postMessage({
        type: 'auto-add-nodes'
      });
    }else if(key === '/'){//log
      exportJson(pos(canvas.data.nodes),`nodes.json`);
    }else if(key === 'e'){ //evaluation
      canvas.levelScalePairs = getNonOverlapLevels(canvas);
      
      let edges = canvas.data.edges;
      let bboxes = canvas.data.nodes.map(d=>d.bbox);
      let iel = bestIdealEdgeLengthPreservation(edges, edges.map(e=>e.weight));
      let [scale, cm] = areaUtilization(bboxes);
      console.log('edge:', +iel.toFixed(4));
      console.log('area:', +cm.toFixed(6));


      // evalMsg(nodes, edges, labelTexts);
    }else if(digits.has(key)){
      if(forceLabelLevel == parseInt(key)){
        forceLabel = !forceLabel;
      }else{
        forceLabel = true;
      }
      if(!forceLabel){
        forceLabelLevel = -1;
      }else{
        forceLabelLevel = parseInt(key);
      }
      console.log(forceLabel, forceLabelLevel);
      markLabelByLevel(canvas.data.nodes, canvas);
      canvas.draw(shouldLabel, forceLabel);
    }
  });
}








function initStyles(){
  //  nodes.forEach((d,i)=>{
  //   let bbox = labelTextNodes[i].getBoundingClientRect();
  //   updateBbox(d, bbox, scales);
  // });
  zoom.on('zoom')(transform); //draw

  const linkLines = svg
  .selectAll('.link')
  .data(edges)
  .join('line')
  .attr('class', 'link')
  .attr('stroke', EDGE_COLOR);//colorscheme[Math.max(e.source.level,e.target.level)-1]);

  const nodeCircles = svg
  .selectAll('.node')
  .data(nodes)
  .join('circle')
  .attr('class', 'node')
  .attr('r', d=>sr(d.level))
  // .attr('fill', d=>colorscheme[(d.level-1) % colorscheme.length])
  .attr('fill', d=>sc(d.level))
  // .attr('fill', d=>'#1f78b4')
  .attr('stroke', EDGE_COLOR)
  .attr('stroke-width', d=>0)
  // .call(drag(simulation));
  
  const labelBoxes = svg
  .selectAll('.labelBox')
  .data(nodes)
  .join('rect')
  .attr('class', 'labelBox');
  // .style('fill', '#aaf')
  // .attr('stroke', '#333')
  // .attr('stroke-width', 1)
  // .attr('opacity', 0.1);

  const labelTexts = svg
  .selectAll('.labelText')
  .data(nodes)
  .join('text')
  .attr('class', 'labelText')
  // .style('fill', d=>d3.color(colorscheme[(d.level-1) % colorscheme.length]))
  // .attr('fill', d=>d3.rgb(57,60,66))
  .attr('fill', d=>d3.color(sc(d.level)))
  .style('font-size', d=>`${20-d.level}px`)
  // .style('font-weight', 100)
  // .style('text-anchor', 'middle')
  // .style('alignment-baseline', 'middle')
  // .style('filter', f'url(#whiteOutlineEffect)')
  .style('display', shouldHideLabel?'none':'')
  .text(d=>d.label);
  // .call(drag(simulation));

  let labelTextNodes = labelTexts.nodes();
  window.labelTexts = labelTexts;
  window.labelTextNodes = labelTextNodes;
  //let bboxes = labelTextNodes.map(d=>d.getBoundingClientRect());
  //let maxWidth = bboxes.reduce((a,b)=>a.width>b.width?a.width:b.width);
  //let maxHeight = bboxes.reduce((a,b)=>a.height>b.height?a.height:b.height);

}





function evalMsg(nodes, edges, labelTexts, counts=undefined){
  if(counts === undefined){
    counts = Array.from(new Set(nodes.map(d=>d.nodeCount)));
    counts.sort((a,b)=>a-b);
  }
  let dl = []; // desired (edge) length
  let cm = [];// compactness / area utilization
  // for(let level=1; level <= maxLevel; level++){
  for(let nc of counts){
    // let edgesTmp = edges.filter(e=>e.source.level <= level && e.target.level <= level);
    // let nodesTmp = nodes.filter(d=>d.level <= level);
    // let bboxesTmp = labelTexts.filter(d=>d.level<=level).nodes().map(d=>d.getBoundingClientRect());
    
    let edgesTmp = edges.filter(e=>e.source.nodeCount <= nc && e.target.nodeCount <= nc);
    let nodesTmp = nodes.filter(d=>d.nodeCount <= nc);
    let bboxesTmp = labelTexts.filter(d=>d.nodeCount <= nc).nodes().map(d=>d.getBoundingClientRect());
    let idealEdgeLength = bestIdealEdgeLengthPreservation(edgesTmp, edgesTmp.map(e=>e.weight));
    let [scale, area] = areaUtilization(bboxesTmp);

    dl.push(idealEdgeLength);
    cm.push(area);
    console.log(
      'node count:', nc, '\n',
      'edge length:', parseFloat(idealEdgeLength.toFixed(4)), '\n',
      'area utilization:', parseFloat(area.toFixed(6)), 'at zoom', scale, '\n',
    );
  }

  let table = '';
  for(let i=0; i<dl.length; i++){
    table += `\\textbf{$T_${i+1}$} & ${dl[i].toFixed(2)} & ${cm[i].toFixed(4)}\\\\ \\hline \n`;
    table += `${i+1} & ${dl[i].toFixed(2)} & ${cm[i].toFixed(4)} \\\\hline]\n`;
  }
  console.log(table);
}


// //--------functions----------
function preprocess(data, nodes){

  data.nodes = [];
  for(let i=0; i<data.node_id.length; i++){
    data.nodes[i] = {};
    for(let k in data){
      if(k.slice(0,5) === 'node_'){
        data.nodes[i][k.slice(5)] = data[k][i];
      }
    }
  }
  if(nodes !== undefined){
    if(nodes[0].nodeCount === undefined){
      nodes.forEach((d,i)=>{
        d.nodeCount = data.node_nodeCount[i];
      });
    }
    if(nodes[0].weight === undefined){
      nodes.forEach((d,i)=>{
        d.weight = data.node_weight[i];
      });
    }
    if(nodes[0].perplexity === undefined){
      nodes.forEach((d,i)=>{
        d.perplexity = data.node_perplexity[i];
      });
    }
    data.nodes0 = data.nodes;
    data.nodes = nodes;
  }

  let cx = d3.mean(data.nodes, d=>d.x);
  let cy = d3.mean(data.nodes, d=>d.y);
  for(let n of data.nodes){
    n.x -= cx;
    n.y -= cy;
  }

  data.edges = [];
  for(let i=0; i<data.edge_source.length; i++){
    data.edges[i] = {};
    for(let k in data){
      if(k.slice(0,5) === 'edge_'){
        data.edges[i][k.slice(5)] = data[k][i];
      }
    }
  }


  
  if(data.virtual_edge_source !== undefined){
    data.virtual_edges = [];
    for(let i=0; i<data.virtual_edge_source.length; i++){
      data.virtual_edges[i] = {};
      for(let k in data){
        if(k.slice(0,13) === 'virtual_edge_'){
          data.virtual_edges[i][k.slice(13)] = data[k][i];
        }
      }
    }
  }
  



  let prescale_pos = 1;
  let prescale_weight = 1;

  data.id2index = {};
  data.nodes.forEach((d,i)=>{
    if(d.x === undefined){
      d.x = Math.random()*100;
      d.y = Math.random()*100;
      d.x *= prescale_pos;
      d.y *= prescale_pos;
    }else{
      d.x *= prescale_pos;
      d.y *= prescale_pos;
      d.xInit = d.x;
      d.yInit = d.y;
    }
    d.index = i;
    data.id2index[d.id] = d.index;
    d.label = d.label.slice(0,16);
    d.norm = Math.sqrt(d.x*d.x + d.y*d.y);
    d.update = IS_PROGRESSIVE ? window.enabledNodes.has(d.id) : true;
  });
  data.node_center = math.mean(data.nodes.map(d=>[d.x, d.y]), 0);

 
  //preprocess edges
  // let nodeIds = data.nodes.map(d=>d.id);
  for(let e of data.edges){
    e.source = data.nodes[data.id2index[e.source]];
    e.target = data.nodes[data.id2index[e.target]];
    e.weight *= prescale_weight;
  }

  // data.edgeIncidence = new Set();
  // for(let i=0; i<data.edges.length; i++){
  //   let e0 = data.edges[i];
  //   for(let j=i+1; j<data.edges.length; j++){
  //     let e1 = data.edges[j];
  //     let isIncident = e0.source.id === e1.source.id 
  //       || e0.source.id === e1.target.id 
  //       || e0.target.id === e1.source.id 
  //       || e0.target.id === e1.target.id;
  //     if(isIncident){
  //       data.edgeIncidence.add(`${e0.source.id}-${e0.target.id}-${e1.source.id}-${e1.target.id}`);
  //       data.edgeIncidence.add(`${e1.source.id}-${e1.target.id}-${e0.source.id}-${e0.target.id}`);
  //     }
  //   }
  // }

  // data.virtual_edges = data.virtual_edges.filter(e=>e.hops <= 10);
  if(data.virtual_edges !== undefined){
    for(let e of data.virtual_edges){
      e.source = data.nodes[data.id2index[e.source]];
      e.target = data.nodes[data.id2index[e.target]];
      e.weight *= prescale_weight;
    }
  }
  
}


function pos(nodes){
  nodes = nodes.map(d=>({
    id: d.id,
    x:d.x, 
    y:d.y, 
    label: d.label,
    level: d.level,
    parent: d.parent,
    nodeCount: d.nodeCount,
    weight: d.weight,
  }));
  return nodes;
}


// function l2k(l){
//   let k = l*1.5-1;
//   return 1;
// }
let l2k = d3.scaleLinear()
.domain([1,4])
.range([2,8]);


function sa(level, currentZoom){
  let alpha = 1;
  if(l2k(level) > currentZoom){
    alpha = 0.1;
  }
  if(level == l2k.domain()[0] && currentZoom<=l2k.range()[0]){
    alpha = 1;
  }
  return 1.0;
  // return alpha;
}


function markCrossing(edges){
  for(let i=0; i<edges.length; i++){
    edges[i].crossed = false;
  }
  for(let i=0; i<edges.length; i++){
    let e0 = edges[i];
    for(let j=i+1; j<edges.length; j++){
      let e1 = edges[j];
      let isIncident = e0.source.id == e1.source.id 
      || e0.source.id == e1.target.id 
      || e0.target.id == e1.source.id 
      || e0.target.id == e1.target.id;
      if(!isIncident && isCrossed(e0,e1)){
        e0.crossed = true;
        e1.crossed = true;
      }
    }
  }
}


let mlbo = {};
function markLabelByOverlap(nodes, canvas){
  // updateBbox(nodes, canvas);
  let bboxes = nodes.map(d=>d.bbox);
  let sx = canvas.scales.sx;
  let sy = canvas.scales.sy;
  if(mlbo.nodes === undefined){
    mlbo.nodes = nodes.slice().sort((a,b)=>a.level-b.level); //INPLACE REORDERED
    mlbo.rx = d3.max(bboxes, d=>d.width);
    mlbo.ry = d3.max(bboxes, d=>d.height);
  }
  let [rx, ry] = [mlbo.rx, mlbo.ry];
  nodes = mlbo.nodes;
  
  let tree = d3.quadtree(nodes, (d)=>sx(d.x), (d)=>sy(d.y));
  
  let shown = new Set(nodes.filter(d=>d.shouldShowLabel).map(d=>d.index));
  for(let ni of nodes){
    if(shown.has(ni.index)){
      continue;
    }else{
      let x = ni.bbox.cx;
      let y = ni.bbox.cy;
      if(x < 0 || x > canvas.width 
        || y < 0 || y > canvas.height 
      ){
        continue;
      }else{
        let neighbors = searchQuadtree(tree, (d)=>sx(d.x), (d)=>sy(d.y), x-rx, x+rx, y-ry, y+ry);
        neighbors = new Set(neighbors);
        let a, b;
        if(neighbors.size < shown.size){
          [a,b] = [neighbors, shown];
        }else{
          [a,b] = [shown, neighbors];
        }
        let shouldShow = true;
        for(let j of a){
          if(b.has(j)){
            if(isRectCollide(bboxes[ni.index], bboxes[j])){
              shouldShow = false;
              break;
            }
          }
        }
        if(shouldShow){
          ni.shouldShowLabel = true;
          shown.add(ni.index);
        }      
      }
    }
  }
}


// function labelOverlap(labelNodes){
//   let count = 0;
//   // let overlapMatrix = [];
//   for(let i=0; i<labelNodes.length; i++){
//     // overlapMatrix.push([]);
//     let l1 = labelNodes[i];
//     l1.show = true;
//   }

//   let bboxes = labelNodes.map(l=>l.getBoundingClientRect());

//   labelNodes.forEach(d=>d.overlap = new Set());
//   for(let i=0; i<labelNodes.length; i++){
//     // overlapMatrix[i][i] = 0;
//     let l1 = labelNodes[i];
//     let bbox1 = bboxes[i];
    
//     for(let j=i+1; j<labelNodes.length; j++){
//       let l2 = labelNodes[j];
//       let bbox2 = bboxes[j];
//       let overlap = isRectCollide(bbox1, bbox2);
//       if(overlap){
//         // overlapMatrix[i][j] = 1;
//         // overlapMatrix[j][i] = 1;
//         // l2.overlap.add(i);
//         // l1.overlap.add(j);
//         // l1.show = false;
//         l2.show = false;
//         count += 1;
//       }else{
//         // overlapMatrix[i][j] = 0;
//         // overlapMatrix[i][j] = 0;
//       }
//     }
//   }
//   // window.overlapMatrix = overlapMatrix;

//   return count;
// }
// 
// 
// 
// def draw
function draw(label=true, forceLabel=false, markOverlap=true){
  // nodes, edges, nodeCircles, linkLines, labelTexts, labelBoxes,sx, sy, transform
  let ctx = this.context;
  let data = this.data;
  // if(!shouldDraw || shouldHideAll) {
  //   return;
  // }
  // markCrossing(data.edges);
  if (this.data.nodesByLevel === undefined){
    this.data.nodesByLevel = data.nodes.slice().sort((a,b) => a.level - b.level);
  }
  ctx.clearRect(0, 0, this.width, this.height);

  // let nodes = this.data.nodesByLevel.filter(d=>{
  let nodes = this.data.nodes
  // .filter(d=>{
  //   return d.update 
  //   && d.bbox.cx > 0 
  //   && d.bbox.cx < this.width 
  //   && d.bbox.cy > 0 
  //   && d.bbox.cy < this.height;
  // });
  let edges = data.edges;
  // .filter(e=>{
  //   return e.source.update && e.target.update;
  // });
  drawEdges(ctx, edges, this.scales, this.transform);
  drawNodes(ctx, nodes, this.scales, this.transform, label, forceLabel, markOverlap);

}


function markLabelByLevel(nodes, canvas){
  let scale = canvas.transform.k;
  let levelScalePairs = canvas.levelScalePairs;
  let showLevel = 0;
  for(ls of levelScalePairs){
    if(ls[1] < scale){
      showLevel = ls[0];
    }
  }
  for(let n of nodes){
    // if(n.level <= forceLabelLevel || n.level <= showLevel ){
    if(n.level <= forceLabelLevel || n.labelScale <= canvas.transform.k){
      n.shouldShowLabel = true;
    }else{
      n.shouldShowLabel = false;
    }
  }
}


function drawNodes(ctx, nodes, scales, transform, label, forceLabel, markOverlap, drawOval=false){
  if(label){
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#fff';
    ctx.lineJoin = 'round';
    // ctx.shadowOffsetX = 0;
    // ctx.shadowOffsetY = 0;
    // ctx.shadowColor = "rgba(255,255,255,1)";
    // ctx.shadowBlur = 2;
  }

  //draw nodes
  // ctx.globalAlpha = 1.0;
  ctx.fillStyle = '#08306b';
  let k = Math.pow(transform.k, 1/2)*DPR;
  for(let n of nodes){
    let x = n.bbox.cx;
    let y = n.bbox.cy;
    let r = n.r*k;

    ctx.globalAlpha = n.update ? 1.0 : HIDDEN_NODE_ALPHA;
    ctx.beginPath();
    // ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.ellipse(x, y, r, r, 0, 0, 2 * Math.PI);
    ctx.fill();
  }

  


  //draw text
  if(label){
    let l0 = -1;
    for(let n of nodes.filter(d=>d.shouldShowLabel)){
      let x = n.bbox.cx;
      let y = n.bbox.cy;
      let l = n.l;
      //draw bbox
      // ctx.globalAlpha = 0.3; 
      // ctx.fillStyle = '#08306b';
      // ctx.beginPath();
      // ctx.rect(x*DPR-n.bbox.width*DPR/2, y*DPR-n.bbox.height*DPR/2, n.bbox.width*DPR, n.bbox.height*DPR);
      // ctx.fill();
      
      ctx.fillStyle = scales.sc(n.level);
      if(l0 != l){
        ctx.font = scales.sf(n.level);
        l0 = l;
      }
      ctx.strokeStyle = '#fff';
      ctx.globalAlpha = n.update ? 1 : HIDDEN_LABEL_ALPHA;
      ctx.lineWidth = 8;
      ctx.strokeText(n.label, x, y);
      ctx.fillText(n.label, x, y);

      if(drawOval){
        
        const margin = 2;//in pixel
        if(n.bbox !== undefined){
          let x = n.bbox.cx;
          let y = n.bbox.cy;

          n.scaleY = Math.max(2, Math.min(n.bbox.width/n.bbox.height, 5));//TODO fix it
          let [x0, y0] = [n.bbox.width/2*DPR, n.bbox.height/2*DPR];
          let a = Math.sqrt(x0*x0 + y0*y0*n.scaleY*n.scaleY); //figure out the major axis (a) of the ellipse 
          let b = a / n.scaleY;
          a += margin;
          b += margin;

          ctx.globalAlpha = 1.0;
          ctx.fillStyle = '#08306b';
          ctx.strokeStyle = '#08306b';
          ctx.lineWidth = DPR;
          ctx.beginPath();
          ctx.ellipse(x, y, a, b, 0, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }


    }
  }
  
}


function drawEdges(ctx, edges, scales, transform){
  ctx.strokeStyle = EDGE_COLOR;
  ctx.globalAlpha = 1.0;
  let k = Math.pow(transform.k, 1/4);
  for(let e of edges){
    
    let x0 = e.source.bbox.cx;
    let y0 = e.source.bbox.cy;
    let x1 = e.target.bbox.cx;
    let y1 = e.target.bbox.cy;
    let lw = Math.max(1, scales.sr(Math.min(e.source.level, e.target.level)) / 2);
    ctx.lineWidth = lw * k * DPR;
    ctx.globalAlpha = e.source.update && e.target.update ? 1.0 : HIDDEN_EDGE_ALPHA;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
}




