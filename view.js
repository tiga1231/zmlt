function drawStatic(graph, canvas, dpr){
  let c = canvas.node().getContext('2d');
  let bbox = canvas.node().getBoundingClientRect();
  let [width, height] = [bbox.width*dpr, bbox.height*dpr];
  let {sx, sy} = getScales(graph.nodes, width, height, 10);
  for(let e of graph.edges){
    let x0 = e.source.x;
    let y0 = e.source.y;
    let x1 = e.target.x;
    let y1 = e.target.y;
    c.lineWidth = dpr;
    c.moveTo(sx(x0), sy(y0));
    c.lineTo(sx(x1), sy(y1));
    c.stroke();
  }
  canvas.graph = graph;//for debug
  return canvas;//for debug
}


function drawInteractive(graph, canvas){

}


function getScales(nodes, width, height, margin=0){

  let xExtent = d3.extent(nodes, d=>d.x);
  let yExtent = d3.extent(nodes, d=>d.y);
  let xSize = xExtent[1] - xExtent[0];
  let ySize = yExtent[1] - yExtent[0];

  let xCenter = (xExtent[0] + xExtent[1])/2;
  let yCenter = (yExtent[0] + yExtent[1])/2;
  xExtent[0] = xCenter - xSize/2;
  xExtent[1] = xCenter + xSize/2;
  yExtent[0] = yCenter - ySize/2;
  yExtent[1] = yCenter + ySize/2;
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
