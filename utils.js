function randint(min, max){
  return Math.floor(Math.random()*(max-min) + min);
}


function evaluate(){
  
  console.log(
    'Ideal Edge Length Preservation:', 
    idealEdgeLengthPreservation(window.data.edges, window.data.edges.map(e=>e.weight))
  );
  console.log(
    'Area Coverage :', 
    areaCoverage(window.labelTextNodes)
  );
  console.log(
    '---------',
  );
  console.log(
    'Number of Label Overlap:', labelOverlap(window.labelTextNodes)
  );
  console.log(
    'Ideal Edge Length Preservation (Mingwei):', 
    idealEdgeLengthPreservation2(window.data.edges, window.data.edges.map(e=>e.weight))
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


function labelOverlap(labelNodes, heightFactor=0.6){
  let count = 0;
  let overlapMatrix = [];
  for(let i=0; i<labelNodes.length; i++){
    overlapMatrix.push([]);
    let l1 = labelNodes[i];
    l1.show = true;
  }

  let bboxes = labelNodes.map(l=>{
    let bbox = l.getBoundingClientRect();
    bbox.y += bbox.height * heightFactor/2;
    bbox.height *= heightFactor;
    return bbox;
  });

  labelNodes.forEach(d=>d.overlap = new Set());
  for(let i=0; i<labelNodes.length; i++){
    overlapMatrix[i][i] = 0;
    let l1 = labelNodes[i];
    let bbox1 = bboxes[i];
    
    for(let j=i+1; j<labelNodes.length; j++){
      let l2 = labelNodes[j];
      let bbox2 = bboxes[j];
      let overlap = isRectCollide(bbox1, bbox2);
      if(overlap){
        overlapMatrix[i][j] = 1;
        overlapMatrix[j][i] = 1;
        l2.overlap.add(i);
        l1.overlap.add(j);
        // l1.show = false;
        l2.show = false;
        count += 1;
      }else{
        overlapMatrix[i][j] = 0;
        overlapMatrix[i][j] = 0;
      }
    }
  }
  window.overlapMatrix = overlapMatrix;
  //TODO greedy

  return count;
}


function initNodePosition(newNodes, currentNodes0, allNodes, allEdges, id2index, useInitital=true){
  for(let node of newNodes){
    // let edge = allEdges.filter(e=>
    //   (currentNodes0.size == 0 || currentNodes0.has(e.source.id)) && e.target.id === node.id
    //   ||
    //   (currentNodes0.size == 0 || currentNodes0.has(e.target.id)) && e.source.id === node.id
    // );
    // let other = edge[0].source.id !== node.id ? edge[0].source : edge[0].target;

    let edges = allEdges.filter(e=>{
      return (
        currentNodes0.has(e.source.id) && currentNodes0.has(e.target.id)
        || currentNodes0.has(e.source.id) && node.id === e.target.id
        || currentNodes0.has(e.target.id) && node.id === e.source.id
      );
    });

    let other;
    if(currentNodes0.size == 0){
      if(useInitital){
        other = {
          x: node.x, 
          y: node.y,
          xInit: node.x, 
          yInit: node.y,
        };
      }else{
        other = {x: Math.random(), y: Math.random()};
      }
    }else{
      // other = node.neighbors.filter(d=>currentNodes0.has(d))[0];
      // other = allNodes.filter(d=>d.id == other)[0];
      other = allNodes[id2index[node.parent]];
    }

    if(useInitital && node.xInit !== undefined){
      node.x = other.x + (node.xInit - other.xInit);
      node.y = other.y + (node.yInit - other.yInit);
    }else{
      
      node.x = (Math.random()-0.5)*1 + other.x;
      node.y = (Math.random()-0.5)*1 + other.y;
    }
    let count = 0;
    while(countCrossings(edges, node) > 0 && count <= 100){
      node.x = (Math.random()-0.5)*1/count + other.x;
      node.y = (Math.random()-0.5)*1/count + other.y;
      count+=1;
    }
    // if(count == 100){
    //   alert(node.x, node.y);
    // }
    currentNodes0.add(node.id);
  }
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

    while(countCrossings(allEdges, node) > 0){
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


function idealEdgeLengthPreservation2(links, ideal_lengths){ 
  let sumOfSquares = 0;
  for (let i = 0; i < links.length; i++) {
    let x1 = links[i].source.x;
    let y1 = links[i].source.y;
    let x2 = links[i].target.x;
    let y2 = links[i].target.y;
    let dist = Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
    let diff = Math.abs(ideal_lengths[i] - dist);
    let relativeDifference = diff / ideal_lengths[i];
    sumOfSquares += Math.pow(relativeDifference, 2);
  }
  let std = Math.sqrt(sumOfSquares / links.length);
  return std;
}


function idealEdgeLengthPreservation(links, ideal_lengths){ 
  let total_difference = 0;
  let total_distance = 0;
  for (let i = 0; i < links.length; ++i) {
    let x1 = links[i].source.x;
    let y1 = links[i].source.y;
    let x2 = links[i].target.x;
    let y2 = links[i].target.y;
    let dist = Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
    let diff = Math.abs(ideal_lengths[i] - dist);
    total_difference += diff;
    total_distance += dist;
  }
  // console.log(total_difference, total_distance);
  let average_difference = total_difference/links.length;
  let average_distance = total_distance/links.length;
  return 1-(average_difference/average_distance);
}


function areaCoverage(labelDoms){
  let labelArea = 0;
  let xmin = +Infinity,
      xmax = -Infinity,
      ymin = +Infinity,
      ymax = -Infinity;
  for(let d of labelDoms){
    let bbox = d.getBoundingClientRect();
    labelArea += bbox.width * bbox.height;
    if(bbox.x < xmin){
      xmin = bbox.x;
    }
    if(bbox.x + bbox.width > xmax){
      xmax = bbox.x + bbox.width;
    }
    if(bbox.y < ymin){
      ymin = bbox.y;
    }
    if(bbox.y + bbox.height > ymax){
      ymax = bbox.y + bbox.height;
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


function countCrossings(edges, node){
  //count crossings between all [edges] and edges emitted from certain [nodes]
  let count = 0;
  for(let i=0; i<edges.length; i++){
    edges[i].crossed = false;
  }

  let edges0;
  if(node == undefined){
    edges0 = edges;
  }else{
    edges0 = edges.filter(e=>node.id === e.source.id || node.id === e.target.id);
  }
  for(let i=0; i<edges0.length; i++){
    for(let j=0; j<edges.length; j++){
      let e0 = edges0[i];
      let e1 = edges[j];
      let isIncident = e0.source.id == e1.source.id 
      || e0.source.id == e1.target.id 
      || e0.target.id == e1.source.id 
      || e0.target.id == e1.target.id;
      
      if(!isIncident && isCrossed(e0,e1)){
        count += 1;
      }else{

      }
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

function signOf(p, l0, l1){
  let a = (l0.y - l1.y);
  let b = -(l0.x - l1.x);
  let c = l0.y * (l0.x - l1.x) - l0.x * (l0.y - l1.y);
  let z = p.x * a + p.y*b + c;
  if(z>0){
    return +1;
  }else if(z<0){
    return -1;
  }else{
    return 0;
  }
}


function whiteOutline(){
  return `
  <filter id="whiteOutlineEffect" width="200%" height="200%" x="-50%" y="-50%">
    <feMorphology in="SourceAlpha" result="MORPH" operator="dilate" radius="1.5" />
    <feColorMatrix in="MORPH" result="WHITENED" type="matrix" values="0 0 0 0.03 0, 0 0 0 0.03 0, 0 0 0 0.03 0, 0 0 0 1 0" />
    <feMerge>
      <feMergeNode in="WHITENED" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
  `;
}
