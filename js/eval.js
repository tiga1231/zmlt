// let fn = 'topics-5000/Graph_5000';
// let version = 6;
// let fn = 'topics-5000-low-degree/topics-8-sfdp';
// let version = 3; //layout version
// 
// 


//paper
// let fn = 'TopicsLayersData-0/Graph_5000';
// let version = 3;
// let nodeCounts = [100, 200, 400, 800, 1600, 2500, 3500, 5000];

// let fn = 'lastfm/Graph_8';
// let version = 13;
// let nodeCounts = [299, 619, 1043, 1301, 1757, 1967, 2286, 2588];


// refined
// let fn = 'topics_refined/Graph_5000';
// let version = 1;
// let nodeCounts = [5001];

// let fn = 'lastfm_refined/Graph_8_2587';
// let version = 1;
// let nodeCounts = [26,51,76,101,201,299,401,501,619,701,801,1043,1301,1757,1967,2286,2588];


//steiner
// let fn = 'topics_steiner/Graph_15-1608744450';
// let version = 1;
// // let nodeCounts = [26,47,70,103,197,314,502,731,906,1380,1802,2398,3582,4172,5058,5947];
// let nodeCounts = [5947];

// let fn = 'lastfm_steiner/Graph_14-1608710991';
// let version = 1;
// let nodeCounts = [26, 60, 95, 184, 266, 384, 518, 606, 836, 1002, 1271, 1734, 1952, 2271, 2588];

// random 7 + rotation
// let t = 1609349995;
// let t = 1609350593;
// let t = 1609350655;
// let t = 1609350673;
// let t = 1609350693;
// let t = 1609350737;
let t = 1609350756;
//// let t = 1609350777;
///
///
let fn = `lastfm_steiner/random/Graph_14-${t}`;
let version = 0;
let nodeCounts = [2588];
// let nodeCounts = [26, 60, 95, 184, 266, 384, 518, 606, 836, 1002, 1271, 1734, 1952, 2271, 2588];

let dpr = window.devicePixelRatio;

load(
  `data/json/${fn}.json`, 
  `data/json/${fn}-nodes-${version}.json`,
  (data)=>{
    window.data = data;
    
    let views = [];
    let [width,height] = [window.innerWidth, window.innerHeight];

    // for(let i=0; i<8; i++){
      // let level = i+1;
      // let nodes = data.nodes.filter(d=>d.level <= level);
      // let edges = data.edges.filter(d=>d.source.level <= level && d.target.level <= level);
      
    for(let nc of nodeCounts){
      let nodes = data.nodes.filter(d=>d.nodeCount <= nc);
      let edges = data.edges.filter(e=>e.source.nodeCount <= nc && e.target.nodeCount <= nc);
      let d = {nodes, edges};
      let canvas = d3.select('#main')
      .append('canvas')
      .attr('width', width * dpr)
      .attr('height', height * dpr)
      .style('width', width)
      .style('height', height);
      views.push(drawStatic(d, canvas, dpr));
      console.log(nc, nodes.length);

    }

    //evaluate label overlap
    let {sx, sy} = getCanvasScales(
      d3.extent(data.nodes, d=>d.x), 
      d3.extent(data.nodes, d=>d.y), 
      width, 
      height
    );
    console.log(sx.domain(), sx.range());
    let maxLevel = d3.max(data.nodes, d=>d.level);
    let sl = d3.scaleLinear().domain([1,maxLevel]).range([18,12]);
    let context = d3.select('canvas').node().getContext('2d');
    for(n of data.nodes){
      updateBBox(n, context, sx(n.x), sy(n.y), sl(n.label));
    }
    evalMsg(data.nodes, data.edges);
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


function evalMsg(nodes, edges){
  let dl = []; // desired (edge) length
  let cm = [];// compactness / area utilization
  for(let nc of nodeCounts){
    let edgesTmp = edges.filter(e=>e.source.nodeCount <= nc && e.target.nodeCount <= nc);
    let nodesTmp = nodes.filter(d=>d.nodeCount <= nc);
    let bboxesTmp = nodes.filter(d=>d.nodeCount <= nc).map(d=>d.bbox);
    let idealEdgeLength = bestIdealEdgeLengthPreservation(edgesTmp, edgesTmp.map(e=>e.weight));
    let [scale, area] = areaUtilization(bboxesTmp);
    dl.push(idealEdgeLength);
    cm.push(area);

    // console.log(parseFloat(idealEdgeLength.toFixed(4)));
    // console.log(parseFloat(area.toFixed(6)));

    console.log(
      'node count:', nc, '\n',
      'edge:', parseFloat(idealEdgeLength.toFixed(4)), '\n',
      'area:', parseFloat(area.toFixed(4)), '\n',
      'at zoom', scale, '\n',
    );
  }
  // let table = '';
  // for(let i=0; i<dl.length; i++){
  //   table += `\\textbf{$T_${i+1}$} & ${dl[i].toFixed(2)} & ${cm[i].toFixed(4)}\\\\ \\hline \n`;
  // }
  // console.log(table);
}

function updateBBox(n, ctx, x, y, l){
  ctx.font = `${l}px Times`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let m = ctx.measureText(n.label);
  let left = x - m.actualBoundingBoxLeft;
  let right = x + m.actualBoundingBoxRight;
  let top = y - m.actualBoundingBoxAscent;
  let bottom = y + m.actualBoundingBoxDescent;
  let width = right - left;
  let height = bottom - top;
  n.bbox = {
    x: left,
    y: top,
    width,
    height,
    left,
    right,
    top,
    bottom,
  }; 
}


