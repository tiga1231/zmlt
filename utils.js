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
    res.magnitude = 1.0;
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

    let x1 = (rect1.left + rect1.right)/2;
    let x2 = (rect2.left + rect2.right)/2;
    if( x1 < x2){
      res.dir.x = -1 * xOverlap;
    }else{
      res.dir.x = 1 * xOverlap;
    }

    let y1 = (rect1.top + rect1.bottom)/2;
    let y2 = (rect2.top + rect2.bottom)/2;
    if( y1 < y2){
      res.dir.y = -1 * yOverlap;
    }else{
      res.dir.y = 1 * yOverlap;
    }
    // console.log([res.dir.x, res.dir.y]);


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
