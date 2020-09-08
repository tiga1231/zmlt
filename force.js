function forceLabelCollide(labelTexts, scales){
  this.labels = labelTexts.nodes();
  this.weight = (e)=>1.0;

  let force = (alpha)=>{
    let vx = Array(this.nodes.length).fill(0);
    let vy = Array(this.nodes.length).fill(0);

    for(let i=0; i<this.labels.length; i++){
      let li = this.labels[i];
      let bbi = li.getBoundingClientRect();
      // console.log(getStyle(li, 'font-size'));
      for(let j=i+1; j<this.labels.length; j++){
        let lj = this.labels[j];
        let bbj = lj.getBoundingClientRect();
        let force = rectCollide(bbi, bbj);
        if(force.magnitude > 0){
          vx[i] += force.dir.x * force.magnitude;
          vy[i] += force.dir.y * force.magnitude;
          vx[j] -= force.dir.x * force.magnitude;
          vy[j] -= force.dir.y * force.magnitude;
        }
      }
    }
    for(let i=0; i<this.labels.length; i++){
      vx[i] *= this.weight();
      vy[i] *= this.weight();
      vx[i] = Math.sign(vx[i]) * Math.min(2, Math.abs(vx[i])); //at most 2 pixel each iteration
      vy[i] = Math.sign(vy[i]) * Math.min(2, Math.abs(vy[i])); //at most 2 pixel each iteration
      this.nodes[i].vx += scales.sx.invert(vx[i]) - scales.sx.invert(0);
      this.nodes[i].vy += scales.sy.invert(vy[i]) - scales.sy.invert(0);
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




function forcePost(edges, ratio=0.01, niter=undefined){
  this.edges = edges;
  let force = (alpha)=>{
    if(ratio < 1){
      sampleSize = ratio * this.nodes.length;
    }else{
      sampleSize = Math.ceil(ratio);
    }
    niter = niter || Math.max(1, this.nodes.length / sampleSize);
    
    let nodes = this.nodes;//.filter(d=>d.vx!==0 || d.vy!==0);
    for(let n of nodes){
      n.x0 = n.x;
      n.y0 = n.y;
      n.vx0 = n.vx;
      n.vy0 = n.vy;
      n.vx = 0;
      n.vy = 0;
    }

    for(let iter=0; iter<niter; iter++){
      let samples = _.sample(nodes, sampleSize);
      // look ahead//TODO binary search
      let steps = 12;
      let t = 2.0;
      while(steps>0){
        for(let n of samples){
          if(n.vx0 !== 0 || n.vy0 !== 0){
            n.x = n.x0 + n.vx0 * t;
            n.y = n.y0 + n.vy0 * t;
          }
        }
        let crossings = countCrossings(this.edges, samples);
        if(crossings == 0){
          break;
        }else{
          t *= 0.8;
        }
        steps -= 1;
      }
      if(steps == 0){
        for(let n of nodes){
          n.x = n.x0;
          n.y = n.y0;
        }
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
