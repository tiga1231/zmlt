// //--------code----------
const colorscheme = d3.schemeAccent;//schemePastel1
const OPACITY_NOT_UPDATE = 0.1;
const IS_PROGRESSIVE = true;
const IS_DYNAMIC = false;
const EDGE_COLOR = '#aaa';
// const EDGE_COLOR = d3.rgb(249,180,35);
const HIDE_OVERLAP = false;
const DPR = window.devicePixelRatio;
// const font = 'monospace';
const FONT = 'Times';

//globals
let shouldTick = true;

let darkMode = false;
let bg = darkMode ? '#322':'#fff';

let runtime = [];
let nodes;
let progress = 1e9;

let shouldDraw = true;
let shouldLabel = true;
let shouldMarkOverlap = false;

let forceLabel = false;
let forceLabelLevel = -1;



window.enabledNodes;


//--------data----------
// d3.json('data/json/lastfm-iqbal/lastfm_8.json').then(data=>{

// //lastfm-ryn
// d3.json('data/json/lastfm-ryn/lastfm_155nodes.json').then(data=>{
// d3.json('data/json/lastfm-ryn/lastfm_155nodes_nodes-4.json').then(nodes=>{


// //topics-800
// d3.json('data/json/topics-800/topics-800.json').then(data=>{
// d3.json('data/json/topics-800/topics-800.json').then(nodes=>{

// math-genealogy-509
// d3.json('./data/json/math-genealogy/math-509.json').then(data=>{
// d3.json('data/json/math-genealogy/math-509-nodes-1.json').then(nodes=>{

// math-euler-293
// d3.json('./data/json/math-genealogy/euler-293.json').then(data=>{
// d3.json('./data/json/math-genealogy/euler-293.json').then(nodes=>{

//eval: topics-800
// d3.json('data/json/topics-800/topics-800.json').then(data=>{
// d3.json('data/eval/topics-800/topics-800.json').then(nodes=>{

//eval: covid-800
// d3.json('data/json/covid-487/covid-487.json').then(data=>{
// d3.json('data/json/covid-487/covid-487.json').then(nodes=>{



// topics-faryad-5000
// d3.json('data/json/topics_faryad_5000/Graph_2000.json').then(data=>{
// d3.json('data/json/topics_faryad_5000/Graph_500-nodes-5.json').then(nodes=>{


// let fn = 'topics-5000-low-degree/old/topics-8-sfdp';
// let version = 16; //layout version
// d3.json(`data/json/${fn}.json`).then(data=>{
// d3.json(`data/json/${fn}-nodes-${version}-2.json`).then(nodes=>{


// let fn = 'topics-5000/Graph_5000';
// let version = 6; //layout version
// d3.json(`data/json/${fn}.json`).then(data=>{
// d3.json(`data/json/${fn}-nodes-${version}.json`).then(nodes=>{





// d3.json(`data/json/lastfm/Graph_8-min.json`).then(data=>{
// d3.json(`data/json/lastfm/Graph_8-nodes-12.json`).then(nodes=>{

//demo topics
let fn = 'data/json/TopicsLayersData-0/Graph_5000-min.json';
let fn2 = 'data/json/TopicsLayersData-0/Graph_5000-radial-nodes-7.json';//for demo, no training
d3.json(fn).then(data=>{
d3.json(fn2).then(nodes=>{

//train topics
// let fn = 'TopicsLayersData-0/Graph_5000-radial'; //no longer works
// let version = 3;
// d3.json(`data/json/${fn}.json`).then(data=>{
// d3.json(`data/json/${fn}-nodes-${version}.json`).then(nodes=>{



//paper graph 1
// let fn = 'TopicsLayersData-0/Graph_5000'; //no longer works
// let version = 3;
// d3.json(`data/json/${fn}.json`).then(data=>{
// d3.json(`data/json/${fn}-nodes-${version}.json`).then(nodes=>{

//paper graph 2
// let fn = 'lastfm/Graph_8';
// let version = 12; //layout version
// d3.json(`data/json/${fn}.json`).then(data=>{
// d3.json(`data/json/${fn}-nodes-${version}.json`).then(nodes=>{


  window.data = data;
  // if(nodes !== undefined){
  //   progress = data.node_id.length;
  // }
  
  if(IS_PROGRESSIVE){
    // enabledNodes = new Set();
    window.enabledNodes = new Set(data.node_id.slice(0,progress));
  }else{
    window.enabledNodes = new Set(data.nodeIds);
  }
  if(nodes === undefined){
    preprocess(data, undefined);
  }else{
    preprocess(data, nodes);
  }
  let canvas = init(data);

  if(shouldDraw){
    canvas.draw(shouldLabel, forceLabel);
  }

});
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
  canvas.levelScalePairs = getNonOverlapLevels(canvas);

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
    progress: 1,
    dpr: DPR,
  };
  canvas.worker = initSimulationWorker(canvas, simData);


  initInteraction(canvas);

  markLabel(nodes, canvas);
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
  let ctx = canvas.context;
  for(let n of nodes){
    let x = sx(n.x);
    let y = sy(n.y);
    ctx.font = `${sl(n.level)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let m = ctx.measureText(n.label);
    let left = x - m.actualBoundingBoxLeft;
    let right = x + m.actualBoundingBoxRight;
    let top = y - m.actualBoundingBoxAscent;
    let bottom = y + m.actualBoundingBoxDescent;

    let width = right - left;
    let height = bottom - top;

    // centered text
    // left -= width/2;
    // right -= width/2;
    // top += height/2;
    // bottom += height/2;

    n.bbox = {
      x: left,
      y: top,
      width,
      height,
      left, 
      right, 
      top, 
      bottom,
    };
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


function initSimulationWorker(canvas, simData){
  let worker = new Worker('simulation.js');
  worker.postMessage(simData);
  worker.onmessage = function(event) {
    let data = event.data;
    let type = data.type;
    if(type === 'tick'){
      console.log(`${(data.progress * 100).toFixed(2)}%`);
      canvas.data.nodes = data.nodes;
      canvas.data.edges = data.edges;
      canvas.simulation = data.simulation;
      // window.enabledNodes = data.enabledNodes;
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
  let maxLevel = d3.max(nodes, d=>d.level);

  let scales = getCanvasScales(xExtent, yExtent, w, h);

  scales.sc = d3.scaleLinear()
  .domain([maxLevel,1])
  // .range(['#ece7f2','#2b8cbe']);
  .range(['#a6bddb','#023858']);

  scales.sr = d3.scaleLinear().domain(d3.extent(nodes, d=>d.level)).range([1.5,0.25]);
  scales.ss = d3.scaleLinear().domain(d3.extent(nodes, d=>d.level)).range([4,1]);
  scales.sl = d3.scaleLinear().domain([1,maxLevel]).range([14, 12]); //label font size;
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
    let labelTextNodesTmp = labelTexts.filter(d=>d.update).nodes();
    console.log(
      'zoom:', 
      parseFloat(transform.k.toFixed(2)),
      '\n',
      'overlap:', 
      labelOverlap(labelTextNodesTmp),
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
  // .scaleExtent([0.5/scale0, 6.0/scale0])
  .on('zoom', (transform0)=>{
    if(transform0 === undefined){
      canvas.transform = d3.event.transform.scale(scale0);
    }else{
      canvas.transform = transform0;
    }
    console.log('zoom', canvas.transform.k);
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
    markLabel(canvas.data.nodes, canvas);
    if(shouldDraw){
      canvas.draw(shouldLabel, forceLabel, shouldMarkOverlap);
    }
  })
  .on('end', ()=>{
    markLabel(canvas.data.nodes, canvas);
    if(shouldDraw){
      canvas.draw(shouldLabel, forceLabel, shouldMarkOverlap);
    }
    // labelOverlap(labelTextNodes, 1.0);
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
        updateBbox(canvas.data.nodes, canvas);
        markOverlap(canvas.data.nodes.filter(d=>d.shouldShowLabel).map(d=>d.bbox));
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
      markLabel(canvas.data.nodes, canvas);
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


function getCanvasScales(xExtent, yExtent, width, height, prescaling=1.0){
  let margin = 50;
  let xSize = xExtent[1] - xExtent[0];
  let ySize = yExtent[1] - yExtent[0];

  //scale up
  let scale = 1/prescaling;
  let xCenter = (xExtent[0] + xExtent[1])/2;
  let yCenter = (yExtent[0] + yExtent[1])/2;
  xExtent[0] = xCenter - xSize/2*scale;
  xExtent[1] = xCenter + xSize/2*scale;
  yExtent[0] = yCenter - ySize/2*scale;
  yExtent[1] = yCenter + ySize/2*scale;
  xSize = xExtent[1] - xExtent[0];
  ySize = yExtent[1] - yExtent[0];

  let xViewport = [margin, width-margin];
  let yViewport = [margin, height-margin];
  let drawWidth = xViewport[1] - xViewport[0];
  let drawHeight = yViewport[1] - yViewport[0];

  if (drawWidth/drawHeight > xSize/ySize){
    let adjust = (ySize / drawHeight * drawWidth) - xSize;
    xExtent[0] -= adjust/2;
    xExtent[1] += adjust/2;
  }else{
    let adjust = (xSize / drawWidth * drawHeight) - ySize;
    yExtent[0] -= adjust/2;
    yExtent[1] += adjust/2;
  }
  
  let sx = d3.scaleLinear()
  .domain(xExtent)
  .range(xViewport);
  let sy = d3.scaleLinear()
  .domain(yExtent)
  .range(yViewport);
  return {sx, sy};
}


function markCrossing(edges){
  for(let i=0; i<edges.length; i++){
    edges[i].crossed = false;
  }
  for(let i=0; i<edges.length; i++){
    let e0 = edges[i];
    if(!e0.source.update || !e0.target.update){
      continue;
    }
    for(let j=i+1; j<edges.length; j++){
      let e1 = edges[j];
      if(!e1.source.update || !e1.target.update){
        continue;
      }
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


function markOverlap(bboxes){
  let count = 0;
  // let overlapMatrix = [];
  for(let i=0; i<bboxes.length; i++){
    // overlapMatrix.push([]);
    bboxes[i].overlap = false;
  }

  for(let i=0; i<bboxes.length; i++){
    // overlapMatrix[i][i] = 0;
    let bbox1 = bboxes[i];
    
    for(let j=i+1; j<bboxes.length; j++){
      let bbox2 = bboxes[j];
      let overlap = isRectCollide(bbox1, bbox2);
      if(overlap){
        // overlapMatrix[i][j] = 1;
        // overlapMatrix[j][i] = 1;
        // l2.overlap.add(i);
        // l1.overlap.add(j);
        // l1.show = false;
        bbox1.overlap = true;
        bbox2.overlap = true;
        count += 1;
      }else{
        // overlapMatrix[i][j] = 0;
        // overlapMatrix[i][j] = 0;
      }
    }
  }
  return count;
}


function labelOverlap(labelNodes){
  let count = 0;
  // let overlapMatrix = [];
  for(let i=0; i<labelNodes.length; i++){
    // overlapMatrix.push([]);
    let l1 = labelNodes[i];
    l1.show = true;
  }

  let bboxes = labelNodes.map(l=>l.getBoundingClientRect());

  labelNodes.forEach(d=>d.overlap = new Set());
  for(let i=0; i<labelNodes.length; i++){
    // overlapMatrix[i][i] = 0;
    let l1 = labelNodes[i];
    let bbox1 = bboxes[i];
    
    for(let j=i+1; j<labelNodes.length; j++){
      let l2 = labelNodes[j];
      let bbox2 = bboxes[j];
      let overlap = isRectCollide(bbox1, bbox2);
      if(overlap){
        // overlapMatrix[i][j] = 1;
        // overlapMatrix[j][i] = 1;
        // l2.overlap.add(i);
        // l1.overlap.add(j);
        // l1.show = false;
        l2.show = false;
        count += 1;
      }else{
        // overlapMatrix[i][j] = 0;
        // overlapMatrix[i][j] = 0;
      }
    }
  }
  // window.overlapMatrix = overlapMatrix;

  return count;
}
// def draw
function draw(label=true, forceLabel=false, markOverlap=true){
  // nodes, edges, nodeCircles, linkLines, labelTexts, labelBoxes,sx, sy, transform
  let ctx = this.context;
  let data = this.data;
  // if(!shouldDraw || shouldHideAll) {
  //   return;
  // }
  // markCrossing(data.edges);
  
  ctx.clearRect(0, 0, this.width, this.height);
  drawEdges(ctx, data.edges, this.scales, this.transform);
  drawNodes(ctx,  data.nodes, this.scales, this.transform, label, forceLabel, markOverlap);

}


function markLabel(nodes, canvas){
  let scale = canvas.transform.k;
  let levelScalePairs = canvas.levelScalePairs;
  let showLevel = 0;
  for(ls of levelScalePairs){
    if(ls[1]< scale){
      showLevel = ls[0];
    }
  }
  console.log(showLevel);
  for(let n of nodes){
    if(n.level <= showLevel || n.level <= forceLabelLevel){
      n.shouldShowLabel = true;
    }else{
      n.shouldShowLabel = false;
    }
  }
}


function drawNodes(ctx, nodes, scales, transform, label, forceLabel, markOverlap){
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

  for(let n of nodes){
    if(!n.update){
      continue;
    }

    let x = scales.sx(n.x);
    let y = scales.sy(n.y);
    let r = scales.sr(n.level) * Math.pow(transform.k, 1/4);
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#08306b';
    ctx.beginPath();
    ctx.arc(x*DPR, y*DPR, r*DPR, 0, 2 * Math.PI);
    ctx.fill();
    
    if(n.shouldShowLabel){
      //draw bbox
      // ctx.globalAlpha = 0.3; 
      // ctx.fillStyle = '#08306b';
      // ctx.beginPath();
      // ctx.rect(x*DPR-n.bbox.width*DPR/2, y*DPR-n.bbox.height*DPR/2, n.bbox.width*DPR, n.bbox.height*DPR);
      // ctx.fill();
      
      //draw text
      let l = scales.sl(n.level);
      ctx.globalAlpha = 1.0;
      if(n.bbox.overlap){
        ctx.fillStyle = 'red';
      }else{
        ctx.fillStyle = '#08306b';
      }
      ctx.strokeStyle = '#fff';
      ctx.font = `${l*DPR}px ${FONT}`;        
      ctx.lineWidth = l*DPR/4;
      ctx.strokeText(n.label, x*DPR, y*DPR);
      ctx.fillText(n.label, x*DPR, y*DPR);
    }
  }
}


function drawEdges(ctx, edges, scales, transform){
  ctx.strokeStyle = '#aaa';
  ctx.globalAlpha = 1.0;
  for(let e of edges){
    if(!(e.source.update && e.target.update)){
      continue;
    }
    let x0 = scales.sx(e.source.x);
    let y0 = scales.sy(e.source.y);
    let x1 = scales.sx(e.target.x);
    let y1 = scales.sy(e.target.y);
    let lw = scales.sr(Math.min(e.source.level, e.target.level))/1.5;
    ctx.lineWidth = lw * Math.pow(transform.k, 1/4) * DPR;
    ctx.beginPath();
    ctx.moveTo(x0*DPR, y0*DPR);
    ctx.lineTo(x1*DPR, y1*DPR);
    ctx.stroke();
  }
}




