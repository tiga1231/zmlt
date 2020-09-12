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


function forceLabelCollide(labels0, scales, simulation, marginLeft, marginTop){

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
  let strength = 1;
  let domain = scales.sx.domain();
  let range = scales.sx.range();
  let scalingFactor = Math.abs((range[1]-range[0]) / (domain[1]-domain[0]));
  let levelRange = d3.extent(labels0, d=>d.level);
  let lz = function(l){
    // mapping: level => zoom-factor 
    let z = l;
    return z;
  }
  let forceLabelCollide_ = (alpha)=>{
    if(force.tree === undefined || Math.random()>0.0){
      //train on shown text only
      let labels = labels0;//.filter(d=>getStyle(d, 'opacity')>0.5);
      force.tree = d3.quadtree(labels, x, y);
    }
    //assuming nodeLevel == zoomLevel
    for(let level=levelRange[0]; level<=levelRange[1]; level++){
      let zoomFactor = lz(level);
      //only consider labels that is <= certain level
      let labels = labels0.filter(l=>lz(l.level)<=zoomFactor);
      let vx = Array(force.nodes.length).fill(0);
      let vy = Array(force.nodes.length).fill(0);

      for(let i=0; i<labels.length; i++){
        let li = labels0[labels[i].index];
        let bbi = {
          x: li.x,
          y: li.y,
          width: 1/(zoomFactor*scalingFactor) * li.bbox.width,
          height: 1/(zoomFactor*scalingFactor) * li.bbox.height,
        };
        bbi.left = bbi.x - bbi.width/2 - bbi.width*marginLeft;
        bbi.right = bbi.x + bbi.width/2 + bbi.width*marginLeft;
        bbi.top = bbi.y - bbi.height/2 - bbi.height*marginTop;
        bbi.bottom = bbi.y + bbi.height/2 + bbi.height*marginTop;

        let xmin = li.x - bbi.width*15; //screen coord width to data coord
        let xmax = li.x + bbi.width*15;
        let ymin = li.y - bbi.height*25;
        let ymax = li.y + bbi.height*25;

        let neighbors = searchQuadtree(force.tree, x, y, xmin, xmax, ymin, ymax);
        // console.log(neighbors.length);
        for(let j of neighbors){
          if(j == labels[i].index) continue;
          let lj = labels0[j];
          // let j = n.i;
          let bbj = {
            x: lj.x,
            y: lj.y,
            width: 1/(zoomFactor*scalingFactor) * lj.bbox.width,
            height: 1/(zoomFactor*scalingFactor) * lj.bbox.height,
          };

          bbj.left = bbj.x - bbj.width/2 - bbj.width*marginLeft;
          bbj.right = bbj.x + bbj.width/2 + bbj.width*marginLeft;
          bbj.top = bbj.y - bbj.height/2 - bbj.height*marginTop;
          bbj.bottom = bbj.y + bbj.height/2 + bbj.height*marginTop;


          let force = rectCollide(bbi, bbj);
          if(force.magnitude > 0){
            vx[li.index] += force.dir.x * force.magnitude;
            vy[li.index] += force.dir.y * force.magnitude;
            vx[lj.index] -= force.dir.x * force.magnitude;
            vy[lj.index] -= force.dir.y * force.magnitude;
          }
        }
        // // //brute force
        // for(let j=i+1; j<labels.length; j++){
        //   let lj = labels0[labels[j].index];
        //   let bbj = {
        //     x: lj.x,
        //     y: lj.y,
        //     width: 1/(zoomFactor*scalingFactor) * lj.bbox.width,
        //     height: 1/(zoomFactor*scalingFactor) * lj.bbox.height,
        //   };
        //   bbj.left = bbj.x - bbj.width/2;
        //   bbj.right = bbj.x + bbj.width/2;
        //   bbj.top = bbj.y - bbj.height/2;
        //   bbj.bottom = bbj.y + bbj.height/2;
        //   let force = rectCollide(bbi, bbj);
        //   if(force.magnitude > 0){
        //     vx[i] += force.dir.x * force.magnitude;
        //     vy[i] += force.dir.y * force.magnitude;
        //     vx[j] -= force.dir.x * force.magnitude;
        //     vy[j] -= force.dir.y * force.magnitude;
        //   }
        // }
      }

      for(let i=0; i<labels.length; i++){
        vx[i] *= strength;
        vy[i] *= strength;
        vx[i] = Math.sign(vx[i]) * Math.min(1, Math.abs(vx[i])); //at most 5 pixel each iteration
        vy[i] = Math.sign(vy[i]) * Math.min(1, Math.abs(vy[i])); //at most 5 pixel each iteration
        force.nodes[i].vx += scales.sx.invert(vx[i]) - scales.sx.invert(0);
        force.nodes[i].vy += scales.sy.invert(vy[i]) - scales.sy.invert(0);
      }
    }
  };

  let force = forceLabelCollide_;
  force.strength = (s)=>{
    strength = s;
  };

  force.initialize = (nodes)=>{
    force.nodes = nodes;
    return force;
  };

  force.strength = (s)=>{
    force.strength = s;
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
      n.vx = n.vx0 !== undefined ? n.vx0*(1-decay) : n.vx;
      n.vy = n.vy0 !== undefined ? n.vy0*(1-decay) : n.vy;
    }
  };

  force.initialize = (nodes)=>{
    force.nodes = nodes;
    return force;
  };

  return force;
}




function forcePost(edges, radius){
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
    
    // if(ratio < 1){
    //   sampleSize = ratio * this.nodes.length;
    // }else{
    //   sampleSize = Math.ceil(ratio);
    // }
    // niter = niter || Math.max(1, this.nodes.length / sampleSize);
    // let nodes = this.nodes;//.filter(d=>d.vx!==0 || d.vy!==0);
    // for(let n of nodes){
    //   n.x0 = n.x;
    //   n.y0 = n.y;
    //   n.vx0 = n.vx;
    //   n.vy0 = n.vy;
    //   n.vx = 0;
    //   n.vy = 0;
    // }
    // for(let iter=0; iter<niter; iter++){
    //   let samples = _.sample(nodes, sampleSize);
    //   // look ahead//TODO binary search
    //   let steps = 12;
    //   let t = 2.0;
    //   while(steps>0){
    //     for(let n of samples){
    //       if(n.vx0 !== 0 || n.vy0 !== 0){
    //         n.x = n.x0 + n.vx0 * t;
    //         n.y = n.y0 + n.vy0 * t;
    //       }
    //     }
    //     let crossings = countCrossings(this.edges, samples);
    //     if(crossings == 0){
    //       break;
    //     }else{
    //       t *= 0.8;
    //     }
    //     steps -= 1;
    //   }
    //   if(steps == 0){
    //     for(let n of nodes){
    //       n.x = n.x0;
    //       n.y = n.y0;
    //     }
    //   }
    // }

    if(force.tree2 === undefined || Math.random()>0){
      updateNeighbors(force.nodes, getX, getX, radius);
    }

    let nodes = force.nodes;
    nodes.forEach((n)=>{
      n.x0 = n.x;
      n.y0 = n.y;
      n.vx0 = n.vx;
      n.vy0 = n.vy;
      n.vx = 0;
      n.vy = 0;
    })

    let samples = _.sample(nodes, nodes.length); //a random shuffle
    for(let n of samples){
      let steps = 12;
      let t = 1.0;
      let neighbors = n.neighbors;

      while(steps>0){
        n.x = n.x0 + n.vx0 * t;
        n.y = n.y0 + n.vy0 * t;

        // console.log(neighbors);
        let edges = force.edges.filter(e=>neighbors.has(e.source.index) || neighbors.has(e.target.index));
        let crossings = countCrossings(edges, n);
        if(crossings == 0){
          break;
        }else{
          t *= 0.8;
        }
        steps -= 1;
      }

      if(steps == 0){
        n.x = n.x0;
        n.y = n.y0;
      }

    }
  };

  let force = forcePost_;
  force.initialize = (nodes)=>{
    force.nodes = nodes;
    force.edges = edges;
    return force;
  };

  return force;
}




function forceStress(edges, ratio=0.1){
  
  let sampleSize;
  let strength = 1;
  let weight = (e)=>1;
  let targetDist = (e)=>1;


  let force = (alpha)=>{
    if(ratio <= 1){
      sampleSize = Math.ceil(ratio * force.edges.length);
    }else{
      sampleSize = Math.ceil(ratio);
    }

    let samples = _.sample(force.edges, sampleSize);
    for(let e of samples){
    // for(let e of this.edges){
      let w = weight(e);
      let d = targetDist(e);
      let p0 = [e.source.x, e.source.y];
      let p1 = [e.target.x, e.target.y];
      let currentDist = Math.sqrt(Math.pow(p0[0]-p1[0], 2)+Math.pow(p0[1]-p1[1], 2));
      let dir = numeric.div([p1[0]-p0[0], p1[1]-p0[1]], currentDist);
      let coef = (currentDist - d) * w * strength * (1/force.nodes.length);
      coef = Math.sign(coef) * Math.min(Math.abs(coef), currentDist/2/force.nodes.length);
      let [dx, dy] = numeric.mul(coef, dir);
      e.source.vx += dx * alpha;
      e.source.vy += dy * alpha;
      e.target.vx += -dx * alpha;
      e.target.vy += -dy * alpha;
    }
  }

  force.initialize = (nodes)=>{
    force.nodes = nodes;
    force.edges = edges;
    return force;
  };

  force.weight = (accessor)=>{
    weight = accessor;
    return force;
  };

  force.targetDist = (accessor)=>{
    targetDist = accessor;
    return force;
  };

  force.strength = (s)=>{
    strength = s;
    return force;
  };

  return force;
}
