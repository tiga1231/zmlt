//// export JSON
function exportJson(obj, fn='result.json'){
  let objStr = JSON.stringify(obj, null, 2);
  let dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(objStr);
  var anchor = document.getElementById('download-json');
  anchor.setAttribute('href', dataStr);
  anchor.setAttribute('download', fn);
  anchor.click();
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


function labelOverlap(labelNodes){
  let count = 0;
  let overlapMatrix = [];
  for(let i=0; i<labelNodes.length; i++){
    overlapMatrix.push([]);
    let l1 = labelNodes[i];
    l1.show = true;
  }

  let bboxes = labelNodes.map(l=>l.getBoundingClientRect());

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
    node.update = true;
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

    let other = {x: Math.random(), y: Math.random()};
    if(useInitital){
      if(node.parent === undefined || node.parent === null){
        other = {
          x: node.x, 
          y: node.y,
          xInit: node.x, 
          yInit: node.y,
        };
      }else{
        // other = node.neighbors.filter(d=>currentNodes0.has(d))[0];
        // other = allNodes.filter(d=>d.id == other)[0];
        other = allNodes[id2index[node.parent]];
      }
    }

    let count = 1;
    // if(useInitital && node.xInit !== undefined){
    //   node.x = other.x + (node.xInit - other.xInit);
    //   node.y = other.y + (node.yInit - other.yInit);
    // }else{
    //   node.x = (Math.random()-0.5)*1 + other.x;
    //   node.y = (Math.random()-0.5)*1 + other.y;
    // }
    let edges1 = allEdges.filter(e=>node.id === e.source.id || node.id === e.target.id);
    do {
      if(useInitital && node.xInit !== undefined){
        let r = 1/count;
        node.x = other.x + (node.xInit - other.xInit)*r;
        node.y = other.y + (node.yInit - other.yInit)*r;
        if(count > 1){
          node.x += (Math.random()-0.5);
          node.y += (Math.random()-0.5);
        }
      }else{
        node.x = other.x + (Math.random()-0.5);
        node.y = other.y + (Math.random()-0.5);
      }
      count+=1;
    } while(countCrossings(edges, edges1)>0);
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


function idealEdgeLengthPreservation2(links, ideal_lengths){ 
  let sumOfSquares = 0;
  for (let i = 0; i < links.length; i++) {
    let x1 = links[i].source.x;
    let y1 = links[i].source.y;
    let x2 = links[i].target.x;
    let y2 = links[i].target.y;
    let [dx, dy] = [(x1-x2), (y1-y2)];
    let dist = Math.sqrt(dx*dx + dy*dy);
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





// function isCrossed(e0, e1){
//   let p0 = e0.source;
//   let p1 = e0.target;
//   let q0 = e1.source;
//   let q1 = e1.target;
//   return (
//     signOf(q0, p0, p1)*signOf(q1, p0, p1) <= 0
//     && signOf(p0, q0, q1)*signOf(p1, q0, q1) <= 0
//   );
// }
function isCrossed(e0, e1){
  //ref: graphic gems 3, "FASTER LINE SEGMENT INTERSECTION", pg.199
  let p1 = e0.source;
  let p2 = e0.target;
  let p3 = e1.source;
  let p4 = e1.target;

  let a = {x: p2.x-p1.x, y: p2.y-p1.y};
  let b = {x: p3.x-p4.x, y: p3.y-p4.y};
  let c = {x: p1.x-p3.x, y: p1.y-p3.y};

  let denom = a.y*b.x - a.x*b.y;
  let numer = b.y*c.x - b.x*c.y;
  if(denom > 0){
    if (numer <= 0 || numer >= denom){
      return false;
    }
  }else{
    if (numer >= 0 || numer <= denom){
      return false;
    }
  }

  let numer2 = a.x*c.y - a.y*c.x;
  if(denom > 0){
    if (numer2 <= 0 || numer2 >= denom){
      return false;
    }
  }else{
    if (numer2 >= 0 || numer2 <= denom){
      return false;
    }
  }

  return true;
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
