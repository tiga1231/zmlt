//--------data----------
d3.json('data/lastfm-ryn/lastfm_155nodes.json').then(data=>{
//precomputed node positions
d3.json('data/lastfm-ryn/lastfm_155nodes_nodes-1.json').then(nodes=>{
  data.nodes = nodes;

  window.data = data;
  preprocess(data, data.nodes);
  main(data.nodes, data.edges, data.virtual_edges);

});
});



// //--------code----------
// 
function preprocess(data, nodes){
  if(nodes !== undefined){
    data.nodes = nodes;
  }

  //capitalize labels
  data.nodes = data.nodes.map((d)=>{
    d.label = d.label.charAt(0).toUpperCase() + d.label.slice(1);
    d.norm = Math.sqrt(d.x*d.x + d.y*d.y);
    return d;
  });

  //preprocess edges
  let nodeIds = data.nodes.map(d=>d.id);
  for(let e of data.edges){
    e.source = data.nodes[nodeIds.indexOf(e.source)];
    e.target = data.nodes[nodeIds.indexOf(e.target)];
  }
  for(let e of data.virtual_edges){
    e.source = data.nodes[nodeIds.indexOf(e.source)];
    e.target = data.nodes[nodeIds.indexOf(e.target)];
  }
  // data.labelNodes = [];
  // data.labelEdges = [];
  // for(let i=0; i<data.nodes.length; i++){
  //   let n = data.nodes[i];
  //   let labelId = `label-for-${n.id}`;
  //   let l = {
  //     for: n,
  //     id: labelId, 
  //     text: n.label, 
  //     type: 'label', 
  //     x: n.x, 
  //     y: n.y,
  //     index: i
  //   };
  //   data.labelNodes.push(l);
  //   data.labelEdges.push({source: n, target:l});
  // }
}

const colorscheme = d3.schemeAccent;//schemePastel1

function main(nodes, edges, virtualEdges){
  let scale0 = 1.0;

  let width = window.innerWidth;
  let height = window.innerHeight;
  let svg = d3.select('#main')
  .attr('width', width)
  .attr('height', height)
  .style('background', '#333');
  svg.append('defs').node().innerHTML = whiteOutline();

  let sr = d3.scaleLinear().domain(d3.extent(nodes, d=>d.level)).range([8,6]);
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

  let zoom = d3.zoom()
  .scaleExtent([0.5/scale0, 6.0/scale0])
  .on('zoom', (transform0)=>{
    if(transform0 === undefined){
      transform = d3.event.transform.scale(scale0);
    }else{
      transform = transform0;
    }
    
    console.log(transform.k);
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
    .attr('r', d=>sr(d.level)*Math.sqrt(transform.k));
    linkLines
    .attr('stroke-width', e => Math.sqrt(transform.k) * (e.source.level==1&&e.target.level==1 ? 1.3 : 0.7))

    draw(nodes, edges, 
    nodeCircles, linkLines, labelTexts,
    scales.sx, scales.sy, transform);
  });
  svg.call(zoom);


  var maxPerplexity = d3.max(nodes, d => d.perplexity);
  let niter = 300;
  const simulation = d3.forceSimulation(nodes);
  

  let drag = simulation => {
    return d3.drag()
    .on('start', (d)=>{
      if (!d3.event.active){
        simulation.alphaTarget(0.1).restart();
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
        simulation.alphaTarget(0);
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
  .data(edges.filter(e=>e.type==='real'))
  .join('line')
  .attr('class', 'link')
  .attr('stroke', e => '#eee');//colorscheme[Math.max(e.source.level,e.target.level)-1]);

  const nodeCircles = svg
  .selectAll('.node')
  .data(nodes)
  .join('circle')
  .attr('class', 'node')
  .attr('r', d=>sr(d.level))
  .attr('fill', d=>colorscheme[d.level-1])
  .attr('stroke', '#eee')
  .attr('stroke-width', 0)
  // .call(drag(simulation));
  
  const labelTexts = svg
  .selectAll('.labelText')
  .data(nodes)
  .join('text')
  .attr('class', 'labelText')
  .style('fill', '#eee')
  //.style('stroke', '#333')
  .style('font-weight', 100)
  .style('font-size', '16px')
  .style('text-anchor', 'middle')
  .style('alignment-baseline', 'middle')
  .style('filter', 'url(#whiteOutlineEffect)')
  .text(d=>d.label)
  // .call(drag(simulation));

  let labelTextNodes = labelTexts.nodes();
  let bboxes = labelTextNodes.map(d=>d.getBoundingClientRect());
  let maxWidth = bboxes.reduce((a,b)=>a.width>b.width?a.width:b.width);
  let maxHeight = bboxes.reduce((a,b)=>a.height>b.height?a.height:b.height);

  nodes.forEach((d,i)=>{
    // d.node = labelTextNodes[i];
    // let bbox = labelTextNodes[i].getBoundingClientRect();
    d.bbox = {
      width: maxWidth,
      height: maxHeight,
    };
    // console.log(d.node.innerHTML, d.label);
    // console.log(bbox.height);
  });

  simulation
  .velocityDecay(0.4)
  .alphaDecay(1 - Math.pow(0.001, 1 / niter))
  .force('pre', forcePre())
  // .force('charge', 
  //   d3.forceManyBody()
  //   // .theta(0.9)
  //   // .distanceMin(0.05)
  //   // .distanceMax(6)
  //   .strength(d=>1e-4)
  // )
  // .force('collide', 
  //   d3.forceCollide()
  //   .radius(d=>{
  //     return 1/(d.level+1);
  //   })
  //   .strength(0.1)
  // )
  // .force('link-real', 
  //   d3.forceLink(edges)
  //   .id(d => d.id)
  //   .strength(function(d,i){
  //     // var dd = Math.abs(d.source.perplexity - d.target.perplexity);
  //     // let ap = (d.source.perplexity + d.target.perplexity)/2;
  //     return 1;
  //   })
  //   .distance(e=>e.weight/100)
  // )
  // .force('stress', 
  //  forceStress(virtualEdges, 0.99)
  //  .weight(e=>1/Math.pow(e.weight, 2))
  //  .targetDist(e=>e.weight / (e.source.level + e.target.level) * 2)
  //  .strength(1)
  // )
  // .force('compact', 
  //   forceCompact()
  //   .strength(0.02)
  // )
  .force('label-collide', 
    forceLabelCollide(nodes, scales, simulation, 0.1, 0.5)
    .strength(100.0)
  )
  .force('post', forcePost(edges, 300))

  // .force('center', d3.forceCenter(0,0))
  // window.setTimeout(()=>{simulation.stop()}, 10e3);


  simulation.on('tick', () => {
    console.log('tick');
    //if(Math.random() > 0.8){
    draw(nodes, edges,
    nodeCircles, linkLines, labelTexts,
    scales.sx, scales.sy, transform);
    //}
  });

  let shouldTick = true;
  window.addEventListener('keydown', (event)=>{
    let key = event.key;
    if(key === 'p'){
      // shouldTick = !shouldTick;
      // if(shouldTick){
      //   simulation.restart();
      // }else{
        simulation.stop();
      // }
    }else if(key === 'r'){
      simulation.alpha(0.95).restart();
    }
  });


  // //off-line training
  simulation.stop();
  // simulation.tick(150);
  zoom.on('zoom')(transform); //draw
  

  
  
}






function pos(){
  let nodes = data.nodes.map(d=>d);
  return JSON.stringify(nodes, null, 2);
}

function sa(level, k){
  //todo: level-to-k coorespondence
  let alpha;
  if(level == 1){
    alpha = 1;
  }else if(k >= level){
    alpha = 1.0;
  }else if(k <= level-1){
    alpha = 0;
  }else{
    let x = k - (level-1); //x \in [0,1]
    let [a,b] = [0.3, 1.0];
    if(x >= b){
      alpha = 1.0;
    }else if(x <= a){
      alpha = 0;
    }else{
      x = (x-a)/(b-a); //x \in [0, 1]
      alpha = x*x*(3-2*x);
    }
  }
  return 1.0;
  return alpha;
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

function draw(nodes, edges,
nodeCircles, linkLines, labelTexts,
sx, sy, transform){

  for(let i=0; i<edges.length; i++){
    edges[i].crossed = false;
  }
  for(let i=0; i<edges.length; i++){
    for(let j=i+1; j<edges.length; j++){
      let e0 = edges[i];
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
  linkLines
  .attr('x1', d => sx(d.source.x))
  .attr('y1', d => sy(d.source.y))
  .attr('x2', d => sx(d.target.x))
  .attr('y2', d => sy(d.target.y))
  .attr('stroke', e=>e.crossed? 'red' : '#eee')
  .attr('opacity', e=>sa(Math.max(e.source.level, e.target.level), transform.k)  )
  nodeCircles
  .attr('cx', d => sx(d.x))
  .attr('cy', d => sy(d.y))
  .attr('opacity', d=>{
    return sa(d.level, transform.k);
  });
  labelTexts
  .attr('x', d=>sx(d.x))
  .attr('y', d=>sy(d.y))
  .attr('opacity', d=>{
    return sa(d.level, transform.k);
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
