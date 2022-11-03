// //--------code----------
const colorscheme = d3.schemeAccent; //schemePastel1
const OPACITY_NOT_UPDATE = 0.1;
const IS_PROGRESSIVE = false;

const EDGE_COLOR = '#000';
// const EDGE_COLOR = d3.rgb(249,180,35);
const HIDE_OVERLAP = false;
const DPR = 1; //window.devicePixelRatio;
// const font = 'monospace';
const FONT = 'Times';
const HIDDEN_NODE_ALPHA = 0.05;
const HIDDEN_EDGE_ALPHA = 0.0;
const HIDDEN_LABEL_ALPHA = 0.0;

//globals
let shouldTick = true;

let darkMode = false;
let bg = darkMode ? '#322' : '#fff';

let runtime = [];
let nodes;

let progress = undefined;
let enabledNodes = undefined;

let shouldDraw = true;
let shouldLabel = true;
let shouldMarkOverlap = false;

let forceLabel = false;
let forceLabelLevel = -1;


//--------data----------

// figure 10
// let fns = [
//   './data/external/lastfm/CIR.json',
//   './data/external/lastfm/prism.json',
//   './data/external/lastfm/lastfm_delg_elliptical.json',
//   './data/external/lastfm/bt_delg.json',
//   './data/external/lastfm/bt_cg.json',

// // figures for appendix
//   `./data/batch-tree-result-json/topics.json`,
//   `./data/batch-tree-result-json/last.fm-linear.json`,
//   `./data/batch-tree-result-json/topics-linear.json`,
//   `./data/batch-tree-result-json/tol-linear.json`,
// ];


// let fns = [

// `data/json/lastfm_steiner_exp/Graph_14-1614144341.json`, ////factor: 1 (uniform edge length)
// `data/json/lastfm_steiner_exp/Graph_14-1614144341-nodes-1.json`,

// `data/json/lastfm_linear/Graph_8-1615803307.json`,
// `data/json/lastfm_linear/Graph_8-1615803307-nodes-1.json`,

// topics
// topics-exponential (uniform edge length)
// `data/json/topics_refined_exp/Graph_5000-1614147219.json`, //// 
// `data/json/topics_refined_exp/Graph_5000-1614147219-nodes-5.json`, 

// topics-linear
// `data/json/topics_faryad_8level_linear/Graph_5000-1615834916.json`,
// `data/json/topics_faryad_8level_linear/Graph_5000-1615834916-nodes-3.json`,

// tree of life (~3000 nodes)
// tree of life uniform
// 'data/json/tol_graphs_exp/Graph_4-1615352218.json',
// 'data/json/tol_graphs_exp/Graph_4-1615352218-nodes-3.json',
// tree of life linear
// 'data/json/tol_graphs_linear/Graph_4-1615872482.json',
// 'data/json/tol_graphs_linear/Graph_4-1615872482-nodes-1.json',

// math genealogy
// `data/json/math_genealogy_exp/Graph_3-1615778978.json`,
// `data/json/math_genealogy_exp/Graph_3-1615778978-nodes-3.json`,
// linear
// 'data/json/math_genealogy_linear/Graph_3-1615878481.json' 
// 'data/json/math_genealogy_linear/Graph_3-1615880448.json',
// 'data/json/math_genealogy_linear/Graph_3-1615880448-nodes-1.json',
// ];


// graphs for parameter scan
let edge_modes = ['linear', 'uniform'];
let graphs = [{
  graph_name: 'lastfm',
  fn: 'data/json/lastfm_linear/Graph_6-1667445298.json',
}, {
  graph_name: 'topics',
  fn: 'data/json/topics_faryad_5000_linear/Graph_2000-1667445499.json',
}, {
  graph_name: 'tol',
  fn: 'data/json/tol_graphs_linear/Graph_4_2000-1667445553.json',
}, {
  graph_name: 'math_genealogy',
  fn: 'data/json/math_genealogy_linear/Graph_3_2000-1667445712.json',
}, ]



// default config
let default_config = {
  charge: {
    // strength: -2e-5
    strength: -0.001
  },
  edge: {
    mode: 'linear',
    // mode: 'uniform'
  },
  overlap: {
    scaleY: 5
  },
  central: {
    r: 0,
    strength: 0.002
  },
  nodeEdgeRepulsion: {
    strength: 0.1
  },
  level2scale: {
    8: 15
  },
};


let niter = 300;

// let parameter_name = 'charge_strength';
// let values = [-0, -0.00003, -0.0001, -0.0003, -0.001, -0.003, -0.01, -0.03, -0.1, -0.3];
// function setForceParameter(config, v) {
//   config.charge.strength = v;
// };

let parameter_name = 'node_edge_strength';
let values = [0.01, 0.03, 0.1, 0.3, 0.6];
function setForceParameter(config, v){
  config.nodeEdgeRepulsion.strength = v;
};

// let parameter_name = 'ellipse_aspect_ratio';
// let values = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20];
// function setForceParameter(config, v){
//   config.overlap.scaleY = v;
// };


// let mode = 'debug';
let mode = '';

if(mode == 'debug'){
  values = values.slice(0,1);
  graphs = graphs.slice(0,1);
  edge_modes = edge_modes.slice(0,1);
}

console.log('parameter_name:', parameter_name);
console.log('parameter_values:', values);
let fns = graphs.map(g => g.fn);
let all_results = [];
let promises = Promise.all(fns.map(fn => d3.json(fn)))
  .then(function(graph_data) {
    graph_data.forEach((data, i) => {
      for (let edge_mode of edge_modes) {
        for (let v of values) {// Scan the parameter space
          
          let config = JSON.parse(JSON.stringify(default_config));
          config.edge.mode = edge_mode;
          setForceParameter(config, v);

          let additional_records = {};
          additional_records['graph'] = graphs[i].graph_name;
          additional_records[parameter_name] = v;
          let results = main([data, ], config, additional_records);
          all_results = all_results.concat(results);
        }
      }
    });
    if (mode !== 'debug') {
      exportJson(all_results, `${parameter_name}.json`);
    }
  });



function main(data, config, additional_records) {
  let nodes;
  if (data.length == 1) {
    data = data[0];
  } else {
    [data, nodes] = data;
  }
  window.data = data;
  window.progress = IS_PROGRESSIVE ? 1 : data.node_id.length;
  window.enabledNodes = new Set(data.node_id.slice(0, window.progress));
  preprocess(data, nodes);

  let canvas = init(data);
  window.canvas = canvas;
  if (shouldDraw) {
    canvas.draw(shouldLabel, forceLabel);
  }

  //simulation
  let simData = canvas.simData;
  resetNodePosition(simData.nodes);

  let results = [];


  let iter = 0;
  let t0 = window.performance.now();
  let simulation = initSimulation(simData, config)
    .alpha(0.99)
    .velocityDecay(0.2)
    .alphaDecay(1 - Math.pow(0.001, 1 / niter))

  if (mode == 'debug') {

    //option 1, draw on every iteration, only work for single config. since the 'iter' is async.
    simulation
      .on('tick', function() {
        iter += 1;
        canvas.zoom.on('zoom')(d3.zoomIdentity);
        if (iter % (niter / 10) == 0) {
          console.log('iter', iter);
        }
      })
      .on('end', () => {
        let result = evaluate(data, t0);
        console.log(result);
        updateLabelVisibility(canvas);
      })
      .restart();
  } else {
    //option 2:
    simulation.tick(niter);
    let result = evaluate(data, t0);
    Object.entries(additional_records).forEach((key_value)=>{
      let [k,v] = key_value;
      result[k] = v;
    })
    // result[parameter_name] = v;
    // result.graph = graph_name;
    result.edge_mode = config.edge.mode;
    console.log(result);
    results.push(result);
    // updateLabelVisibility(canvas);
    // canvas.zoom.on('zoom')(d3.zoomIdentity);
  }
  return results;
}


function evaluate(data, t0) {
  let runtime = (performance.now() - t0) / 1000;
  // canvas.levelScalePairs = getNonOverlapLevels(canvas);
  // markNonOverlapLevels(canvas);
  // markLabelByLevel(data.nodes, canvas);

  let edges = data.edges;
  let bboxes = data.nodes.map(d => d.bbox);
  let iel = bestIdealEdgeLengthPreservation(data.edges, data.edges.map(e => e.weight));
  let [scale, cm] = areaUtilization(bboxes);
  // console.log('edge', +iel.toFixed(4));
  // console.log('compactness:', +cm.toFixed(6));
  // console.log('ideal scale:', +scale.toFixed(6));
  // console.log('Runtime:', runtime);
  return {
    edge_length_preservation: iel,
    compactness: cm,
    runtime: runtime,
    // optimalScale: scale,
  }
}



function resetNodePosition(nodes) {
  nodes.forEach((d, i) => {
    d.x = d.init_pos[0];
    d.y = d.init_pos[1];
  });
}



function updateLabelVisibility(canvas) {
  //Mark  non-overlap scales for each label
  updateBbox(canvas.data.nodes, canvas);
  canvas.levelScalePairs = getNonOverlapLevelScalePairs(canvas);
  markNonOverlapLevels(canvas);
  // markLabelByLevel(canvas.data.nodes, canvas.levelScalePairs, canvas.transform.k);
}



// function initLevel2scale(data) {
//   let maxLevel = d3.max(data.nodes, d => d.level) || 8;
//   let level2scale = {};
//   if (fns[0].includes('topics')) {
//     level2scale[maxLevel] = 20;
//   } else if (fns[0].includes('topics_steiner')) {
//     level2scale[maxLevel - 1] = 20;
//     level2scale[maxLevel] = 200;
//   } else if (fns[0].includes('lastfm')) {
//     // let baseScale = 1;
//     // let scaleFactor = Math.pow(15, 1 / (maxLevel - 1));
//     // for (let i = 1; i <= maxLevel; i++) {
//     //   level2scale[i] = baseScale * Math.pow(scaleFactor, i - 1);
//     // }
//     level2scale = {
//       8: 15,
//     };
//   } else if (fns[0].includes('tol_graphs')) {
//     level2scale = {
//       8: 15,
//     };
//   } else if (fns[0].includes('math_genealogy')) {
//     level2scale = {
//       8: 15,
//     };
//   } else {
//     level2scale = {
//       8: 15,
//     };
//   }
//   return level2scale;
// }



// function initDefaultForceConfig(data) {
//   let extent = d3.extent(data.nodes, d => Math.sqrt(d.x * d.x + d.y * d.y));
//   let diameter = 2 * (extent[1] - extent[0]);
//   let forceConfig = {
//     charge: {
//       strength: -2e-5 * diameter
//     },
//     overlap: {
//       scaleY: 5
//     },
//     central: {
//       r: 0,
//       strength: 0.002
//     },
//     nodeEdgeRepulsion: {
//       strength: 0.1
//     },
//     level2scale: initLevel2scale(data),
//   };
//   return forceConfig;
// }



function init(data) {
  //let virtualEdges = data.virtual_edges;
  // let id2index = data.id2index;

  let nodes = data.nodes;
  let edges = data.edges;
  let canvasData = {
    nodes,
    edges
  };

  let width = window.innerWidth;
  let height = window.innerHeight;
  let scales = initScales(nodes, width, height);
  let canvas = initCanvas(width, height, canvasData, scales, draw);

  updateBbox(canvas.data.nodes, canvas);
  // markNonOverlapLevels(canvas);
  // markLabelByLevel(canvas.data.nodes, canvas);
  initInteraction(canvas);

  canvas.simData = {
    nodes: data.nodes,
    edges: data.edges,
    virtualEdges: data.virtual_edges,
    enabledNodes: window.enabledNodes,
    id2index: data.id2index,
    xDomain: scales.sx.domain(),
    xRange: scales.sy.range(),
    yDomain: scales.sy.domain(),
    yRange: scales.sy.range(),
    dpr: DPR,
  };

  return canvas;
}


function updateBbox(nodes, canvas) {
  let scales = canvas.scales; //initScales(nodes, canvas.width, canvas.height);
  let sx = scales.sx;
  let sy = scales.sy;
  let sl = scales.sl;
  let sr = scales.sr;
  let ctx = canvas.context;
  for (let n of nodes) {
    let x = sx(n.x);
    let y = sy(n.y);
    let l = sl(n.level);
    n.r = sr(n.level);
    n.l = l;
    if (n.bbox === undefined) {

      ctx.font = `${l}px ${FONT}`;
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
        cx: x * DPR,
        cy: y * DPR,

        width,
        height,
        left,
        right,
        top,
        bottom,
      };
    } else {
      // n.bbox.cx = Math.round(x * DPR);
      // n.bbox.cy = Math.round(y * DPR);
      n.bbox.cx = x * DPR;
      n.bbox.cy = y * DPR;
      n.bbox.x = x - n.bbox.width / 2;
      n.bbox.y = y - n.bbox.height / 2;
      n.bbox.left = x - n.bbox.width / 2;
      n.bbox.right = x + n.bbox.width / 2;
      n.bbox.top = y - n.bbox.height / 2;
      n.bbox.bottom = y + n.bbox.height / 2;
    }

  }
}


function getNonOverlapLevelScalePairs(canvas) {
  /*For each node levels, figure out the minimal zoom scale that induces no label overlap*/
  let nodes = canvas.data.nodes;
  updateBbox(nodes, canvas);
  let levels = new Set(nodes.map(d => d.level));
  levels = Array.from(levels).sort((a, b) => a - b);
  let res = [];
  for (let l of levels) {
    let bbox = nodes.filter(d => d.level <= l).map(d => d.bbox);
    let [s, a] = areaUtilization(bbox);
    res.push([l, s]);
  }
  return res;
}


function markScale(nodes, higher, all) {
  let sx = d => d.bbox.cx;
  let sy = d => d.bbox.cy;
  let higherEqual = nodes.concat(higher);
  let tree = d3.quadtree(higherEqual, sx, sy);
  let rx = d3.max(higherEqual, d => d.bbox.width) * 2; //depends on min zoom extent
  let ry = d3.max(higherEqual, d => d.bbox.height) * 2;

  const min0 = 0.00001;
  const max0 = 1000;
  let current = new Set(higher.map(d => d.index));
  for (let n of nodes) {
    let bi = n.bbox;
    let [x, y] = [bi.cx, bi.cy];
    let neighbors = searchQuadtree(tree, sx, sy, x - rx, x + rx, y - ry, y + ry);
    // console.log(neighbors)
    neighbors = neighbors.filter(i => current.has(i));
    let scale = min0;
    for (let j of neighbors) {
      if (n.index === j) {
        continue;
      }
      let min = min0;
      let max = max0;
      let bj = all[j].bbox;
      let mid; // = (min+max)/2;
      for (let k = 0; k < 12; k++) {
        mid = (min + max) / 2;
        if (isRectCollide2(bi, bj, mid)) {
          [min, max] = [mid, max];
        } else {
          [min, max] = [min, mid];
        }
      }
      scale = Math.max(scale, max);
    }
    n.labelScale = scale;
    // current.push(n.index);
    current.add(n.index);
    // console.log(n.level, n.labelScale);
  }
}


function markNonOverlapLevels(canvas) {
  let nodes = canvas.data.nodes;
  updateBbox(nodes, canvas);
  let l0 = 0;
  // for (let l of [10, 20]){
  let levels = Array.from(new Set(nodes.map(d => d.level))).sort((a, b) => a - b);
  for (let l of levels) {
    let nodes_l = nodes
      .filter(d => l0 < d.level && d.level <= l)
      .sort((a, b) => b.perplexity - a.perplexity);
    let higher = nodes.filter(d => d.level <= l0);
    markScale(nodes_l, higher, nodes);
    l0 = l;
  }
}



function setCanvasSize(canvas, w, h) {
  canvas.width = w * DPR;
  canvas.height = h * DPR;
  canvas.style.width = w;
  canvas.style.height = h;
}

function initCanvas(w, h, data, scales, draw) {
  let canvas = document.getElementById('main');
  canvas.context = canvas.getContext('2d');
  setCanvasSize(canvas, w, h);

  canvas.data = data;
  canvas.scales = scales;
  canvas.draw = draw;
  canvas.clear = () => {
    canvas.context.clearRect(0, 0, canvas.width, canvas.height);
  };
  canvas.transform = d3.zoomIdentity.scale(1);
  return canvas;
}


function initScales(nodes, w, h) {

  let xExtent = d3.extent(nodes, d => d.x);
  let yExtent = d3.extent(nodes, d => d.y);
  // let maxLevel = d3.max(nodes, d=>d.level);

  let scales = getCanvasScales(xExtent, yExtent, w, h);

  // scales.sc = d3.scaleLinear()
  // .domain([maxLevel,1])
  // // .range(['#ece7f2','#2b8cbe']);
  // .range(['#a6bddb','#023858']);

  let extentLevel = d3.extent(nodes, d => d.level);
  scales.sr = d3.scaleLinear().domain(extentLevel).range([0, 0]);
  scales.ss = d3.scaleLinear().domain(extentLevel).range([4, 1]);
  // scales.sl = d3.scaleLinear().domain(extentLevel).range([18, 12]); //label font size;
  scales.sl = d3.scaleLinear().domain(extentLevel).range([16, 16]); //label font size;
  // scales.sc = d3.scaleLinear().domain(extentLevel).range(['#08306b', '#9ecae1']); //node & label color
  scales.sc = d3.scaleLinear().domain(extentLevel).range(['black', 'black']); //node & label color

  let levels = Array.from(new Set(nodes.map(d => d.level))).sort((a, b) => a - b);
  let fonts = levels.map(l => `${Math.round(scales.sl(l)*DPR)}px ${FONT}`);
  scales.sf = d3.scaleLinear().domain(levels).range(fonts); //font size
  return scales;
}



function initInteraction(canvas) {
  initZoom(canvas);
}


function initZoom(canvas) {
  let sx0, sy0;
  let scale0 = 1;
  // let transform = d3.zoomIdentity.scale(scale0 * dpr);

  canvas.levelScalePairs = getNonOverlapLevelScalePairs(canvas);

  let zoom = d3.zoom()
    .scaleExtent([0.1, 1000])
    .on('zoom', (transform0) => {

      if (transform0 === undefined) {
        canvas.transform = d3.event.transform.scale(scale0);
      } else {
        canvas.transform = transform0;
      }
      if (sx0 === undefined) {
        sx0 = canvas.scales.sx;
        sy0 = canvas.scales.sy;
        canvas.scales.sx0 = sx0;
        canvas.scales.sy0 = sy0;
      }
      canvas.scales.sx = canvas.transform.rescaleX(sx0);
      canvas.scales.sy = canvas.transform.rescaleY(sy0);

      updateBbox(canvas.data.nodes, canvas);
      // Show label according to non-overlap zoom scale
      markLabelByLevel(canvas.data.nodes, canvas.levelScalePairs, canvas.transform.k);
      // optional: greedy labeling
      // markLabelByOverlap(canvas.data.nodes, canvas);

      if (shouldDraw) {
        canvas.draw(shouldLabel, forceLabel, shouldMarkOverlap);
      }
    })
    .on('end', () => {
      // console.log('zoom', canvas.transform.k);
    });
  d3.select(canvas).call(zoom);
  d3.select('#resetButton')
    .on('click', () => {
      d3.select(canvas)
        .transition()
        .duration(700)
        .ease(d3.easeCubicInOut)
        .call(zoom.transform, d3.zoomIdentity);
    });
  canvas.zoom = zoom;

}



function debugMsg(data) {
  let edges = data.edges;
  let nodes = data.nodes;
  let labelTextNodes = labelTexts.nodes();
  console.log(
    'zoom:',
    parseFloat(transform.k.toFixed(2)),
    '\n',
    'overlap:',
    // labelOverlap(labelTextNodesTmp),
    '\n',
    'crossings:',
    countCrossings(edges),
    '\n',
    'edge length:',
    parseFloat(
      idealEdgeLengthPreservation2(edges, edges.map(e => e.weight))
      .toFixed(4)
    ),
    '\n',
    'label area:',
    parseFloat(areaCoverage(labelTextNodes).toFixed(6)),
    '\n',
  );
}



// function evalMsg(nodes, edges, labelTexts, counts = undefined) {
//   if (counts === undefined) {
//     counts = Array.from(new Set(nodes.map(d => d.nodeCount)));
//     counts.sort((a, b) => a - b);
//   }
//   let dl = []; // desired (edge) length
//   let cm = []; // compactness / area utilization
//   // for(let level=1; level <= maxLevel; level++){
//   for (let nc of counts) {
//     // let edgesTmp = edges.filter(e=>e.source.level <= level && e.target.level <= level);
//     // let nodesTmp = nodes.filter(d=>d.level <= level);
//     // let bboxesTmp = labelTexts.filter(d=>d.level<=level).nodes().map(d=>d.getBoundingClientRect());

//     let edgesTmp = edges.filter(e => e.source.nodeCount <= nc && e.target.nodeCount <= nc);
//     let nodesTmp = nodes.filter(d => d.nodeCount <= nc);
//     let bboxesTmp = labelTexts.filter(d => d.nodeCount <= nc).nodes().map(d => d.getBoundingClientRect());
//     let idealEdgeLength = bestIdealEdgeLengthPreservation(edgesTmp, edgesTmp.map(e => e.weight));
//     let [scale, area] = areaUtilization(bboxesTmp);

//     dl.push(idealEdgeLength);
//     cm.push(area);
//     console.log(
//       'node count:', nc, '\n',
//       'edge length:', parseFloat(idealEdgeLength.toFixed(4)), '\n',
//       'area utilization:', parseFloat(area.toFixed(6)), 'at zoom', scale, '\n',
//     );
//   }

//   let table = '';
//   for (let i = 0; i < dl.length; i++) {
//     table += `\\textbf{$T_${i+1}$} & ${dl[i].toFixed(2)} & ${cm[i].toFixed(4)}\\\\ \\hline \n`;
//     table += `${i+1} & ${dl[i].toFixed(2)} & ${cm[i].toFixed(4)} \\\\hline]\n`;
//   }
//   console.log(table);
// }


// //--------functions----------
function preprocess(data, nodes) {

  data.nodes = [];
  for (let i = 0; i < data.node_id.length; i++) {
    data.nodes[i] = {};
    for (let k in data) {
      if (k.slice(0, 5) === 'node_') {
        data.nodes[i][k.slice(5)] = data[k][i];
      }
    }
  }
  if (nodes !== undefined) {
    if (nodes[0].nodeCount === undefined) {
      nodes.forEach((d, i) => {
        d.nodeCount = data.node_nodeCount[i];
      });
    }
    if (nodes[0].weight === undefined) {
      nodes.forEach((d, i) => {
        d.weight = data.node_weight[i];
      });
    }
    if (nodes[0].perplexity === undefined) {
      nodes.forEach((d, i) => {
        d.perplexity = data.node_perplexity[i];
      });
    }
    data.nodes0 = data.nodes;
    data.nodes = nodes;
  }

  let cx = d3.mean(data.nodes, d => d.x);
  let cy = d3.mean(data.nodes, d => d.y);
  for (let n of data.nodes) {
    n.x -= cx;
    n.y -= cy;
  }

  data.edges = [];
  for (let i = 0; i < data.edge_source.length; i++) {
    data.edges[i] = {};
    for (let k in data) {
      if (k.slice(0, 5) === 'edge_') {
        data.edges[i][k.slice(5)] = data[k][i];
      }
    }
  }

  if (data.virtual_edge_source !== undefined) {
    data.virtual_edges = [];
    for (let i = 0; i < data.virtual_edge_source.length; i++) {
      data.virtual_edges[i] = {};
      for (let k in data) {
        if (k.slice(0, 13) === 'virtual_edge_') {
          data.virtual_edges[i][k.slice(13)] = data[k][i];
        }
      }
    }
  }

  let prescale_pos = 1;
  let prescale_weight = 1;

  data.id2index = {};
  data.nodes.forEach((d, i) => {
    if (d.x === undefined) {
      d.x = Math.random() * 100;
      d.y = Math.random() * 100;
      d.x *= prescale_pos;
      d.y *= prescale_pos;
    } else {
      d.x *= prescale_pos;
      d.y *= prescale_pos;
      d.xInit = d.x;
      d.yInit = d.y;
    }
    d.init_pos = [d.x, d.y];
    d.index = i;
    data.id2index[d.id] = d.index;
    d.label = d.label.slice(0, 16);
    d.norm = Math.sqrt(d.x * d.x + d.y * d.y);
    d.update = IS_PROGRESSIVE ? window.enabledNodes.has(d.id) : true;
  });
  data.node_center = math.mean(data.nodes.map(d => [d.x, d.y]), 0);


  //preprocess edges
  // let nodeIds = data.nodes.map(d=>d.id);
  for (let e of data.edges) {
    e.source = data.nodes[data.id2index[e.source]];
    e.target = data.nodes[data.id2index[e.target]];
    e.weight *= prescale_weight;
  }

  // data.edgeIncidence = new Set();
  // for(let i=0; i<data.edges.length; i++){
  //   let e0 = data.edges[i];
  //   for(let j=i+1; j<data.edges.length; j++){
  //     let e1 = data.edges[j];
  //     let isIncident = e0.source.id === e1.source.id 
  //       || e0.source.id === e1.target.id 
  //       || e0.target.id === e1.source.id 
  //       || e0.target.id === e1.target.id;
  //     if(isIncident){
  //       data.edgeIncidence.add(`${e0.source.id}-${e0.target.id}-${e1.source.id}-${e1.target.id}`);
  //       data.edgeIncidence.add(`${e1.source.id}-${e1.target.id}-${e0.source.id}-${e0.target.id}`);
  //     }
  //   }
  // }

  // data.virtual_edges = data.virtual_edges.filter(e=>e.hops <= 10);
  if (data.virtual_edges !== undefined) {
    for (let e of data.virtual_edges) {
      e.source = data.nodes[data.id2index[e.source]];
      e.target = data.nodes[data.id2index[e.target]];
      e.weight *= prescale_weight;
    }
  }

}


function pos(nodes) {
  nodes = nodes.map(d => ({
    id: d.id,
    x: d.x,
    y: d.y,
    label: d.label,
    level: d.level,
    parent: d.parent,
    nodeCount: d.nodeCount,
    weight: d.weight,
  }));
  return nodes;
}


// function l2k(l){
//   let k = l*1.5-1;
//   return 1;
// }
let l2k = d3.scaleLinear()
  .domain([1, 4])
  .range([2, 8]);

function sa(level, currentZoom) {
  let alpha = 1;
  if (l2k(level) > currentZoom) {
    alpha = 0.1;
  }
  if (level == l2k.domain()[0] && currentZoom <= l2k.range()[0]) {
    alpha = 1;
  }
  return 1.0;
  // return alpha;
}


function markCrossing(edges) {
  for (let i = 0; i < edges.length; i++) {
    edges[i].crossed = false;
  }
  for (let i = 0; i < edges.length; i++) {
    let e0 = edges[i];
    for (let j = i + 1; j < edges.length; j++) {
      let e1 = edges[j];
      let isIncident = e0.source.id == e1.source.id ||
        e0.source.id == e1.target.id ||
        e0.target.id == e1.source.id ||
        e0.target.id == e1.target.id;
      if (!isIncident && isCrossed(e0, e1)) {
        e0.crossed = true;
        e1.crossed = true;
      }
    }
  }
}


let mlbo = {};

function markLabelByOverlap(nodes, canvas) {
  // updateBbox(nodes, canvas);
  let bboxes = nodes.map(d => d.bbox);
  let sx = canvas.scales.sx;
  let sy = canvas.scales.sy;
  if (mlbo.nodes === undefined) {
    mlbo.nodes = nodes.slice().sort((a, b) => a.level - b.level); //INPLACE REORDERED
    mlbo.rx = d3.max(bboxes, d => d.width);
    mlbo.ry = d3.max(bboxes, d => d.height);
  }
  let [rx, ry] = [mlbo.rx, mlbo.ry];
  nodes = mlbo.nodes;

  let tree = d3.quadtree(nodes, (d) => sx(d.x), (d) => sy(d.y));

  let shown = new Set(nodes.filter(d => d.shouldShowLabel).map(d => d.index));
  for (let ni of nodes) {
    if (shown.has(ni.index)) {
      continue;
    } else {
      let x = ni.bbox.cx;
      let y = ni.bbox.cy;
      if (x < 0 || x > canvas.width ||
        y < 0 || y > canvas.height
      ) {
        continue;
      } else {
        let neighbors = searchQuadtree(tree, (d) => sx(d.x), (d) => sy(d.y), x - rx, x + rx, y - ry, y + ry);
        neighbors = new Set(neighbors);
        let a, b;
        if (neighbors.size < shown.size) {
          [a, b] = [neighbors, shown];
        } else {
          [a, b] = [shown, neighbors];
        }
        let shouldShow = true;
        for (let j of a) {
          if (b.has(j)) {
            if (isRectCollide(bboxes[ni.index], bboxes[j])) {
              shouldShow = false;
              break;
            }
          }
        }
        if (shouldShow) {
          ni.shouldShowLabel = true;
          shown.add(ni.index);
        }
      }
    }
  }
}


function draw(label = true, forceLabel = false, markOverlap = true) {
  // this being the canvas;
  let ctx = this.context;
  let data = this.data;
  // if (this.data.nodesByLevel === undefined) {
  //   this.data.nodesByLevel = data.nodes.slice().sort((a, b) => a.level - b.level);
  // }
  ctx.clearRect(0, 0, this.width, this.height);
  let nodes = this.data.nodes;
  let edges = this.data.edges;
  drawEdges(ctx, edges, this.scales, this.transform);
  drawNodes(ctx, nodes, this.scales, this.transform, label, forceLabel, markOverlap);
}


function markLabelByLevel(nodes, levelScalePairs, currentZoomScale) {
  let scale = currentZoomScale;
  let showLevel = 0;
  for (ls of levelScalePairs) {
    if (ls[1] < currentZoomScale) {
      showLevel = ls[0];
    }
  }
  for (let n of nodes) {
    if (n.level <= forceLabelLevel || n.labelScale <= currentZoomScale) {
      n.shouldShowLabel = true;
    } else {
      n.shouldShowLabel = false;
    }
  }
}


function drawNodes(ctx, nodes, scales, transform, label, forceLabel, markOverlap, drawOval = false) {
  if (label) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#fff';
    ctx.lineJoin = 'round';
    // ctx.shadowOffsetX = 0;
    // ctx.shadowOffsetY = 0;
    // ctx.shadowColor = "rgba(255,255,255,1)";
    // ctx.shadowBlur = 2;
  }

  //draw nodes
  // ctx.globalAlpha = 1.0;
  ctx.fillStyle = '#08306b';
  let k = Math.pow(transform.k, 1 / 2) * DPR;
  for (let n of nodes) {
    let x = n.bbox.cx;
    let y = n.bbox.cy;
    let r = n.r * k;

    ctx.globalAlpha = n.update ? 1.0 : HIDDEN_NODE_ALPHA;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r, 0, 0, 2 * Math.PI);
    ctx.fill();
  }



  //draw text
  if (label) {
    let l0 = -1;
    for (let n of nodes.filter(d => d.shouldShowLabel)) {
      let x = n.bbox.cx;
      let y = n.bbox.cy;
      let l = n.l;
      //draw bbox
      // ctx.globalAlpha = 0.3; 
      // ctx.fillStyle = '#08306b';
      // ctx.beginPath();
      // ctx.rect(x*DPR-n.bbox.width*DPR/2, y*DPR-n.bbox.height*DPR/2, n.bbox.width*DPR, n.bbox.height*DPR);
      // ctx.fill();

      ctx.fillStyle = scales.sc(n.level);
      if (l0 != l) {
        ctx.font = scales.sf(n.level);
        l0 = l;
      }
      ctx.strokeStyle = '#fff';
      ctx.globalAlpha = n.update ? 1 : HIDDEN_LABEL_ALPHA;
      ctx.lineWidth = 8;
      ctx.strokeText(n.label, x, y);
      ctx.fillText(n.label, x, y);

      if (drawOval) {

        const margin = 2; //in pixel
        if (n.bbox !== undefined) {
          let x = n.bbox.cx;
          let y = n.bbox.cy;

          n.scaleY = Math.max(2, Math.min(n.bbox.width / n.bbox.height, 5)); //TODO fix it
          let [x0, y0] = [n.bbox.width / 2 * DPR, n.bbox.height / 2 * DPR];
          let a = Math.sqrt(x0 * x0 + y0 * y0 * n.scaleY * n.scaleY); //figure out the major axis (a) of the ellipse 
          let b = a / n.scaleY;
          a += margin;
          b += margin;

          ctx.globalAlpha = 1.0;
          ctx.fillStyle = '#08306b';
          ctx.strokeStyle = '#08306b';
          ctx.lineWidth = DPR;
          ctx.beginPath();
          ctx.ellipse(x, y, a, b, 0, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }
    }
  }
}


function drawEdges(ctx, edges, scales, transform) {
  ctx.strokeStyle = EDGE_COLOR;
  ctx.globalAlpha = 1.0;
  let k = Math.pow(transform.k, 1 / 4);
  for (let e of edges) {

    let x0 = e.source.bbox.cx;
    let y0 = e.source.bbox.cy;
    let x1 = e.target.bbox.cx;
    let y1 = e.target.bbox.cy;
    let lw = 0.5; //Math.max(0.5, scales.sr(Math.min(e.source.level, e.target.level)) / 2);
    ctx.lineWidth = lw * k * DPR;
    ctx.globalAlpha = e.source.update && e.target.update ? 1.0 : HIDDEN_EDGE_ALPHA;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
}