//// export JSON
function exportJson(obj, fn='result.json'){
  let objStr = JSON.stringify(obj, null, 2);
  let dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(objStr);
  var anchor = document.getElementById('download-json');
  anchor.setAttribute('href', dataStr);
  anchor.setAttribute('download', fn);
  anchor.click();
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


function randint(min, max){
  return Math.floor(Math.random()*(max-min) + min);
}

function rotate(p, cos, sin, center={x:0, y:0}){
  let res = {
    x: p.x, 
    y: p.y
  };
  [res.x, res.y] = [res.x-center.x, res.y-center.y];
  [res.x, res.y] = [res.x*cos + res.y*(-sin), res.x*sin + res.y*cos];
  [res.x, res.y] = [res.x+center.x, res.y+center.y];
  return res;
}


function translate(p, tx, ty){
  let res = {
    x: p.x, 
    y: p.y
  };
  res.x += tx;
  res.y += ty;
  return res;
}


function evaluate(){
  
  
  console.log(
    'Label Overlap:', labelOverlap(window.labelTextNodes)
  );
  console.log(
    '---------',
  );

  console.log(
    'Ideal Edge Length Preservation (Mingwei):', 
    idealEdgeLengthPreservation2(window.data.edges, window.data.edges.map(e=>e.weight))
  );
  console.log(
    'Area:', areaCoverage(window.labelTextNodes)
  );
  console.log(
    '==========',
  );
}


function colorLabel(labelNodes, color='orange'){
  labelNodes.forEach(d=>{
    d.style.fill = color;
  });
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


function initNodePosition(newNodes, root, currentNodes0, allNodes, allEdges, id2index, useInitital=false){
  for(let node of newNodes){
    node.update = true;
    if(node.id == root.id){
      node.x = 0;
      node.y = 0;
      continue;
    }

    let currentEdges = allEdges.filter(e=>{
      return e.source.update && e.target.update;
      // return (
      //   currentNodes0.has(e.source.id) && currentNodes0.has(e.target.id)
      // );
    });

    let parent = allNodes[id2index[node.parent]];
    let count = 1;
    let r = 1;
    let edges1 = allEdges.filter(e=>(
      currentNodes0.has(e.source.id) && node.id === e.target.id
      || currentNodes0.has(e.target.id) && node.id === e.source.id
    ));

    do {
      // r = 1/count;
      r *= 0.8;
      if(parent.id === root.id){
        node.x = root.x + (Math.random()-0.5)*r; 
        node.y = root.y + (Math.random()-0.5)*r; 
      }else{
        let dx = parent.x - root.x;
        let dy = parent.y - root.y;
        let l = Math.sqrt(dx*dx+dy*dy);
        let cos = dx/l;
        let sin = dy/l; 
        node.x = parent.x + r * (node.weight*2) * cos; 
        node.y = parent.y + r * (node.weight*2) * sin; 
      }
      count+=1;
    }while(countCrossings(currentEdges, edges1)>0);
    currentNodes0.add(node.id);
  }
  return currentNodes0;
}

// function initNodePosition(newNodes, currentNodes0, allNodes, allEdges){
//   let currentNodes = currentNodes0;
//   let currentEdges = allEdges.filter(e=>currentNodes.has(e.source.id) && currentNodes.has(e.target.id));

//   for(let node of newNodes){
//     let boundary = getBoundary(node, currentNodes, allEdges);
//     initOneNode(
//       node, 
//       allNodes.filter(d=>boundary.nodes.has(d.id)), 
//       boundary.edges,
//       allNodes.filter(d=>currentNodes.has(d.id)),
//       currentEdges
//     );

//     currentNodes.add(node.id);
//     for (let e of boundary.edges){
//       currentEdges.push(e);
//     }
//   }
// }


function getBoundary(node, currentNodes, allEdges){
  let boundary = {};
  boundary.edges = allEdges.filter(e=>{
    return (
      currentNodes.has(e.target.id) && e.source.id === node.id
      || 
      currentNodes.has(e.source.id) && e.target.id === node.id
    );
  });
  boundary.nodes = new Set(
    boundary.edges.map(e=>e.source.id !== node.id ? e.source.id : e.target.id)
  );
  return boundary;
}


function initOneNode(node, boundaryNodes, boundaryEdges, currentNodes, currentEdges){
  let allEdges = currentEdges.concat(boundaryEdges);
  if(currentNodes.length <= 1){
    node.x = Math.random();
    node.y = Math.random();
  }else{
    // let cx = d3.mean(currentNodes, d=>d.x);
    // let cy = d3.mean(currentNodes, d=>d.y);
    // let [dx, dy] = [boundaryNodes[0].x-cx, boundaryNodes[0].y-cy];
    // let norm = Math.sqrt(dx*dx+dy*dy);
    // node.x = boundaryNodes[0].x + (dx/norm+Math.random()-0.5)*10;
    // node.y = boundaryNodes[0].y + (dy/norm+Math.random()-0.5)*10;
    
    // node.x = (Math.random()-0.5)*1 + boundaryNodes[0].x;
    // node.y = (Math.random()-0.5)*1 + boundaryNodes[0].y;
    // while(countCrossings(allEdges, node) > 0){
    //   node.x = (Math.random()-0.5)*1+ boundaryNodes[0].x;
    //   node.y = (Math.random()-0.5)*1 + boundaryNodes[0].y;
    // }

    let edges1 = allEdges.filter(e=>node.id === e.source.id || node.id === e.target.id);
    while(countCrossings(allEdges, edges1) > 0){
      node.x = (Math.random()-0.5)*10 + boundaryNodes[0].x;
      node.y = (Math.random()-0.5)*10 + boundaryNodes[0].y;
    }

    // node.x = (Math.random()-0.5)*2 + boundaryNodes[0].x;
    // node.y = (Math.random()-0.5)*2 + boundaryNodes[0].y;
    // while(countCrossings(allEdges, node) > 0){
    //   node.x = (Math.random()-0.5)*2 + boundaryNodes[0].x;
    //   node.y = (Math.random()-0.5)*2 + boundaryNodes[0].y;
    // }
    
  }
  
}


function idealEdgeLengthPreservation2(links, ideal_lengths, scale=1){ 
  let sumOfSquares = 0;
  for (let i = 0; i < links.length; i++) {
    let x1 = links[i].source.x;
    let y1 = links[i].source.y;
    let x2 = links[i].target.x;
    let y2 = links[i].target.y;
    let [dx, dy] = [(x1-x2), (y1-y2)];
    let dist = Math.sqrt(dx*dx + dy*dy);
    dist *= scale;
    let diff = Math.abs(ideal_lengths[i] - dist);
    let relativeDifference = diff / ideal_lengths[i];
    sumOfSquares += Math.pow(relativeDifference, 2);
  }
  let std = Math.sqrt(sumOfSquares / links.length);
  return std;
}


function bestScalingForEdgeLengthPreservation(links, lengths){
  let s = 1; //find best scaling factor
  let num = 0; // = np.sum([ideal_edge_length[k]**2/actual_edge_length[k] for k in g.edges])
  let den = 0; // np.sum([ideal_edge_length[k] for k in g.edges])
  for (let i = 0; i < links.length; i++) {
    let x1 = links[i].source.x;
    let y1 = links[i].source.y;
    let x2 = links[i].target.x;
    let y2 = links[i].target.y;
    let [dx, dy] = [(x1-x2), (y1-y2)];
    let al = Math.sqrt(dx*dx + dy*dy); //actual length
    let il = lengths[i]; //ideal length
    num += (il*il) / al;
    den += il;
  }
  s = num / den;
  return s;
}

function bestIdealEdgeLengthPreservation(links, lengths){
  let s = 1; //find best scaling factor
  let num = 0; // = np.sum([ideal_edge_length[k]**2/actual_edge_length[k] for k in g.edges])
  let den = 0; // np.sum([ideal_edge_length[k] for k in g.edges])
  for (let i = 0; i < links.length; i++) {
    let x1 = links[i].source.x;
    let y1 = links[i].source.y;
    let x2 = links[i].target.x;
    let y2 = links[i].target.y;
    let [dx, dy] = [(x1-x2), (y1-y2)];
    let al = Math.sqrt(dx*dx + dy*dy); //actual length
    let il = lengths[i]; //ideal length
    num += (il*il) / al;
    den += il;
  }
  s = num / den;
  console.log('best scale:', s);
  console.log('not scaled:', idealEdgeLengthPreservation2(links, lengths, s+0.01));
  return idealEdgeLengthPreservation2(links, lengths, s);
}

function areaUtilization(bboxes){
  //binary search minimal non-overlap scale
  //then compute area usage
  bboxes.forEach((b,i)=>b.index=i);
  let sx = (d)=>(d.x+d.x+d.width)/2;
  let sy = (d)=>(d.y+d.y+d.height)/2;

  let tree = d3.quadtree(bboxes, sx, sy);

  const min0 = 0.1;
  const max0 = 1000;
  let lowerbound = min0;
  let upperbound = min0;
  let r = d3.max(bboxes, b=>b.width);
  for(let i=0; i<bboxes.length; i++){
    let bi = bboxes[i];
    let x = sx(bi);
    let y = sy(bi);
    let neighbors = searchQuadtree(tree, sx, sy, x-r, x+r, y-r, y+r);
    // console.log('n neighbor', neighbors.length);
    for(let j of neighbors){
      if(i!==j){
        let bj = bboxes[j];
        let min = min0;
        let max = max0;
        for(let k=0; k<20; k++){
          let tmp = (min+max)/2;
          if(isRectCollide2(bi, bj, tmp)){
            [min,max] = [tmp, max];
          }else{
            [min,max] = [min, tmp];
          }
        }
        lowerbound = Math.max(min, lowerbound);
        upperbound = Math.max(max, upperbound);
      }
    }
  }
  return [upperbound, areaCoverage(bboxes, upperbound)];
}

// function idealEdgeLengthPreservation(links, ideal_lengths){ 
//   let total_difference = 0;
//   let total_distance = 0;
//   for (let i = 0; i < links.length; ++i) {
//     let x1 = links[i].source.x;
//     let y1 = links[i].source.y;
//     let x2 = links[i].target.x;
//     let y2 = links[i].target.y;
//     let dist = Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
//     let diff = Math.abs(ideal_lengths[i] - dist);
//     total_difference += diff;
//     total_distance += dist;
//   }
//   // console.log(total_difference, total_distance);
//   let average_difference = total_difference/links.length;
//   let average_distance = total_distance/links.length;
//   return 1-(average_difference/average_distance);
// }


function areaCoverage(labelDoms, scale=1){
  let labelArea = 0;
  let xmin = +Infinity,
      xmax = -Infinity,
      ymin = +Infinity,
      ymax = -Infinity;
  let s2 = scale*scale;

  if(labelDoms[0].width === undefined){ //if an array of domNodes()
    labelDoms = labelDoms.map(d=>d.getBoundingClientRect());
  }else{// an array of bboxes
    //do nothing
  }
  for(let bbox of labelDoms){
    labelArea += bbox.width * bbox.height / s2;

    let cx = (bbox.x + bbox.x + bbox.width)/2;
    let cy = (bbox.y + bbox.y + bbox.height)/2;
    let left = cx - bbox.width/2/scale;
    let right = cx + bbox.width/2/scale;
    let top = cy - bbox.height/2/scale;
    let bottom = cy + bbox.height/2/scale;
    if(left < xmin){
      xmin = left;
    }
    if(right > xmax){
      xmax = right;
    }
    if(top < ymin){
      ymin = top;
    }
    if(bottom > ymax){
      ymax = bottom;
    }
  }
  let boundingArea = (ymax - ymin) * (xmax - xmin);
  return labelArea / boundingArea;
}




//https://github.com/d3/d3-quadtree
function searchQuadtree(quadtree, xGetter, yGetter, xmin, xmax, ymin, ymax) {
  const results = [];
  quadtree.visit(function(node, x1, y1, x2, y2) {
    if (!node.length) {
      do {
        var d = node.data;
        // let bb = d.getBoundingClientRect();
        // let x = bb.x + bb.width/2;
        // let y = bb.y + bb.height/2;
        let x = xGetter(d);
        let y = yGetter(d);
        if (x >= xmin && x < xmax && y >= ymin && y < ymax) {
          results.push(d.index);
        }
      } while (node = node.next);
    }
    return x1 >= xmax || y1 >= ymax || x2 < xmin || y2 < ymin;
  });
  return results;
}


function isRectCollide2(rect1, rect2, scale=1){
  let x1 = (rect1.x+rect1.x+rect1.width)/2;
  let y1 = (rect1.y+rect1.y+rect1.height)/2;
  let rw1 = rect1.width /2 /scale;
  let rh1 = rect1.height /2 /scale;
  let rect1_left = x1 - rw1;
  let rect1_right = x1 + rw1;
  let rect1_top = y1 - rh1;
  let rect1_bottom = y1 + rh1;

  let x2 = (rect2.x+rect2.x+rect2.width)/2;
  let y2 = (rect2.y+rect2.y+rect2.height)/2;
  let rw2 = rect2.width /2 /scale;
  let rh2 = rect2.height /2 /scale;
  let rect2_left = x2 - rw2;
  let rect2_right = x2 + rw2;
  let rect2_top = y2 - rh2;
  let rect2_bottom = y2 + rh2;

  return (
       rect1_left <= rect2_right
    && rect1_right >= rect2_left
    && rect1_top <= rect2_bottom
    && rect1_bottom >= rect2_top
  );
}

//https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
function isRectCollide(rect1, rect2){
  return (
       rect1.left <= rect2.right
    && rect1.right >= rect2.left
    && rect1.top <= rect2.bottom
    && rect1.bottom >= rect2.top
  );
}



function rectCollide(rect1, rect2){
  let res = {
    magnitude: 0,
    dir: {x:0, y:0},
  };

  if(isRectCollide(rect1, rect2)){
    res.magnitude = 1;
    let xOverlap = 
    (rect2.right-rect2.left) 
    + (rect1.right-rect1.left)
    - (
      Math.max(rect1.right, rect2.right) 
      - Math.min(rect1.left, rect2.left)
    );

    let yOverlap = (rect2.bottom-rect2.top) + (rect1.bottom-rect1.top)
    - (
      Math.max(rect1.bottom, rect2.bottom) 
      - Math.min(rect1.top, rect2.top)
    );
    
    let d = Math.max(xOverlap, yOverlap);
    let dx = Math.max(xOverlap, 1);
    let dy = Math.max(yOverlap, 1);

    let x1 = (rect1.left + rect1.right)/2;
    let x2 = (rect2.left + rect2.right)/2;
    if( x1 < x2){
      res.dir.x = -1 * dx;
    }else{
      res.dir.x = 1 * dx;
    }
    let y1 = (rect1.top + rect1.bottom)/2;
    let y2 = (rect2.top + rect2.bottom)/2;
    if( y1 < y2){
      res.dir.y = -1 * dy;
    }else{
      res.dir.y = 1 * dy;
    }
  }
  return res;
}


///ref:
///https://stackoverflow.com/questions/1955048/get-computed-font-size-for-dom-element-in-js
function getStyle(el,styleProp) {
  var camelize = function (str) {
    return str.replace(/\-(\w)/g, function(str, letter){
      return letter.toUpperCase();
    });
  };

  if (el.currentStyle) {
    return el.currentStyle[camelize(styleProp)];
  } else if (document.defaultView && document.defaultView.getComputedStyle) {
    return document.defaultView.getComputedStyle(el,null)
                               .getPropertyValue(styleProp);
  } else {
    return el.style[camelize(styleProp)]; 
  }
}



function interpolate(a, b, t=0.5){
  return a*(1-t) + b*(t);
}


// function countCrossings(edges, node){
//   //count crossings between all [edges] and edges emitted from certain [node]
//   let segments = edges.map(e=>[[e.source.x,e.source.y],[e.target.x, e.target.y]]);
//   console.log(segments);
//   let inter = findIntersections(segments);
//   return inter.length;
// }

function edge2segment(edges){
  return edges.map(e=>[[e.source.x, e.source.y],[e.target.x, e.target.y]]);
  // let segs = {};
  // edges.forEach((e,i)=>{
  //   segs[i] = [[e.source.x, e.source.y],[e.target.x, e.target.y]];
  // });
  return segs;
}


function markCrossings(edges){
  for(let e of edges){
    e.crossed = false;
    e.source.crossed = false;
    e.target.crossed = false;
  }
  let segs = edge2segment(edges);
  let inter = findIntersections(segs);
  for(let i=0; i<inter.length; i++){
    if( Array.isArray(inter[i].segmentID) ){
      let [e0,e1] = [+inter[i].segmentID[0], +inter[i].segmentID[1]];

      edges[e0].crossed = true;
      edges[e0].source.crossed = true;
      edges[e0].target.crossed = true;

      edges[e1].crossed = true;
      edges[e1].source.crossed = true;
      edges[e1].target.crossed = true;
    }else{
      console.log(inter[i]);
      let e0 = +inter[i].segmentID;
      edges[e0].crossed = true;
      edges[e0].source.crossed = true;
      edges[e0].target.crossed = true;
    }
  }
}



// function countCrossings(edges, node){
//   //count crossings between all [edges] and edges emitted from certain [node]
//   let count = 0;
//   for(let i=0; i<edges.length; i++){
//     edges[i].crossed = false;
//   }
//   let edges0;
//   if(node == undefined){
//     edges0 = edges;
//   }else{
//     edges0 = edges.filter(e=>node.id === e.source.id || node.id === e.target.id);
//   }
//   let edges1 = edges;

//   for(let i=0; i<edges0.length; i++){
//     let e0 = edges0[i];
//     for(let j=0; j<edges1.length; j++){
//       let e1 = edges1[j];
//       let isIncident = e0.source.id === e1.source.id 
//         || e0.source.id === e1.target.id 
//         || e0.target.id === e1.source.id 
//         || e0.target.id === e1.target.id;
//       count += !isIncident && isCrossed(e0,e1);
//     }
//   }
//   return count;
// }

// edges0 = edges.filter(e=>node.id === e.source.id || node.id === e.target.id);

function countCrossings(edges0, edges1){
  //count crossings between all [edges0] and [edges1]
  let count = 0;
  for(let i=0; i<edges0.length; i++){
    edges0[i].crossed = false;
  }
  if(edges1 === undefined){
    edges1 = edges0;
  }else{
    for(let i=0; i<edges1.length; i++){
      edges1[i].crossed = false;
    }
  }
  

  for(let i=0; i<edges0.length; i++){
    let e0 = edges0[i];
    for(let j=0; j<edges1.length; j++){
      let e1 = edges1[j];
      let isIncident = e0.source.id === e1.source.id 
        || e0.source.id === e1.target.id 
        || e0.target.id === e1.source.id 
        || e0.target.id === e1.target.id;
      
      count += !isIncident && isCrossed(e0,e1);
    }
  }
  return count;
}





function isCrossed(e0, e1){
  let p0 = e0.source;
  let p1 = e0.target;
  let q0 = e1.source;
  let q1 = e1.target;
  return (
    signOf(q0, p0, p1)*signOf(q1, p0, p1) <= 0
    && signOf(p0, q0, q1)*signOf(p1, q0, q1) <= 0
  );
}


// function isCrossed(e0, e1){
//   let epsilon = 0;
//   //ref: graphic gems 3, "FASTER LINE SEGMENT INTERSECTION", pg.199
//   let p1 = e0.source;
//   let p2 = e0.target;
//   let p3 = e1.source;
//   let p4 = e1.target;

//   let a = {x: p2.x-p1.x, y: p2.y-p1.y};
//   let b = {x: p3.x-p4.x, y: p3.y-p4.y};
//   let c = {x: p1.x-p3.x, y: p1.y-p3.y};

//   let denom = a.y*b.x - a.x*b.y;
//   let numer = b.y*c.x - b.x*c.y;
//   if(denom > 0){
//     if (numer < -epsilon || numer > denom + epsilon){
//       return false;
//     }
//   }else{
//     if (numer < -epsilon || numer < denom + epsilon){
//       return false;
//     }
//   }

//   let numer2 = a.x*c.y - a.y*c.x;
//   if(denom > 0){
//     if (numer2 < -epsilon || numer2 > denom + epsilon){
//       return false;
//     }
//   }else{
//     if (numer2 > -epsilon || numer2 < denom + epsilon){
//       return false;
//     }
//   }

//   return true;
// }


function signOf(p, l0, l1){
  let a = (l0.y - l1.y);
  let b = -(l0.x - l1.x);
  let c = l0.y * (l0.x - l1.x) - l0.x * (l0.y - l1.y);
  let z = p.x * a + p.y*b + c;
  let epsilon = 1e-8;
  if(z>epsilon){
    return +1;
  }else if(z<-epsilon){
    return -1;
  }else{
    return 0;
  }
}


function whiteOutline(){
  return `
  <filter id="whiteOutlineEffect" width="200%" height="200%" x="-50%" y="-50%">
    <feMorphology in="SourceAlpha" result="MORPH" operator="dilate" radius="1" />
    <feColorMatrix in="MORPH" result="WHITENED" type="matrix" values="0 0 0 0.9 0, 0 0 0 0.9 0, 0 0 0 0.9 0, 0 0 0 1 0" />
    <feMerge>
      <feMergeNode in="WHITENED" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
  `;
}
