//--------data----------
d3.json('data/Topics_Layer_1.json').then(data=>{
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
  let labelNodes = [];
  let labelEdges = [];
  for(let n of data.nodes){
    let labelId = `label-for-${n.id}`;
    let l = {
      for: n,
      id: labelId, 
      text: n.label, 
      type:'label', 
      x:n.x, 
      y:n.y};
    labelNodes.push(l);
    labelEdges.push({source: n, target:l});
  }
  window.data = data;
  main(data.nodes, data.edges, data.virtual_edges, labelNodes, labelEdges);
});




// //--------code----------
function main(nodes, edges, virtualEdges, labelNodes, labelEdges){

  let width = window.innerWidth;
  let height = window.innerHeight;
  let svg = d3.select('#main')
  .attr('width', width)
  .attr('height', height)
  .style('background', '#333');
  svg.append('defs').node().innerHTML = whiteOutline();

  let sr = d3.scaleLinear().domain(d3.extent(nodes, d=>d.level)).range([3,1]);
  
  let [sx, sy] = getScales(nodes, svg);
  let ax = d3.axisBottom(sx);//.tickSize(-(sy.range()[1]-sy.range()[0]));
  let ay = d3.axisLeft(sy);//.tickSize(-(sx.range()[1]-sx.range()[0]));
  let gx = svg.selectAll('.gx')
  .data([0,])
  .enter()
  .append('g')
  .attr('class', 'gx')
  .attr('transform', `translate(0,${sy.range()[1]})`)
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
  let transform = {};
  let zoom = d3.zoom()
  .on('zoom', ()=>{
    transform = d3.event.transform;
    console.log(transform.k);
    if(sx0 === undefined){
      sx0 = sx;
      sy0 = sy;
    }
    sx = transform.rescaleX(sx0);
    sy = transform.rescaleY(sy0);
    ax.scale(sx);
    ay.scale(sy);
    gx.call(ax);
    gy.call(ay);
    nodeCircles.attr('r', d=>sr(d.level)*Math.sqrt(transform.k));
    draw(nodes, edges, labelNodes, labelEdges, 
    nodeCircles, linkLines, labelTexts,
    sx, sy, transform);
  });
  svg.call(zoom);


  var maxPerplexity = d3.max(nodes, d => d.perplexity);
  let niter = 3e6;


  const simulation = d3.forceSimulation(nodes.concat(labelNodes))
  .velocityDecay(0.4)
  .alphaDecay(1 - Math.pow(0.001, 1 / niter))
  .force('pre', forcePre())
  //.force('attach-text', d3.forceLink(labelEdges)
  //  .id(d => d.id)
  //  .strength(function(d,i){
  //    return 1.1;
  //  })
  //  .distance(d=>0)
  //)
  .force('charge', 
    d3.forceManyBody()
    .strength(d=>d.type!=='label' ? 0.05/nodes.length:0)
  )
  .force('collide', 
    d3.forceCollide()
    .radius(d=>{
      if(d.type=='label'){
        return 0;
      }else{
        return 4;
      }
    })
    .strength(0.001)
  )
  .force('link-real', 
    d3.forceLink(edges)
    .id(d => d.id)
    .strength(function(d,i){
      // var dd = Math.abs(d.source.perplexity - d.target.perplexity);
      // let ap = (d.source.perplexity + d.target.perplexity)/2;
      return 0.9;
    })
    .distance(d=>1)
  )
  //.force('stress', 
  //  forceStress(virtualEdges, 1/nodes.length/5)
  //  .weight(e=> 1/Math.pow(e.weight, 2) / (e.source.level+e.target.level)*2  )
  //  .targetDist(e=>e.weight)
  //  .strength(10)
  //)
  .force('post', forcePost(edges, 2))
  // .force('center', d3.forceCenter(0,0));
  window.simulation = simulation;

  let drag = simulation => {

    function dragstarted(d) {
      if (!d3.event.active){
        simulation.alphaTarget(0.4).restart();
      }
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(d) {
      d.fx = sx.invert(d3.event.sourceEvent.offsetX);
      d.fy = sy.invert(d3.event.sourceEvent.offsetY);
    }
    function dragended(d) {
      if (!d3.event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    return d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  };


  const linkLines = svg
  .selectAll('.link')
  .data(edges.filter(e=>e.type==='real'))
  .join('line')
  .attr('class', 'link')
  .attr('stroke-width', e => e.source.level==1 && e.target.level==1 ? 2.0 : 0.8)
  .attr('stroke', '#eee');

  const nodeCircles = svg
  .selectAll('.node')
  .data(nodes)
  .join('circle')
  .attr('class', 'node')
  .attr('r', d=>sr(d.level))
  //.attr('fill', d=>d3.schemePastel1[d.level-1])
  .attr('fill', d=>d3.schemeAccent[d.level-1])
  .attr('stroke', '#eee')
  .attr('stroke-width', 0)
  .call(drag(simulation));
  
  const labelTexts = svg
  .selectAll('.labelText')
  .data(labelNodes)
  .join('text')
  .attr('class', 'labelText')
  .style('fill', '#eee')
  //.style('stroke', '#333')
  //.style('font-weight', 'bold')
  .style('text-anchor', 'middle')
  .style('filter', 'url(#whiteOutlineEffect)')
  .text(d=>d.text)
  .call(drag(simulation));


  simulation.on('tick', () => {
    //if(Math.random() > 0.8){
    draw(nodes, edges, labelNodes, labelEdges, 
    nodeCircles, linkLines, labelTexts,
    sx, sy, transform);
    //}
  });

}






function pos(){
  let nodes = data.nodes.map(d=>d);
  return JSON.stringify(nodes, null, 2);
}

function sa(level, k){
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
  return alpha;
}


function getScales(nodes, svg){
  let width = +svg.node().clientWidth;
  let height = +svg.node().clientHeight;

  let xExtent = d3.extent(nodes, d=>d.x);
  let yExtent = d3.extent(nodes, d=>d.y);
  let xSize = xExtent[1] - xExtent[0];
  let ySize = yExtent[1] - yExtent[0];
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
  return [sx, sy];
}

function draw(nodes, edges, labelNodes, labelEdges, 
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
  .attr('stroke', d=>d.crossed?'red':'#aaa')
  .attr('opacity', e=>sa(Math.max(e.source.level, e.target.level), transform.k)  )
  nodeCircles
  .attr('cx', d => sx(d.x))
  .attr('cy', d => sy(d.y))
  .attr('opacity', d=>{
    return sa(d.level, transform.k);
  });
  labelTexts
  .attr('x', d=>sx(d.for.x))
  .attr('y', d=>sy(d.for.y))
}
