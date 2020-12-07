// //--------code----------
const colorscheme = d3.schemeAccent;//schemePastel1
const OPACITY_NOT_UPDATE = 0.1;
const IS_PROGRESSIVE = true;
const IS_DYNAMIC = false;
const EDGE_COLOR = '#aaa';
// const EDGE_COLOR = d3.rgb(249,180,35);
const HIDE_OVERLAP = false;
//globals
let shouldTick = true;
let shouldHideLabel = false;
let shouldHideAll = false;
let shouldDraw = true;

let darkMode = false;
let bg = darkMode ? '#322':'#fff';

let runtime = [];
let nodes;
let progress = 1e9;


window.enabledNodes;

let worker = new Worker('simulation.js');

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




// let fn = 'TopicsLayersData-0/Graph_5000';
// let version = 3;
// d3.json(`data/json/${fn}.json`).then(data=>{
// d3.json(`data/json/${fn}-nodes-${version}.json`).then(nodes=>{

let fn = 'lastfm/Graph_8';
let version = 2; //layout version
d3.json(`data/json/${fn}.json`).then(data=>{
d3.json(`data/json/${fn}-nodes-${version}.json`).then(nodes=>{

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
  window.nodes = data.nodes;
  window.edges = data.edges;
  let dataObj = init(data);
  let simData = dataObj.simData;
  let drawData = dataObj.drawData;
  worker.postMessage(simData);
  worker.onmessage = function(event) {
    let data = event.data;
    let type = data.type;
    if(type === 'tick'){
      console.log(`${(data.progress * 100).toFixed(2)}%`);

      window.nodes = data.nodes;
      window.edges = data.edges;
      window.simulation = data.simulation;
      window.enabledNodes = data.enabledNodes;
      draw(
        data.nodes, data.edges, 
        drawData.nodeCircles, drawData.linkLines, 
        drawData.labelTexts, drawData.labelBoxes,
        drawData.scales.sx, drawData.scales.sy, 
        drawData.transform
      );

    }else if(type === 'end'){
      window.nodes = data.nodes;
      window.edges = data.edges;
      window.simulation = data.simulation;
      window.enabledNodes = data.enabledNodes;
      draw(
        data.nodes, data.edges, 
        drawData.nodeCircles, drawData.linkLines, 
        drawData.labelTexts, drawData.labelBoxes,
        drawData.scales.sx, drawData.scales.sy, 
        drawData.transform
      );
      let t = performance.now() - window.t0;
      console.log('training time', t/1000, 'secs');
    }
  };

});
});




function init(data){
  let nodes = data.nodes; 
  let edges = data.edges;
  let virtualEdges = data.virtual_edges;
  let id2index = data.id2index;

  let scale0 = 1;
  let maxLevel = d3.max(nodes, d=>d.level);

  let width = window.innerWidth;
  let height = window.innerHeight;


  let svg = d3.select('#main')
  .attr('width', width)
  .attr('height', height)
  .style('background', bg); 
  svg.append('defs').node().innerHTML = whiteOutline();

  let sc = d3.scaleLinear()
  .domain([maxLevel,1])
  // .range(['#ece7f2','#2b8cbe']);
  .range(['#a6bddb','#023858']);

  

  // let sr = d3.scaleLinear().domain(d3.extent(nodes, d=>d.level)).range([2,1]);
  let sr = d3.scaleLinear().domain(d3.extent(nodes, d=>d.level)).range([0,0]);
  let ss = d3.scaleLinear().domain(d3.extent(nodes, d=>d.level)).range([4,1]);
  let scales = getScales(nodes, svg, scale0);

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

  let sx0, sy0;
  let transform = d3.zoomIdentity.scale(scale0);

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

  


  let zoom = d3.zoom()
  // .scaleExtent([0.5/scale0, 6.0/scale0])
  .on('zoom', (transform0)=>{


    if(transform0 === undefined){
      transform = d3.event.transform.scale(scale0);
    }else{
      transform = transform0;
    }
    console.log('zoom', transform.k);
    if(sx0 === undefined){
      sx0 = scales.sx;
      sy0 = scales.sy;
    }
    scales.sx = transform.rescaleX(sx0);
    scales.sy = transform.rescaleY(sy0);

    worker.postMessage({
      type: 'zoom',
      xDomain: scales.sx.domain(),
      yDomain: scales.sy.domain(),
      xRange: scales.sx.range(),
      yRange: scales.sy.range(),
    });

    ax.scale(scales.sx);
    ay.scale(scales.sy);
    gx.call(ax);
    gy.call(ay);
    
    nodeCircles
    .attr('r', d=>sr(d.level)*Math.pow(transform.k, 1/2));
    // .attr('r', d=>sr(d.level));
    linkLines
    .attr('stroke-width', e => Math.sqrt(transform.k) * ss(e.level)/2 )

    draw(window.nodes, window.edges, 
    nodeCircles, linkLines, labelTexts, labelBoxes,
    scales.sx, scales.sy, transform);

  })
  .on('end', ()=>{

    debugMsg();
    labelOverlap(labelTextNodes, 1.0);

    nodeCircles
    .attr('r', d=>sr(d.level)*Math.pow(transform.k, 1/2));
    // .attr('r', d=>sr(d.level));
    linkLines
    .attr('stroke-width', e => Math.sqrt(transform.k) * ss(e.level)/2 )

    draw(window.nodes, window.edges, 
    nodeCircles, linkLines, labelTexts, labelBoxes,
    scales.sx, scales.sy, transform);

  });
  svg.call(zoom);


  var maxPerplexity = d3.max(nodes, d => d.perplexity);
  let niter = 500;
  // let simulation = d3.forceSimulation(nodes);
  

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

  nodes.forEach((d,i)=>{
    let bbox = labelTextNodes[i].getBoundingClientRect();
    updateBbox(d, bbox, scales);
  });
  zoom.on('zoom')(transform); //draw


  

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
      colorLabel(labelTextNodes, 'white');
      labelOverlap(labelTextNodes);
      let labels = labelTextNodes.filter(d=>d.overlap.size > 0);
      console.log('overlap:', labels.length);
      colorLabel(labels, 'orange');

    }else if(key === 'l'){//hide [l]abel
      shouldHideLabel = !shouldHideLabel;
      d3.selectAll('.labelText')
      .style('display', shouldHideLabel?'none':'');
      d3.selectAll('.labelBox')
      .style('display', shouldHideLabel?'none':'');

    }else if(key === 'h'){//[h]ide all
      shouldHideAll = !shouldHideAll;
      shouldDraw = !shouldDraw;
      d3.selectAll('.labelText')
      .style('display', (shouldHideAll||shouldHideLabel)?'none':'');
      d3.selectAll('.node')
      .style('display', shouldHideAll?'none':'');
      d3.selectAll('.link')
      .style('display', shouldHideAll?'none':'');
      d3.selectAll('.labelBox')
      .style('display', shouldHideAll?'none':'');
      if(!shouldHideAll){
        draw(window.nodes, window.edges, 
        nodeCircles, linkLines, labelTexts,labelBoxes,
        scales.sx, scales.sy, transform);
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
      exportJson(pos(),`topics-${window.enabledNodes.size}.json`);
    }else if(key === 'e'){ //evaluation
      evalMsg(nodes, edges, labelTexts);
    }
  });
  let simData = {
    nodes, 
    edges, 
    virtualEdges, 
    enabledNodes: window.enabledNodes, 
    id2index,
    xDomain: scales.sx.domain(),
    xRange: scales.sy.range(),
    yDomain: scales.sy.domain(),
    yRange: scales.sy.range(),
    progress: progress,
    // edgeIncidence: data.edgeIncidence,
  };
  let drawData = {
    nodeCircles,
    linkLines,
    labelTexts,
    labelBoxes,
    scales,
    transform
  }

  return {simData, drawData};
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

    data.nodes = nodes;
  }else{
    data.nodes = [];
    for(let i=0; i<data.node_id.length; i++){
      data.nodes[i] = {};
      for(let k in data){
        if(k.slice(0,5) === 'node_'){
          data.nodes[i][k.slice(5)] = data[k][i];
        }
      }
    }
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


  data.virtual_edges = [];
  for(let i=0; i<data.virtual_edge_source.length; i++){
    data.virtual_edges[i] = {};
    for(let k in data){
      if(k.slice(0,13) === 'virtual_edge_'){
        data.virtual_edges[i][k.slice(13)] = data[k][i];
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
  for(let e of data.virtual_edges){
    e.source = data.nodes[data.id2index[e.source]];
    e.target = data.nodes[data.id2index[e.target]];
    e.weight *= prescale_weight;
  }
}


function pos(){
  let nodes = window.nodes.map(d=>({
    id: d.id,
    x:d.x, 
    y:d.y, 
    label: d.label,
    level: d.level,
    parent: d.parent,
    nodeCount: d.nodeCount,
    weight: d.weight,
  }));
  // return JSON.stringify(nodes, null, 2);
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


function getScales(nodes, svg, prescaling=1.0){
  let width = +svg.node().clientWidth;
  let height = +svg.node().clientHeight;

  let xExtent = d3.extent(nodes, d=>d.x);
  let yExtent = d3.extent(nodes, d=>d.y);
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


  let xViewport = [50, width-50];
  let yViewport = [50, height-50];
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


// def draw
function draw(nodes, edges,
nodeCircles, linkLines, labelTexts, labelBoxes,
sx, sy, transform){

  if(!shouldDraw || shouldHideAll) {
    return;
  }

  //relative error
  // let bestScale = bestScalingForEdgeLengthPreservation(edges, edges.map(e=>e.weight));
  // edges.forEach(e=>{
  //   let desired = e.weight;
  //   let [x1,y1] = [e.source.x, e.source.y];
  //   let [x2,y2] = [e.target.x, e.target.y];
  //   let [dx, dy] = [x2-x1, y2-y1];
  //   let actual = Math.sqrt(dx*dx + dy*dy) * bestScale;
  //   e.error = (actual - desired) / desired;
  // });
  // let relError = edges.map(e=>e.error);
  // let vmax = d3.max(relError, d=>Math.abs(d));
  // console.log([-vmax, vmax]);
  // window.relError = relError;
  // console.log(JSON.stringify(relError));

  // let sec = d3.scaleLinear()//[s]cale of [e]dge [c]olor 
  // .domain(   numeric.mul(d3.range(-2,3), 1/2 * vmax*0.5)   )
  // .range(['#ca0020','#f4a582','#f7f7f7','#92c5de','#0571b0']);

  

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
  linkLines
  .data(edges)
  .attr('x1', d => sx(d.source.x))
  .attr('y1', d => sy(d.source.y))
  .attr('x2', d => sx(d.target.x))
  .attr('y2', d => sy(d.target.y))
  .attr('stroke', e=>{
    return e.crossed ? 'yellow' : EDGE_COLOR
    // return sec(e.error);
  })
  .attr('opacity', e=>{
    return e.source.update && e.target.update ? 1.0:OPACITY_NOT_UPDATE;
    // return sa(Math.max(e.source.level, e.target.level), transform.k)
  })
  nodeCircles
  .data(nodes)
  .attr('cx', (d,i) => {
    return sx(d.x);
  })
  .attr('cy', d => sy(d.y))
  .attr('opacity', d=>{
    return d.update ? 1.0:OPACITY_NOT_UPDATE;
    // return sa(d.level, transform.k);
  });
  labelTexts
  .data(nodes)
  .attr('x', d=>sx(d.x))
  .attr('y', d=>sy(d.y))
  // .transition()
  // .duration(300)
  .attr('opacity', (d,i)=>{
    if(HIDE_OVERLAP){
      return labelTextNodes[i].show && d.update ? 1.0: 0.0;
    }else{
      return d.update ? 1.0:0;
    }
  });

  for(let n of nodes){
    updateBbox(n, n.bbox, {sx,sy});
  }
  labelBoxes
  .data(nodes)
  .attr('x', d=>d.bbox.left)
  .attr('y', d=>d.bbox.top)
  .attr('width', d=>d.bbox.right-d.bbox.left)
  .attr('height', d=>d.bbox.bottom-d.bbox.top)
  .style('opacity', d=>{
    return d.update ? 0.0:0.0;
  });

  // let labelTextNodes = labelTexts.nodes();
  // nodes.forEach((d,i)=>{
    // d.bbox = labelTextNodes[i].getBoundingClientRect();
  //   d.bbox.x = d.x - d.bbox.width/2;
  //   d.bbox.y = d.y - d.bbox.height/2;
  // });


  // labelTexts
  // .attr('x', d=>sx(d.x))
  // .attr('y', d=>sy(d.y))
}




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
