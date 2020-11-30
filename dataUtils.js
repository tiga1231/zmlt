let dataUtils = {};
dataUtils.preprocess = function(data, nodes){
  if(nodes !== undefined){
    data.nodes = nodes;
  }else{
    data.nodes = [];
    for(let i=0; i<data.node_id.length; i++){
      data.nodes[i] = {};
      for(let k in data){
        if(k.slice(0,5) === 'node_'){
          data.nodes[i][k.slice(5)] = data[k][i];
        }
      }
    }
  }

  //use the nodeCount in data, not int nodes
  data.nodes.forEach((d,i)=>{
    d.nodeCount = data.node_nodeCount[i];
  });


  data.edges = [];
  for(let i=0; i<data.edge_source.length; i++){
    data.edges[i] = {};
    for(let k in data){
      if(k.slice(0,5) === 'edge_'){
        data.edges[i][k.slice(5)] = data[k][i];
      }
    }
  }
  


  data.id2index = {};
  data.nodes.forEach((d,i)=>{
    d.index = i;
    d.label = d.label.slice(0,16);
    data.id2index[d.id] = d.index;
  });
 
  //preprocess edges
  for(let e of data.edges){
    e.source = data.nodes[data.id2index[e.source]];
    e.target = data.nodes[data.id2index[e.target]];
  }
  return data;
};

