importScripts("lib/underscore-min.js");


function forceRestoreCache(nodes){
  let force = ()=>{
    for(let n of nodes){
      if(n.cache !== undefined){
        n.vx += n.cache.vx;
        n.vy += n.cache.vy;
        n.cache.vx = 0;
        n.cache.vy = 0;
      }
    }
  };
  force.initialize = (newNodes)=>{
    nodes = newNodes;
  };
  return force;
}


function forceCache(nodes){
  let force = ()=>{
    for(let n of nodes){
      if(n.cache === undefined){
        n.cache = {
          vx: n.vx, 
          vy: n.vy
        };
      }else{
        n.cache.vx += n.vx;
        n.cache.vy += n.vy;
      }
      n.vx = 0;
      n.vy = 0;
    }
  };

  force.initialize = (newNodes)=>{
    nodes = newNodes;
  };
  return force;
}

function forceScaleY(nodes, scaleAccessor){
  let force = ()=>{
    for(let n of nodes){
      let k = scaleAccessor(n);
      n.y *= k;
      n.vy *= 1/k;
    }
  };

  force.initialize = (newNodes)=>{
    nodes = newNodes;
  };
  return force;
}


function forceEllipse(kwargs){
  let nodes = kwargs.nodes;
  let strength = kwargs.strength;
  let scales = kwargs.scales;

  function isInside(x, y, a, b){
    // e1 = {a, b, c};
    return x*x/(a*a) + y*y/(b*b) < 1;
  }

  function forceDir(x, y, a, b){
    let dir = {
      x: x / (a*a),
      y: y / (b*b),
    };
    let norm = Math.sqrt(dir.x*dir.x + dir.y*dir.y);
    dir.x /= norm;
    dir.y /= norm;
    return dir;
  }

  let force = (alpha)=>{
    let tree = d3.quadtree(nodes, (d)=>scales.sx(d.x), (d)=>scales.sy(d.y));
    let n = -Math.log(alpha);
    let beta = alpha > 0.5 ? (1-alpha) * 15/Math.sqrt(n+5) : 7.5/Math.sqrt(n+5);


    for(let i=0; i<nodes.length; i++){
      let n = nodes[i];
      let ni = n.ellipse;
      ni.x = scales.sx(n.x);
      ni.y = scales.sy(n.y);
      
    }

    for(let i=0; i<nodes.length; i++){
      if(!nodes[i].update){
        continue;
      }
      let ni = nodes[i].ellipse;

      let m = 1;
      let xmin = nodes[i].bbox.left - nodes[i].bbox.width * m;
      let xmax = nodes[i].bbox.right + nodes[i].bbox.width * m;
      let ymin = nodes[i].bbox.top - nodes[i].bbox.height * m;
      let ymax = nodes[i].bbox.bottom + nodes[i].bbox.height * m;
      let neighbors = searchQuadtree(tree, (d)=>scales.sx(d.x), (d)=>scales.sy(d.y), xmin, xmax, ymin, ymax);
      for(let j of neighbors){
        if(i==j || !nodes[j].update){
          continue;
        }
        let nj = nodes[j].ellipse;
        let dx = ni.x-nj.x;
        let dy = ni.y-nj.y;
        let dij = Math.sqrt(Math.pow(dx/ni.a, 2) + Math.pow(dy/ni.b, 2));

        // let [x,y] = [nj.x-ni.x, nj.y-ni.y];
        // let inside = (
        //   isInside(x-nj.a, y-nj.b, ni.a, ni.b)
        //   || isInside(x-nj.a, y+nj.b, ni.a, ni.b)
        //   || isInside(x+nj.a, y-nj.b, ni.a, ni.b)
        //   || isInside(x+nj.a, y+nj.b, ni.a, ni.b)
        // );
        let collide = isRectCollide(nodes[i].bbox, nodes[j].bbox);
        let dir = forceDir(nj.x-ni.x, nj.y-ni.y, ni.a, ni.b);
        // let magnitude = inside||collide ? strength/(Math.pow(dij,2)+0.1) : 0.05 * strength / dij;
        let magnitude = collide ? strength/(Math.pow(dij,2)+1) : 0.01*strength/(Math.pow(dij,2)+10);
        magnitude *= beta;

        let vx = magnitude * dir.x;
        let vy = magnitude * dir.y;

        vx = scales.sx.invert(vx) - scales.sx.invert(0);
        vy = scales.sy.invert(vy) - scales.sy.invert(0);
        nodes[j].vx += vx;
        nodes[j].vy += vy;
        nodes[i].vx -= vx;
        nodes[i].vy -= vy;
      }
    }
  };


  force.initialize = (newNodes)=>{
    nodes = newNodes;
    for(let n of nodes){
      n.ellipse = {
        b: n.bbox.height/2 * kwargs.b,
        c: n.bbox.width/2 * kwargs.c,
      };
      n.ellipse.a = Math.sqrt(n.ellipse.b*n.ellipse.b + n.ellipse.c*n.ellipse.c);
    }
    return force;
  };


  force.strength = (s)=>{
    strength = s;
    return force;
  };
  return force;
}


function forceNodeEdgeRepulsion(nodes0, edges0, enabledNodes, strength0=1){
  let nodes = nodes0;
  let edges = edges0;

  function distance(a, b={x:0, y:0}){
    return Math.sqrt((a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y));
  }

  function forceDir(x, y, a2, b2){
    // let dir = {
    //   x: x / a2,
    //   y: y / b2,
    // };
    // let norm = Math.sqrt(dir.x*dir.x + dir.y*dir.y);
    // // let norm = Math.abs(dir.x) + Math.abs(dir.y);
    // dir.x /= norm;
    // dir.y /= norm;
    // dir.x = 0;
    // console.log(dir.y);
    let dir = {x: 0, y: Math.sign(y)};
    return dir;
  }
  

  let strength = (n, a, b, c)=>{
    // let c = Math.sqrt(a*a-b*b);
    // let p = {x: n.x/a, y: n.y/b};
    // let r = p.x*p.x + p.y*p.y;
    // let y2 = n.y*n.y;
    // let d = Math.sqrt(Math.pow(n.x-c,2)+y2) + Math.sqrt(Math.pow(n.x+c,2)+y2);
    // let a2 = 2*a;
    let ax = Math.abs(n.x);
    let ay = Math.abs(n.y);
    // if(d > a2){
    if(ay > a || ax > a){
      return 0;
    }else{
      // let c2 = c*2;
      // return 10*c2/(y2+c2/2);
      return strength0 * c/(ay+c);
    }
  };

  let force = (alpha)=>{
    // let n = -Math.log(alpha);
    let beta = Math.pow(alpha, 0.5);
    // let beta = Math.pow((1-alpha), 7) * Math.pow(alpha, 3) * 450;
    // let beta = alpha > 0.5 ? (1-alpha) * 15/Math.sqrt(n+10) : 7.5/Math.sqrt(n+10);

    let tree = d3.quadtree(nodes, d=>d.x, d=>d.y);

    for(let j=0; j<edges.length; j++){
      let e = edges[j];
      let e0 = e.source;
      let e1 = e.target;

      // if(!enabledNodes.has(e0.id) || !enabledNodes.has(e1.id)){
      //   continue;
      // }


      //rotational and translational params
      let center = {
        x: (e0.x+e1.x)/2, 
        y: (e0.y+e1.y)/2
      };
      let dx = e1.x - e0.x;
      let dy = e1.y - e0.y;
      let r = Math.sqrt(dx*dx+dy*dy);
      let cos = dx/r;
      let sin = dy/r;

      //ellipse parameters
      let c = Math.sqrt(dx*dx+dy*dy)/2;
      let b = c/2;
      let b2 = b*b;
      let a = Math.sqrt(b2+c*c);
      let a2 = a*a;

      let f0 = translate(e0, -center.x, -center.y);
      let f1 = translate(e1, -center.x, -center.y);
      f0 = rotate(f0, cos, -sin);
      f1 = rotate(f1, cos, -sin);


      let xmin = Math.min(e0.x, e1.x) - r;
      let xmax = Math.max(e0.x, e1.x) + r;
      let ymin = Math.min(e0.y, e1.y) - r;
      let ymax = Math.max(e0.y, e1.y) + r;
      e.neighbors = new Set(
        searchQuadtree(tree,  
          d=>d.x, d=>d.y, 
          xmin, xmax, ymin, ymax
        )
      );


      // for(let i=0; i<nodes.length; i++){
      //   let n = nodes[i];
      //   n.vxTmp = 0;
      //   n.vyTmp = 0;
      // }
      for(let i of e.neighbors){
      //   i = id2index[i];
        let n = nodes[i];

        // if(!enabledNodes.has(n.id)){
        // if(!n.update){
        //   continue;
        // }
        if(n.id !== e0.id && n.id !== e1.id){
          p = translate(n, -center.x, -center.y);
          p = rotate(p, cos, -sin);
          
          // let k = strength(n,e,a,b);
          let k = strength(p, a, b, c);
          if(k>0){
            let dir = forceDir(p.x, p.y, a2, b2);
            dir = rotate(dir, cos, sin);
            let bk = beta * k;
            let bkx = bk * dir.x;
            let bky = bk * dir.y;

            //node movement
            n.vx += bkx / n.perplexity;
            n.vy += bky / n.perplexity;

            //edge movement
            let sbkx = 0.7*bkx;
            let sbky = 0.7*bky;
            e0.vx -= sbkx / e0.perplexity;
            e0.vy -= sbky / e0.perplexity;
            e1.vx -= sbkx / e1.perplexity;
            e1.vy -= sbky / e1.perplexity;
          }
        }
      }
      // for(let i=0; i<nodes.length; i++){
      //   let n = nodes[i];
      //   n.vx += Math.sign(n.vxTmp) * Math.min(1, Math.abs(n.vxTmp)) / n.perplexity;
      //   n.vy += Math.sign(n.vyTmp) * Math.min(1, Math.abs(n.vyTmp)) / n.perplexity;
      //   n.vxTmp = undefined;
      //   n.vyTmp = undefined;
      // }
    }

  };

  force.initialize = (nodes1, edges1)=>{
    nodes = nodes1;
    edges = edges1;
    return force;
  };


  return force;
}

function forceCompact(){
  let strength = 0.1;
  let force = (alpha)=>{
    for(let n of force.nodes){
      n.norm = Math.sqrt(n.x*n.x + n.y*n.y);
      let dx = n.x / n.norm;
      let dy = n.y / n.norm;
      n.vx -= strength * alpha * dx * Math.pow(n.norm, 1);
      n.vy -= strength * alpha * dy * Math.pow(n.norm, 1);
    }
  };

  force.initialize = (nodes)=>{
    force.nodes = nodes;
    return force;
  };

  force.strength = (s)=>{
    strength = s;
    return force;
  };

  return force;
}


function forceLabelCollide(
labels0, scales, l2z, simulation, 
marginLeft, marginTop
){

  // let x = (d)=>{
  //   try{
  //     let bb = d.getBoundingClientRect();
  //     return bb.x + bb.width/2;
  //   }catch(err){
  //     console.warn(err);
  //     console.log(d);
  //     return 0;
  //   }
  // };
  // let y = (d)=>{
  //   let bb = d.getBoundingClientRect();
  //   return bb.y + bb.height/2;
  // };
  let x = (d)=>d.x;
  let y = (d)=>d.y;
  let sx0 = scales.sx;
  let sy0 = scales.sy;
  // let domain = scales.sx.domain();
  // let range = scales.sx.range();
  // let sxFactor = Math.abs( (range[1]-range[0]) / (domain[1]-domain[0]));
  let levelRange = d3.extent(labels0, d=>d.level);
  // let lz = function(l){
  //   // mapping: level => zoom-factor 
  //   let z = l;
  //   return z;
  // }
  let strength = 1.5;
  let forceLabelCollide_ = (alpha)=>{
    //consider the current scale
    let domain = scales.sx.domain();
    let range = scales.sx.range();
    let sxFactor = Math.abs( (range[1]-range[0]) / (domain[1]-domain[0]));

    // if(force.tree === undefined || Math.random()>1/10){
    //   //train on shown text only
    //   let labels = labels0;//.filter(d=>getStyle(d, 'opacity')>0.5);
    //   force.tree = d3.quadtree(labels, x, y);
    // }

    // for(let level=levelRange[0]; level<=levelRange[1]; level++){
    //   let zoomFactor = l2z(level);
    for(let level=0; level<1; level++){
      let zoomFactor = 1;

      //only consider labels that is <= certain level
      let labels = labels0.filter(l=>l2z(l.level)<=zoomFactor);
      let vx = Array(force.nodes.length).fill(0);
      let vy = Array(force.nodes.length).fill(0);

      for(let i=0; i<labels.length; i++){
        let li = labels0[labels[i].index];
        let bbi = {
          x: li.x * sxFactor * zoomFactor,
          y: li.y * sxFactor * zoomFactor,
          width: li.bbox.width,
          height: li.bbox.height,
        };
        bbi.left = bbi.x - bbi.width/2 - bbi.width*marginLeft;
        bbi.right = bbi.x + bbi.width/2 + bbi.width*marginLeft;
        bbi.top = bbi.y - bbi.height/2 - bbi.height*marginTop;
        bbi.bottom = bbi.y + bbi.height/2 + bbi.height*marginTop;

        // //neighbors
        // let xmin = li.x - 100 / sxFactor / zoomFactor; //screen coord
        // let xmax = li.x + 100 / sxFactor / zoomFactor;
        // let ymin = li.y - 100 / sxFactor / zoomFactor;
        // let ymax = li.y + 100 / sxFactor / zoomFactor;
        // let neighbors = searchQuadtree(force.tree, x, y, xmin, xmax, ymin, ymax);
        // // console.log(neighbors.length);
        // for(let j of neighbors){
        //   if(j == labels[i].index) continue;
        //   let lj = labels0[j];
        //   let bbj = {
        //     x: lj.x * sxFactor * zoomFactor,
        //     y: lj.y * sxFactor * zoomFactor,
        //     width:  lj.bbox.width,
        //     height: lj.bbox.height,
        //   };
        //   bbj.left = bbj.x - bbj.width/2 - bbj.width*marginLeft;
        //   bbj.right = bbj.x + bbj.width/2 + bbj.width*marginLeft;
        //   bbj.top = bbj.y - bbj.height/2 - bbj.height*marginTop;
        //   bbj.bottom = bbj.y + bbj.height/2 + bbj.height*marginTop;
        //   let force = rectCollide(bbi, bbj);
        //   if(force.magnitude > 0){
        //     vx[li.index] += force.dir.x * force.magnitude; //in pixels
        //     vy[li.index] += force.dir.y * force.magnitude;
        //     vx[lj.index] -= force.dir.x * force.magnitude;
        //     vy[lj.index] -= force.dir.y * force.magnitude;
        //   }
        // }

        // //brute force
        for(let j=i+1; j<labels.length; j++){
          // if(i==j) continue;
          let lj = labels0[labels[j].index];
          let bbj = {
            x: lj.x * sxFactor * zoomFactor,
            y: lj.y * sxFactor * zoomFactor,
            width: lj.bbox.width,
            height: lj.bbox.height,
          };
          bbj.left = bbj.x - bbj.width/2 - bbj.width*marginLeft;
          bbj.right = bbj.x + bbj.width/2 + bbj.width*marginLeft;
          bbj.top = bbj.y - bbj.height/2 - bbj.height*marginTop;
          bbj.bottom = bbj.y + bbj.height/2 + bbj.height*marginTop;

          let force = rectCollide(bbi, bbj);
          if(force.magnitude > 0){
            vx[i] += force.dir.x * force.magnitude;
            vy[i] += force.dir.y * force.magnitude;
            vx[j] -= force.dir.x * force.magnitude;
            vy[j] -= force.dir.y * force.magnitude;
          }
        }

      }
      console.log('alpha', alpha);
      let beta = Math.pow((1-alpha), 7) * Math.pow(alpha, 3) * 450;
      if(alpha < 0.5){
        beta = Math.max(beta, alpha);
      }
      // beta = 1;

      for(let i=0; i<labels.length; i++){
        //at most [strength] pixel each iteration
        vx[i] = beta * Math.sign(vx[i]) * Math.min(strength, Math.abs(vx[i])); 
        vy[i] = beta * Math.sign(vy[i]) * Math.min(strength, Math.abs(vy[i]));
        // vx[i] *= 1 / sxFactor;
        // vy[i] *= 1 / sxFactor;
        force.nodes[i].vx += sx0.invert(vx[i]) - sx0.invert(0);
        force.nodes[i].vy += sy0.invert(vy[i]) - sy0.invert(0);
      }
      // console.log(force.nodes[0].vy);
    }
  };

  let force = forceLabelCollide_;

  force.initialize = (nodes)=>{
    force.nodes = nodes;
    return force;
  };


  return force;
}



function forceDummy(){
  let forceDummy_ = (alpha)=>{
  };
  let force = forceDummy_;

  force.initialize = (nodes)=>{
    force.nodes = nodes;
    return force;
  };
  return force;
}


function forcePre(scales, rotate=true){
  let force = (alpha)=>{
    if(rotate){
      for(let n of force.nodes){
        [n.x0, n.y0] = [n.x, n.y];
        [n.vx0, n.vy0] = [n.vx, n.vy];
      }

      let thetaBest = 0;
      // if(true){
      // // if(0.3 < alpha && alpha < 0.9 && Math.random() < 0.5){
      //   let thetas = d3.range(18).map(i=>(i+(Math.random()-0.5))/18 * Math.PI);
      //   let metricBest = -Infinity;
      //   for(let theta of thetas){
      //     //rotate
      //     let [cos, sin] = [Math.cos(theta), Math.sin(theta)];
      //     for(let n of force.nodes){
      //       [n.x, n.y] = [cos*n.x0-sin*n.y0, sin*n.x0+cos*n.y0];
      //       updateBboxXY(n, n.bbox, scales);
      //     }
      //     ////eval & choose best
      //     let bbox = force.nodes.map(d=>d.bbox);
      //     let [s, compactness] = areaUtilization(bbox);

      //     if(compactness > metricBest){
      //       thetaBest = theta;
      //       metricBest = compactness;
      //     }
      //   }
      //   console.log(
      //     'alpha:', alpha.toFixed(2), 
      //     'rot:', (thetaBest/(Math.PI)*180).toFixed(2), 
      //     'CM:', metricBest.toFixed(6)
      //   );
      // }

      let [cos, sin] = [Math.cos(thetaBest), Math.sin(thetaBest)];
      for(let n of force.nodes){
        [n.x, n.y] = [cos*n.x0-sin*n.y0, sin*n.x0+cos*n.y0];
        [n.vx, n.vy] = [cos*n.vx0-sin*n.vy0, sin*n.vx0+cos*n.vy0];
      }
    }

    for(let n of force.nodes){
      updateBboxXY(n, n.bbox, scales);
    }



    
  };


  force.initialize = (nodes)=>{
    force.nodes = nodes;
    return force;
  };

  return force;
}




function forcePost(nodes, edges){

  let forcePost_ = (alpha)=>{
    
    for(let n of nodes){
      [n.x0, n.y0] = [n.x, n.y];
      [n.vx0, n.vy0] = [n.vx, n.vy];
    }

    for(let n of _.shuffle(nodes)){
      let edges1 = edges.filter(e=>n.id === e.source.id || n.id === e.target.id);
      let t = 1.0;
      let steps = 12;
      while(steps > 0){
        n.x = n.x0 + n.vx;
        n.y = n.y0 + n.vy;
        let crossings = countCrossings(edges, edges1);
        if(crossings == 0){
          break;
        }else{
          n.vx *= 0.8;
          n.vy *= 0.8;
        }
        steps -= 1;
      }
      if(steps == 0){
        n.vx = 0;
        n.vy = 0;
        n.x = n.x0;
        n.y = n.y0;
      }
    }

    for(let n of nodes){
      [n.x, n.y] = [n.x0, n.y0];
      // [n.x, n.y] = [n.x0+n.vx, n.y0+n.vy];
      // [n.vx, n.vy] = [0, 0];
    }

  };

  let force = forcePost_;
  force.initialize = (nodes1, edges1)=>{
    nodes = nodes1;
    edges = edges1;
    return force;
  };

  return force;
}




function forceStress(nodes, edges, nSample, stochastic=true){
  
  let sampleSize;
  let strength = (e)=>1;
  let distance = (e)=>1;
  let schedule = (a)=>Math.sqrt(a);
  // let schedule = (a)=>0.8;
  if(nSample === undefined){
    nSample = nodes.length * 6;
  }
  let oneIter = (e, alpha)=>{
    let w = strength(e);
    let d = distance(e);
    let p0 = [e.source.x, e.source.y];
    let p1 = [e.target.x, e.target.y];

    let currentDist = Math.sqrt(
      Math.pow(p0[0]-p1[0], 2)
      + Math.pow(p0[1]-p1[1], 2)
    );

    let dir = numeric.div([p1[0]-p0[0], p1[1]-p0[1]], Math.max(currentDist, 1));
    let coef = (currentDist - d) * w;
    coef = Math.sign(coef) * Math.min(
      Math.abs(coef), 
      currentDist*0.1,
      1,
    );
    
    let [dx, dy] = numeric.mul(coef, dir);
    let vx = dx * alpha;
    let vy = dy * alpha;
    e.source.vx += vx;
    e.source.vy += vy;
    e.target.vx += -vx;
    e.target.vy += -vy;
  }
  let force = (alpha)=>{
    alpha = schedule(alpha);
    if(stochastic){
      for(let i=0; i<Math.min(nSample, edges.length); i++){
        let e = edges[randint(0,edges.length)];
        oneIter(e, alpha);
      }
    }else{
      for(let e of edges){
        oneIter(e, alpha);
      }
    }
  }

  force.initialize = (edges1)=>{
    edges = edges1;
    return force;
  };

  force.distance = (accessor)=>{
    distance = accessor;
    return force;
  };

  force.strength = (accessor)=>{
    strength = accessor;
    return force;
  };

  force.schedule = (f)=>{
    schedule = f;
    return force;
  };

  return force;
}



function updateBboxXY(d, bbox, scales){
  let x = scales.sx(d.x);
  let y = scales.sy(d.y);
  d.bbox = {
    width: bbox.width,
    height: bbox.height,
    
    left: x - bbox.width/2,
    right: x + bbox.width/2,

    top: y - bbox.height/2,
    bottom: y + bbox.height/2,
  };
  d.bbox.x = d.bbox.left;
  d.bbox.y = d.bbox.top;
}
