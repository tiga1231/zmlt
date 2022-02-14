from collections import OrderedDict
from time import time
import re
import json
from natsort import natsorted
from glob import glob
from pathlib import Path
import os, sys

import math
from random import random, shuffle, choice

# import pydot
import networkx as nx
from networkx.drawing.nx_pydot import graphviz_layout
from networkx.drawing.nx_pydot import read_dot

import numpy as np
from scipy.spatial import Delaunay

from matplotlib import collections  as mc
from tqdm import tqdm
import matplotlib.pyplot as plt
plt.style.use('ggplot')
plt.style.use('seaborn-colorblind')
from IPython.display import clear_output

nodePattern = re.compile('^(\d+) ')
edgePattern = re.compile('^(\d+) -- (\d+)')
attrsPattern = re.compile('\[(.+)\]')

def isNode(line):
    return '--' not in line


def processAttrs(line):
    attrs = attrsPattern.findall(line)
    if len(attrs) > 0:
        attrs = attrs[0].split(',')
    attrs = [a.split('=') for a in attrs]
    attrs = [[a[0].strip(), a[1].replace('"','').strip()] for a in attrs]
    for a in attrs:
        try:
            a[1] = int(a[1])
        except ValueError:
            try:
                a[1] = float(a[1])
            except:
                pass
    return attrs


def processEdge(line):
    finding = edgePattern.findall(line)[0]
    source, target = finding[:2]
    source, target = int(source), int(target)
    attrs = processAttrs(line)
    return dict(attrs, source=source, target=target)


def processNode(line):
    nodeId = int(line.split(' ')[0])
    nodeAttrs = processAttrs(line)
    return dict(nodeAttrs, id=nodeId)


def draw(g, pos, edges=True, labels=False, figsize=[8,8], s=2, lw=0.5):
    xy = np.array(list([pos[k] for k in g.nodes]))
    fig = plt.figure(figsize=figsize)
    ax = fig.subplots()
    
    ## nodes
    ax.scatter(xy[:,0], xy[:,1], s=s, zorder=3)
    
    ## edges
    if edges:
        lines = [[pos[i], pos[j]] for (i,j) in g.edges]
        lc = mc.LineCollection(lines, colors='grey', linewidths=lw)
        ax.add_collection(lc)
    ax.autoscale()
    ax.margins(0.1)
    plt.axis('equal')

    if labels:
        for i in g.nodes:
            plt.text(pos[i][0], pos[i][1], g.nodes[i]['label'])
    return ax
#     plt.figure(figsize=figsize)
#     nx.draw(
#         g, 
#         pos=pos,
#         node_size=10,
#         width=0.5,
#     )




def subtree_sizes(tree, root):
    tree = nx.bfs_tree(tree, source=root)
    s = [len(nx.bfs_tree(tree, i).nodes) for i in tree.neighbors(root)]
    total = sum(s)
    return np.array(s)


def normalize(node):
    for prop in node:
        if prop == 'pos':
            pos = node[prop].replace('"', '')
            pos = pos.split(',')
            pos = [float(pos[0]), float(pos[1])]
            node[prop] = pos
        else:
            if type(node[prop]) == str:
                node[prop] = node[prop].replace('"', '')
                
            try:
                node[prop] = int(node[prop])
            except ValueError:
                try:
                    node[prop] = float(node[prop])
                except ValueError:
                    pass
            except Exception as err:
                print(err)
                print(node, prop)

def edges2graph(lines, i2k=None, label2i=None):
    pattern = re.compile('"(.+)" -- "(.+)"')
    nodes = set()
    edges = set()
    for i,line in enumerate(lines):
        if len(line.strip()) > 0:
            edge = re.findall(pattern, line)[0]
            source, target = edge
            nodes.update([source, target])
            edges.add( (source, target) )
    
    if label2i is None:
        label2i = {k:i for i,k in enumerate(nodes)}
        i2k = list(range(len(nodes)))
    g = nx.Graph()
    
    nodes = [dict(id=label2i[k], label=k) for i,k in enumerate(nodes)]
    ids = [n['id'] for n in nodes]
    g.add_nodes_from( zip(ids, nodes) )
    
    edges = [(i2k[label2i[e[0]]],i2k[label2i[e[1]]]) for e in edges]
    g.add_edges_from(edges)
    return g, i2k, label2i

def fan(nodes, 
        origin=[0,0], radii=[], 
        phaseCenter=0, phaseRange=np.pi, 
        weights=[1,1], 
        mode='random'):
    pos = {}
    phases = {}
    ranges = {}
    n = len(nodes)
    cos, sin = np.cos, np.sin
    
    weightTotal = sum(weights)
    weights = [w/weightTotal for w in weights]
    
    nr = sorted(zip(nodes, weights, radii), key=lambda x:x[1])
    
    
    if mode == 'center':
        ## centralize heavy sub trees
        nr2 = []
        for i in list(range(len(nr)))[::-1]:
            if i%2 == 0:
                nr2.append(nr[i])
            else:
                nr2.insert(0, nr[i])
    elif mode == 'polar':
        ## polarize heavy sub trees
        nr2 = []
        for i in range(len(nr)):
            if i%2 == 0:
                nr2.append(nr[i])
            else:
                nr2.insert(0, nr[i])
    elif mode == 'random':
        shuffle(nr)
        nr2 = nr
    elif mode == 'interleave':
        a = nr[::2]
        b = nr[1::2][::-1]
        if len(a)==len(b):
            nr2 = sum(zip(a,b), tuple())
        else:
            nr2 = sum(zip(a,b+[-1,]), tuple())[:-1]
            
    elif mode == 'ordered':
        nr2 = nr
        
    nodes, weights, radii = zip(*nr2)
    
    weightCumSum = [sum(weights[:i]) for i in range(len(weights)+1)]
    for i in range(n):
        angle_offset = (weightCumSum[i]+weightCumSum[i+1])/2 * phaseRange
        angle_i = phaseCenter - phaseRange/2 + angle_offset
        ri = radii[i]
        pos[nodes[i]] = [origin[0] + ri*cos(angle_i), origin[1] + ri*sin(angle_i)]
        phases[nodes[i]] = angle_i
        ranges[nodes[i]] = weights[i] * phaseRange * 0.9
    return pos, phases, ranges


def radial_layout(g, root=None, mode='center', origin=[0,0], phase0=0, range0=np.pi*2):
    g0 = g
    g = nx.bfs_tree(g, source=root)
    pos = {}
    phases = {}
    ranges = {}
    depth_from_root = nx.shortest_path_length(g, root)
    if root is None:
        root = next(iter(g.nodes))
    pos[root] = origin
    phases[root] = phase0
    ranges[root] = range0
    roots = [root, ]
    depth = 1
    while len(pos) < len(g.nodes):
        newRoots = []
        for root in roots:
            if mode=='ordered':
                neighbors = [n for n in g0.nodes[root]['neighbor_order'] if n not in pos]
            else:
                neighbors = [n for n in g.neighbors(root) if n not in pos]
            if len(neighbors) > 0:
                edge_lengths = [g0.edges[(root, n)]['weight'] for n in neighbors]
                subTreeSizes = [len(nx.bfs_tree(g, i).nodes) for i in neighbors]
                degrees = [g.degree[i] for i in neighbors]
                depths = [depth_from_root[i] for i in neighbors]
#                 weights = [(x*z/y**2) for x, y, z in zip(degrees, depths, subTreeSizes)]
                weights = [z for x, y, z in zip(degrees, depths, subTreeSizes)]
#                 neighborSizes = [len(list(g0.neighbors(i))) for i in neighbors]
                newRoots += neighbors
                newPos, newPhases, newRanges = fan(
                    neighbors, 
                    mode=mode,
#                     origin=pos[root], radii=edge_lengths, #mode: Reyan
                    origin=origin, radii=[depth for e in edge_lengths],#mode: mw
                    phaseCenter=phases[root], 
                    phaseRange=ranges[root], 
                    weights=weights,
                )
                pos.update(newPos)
                phases.update(newPhases)
                ranges.update(newRanges)
        roots = newRoots
        depth+=1
    return pos


def rotate(pos0, theta=0):
    cos = math.cos(theta)
    sin = math.sin(theta)
    pos = {}
    for k in pos0:
        p = pos0[k]
        pos[k] = (p[0]*cos-p[1]*sin, p[0]*sin+p[1]*cos)
    return pos



def neighbor_order(nodeId, parentId, neighbors, pos):
    v = np.array([pos[i] for i in neighbors]) - np.array([pos[nodeId]])
    a = np.angle(v[:,0] + 1j * v[:,1])
    order = [neighbors[o] for o in np.argsort(a)]
    if parentId is not None:
        order = np.roll(order, -order.index(parentId))
    return order








if len(sys.argv)>=2:
    dir_in = sys.argv[1]
else:
    dir_in = './data/txt/lastfm_small'
fns = natsorted(glob(f'{dir_in}/*.txt'))
levels = list(range(1, len(fns)+1))
maxLevel = max(*levels)

# fn_out = Path('out.json')
if len(sys.argv)>=3:
    fn_out = Path(sys.argv[2])
else:
    fn_out = Path('out.json')
dir_out = fn_out.parent


## linear increment
baseWeight = 200
if 'topics_steiner' in fns[0]:
    increment = 50
elif 'tol_graphs' in fns[0]:
    increment = 50
else:
    increment = 50
weights = [baseWeight+(maxLevel-l)*increment for l in levels]
weights = [w/200 for w in weights]

## exponential increment
# baseWeight = 1
# maxWeight = 1
# incrementFactor = maxWeight**(1/(maxLevel-1))
# weights = [baseWeight*incrementFactor**(maxLevel-l) for l in levels]

list(zip(fns,levels,weights))


for i, (fn, level, weight) in list(enumerate(zip(fns, levels, weights)))[::-1]:
    
    with open(fn) as f:
        if level == maxLevel:
            subgraph, i2k, label2i = edges2graph(f.readlines())
            g = subgraph
        else:
            subgraph,_,_ = edges2graph(f.readlines(), i2k, label2i)
        nodeCount = len(subgraph)
        print(fn, level, nodeCount, weight)
    
        for n in subgraph.nodes:
            g.nodes[n]['level'] = level
            g.nodes[n]['nodeCount'] = nodeCount
            g.nodes[n]['weight'] = weight

        for e in subgraph.edges:
            g.edges[e]['level'] = level
            g.edges[e]['weight'] = weight


print('all_pairs_shortest_path...')
apsp = nx.all_pairs_dijkstra_path_length(g, weight='weight')
d = np.zeros([len(g.nodes),len(g.nodes)])
for dk in tqdm(apsp):
    source = dk[0]
    target_dist = dk[1]
    d[source,:] = [target_dist[i] for i in range(len(g.nodes))]
    
    
print('k-hop all_pairs_shortest_path...')
apsp = nx.all_pairs_dijkstra_path_length(g, weight=1)
hops = np.zeros([len(g.nodes),len(g.nodes)])
for dk in tqdm(apsp):
    source = dk[0]
    target_dist = dk[1]
    hops[source,:] = [target_dist[i] for i in range(len(g.nodes))]

fn = fns[-1]



# %%time

init_layout = 'radial'
# init_layout = 'sfdp-ordered-radial'
# init_layout = 'sfdp'


# # pos0 = nx.layout.planar_layout(g, scale=40)
# # pos0 = graphviz_layout(g, prog="dot", root=list(g.nodes)[0])
# # pos0 = graphviz_layout(g, prog='twopi')

t0 = time()
if init_layout == 'sfdp':
    g1 = nx.Graph(g)
    for i in g1.nodes:
        g1.nodes[i]['label'] = ''
    pos0 = graphviz_layout(g1, prog='sfdp')
    
    
elif init_layout == 'radial':
    root = list(g.nodes)[np.argmin(d.max(axis=1))] ##large-depth node
#     root = choice(list(g.nodes)) ##random node
    
#     root = nx.center(g)[0]
#     root = 1949 ##tree-of-life 3000-nodes
#     root = 1143
    pos0 = radial_layout(g, root, mode='center')
#     pos0 = rotate(pos0, -math.pi*0.5)


elif init_layout == 'sfdp-ordered-radial':
    
    
    ##remove label to avoid parsing bug of sfdp
    g1 = nx.Graph(g)
    for i in g1.nodes:
        g1.nodes[i]['label'] = '' 
        
    pos_sfdp = graphviz_layout(g1, prog='sfdp')
    draw(g, pos_sfdp, s=1, lw=1, labels=False, figsize=[8,8])
#     center = np.array(list(pos_sfdp.values())).mean(0)
#     root = min([p for p in pos_sfdp.items()], key=lambda x:np.linalg.norm(x[1]-center))[0]
    root = list(g.nodes)[np.argmin(d.max(axis=1))] ##large-depth node
    root = 1949 ##tree-of-life 3000-nodes
#     root = nx.center(g)[0]
    bfs = nx.bfs_tree(g, root)
    for nodeId in g:
        try:
            parentId = next(bfs.predecessors(nodeId))
        except StopIteration:
            parentId = None
        neighbors = list(g.neighbors(nodeId))
        g.nodes[nodeId]['neighbor_order'] = neighbor_order(nodeId, parentId, neighbors, pos_sfdp)
    
    pos0 = radial_layout(g, root, mode='ordered')
    


dt = time() - t0
print(f'{dt} sec')


# pos0 = rotate(pos0, math.pi/180* 80)
# draw(g, pos0, s=1, lw=1, labels=False, figsize=[24,24])
# plt.show()




node_order = list(g.nodes)
bfs = nx.bfs_tree(g, root)
##bfs ordering
node_order = list(bfs) 


pos = pos0.copy()
# s = 3
# pos = {k:list(np.array(v)*s) for k,v in pos.items()}


if not Path(dir_out).exists():
    os.makedirs(Path(dir_out))
else:
    print(Path(dir_out), 'exists')
fn_out


for n in g.nodes:
    if 'neighbor_order' in g.nodes[n]:
        del g.nodes[n]['neighbor_order']
    else:
        break



###graph to list
nodes = {k: g.nodes[k] for k in g.nodes}
edges = [[e[0], e[1], g.edges[e]] for e in g.edges]

nodes = [{
    'id': node_order[i],
    'index': i,
    'x': float(pos[node_order[i]][0]),
    'y': float(pos[node_order[i]][1]),
    'neighbors': list(nx.neighbors(g, node_order[i])),
    'perplexity': len(list(nx.neighbors(g, node_order[i]))),
    **nodes[node_order[i]]
} for i in range(len(nodes))]

edges = [{
    'source': e[0],
    'target': e[1],
    **e[2]
} for e in edges]



##store the position & perplexity
for i,node in enumerate(nodes):
    try: 
        parent = next(bfs.predecessors(node['id']))
    except StopIteration:
        parent = None
    node['parent'] = parent

hopThresh = 6
virtual_edges = []
for i in tqdm(range(len(nodes))):
    for j in range(i+1, len(nodes)):
        if d[i,j] == 0:
            print(f'[warning] d[{i},{j}] = 0')
        else:
            if hops[i,j] < hopThresh or random() < 1:
                dij = d[i,j]
                e = {
                    'source': i2k[i],
                    'target': i2k[j],
                    'weight': dij,
                    'hops': hops[i,j]
                }
                virtual_edges.append(e)
            else:
                continue
            
            


res = {}
for k in nodes[0]:
    # print(k)
    res[f'node_{k}'] = [n[k] for n in nodes]
for k in edges[0]:
    res[f'edge_{k}'] = [e[k] for e in edges]

print(fn_out)
# with open(fn_out+'-min.json', 'w') as f:
#     json.dump(res, f, indent=2)
    
for k in virtual_edges[0]:
    res[f'virtual_edge_{k}'] = [ve[k] for ve in virtual_edges]

print(f'writing {fn_out}...')
# with open(fn_out+'.json', 'w') as f:
with open(fn_out, 'w') as f:
    json.dump(res, f, indent=2)

print('done!')


