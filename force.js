function forceEllipse(kwargs){
  let nodes = kwargs.nodes;
  let strength = kwargs.strength;
  let scales = kwargs.scales;

  function isInside(x, y, a, b){
    // e1 = {a, b, c};
    return x*x/(a*a) + y*y/(a*a/4) < 1;
  }

  function forceDir(x, y, a, b){
    let dir = {
      x: 2*x / (a*a),
      y: 2*y / (b*b),
    };
    let norm = Math.sqrt(dir.x*dir.x + dir.y*dir.y);
    dir.x /= norm;
    dir.y /= norm;
    return dir;
  }

  let force = (alpha)=>{
    let tree = d3.quadtree(nodes, (d)=>scales.sx(d.x), (d)=>scales.sy(d.y));
    
    // let beta = Math.pow(alpha, 2) * Math.pow(1-alpha, 4) * 85;
    // if(alpha < 0.5){
    //   beta = Math.max(beta, alpha);
    // }
    let n = -Math.log(alpha);
    let beta = 2/Math.sqrt(n+10);



    for(let i=0; i<nodes.length; i++){
      let ni = nodes[i].ellipse;
      ni.x = scales.sx(nodes[i].x);
      ni.y = scales.sy(nodes[i].y);
    }

    for(let i=0; i<nodes.length; i++){
      if(!nodes[i].update){
        continue;
      }
      let ni = nodes[i].ellipse;

      let marginLeft = nodes[i].bbox.width * 0.1;
      let marginTop = nodes[i].bbox.height * 2;
      let bbi = {
        left: scales.sx(nodes[i].x) - marginLeft,
        top: scales.sy(nodes[i].y) - marginTop,
      };
      bbi.right = bbi.left + nodes[i].bbox.width + marginLeft;
      bbi.bottom = bbi.top + nodes[i].bbox.height + marginTop;

      let xmin = bbi.left - nodes[i].bbox.width * 5;
      let xmax = bbi.right + nodes[i].bbox.width * 5;
      let ymin = bbi.top - nodes[i].bbox.height * 5;
      let ymax = bbi.bottom + nodes[i].bbox.height * 5;
      let neighbors = searchQuadtree(tree, (d)=>scales.sx(d.x), (d)=>scales.sy(d.y), xmin, xmax, ymin, ymax);

      for(let j of neighbors){
        if(i==j || !nodes[j].update){
          continue;
        }

        let nj = nodes[j].ellipse;

        let marginLeft = nodes[j].bbox.width * 0.1;
        let marginTop = nodes[j].bbox.height * 2;
        let bbj = {
          left: scales.sx(nodes[j].x) - marginLeft,
          top: scales.sy(nodes[j].y) - marginTop,
        };
        bbj.right = bbj.left + nodes[j].bbox.width + marginLeft;
        bbj.bottom = bbj.top + nodes[j].bbox.bottom + marginTop;

        let dij = Math.sqrt((ni.x-nj.x)*(ni.x-nj.x) + (ni.y-nj.y)*(ni.y-nj.y));
        let inside = isInside(nj.x-ni.x, nj.y-ni.y, ni.a, ni.b);
        let collide = isRectCollide(bbi, bbj);
        let dir = forceDir(nj.x-ni.x, nj.y-ni.y, ni.a, ni.b);
        let magnitude = collide ? strength : 0.15 * strength / (dij / ni.a);
        magnitude *= beta;

        let vx = magnitude * dir.x;
        let vy = magnitude * dir.y;
        nodes[j].vx += scales.sx.invert(vx) - scales.sx.invert(0);
        nodes[j].vy += scales.sy.invert(vy) - scales.sy.invert(0);
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


function forceNodeEdgeRepulsion(nodes0, edges0, enabledNodes){
  let nodes = nodes0;
  let edges = edges0;

  function distance(a, b){
    return Math.sqrt((a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y));
  }

  function forceDir(x, y, a, b){
    let dir = {
      x: 2*x / (a*a),
      y: 2*y / (b*b),
    };
    dir.x = 0;
    let norm = Math.sqrt(dir.x*dir.x + dir.y*dir.y);
    dir.x /= norm;
    dir.y /= norm;
    return dir;
  }
  

  let strength = (n,e,a,b)=>{
    let [p0,p1] = [e.source, e.target];
    let center = {
      x: (p0.x+p1.x)/2, 
      y: (p0.y+p1.y)/2
    };
    let dist1 = distance(n, center);
    let p0n = {
      x: n.x-p0.x, 
      y: n.y-p0.y, 
    };
    let r = distance(p0n, {x:0,y:0});
    let p0p1 = {
      x: p1.x-p0.x, 
      y: p1.y-p0.y,
    };
    let proj = (p0n.x*p0p1.x + p0n.y*p0p1.y) / distance(p0p1, {x:0,y:0});
    if(proj < 0 || proj > 2*Math.sqrt(a*a-b*b)){
      return 0;
    }else{
      let dist2 = Math.sqrt(r*r - proj*proj);
      let s = 20/Math.sqrt(0.0001+dist2/a);
      return s;
    }
  };

  let force = (alpha)=>{
    let beta = Math.pow((1-alpha), 7) * Math.pow(alpha, 3) * 450;


    for(let j=0; j<edges.length; j++){
      let e = edges[j];
      let p0 = e.source;
      let p1 = e.target;
      if(!enabledNodes.has(p0.id) || !enabledNodes.has(p1.id)){
        continue;
      }
      let dx = p1.x - p0.x;
      let dy = p1.y - p0.y;
      //ellipse parameters
      let c = Math.sqrt(dx*dx+dy*dy)/2;
      let b = c*0.001;
      let a = Math.sqrt(b*b+c*c);
      //rotational and translational params
      let tx = (p0.x + p1.x)/2;
      let ty = (p0.y + p1.y)/2;
      let r = Math.sqrt(dx*dx+dy*dy);
      let cos = dx/r;
      let sin = dy/r;

      for(let i=0; i<nodes.length; i++){

        // if(i!==0 || j!==0){
        //   break;
        // }

        let n = nodes[i];
        if(!enabledNodes.has(n.id)){
          continue;
        }
        if(Math.random()>0.8) continue;


        if(n.id !== p0.id && n.id !== p1.id){
          let p = {
            x: (n.x - tx),
            y: (n.y - ty),
          };
          [p.x, p.y] = [p.x * cos + p.y * (-sin), p.x * sin + p.y * cos];
          let dir = forceDir(p.x, p.y, a, b);
          [dir.x, dir.y] = [dir.x * cos + dir.y * sin, dir.x * (-sin) + dir.y * cos];
          let k = strength(n,e,a,b);

          n.vx += beta * k * dir.x / (n.level*n.level+1);
          n.vy += beta * k * dir.y / (n.level*n.level+1);

          // p0.vx -= 0.5*alpha * k * dir.x / e.source.level;
          // p0.vy -= 0.5*alpha * k * dir.y / e.source.level;
          // p1.vx -= 0.5*alpha * k * dir.x / e.target.level;
          // p1.vy -= 0.5*alpha * k * dir.y / e.target.level;
        }

      }
    }
    return;
  };

  force.initialize = (nodes)=>{
    nodes = nodes;
    return force;
  };

  force.strength = (f)=>{
    strength = f;
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


function forcePre(decay=0.4){
  let force = (alpha)=>{
    for(let n of force.nodes){
      // n.vx = n.vx0 !== undefined ? n.vx0*(1-decay) : n.vx;
      // n.vy = n.vy0 !== undefined ? n.vy0*(1-decay) : n.vy;
      n.vx = 0;
      n.vy = 0;
      // n.fx = null;
      // n.fy = null;
    }
  };

  force.initialize = (nodes)=>{
    force.nodes = nodes;
    return force;
  };

  return force;
}




function forcePost(edges, radius, enabledNodes){
  let getX = (d)=>d.x;
  let getY = (d)=>d.y;
  let updateNeighbors = (nodes, getX, getY, r)=>{
    force.tree2 = d3.quadtree(nodes, getX, getX);
      for(let n of nodes){
        n.neighbors = new Set(
          searchQuadtree(force.tree2, getX, getY, n.x-r, n.x+r, n.y-r, n.y+r)
        );
      }
  };

  let forcePost_ = (alpha)=>{
    let nodes = force.nodes.filter(d=>d.update);
    let edges = force.edges.filter(e=>enabledNodes.has(e.source.id) && enabledNodes.has(e.target.id));

    let sampleSize = 1;
    let niter = Math.ceil(nodes.length / sampleSize);

    for(let n of nodes){
      n.x0 = n.x;
      n.y0 = n.y;
      n.vx0 = n.vx;
      n.vy0 = n.vy;
      n.vx = 0;
      n.vy = 0;
    }
    for(let iter=0; iter<niter; iter++){
      // look ahead//TODO binary search
      let steps = 12;
      let t = 1.0;
      let crossings;
      while(steps>0){
        for(let i=sampleSize*iter; i<sampleSize*(iter+1); i++){
          let n = nodes[i];
          if(n.vx0 !== 0 || n.vy0 !== 0){
            n.x = n.x0 + n.vx0 * t;
            n.y = n.y0 + n.vy0 * t;
          }
        }

        crossings = 0;
        for(let i=sampleSize*iter; i<sampleSize*(iter+1); i++){
          crossings += countCrossings(edges, nodes[i]);
        }

        if(crossings == 0){
          break;
        }else{
          t *= 0.8;
        }
        steps -= 1;
      }
      // console.log(crossings);

      if(steps == 0){
        // console.log('reseting nodes in', samples);
        for(let i=sampleSize*iter; i<sampleSize*(iter+1); i++){
          let n = nodes[i];
          n.x = n.x0;
          n.y = n.y0;
        }
      }
    }

    // if(alpha < 0.5){
    //   for(let i=0; i<nodes.length; i++){
    //     if(!nodes[i].update){
    //       continue;
    //     }
    //     let n = nodes[i];
    //     n.fx = n.x0;
    //     n.fy = n.y0;
    //   }
    // }
    

    // if(force.tree2 === undefined || Math.random()>0){
    //   updateNeighbors(force.nodes, getX, getX, radius);
    // }

    // let nodes = force.nodes;
    // nodes.forEach((n)=>{
    //   n.x0 = n.x;
    //   n.y0 = n.y;
    //   n.vx0 = n.vx;
    //   n.vy0 = n.vy;
    //   n.vx = 0;
    //   n.vy = 0;
    // })

    // let samples = _.sample(nodes.filter(d=>d.update), nodes.length); //a random shuffle
    // for(let n of samples){
    //   if(!n.update){
    //     continue;
    //   }

    //   let steps = 12;
    //   let t = 1.0;
    //   // let neighbors = n.neighbors;
    //   // let neighbors = new Set(Array.from(n.neighbors).filter(i=>nodes[i].update));
    //   let neighbors = new Set(samples.map(d=>d.index));
    //   let edges = force.edges.filter(e=>neighbors.has(e.source.index) || neighbors.has(e.target.index));

    //   let crossings;
    //   while(steps>0){
    //     n.x = n.x0 + n.vx0 * t;
    //     n.y = n.y0 + n.vy0 * t;

    //     crossings = countCrossings(edges, n);
    //     if(crossings == 0){
    //       break;
    //     }else{
    //       t *= 0.8;
    //     }
    //     steps -= 1;
    //   }
    //   console.log(crossings);

    //   if(steps == 0){
    //     console.log('reseting node', n);
    //     n.x = n.x0;
    //     n.y = n.y0;
    //   }
    // }
    
    
  };

  let force = forcePost_;
  force.initialize = (nodes)=>{
    force.nodes = nodes;
    force.edges = edges;
    return force;
  };

  return force;
}




function forceStress(nodes, edges, enabledNodes){
  
  let sampleSize;
  let strength = (e)=>1;
  let distance = (e)=>1;
  let schedule = (a)=>a;

  let force = (alpha)=>{
    alpha = schedule(alpha);
    // for(let e of edges){
    // 
    //stochastic
    for(let i=0; i<nodes.length/3; i++){
      let e = edges[randint(0,edges.length)];

      if(enabledNodes.has(e.source.id) && enabledNodes.has(e.target.id)){
        let w = strength(e);
        let d = distance(e);

        let p0 = [e.source.x, e.source.y];
        let p1 = [e.target.x, e.target.y];

        let currentDist = Math.sqrt(Math.pow(p0[0]-p1[0], 2)+Math.pow(p0[1]-p1[1], 2));
        let dir = numeric.div([p1[0]-p0[0], p1[1]-p0[1]], Math.max(currentDist, 1e-4));

        let coef = (currentDist - d) * w;
        coef = Math.sign(coef) * Math.min(Math.abs(coef), Math.max(1e-4, currentDist*0.4));

        let [dx, dy] = numeric.mul(coef, dir);
        e.source.vx += dx * alpha;
        e.source.vy += dy * alpha;
        e.target.vx += -dx * alpha;
        e.target.vy += -dy * alpha;

      }
    }
  }

  force.initialize = ()=>{
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
