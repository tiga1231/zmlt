//--------data----------
// d3.json('data/json/lastfm-iqbal/lastfm_8.json').then(data=>{

// //lastfm-ryn
// d3.json('data/json/lastfm-ryn/lastfm_155nodes.json').then(data=>{
// d3.json('data/json/lastfm-ryn/lastfm_155nodes_nodes-4.json').then(nodes=>{

// topics-faryad-500
// d3.json('data/json/topics_faryad_5000/Graph_500.json').then(data=>{
// d3.json('data/json/topics_faryad_5000/Graph_500-nodes-1.json').then(nodes=>{

// topics-faryad-800
// d3.json('data/json/topics_faryad_5000/Graph_800.json').then(data=>{
// d3.json('data/json/topics_faryad_5000/Graph_800-nodes-2.json').then(nodes=>{

// topics-faryad-5000
// d3.json('data/json/topics_faryad_5000/Graph_1600.json').then(data=>{
// d3.json('data/json/topics_faryad_5000/Graph_1600.json').then(nodes=>{

// math-genealogy-67
// d3.json('data/json/math-genealogy/data_names_shortened.json').then(data=>{
// d3.json('data/json/math-genealogy/data_names_shortened-nodes-1.json').then(nodes=>{

// math-genealogy-509
d3.json('./data/json/math-genealogy/math-509.json').then(data=>{
d3.json('data/json/math-genealogy/math-509-nodes-1.json').then(nodes=>{



  data.nodes = nodes;
  window.data = data;
  preprocess(data, data.nodes);
  main(data.nodes, data.edges, data.virtual_edges, data.node_center);

});
});


// //--------code----------
const colorscheme = d3.schemeAccent;//schemePastel1
const OPACITY_NOT_UPDATE = 0.1;
const IS_PROGRESSIVE = false;
const IS_DYNAMIC = false;
const EDGE_COLOR = '#666';
//globals
let shouldTick = true;
let shouldHideLabel = false;
let shouldHideAll = false;
let shouldDraw = true;
let bg = '#eef7ec';


function main(nodes, edges, virtualEdges, nodeCenter){
  let scale0 = 1;
  let width = window.innerWidth;
  let height = window.innerHeight;

  let enabledNodes;
  if(IS_PROGRESSIVE){
    enabledNodes = new Set();
  }else{
    enabledNodes = new Set(nodes.map(d=>d.id));
  }
  window.enabledNodes = enabledNodes;

  

  let svg = d3.select('#main')
  .attr('width', width)
  .attr('height', height)
  .style('background', bg); 
  svg.append('defs').node().innerHTML = whiteOutline();

  let sc = d3.scaleLinear()
  .domain([5,1])
  .range(['#ece7f2','#2b8cbe']);
  let sr = d3.scaleLinear().domain(d3.extent(nodes, d=>d.level)).range([3,1]);
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
    let edgesTmp = edges.filter(e=>enabledNodes.has(e.source.id) && enabledNodes.has(e.target.id));
    let nodesTmp = nodes.filter(d=>enabledNodes.has(d.id));
    let labelTextNodesTmp = labelTexts.filter(d=>enabledNodes.has(d.id)).nodes();
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
    if(sx0 === undefined){
      sx0 = scales.sx;
      sy0 = scales.sy;
    }
    scales.sx = transform.rescaleX(sx0);
    scales.sy = transform.rescaleY(sy0);
    ax.scale(scales.sx);
    ay.scale(scales.sy);
    gx.call(ax);
    gy.call(ay);

    nodeCircles
    .attr('r', d=>sr(d.level)*Math.pow(transform.k, 1/4));
    // .attr('r', d=>sr(d.level));
    linkLines
    .attr('stroke-width', e => sr(e.level)/2 )
    // .attr('stroke-width', e => Math.sqrt(transform.k) * sr(e.level)/2 )

    draw(nodes, edges, 
    nodeCircles, linkLines, labelTexts,
    scales.sx, scales.sy, transform);
  })
  .on('end', ()=>{
    debugMsg();


    labelOverlap(labelTextNodes, 1.0);
    draw(nodes, edges, 
    nodeCircles, linkLines, labelTexts,
    scales.sx, scales.sy, transform);

  });
  svg.call(zoom);


  var maxPerplexity = d3.max(nodes, d => d.perplexity);
  let niter = 500;
  const simulation = d3.forceSimulation(nodes);
  

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
  .attr('stroke', e => EDGE_COLOR);//colorscheme[Math.max(e.source.level,e.target.level)-1]);

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
  .attr('stroke-width', d=>Math.max(1, sr(d.level)/4))
  .call(drag(simulation));
  
  const labelTexts = svg
  .selectAll('.labelText')
  .data(nodes)
  .join('text')
  .attr('class', 'labelText')
  // .style('fill', d=>d3.color(colorscheme[(d.level-1) % colorscheme.length]).brighter())
  .attr('fill', d=>'#eee')
  // .attr('fill', d=>d3.color(sc(d.level)).brighter(2))
  .style('font-weight', 100)
  // .style('font-size', d=>`${16-d.level}px`)
  .style('font-size', d=>'16px')
  .style('text-anchor', 'middle')
  .style('alignment-baseline', 'middle')
  .style('filter', 'url(#whiteOutlineEffect)')
  .text(d=>d.label)
  .call(drag(simulation));

  let labelTextNodes = labelTexts.nodes();
  window.labelTextNodes = labelTextNodes;
  //let bboxes = labelTextNodes.map(d=>d.getBoundingClientRect());
  //let maxWidth = bboxes.reduce((a,b)=>a.width>b.width?a.width:b.width);
  //let maxHeight = bboxes.reduce((a,b)=>a.height>b.height?a.height:b.height);

  nodes.forEach((d,i)=>{
    let bbox = labelTextNodes[i].getBoundingClientRect();
    d.bbox = {
      //width: maxWidth,
      //height: maxHeight,
      width: bbox.width,
      height: bbox.height,
    };
  });

  let maxEdgeWeight = d3.max(edges, e=>e.weight);
  let minEdgeWeight = d3.min(edges, e=>e.weight);
  console.log('maxEdgeWeight', maxEdgeWeight);
  let progress = 0;
  

  // def force
  simulation
  .velocityDecay(0.4)
  .alphaDecay(1 - Math.pow(0.001, 1 / niter))
  // .force('pre', forcePre())
  // .force('central', 
  //  d3.forceRadial(0, nodeCenter[0], nodeCenter[1])
  //  .strength(0.01)
  // )
  // .force('charge', 
  //  d3.forceManyBody()
  //  .strength(d=>-1)
  // )
  // .force('collide', 
  //  d3.forceCollide()
  //  .radius(d=>{
  //    return 80;
  //  })
  //  .strength(0.1)
  // )
  // .force('compact',
  //   d3.forceLink(edges)
  //   .distance(e=>-5)
  //   .strength(e=>1e-2)
  // )
  // .force('link-virtual',
  //   d3.forceLink(virtualEdges)
  //   .distance(e=>e.weight)
  //   .strength(e=>1 / Math.pow(e.weight, 2) * Math.pow(minEdgeWeight, 2) )
  //   // .strength(e=>0.02 / e.hops )
  // )
  // .force('link-real',
  //   d3.forceLink(edges)
  //   .distance(e=>e.weight)
  //   .strength(e=>1)
  // )
  // 
  
  .force('ideal-edge-length', 
    forceStress(nodes, edges, enabledNodes)
    // .strength(e=>50/Math.pow(e.weight, 1))
    .strength(e=>1 / e.weight * minEdgeWeight )
    .distance(e=>e.weight)
  )
  // .force('node-edge-repulsion', 
  //   forceNodeEdgeRepulsion(nodes, edges, enabledNodes)
  // )
  .force('stress', 
    forceStress(nodes, virtualEdges, enabledNodes)
    .strength(e=>2 / Math.pow(e.weight, 1.3) * Math.pow(minEdgeWeight, 1.3) )
    .distance(e=>e.weight)
  )
  .force('label-collide', 
    forceEllipse({
      nodes: nodes, 
      scales: scales,
      strength: 4,
      b: 2.5,
      c: 1.0,
    })
  )
  .force('post', forcePost(edges, 1e9, enabledNodes, 0.8));






  let t0 = 0;
  let tickCount = 0;
  simulation.on('tick', () => {
    let t = performance.now();
    let fps = 1000 / (t-t0);
    //console.log(`${fps.toFixed(2)} fps`);
    t0 = t;
    if(tickCount % 10 == 0){
      console.log(tickCount);
    }
    draw(
      nodes, edges,
      nodeCircles, linkLines, labelTexts,
      scales.sx, scales.sy, transform
    );
    tickCount += 1;
  });


  let intervalId = undefined;
  let addNode = ()=>{
    let start = progress;
    progress += 1;
    if(progress <= nodes.length){
      initNodePosition(nodes.slice(start, progress), enabledNodes, nodes, edges, data.id2index, !IS_DYNAMIC);
      // enabledNodes.add(nodes[progress].id);
    }else{
      simulation.alpha(0.99).restart();
      // alert('All nodes enabled');
      return;
    }
    nodes.forEach((d,i)=>{
      d.update = enabledNodes.has(d.id);
    });
    simulation.alpha(0.99).restart();
    console.log(`${progress} / ${nodes.length}`);

    // labelOverlap(labelTextNodes, 1.0);
    draw(
      nodes, edges, 
      nodeCircles, linkLines, labelTexts,
      scales.sx, scales.sy, transform
    );
  };
  window.addEventListener('keydown', (event)=>{
    let key = event.key;
    if(key === 'p'){//[P]ause
      // shouldTick = !shouldTick;
      // if(shouldTick){
      //   simulation.restart();
      // }else{
        simulation.stop();
      // }
    }else if(key === 'r'){//[R]eset
      simulation.alpha(0.85).restart();
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


    }else if(key === 'h'){//[h]ide all
      shouldHideAll = !shouldHideAll;
      // shouldDraw = !shouldDraw;
      d3.selectAll('.labelText')
      .style('display', (shouldHideAll||shouldHideLabel)?'none':'');
      d3.selectAll('.node')
      .style('display', shouldHideAll?'none':'');
      d3.selectAll('.link')
      .style('display', shouldHideAll?'none':'');

    }else if(key === 'a'){//[A]dd a node
      addNode();
    }else if(key == 'd'){//show [D]ebug message
      debugMsg();
    }else if(key == 'b'){//background
      bg = (bg != '#eef7ec') ? '#eef7ec' : '#333';
      svg.style('background', bg); 
    }else if(key == 's'){
      if(intervalId === undefined){
        intervalId = setInterval(addNode, 2000);
      }else{
        console.log('stop')
        clearInterval(intervalId);
        intervalId = undefined;
      }
      
    }else{

    }
  });
  // //off-line training
  simulation.stop();
  // simulation.tick(150);
  zoom.on('zoom')(transform); //draw
  
}



// //--------functions----------
function preprocess(data, nodes){
  if(nodes !== undefined){
    data.nodes = nodes;
  }


  let prescale_pos = 2;
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
    d.weight = prescale_weight / d.level;
    d.label = d.label.slice(0,16);
    d.norm = Math.sqrt(d.x*d.x + d.y*d.y);
    d.update = !IS_PROGRESSIVE;
  });
  data.node_center = math.mean(data.nodes.map(d=>[d.x, d.y]), 0);

 
  //preprocess edges
  // let nodeIds = data.nodes.map(d=>d.id);
  for(let e of data.edges){
    e.source = data.nodes[data.id2index[e.source]];
    e.target = data.nodes[data.id2index[e.target]];
    e.weight *= prescale_weight;
  }

  // data.virtual_edges = data.virtual_edges.filter(e=>e.hops <= 16);
  for(let e of data.virtual_edges){
    e.source = data.nodes[data.id2index[e.source]];
    e.target = data.nodes[data.id2index[e.target]];
    e.weight *= prescale_weight;
  }
}


function pos(){
  let nodes = data.nodes.map(d=>d);
  return JSON.stringify(nodes, null, 2);
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
nodeCircles, linkLines, labelTexts,
sx, sy, transform){
  if(!shouldDraw) {
    return;
  }
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
  .attr('x1', d => sx(d.source.x))
  .attr('y1', d => sy(d.source.y))
  .attr('x2', d => sx(d.target.x))
  .attr('y2', d => sy(d.target.y))
  .attr('stroke', e=>e.crossed ? 'red' : EDGE_COLOR)
  .attr('opacity', e=>{
    return e.source.update && e.target.update ? 1.0:OPACITY_NOT_UPDATE;
    // return sa(Math.max(e.source.level, e.target.level), transform.k)
  })
  nodeCircles
  .attr('cx', d => sx(d.x))
  .attr('cy', d => sy(d.y))
  .attr('opacity', d=>{
    return d.update ? 1.0:OPACITY_NOT_UPDATE;
    // return sa(d.level, transform.k);
  });
  labelTexts
  .attr('x', d=>sx(d.x))
  .attr('y', d=>sy(d.y))
  // .transition()
  // .duration(300)
  .attr('opacity', (d,i)=>{
    // return labelTextNodes[i].show && d.update ? 1.0: 0.0;
    return d.update ? 1.0:0;
  })

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
