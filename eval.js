// let fn = 'topics-5000/Graph_5000';
// let version = 6;
// let fn = 'topics-5000-low-degree/topics-8-sfdp';
// let version = 3; //layout version
// 
// 

// let fn = 'TopicsLayersData-0/Graph_5000';
// let version = 3;
// let nodeCounts = [100, 200, 400, 800, 1600, 2500, 3500, 5000];

let fn = 'lastfm/Graph_8';
let version = 2;
let nodeCounts = [299, 619, 1043, 1301, 1757, 1967, 2286, 2588];



let dpr = window.devicePixelRatio * 2;
load(
  `data/json/${fn}.json`, 
  `data/json/${fn}-nodes-${version}.json`,
  (data)=>{
    window.data = data;
    
    let views = [];
    let [width,height] = [window.innerWidth/4, window.innerHeight/2];

    // for(let i=0; i<8; i++){
      // let level = i+1;
      // let nodes = data.nodes.filter(d=>d.level <= level);
      // let edges = data.edges.filter(d=>d.source.level <= level && d.target.level <= level);
      
    for(let nc of nodeCounts){
      let nodes = data.nodes.filter(d=>d.nodeCount <= nc);
      let edges = data.edges.filter(e=>e.source.nodeCount <= nc && e.target.nodeCount <= nc);
      console.log(nc, nodes.length);
      let d = {nodes, edges};
      let canvas = d3.select('#main')
      .append('canvas')
      .attr('width', width * dpr)
      .attr('height', height * dpr)
      .style('width', width)
      .style('height', height);
      views.push(drawStatic(d, canvas, dpr));
    }

    //evaluate label overlap
    let [w,h] = [1000,1000];
    let domainX = d3.extent(data.nodes, d=>d.x);
    let domainY = d3.extent(data.nodes, d=>d.y);
    let domain = [Math.min(domainX[0], domainY[0]), Math.max(domainX[1], domainY[1])];
    let sx = d3.scaleLinear().domain(domain).range([0,w]);
    let sy = d3.scaleLinear().domain(domain).range([0,h]);
    let svg = d3.select('body')
    .append('svg')
    .attr('width', w)
    .attr('height', h)
    svg.append('defs').node().innerHTML = whiteOutline();
    let labelTexts = svg
    .selectAll('.labelText')
    .data(data.nodes)
    .join('text')
    .attr('class', 'labelText')
    .attr('x', d=>sx(d.x))
    .attr('y', d=>sy(d.y))
    .attr('fill', '#555')
    .style('font-size', d=>`${20-d.level}px`)
    .text(d=>d.label);
    evalMsg(data.nodes, data.edges, labelTexts);
  }
);


// //--------functions----------
function load(graph_fn, node_fn=undefined, callback=()=>{}){
  if(node_fn === undefined){
    d3.json(graph_fn).then(data=>{
      data = dataUtils.preprocess(data, undefined);
      callback(data);
    });
  }else{
    d3.json(graph_fn).then(data=>{
      d3.json(node_fn).then(nodes=>{
        data = dataUtils.preprocess(data, nodes);
        callback(data);
      });
    });
  }
}


function evalMsg(nodes, edges, texts){
    let dl = []; // desired (edge) length
    let cm = [];// compactness / area utilization
    for(let nc of nodeCounts){
      
      let edgesTmp = edges.filter(e=>e.source.nodeCount <= nc && e.target.nodeCount <= nc);
      let nodesTmp = nodes.filter(d=>d.nodeCount <= nc);
      let bboxesTmp = texts.filter(d=>d.nodeCount <= nc).nodes().map(d=>d.getBoundingClientRect());
      let idealEdgeLength = bestIdealEdgeLengthPreservation(edgesTmp, edgesTmp.map(e=>e.weight));
      let [scale, area] = areaUtilization(bboxesTmp);
      dl.push(idealEdgeLength);
      cm.push(area);
      console.log(
        'node count:', nc, '\n',
        'edge length:', parseFloat(idealEdgeLength.toFixed(4)), '\n',
        'area utilization:', parseFloat(area.toFixed(6)), 'at zoom', scale, '\n',
      );
    }

    let table = '';
    for(let i=0; i<dl.length; i++){
      table += `\\textbf{$T_${i+1}$} & ${dl[i].toFixed(2)} & ${cm[i].toFixed(4)}\\\\ \\hline \n`;
    }
    console.log(table);
  }



