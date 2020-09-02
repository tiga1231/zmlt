function interpolate(a, b, t=0.5){
  return a*(1-t) + b*(t);
}

function countCrossings(edges, nodes){
  //count crossings between all [edges] and edges emitted from certain [nodes]
  let count = 0;
  for(let i=0; i<edges.length; i++){
    edges[i].crossed = false;
  }

  let edges0;
  if(nodes == undefined){
    edges0 = edges;
  }else{
    nodes = new Set(nodes.map(d=>d.id));
    edges0 = edges.filter(e=>nodes.has(e.source.id) || nodes.has(e.target.id));
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
    signOf(q0, p0, p1)*signOf(q1, p0, p1) < 0
    && signOf(p0, q0, q1)*signOf(p1, q0, q1) < 0
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
