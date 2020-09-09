function forceCompact(nodes){
  this.strength = 0.1;
  this.nodes = nodes;
  let force = (alpha)=>{
    for(let n of this.nodes){
      n.norm = Math.sqrt(n.x*n.x + n.y*n.y);
      let dx = n.x / n.norm;
      let dy = n.y / n.norm;
      n.vx -= this.strength * alpha * dx * Math.pow(n.norm, 1.5);
      n.vy -= this.strength * alpha * dy * Math.pow(n.norm, 1.5);
    }
  };

  force.initialize = (nodes)=>{
    this.nodes = nodes;
    return force;
  };

  force.strength = (s)=>{
    this.strength = s;
    return force;
  };

  return force;
}


function forceLabelCollide(labels, scales, simulation, margin=0.01){
  this.labels = labels;

  this.weight = (e)=>1.0;
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

  let domain = scales.sx.domain();
  let range = scales.sx.range();
  let scalingFactor = Math.abs((range[1]-range[0]) / (domain[1]-domain[0]));

  let levelRange = d3.extent(this.labels, d=>d.level);
  console.log(levelRange);
  let lz = function(l){
    // mapping: level => zoom-factor 
    let z = l;
    return z;
  }
  let force = (alpha)=>{
    if(this.tree === undefined || Math.random()>0.8){
      //train on shown text only
      labels = this.labels;//.filter(d=>getStyle(d, 'opacity')>0.5);
      this.tree = d3.quadtree(labels, x, y);
    }
    //assuming nodeLevel == zoomLevel
    for(let level=levelRange[0]; level<=levelRange[1]; level++){
      let zoomFactor = lz(level);
      //only consider labels that is <= certain level
      labels = this.labels.filter(l=>lz(l.level)<=zoomFactor);

      let vx = Array(this.nodes.length).fill(0);
      let vy = Array(this.nodes.length).fill(0);

      for(let i=0; i<labels.length; i++){
        let li = labels[i];
        let bbi = li.bbox;
        bbi = {
          x: li.x,
          y: li.y,
          width: 1/(zoomFactor*scalingFactor) * bbi.width,
          height: 1/(zoomFactor*scalingFactor) * bbi.height,
        };

        let xmin = li.x - bbi.width*1.5; //screen coord width to data coord
        let xmax = li.x + bbi.width*1.5;
        let ymin = li.y - bbi.height*2.5;
        let ymax = li.y + bbi.height*2.5;

        let neighbors = searchQuadtree(this.tree, x, y, xmin, xmax, ymin, ymax);
        // console.log(neighbors.length);
        for(let j of neighbors){
          let lj = this.labels[j];
          // let j = n.i;
          let bbj = lj.bbox;
          bbj = {
            x: lj.x,
            y: lj.y,
            width: 1/(zoomFactor*scalingFactor) * bbj.width,
            height: 1/(zoomFactor*scalingFactor) * bbj.height,
          };
          let force = rectCollide(bbi, bbj, margin);
          if(force.magnitude > 0){
            vx[li.index] += force.dir.x/2 * force.magnitude;
            vy[li.index] += force.dir.y * force.magnitude;
            vx[lj.index] -= force.dir.x/2 * force.magnitude;
            vy[lj.index] -= force.dir.y * force.magnitude;
          }
        }
        ////brute force
        // for(let j=i+1; j<this.labels.length; j++){
        //   let lj = this.labels[j];
        //   let bbj = lj.getBoundingClientRect();
        //   let force = rectCollide(bbi, bbj);
        //   if(force.magnitude > 0){
        //     vx[i] += force.dir.x * force.magnitude;
        //     vy[i] += force.dir.y * force.magnitude;
        //     vx[j] -= force.dir.x * force.magnitude;
        //     vy[j] -= force.dir.y * force.magnitude;
        //   }
        // }
      }
      for(let i=0; i<this.labels.length; i++){
        vx[i] *= this.weight();
        vy[i] *= this.weight();
        vx[i] = Math.sign(vx[i]) * Math.min(5, Math.abs(vx[i])); //at most 5 pixel each iteration
        vy[i] = Math.sign(vy[i]) * Math.min(5, Math.abs(vy[i])); //at most 5 pixel each iteration
        this.nodes[i].vx += scales.sx.invert(vx[i]) - scales.sx.invert(0);
        this.nodes[i].vy += scales.sy.invert(vy[i]) - scales.sy.invert(0);
      }
    }
  };

  force.initialize = (nodes)=>{
    this.nodes = nodes;
    return force;
  };

  force.weight = (accessor)=>{
    this.weight = accessor;
    return force;
  };

  return force;
}




function forcePre(decay=0.4){
  let force = (alpha)=>{
    for(let n of this.nodes){
      n.vx = n.vx0 !== undefined ? n.vx0*(1-decay) : n.vx;
      n.vy = n.vy0 !== undefined ? n.vy0*(1-decay) : n.vy;
    }
  };

  force.initialize = (nodes)=>{
    this.nodes = nodes;
    return force;
  };

  return force;
}




function forcePost(edges, radius=5){
  this.edges = edges;
  let force = (alpha)=>{
    
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

    let getX = (d)=>d.x;
    let getY = (d)=>d.y;

    if(this.tree2 === undefined || Math.random()>0.0){
      this.tree2 = d3.quadtree(this.nodes, getX, getX);
    }

    let nodes = this.nodes;
    for(let n of nodes){
      n.x0 = n.x;
      n.y0 = n.y;
      n.vx0 = n.vx;
      n.vy0 = n.vy;
      n.vx = 0;
      n.vy = 0;
    }

    let samples = _.sample(nodes, nodes.length); //a random shuffle
    for(let n of samples){
      let steps = 12;
      let t = 1.0;
      while(steps>0){
        if(n.vx0 !== 0 || n.vy0 !== 0){
          n.x = n.x0 + n.vx0 * t;
          n.y = n.y0 + n.vy0 * t;
        }
        let r = radius;
        let neighbors = searchQuadtree(this.tree2, getX, getY, n.x-r, n.x+r, n.y-r, n.y+r);
        neighbors = new Set(neighbors);
        // console.log(neighbors);
        let edges = this.edges.filter(e=>neighbors.has(e.source.index) || neighbors.has(e.target.index));
        let crossings = countCrossings(edges, [n]);
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

  force.initialize = (nodes)=>{
    this.nodes = nodes;
    return force;
  };

  return force;
}




function forceStress(edges, ratio=0.1){
  this.edges = edges;
  this.strength = 0.0001;
  this.weight = (e)=>1;
  this.targetDist = (e)=>1;
  let sampleSize;
  let force = (alpha)=>{
    if(ratio < 1){
      sampleSize = Math.ceil(ratio * this.edges.length);
    }else{
      sampleSize = Math.ceil(ratio);
    }


    let samples = _.sample(this.edges, sampleSize);
    for(let e of samples){
    // for(let e of this.edges){
      let w = this.weight(e);
      let targetDist = this.targetDist(e);
      let p0 = [e.source.x, e.source.y];
      let p1 = [e.target.x, e.target.y];
      let currentDist = Math.sqrt(Math.pow(p0[0]-p1[0], 2)+Math.pow(p0[1]-p1[1], 2));
      let dir = numeric.div([p1[0]-p0[0], p1[1]-p0[1]], currentDist + 0.001);
      let coef = (currentDist - targetDist) * w * this.strength * (1/this.nodes.length);
      coef = Math.sign(coef) * Math.min(Math.abs(coef), currentDist/2 /this.nodes.length);
      let [dx, dy] = numeric.mul(coef, dir);
      
      e.source.vx += dx * alpha;
      e.source.vy += dy * alpha;
      e.target.vx += -dx * alpha;
      e.target.vy += -dy * alpha;
    }
  }

  force.initialize = (nodes)=>{
    this.nodes = nodes;
    return force;
  };

  force.weight = (accessor)=>{
    this.weight = accessor;
    return force;
  };

  force.targetDist = (accessor)=>{
    this.targetDist = accessor;
    return force;
  };

  force.strength = (s)=>{
    this.strength = s;
    return force;
  };

  return force;
}
