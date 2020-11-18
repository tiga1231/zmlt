(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.findIntersections = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.avl = factory());
}(this, (function () { 'use strict';

/**
 * Prints tree horizontally
 * @param  {Node}                       root
 * @param  {Function(node:Node):String} [printNode]
 * @return {String}
 */
function print (root, printNode) {
  if ( printNode === void 0 ) printNode = function (n) { return n.key; };

  var out = [];
  row(root, '', true, function (v) { return out.push(v); }, printNode);
  return out.join('');
}

/**
 * Prints level of the tree
 * @param  {Node}                        root
 * @param  {String}                      prefix
 * @param  {Boolean}                     isTail
 * @param  {Function(in:string):void}    out
 * @param  {Function(node:Node):String}  printNode
 */
function row (root, prefix, isTail, out, printNode) {
  if (root) {
    out(("" + prefix + (isTail ? '└── ' : '├── ') + (printNode(root)) + "\n"));
    var indent = prefix + (isTail ? '    ' : '│   ');
    if (root.left)  { row(root.left,  indent, false, out, printNode); }
    if (root.right) { row(root.right, indent, true,  out, printNode); }
  }
}


/**
 * Is the tree balanced (none of the subtrees differ in height by more than 1)
 * @param  {Node}    root
 * @return {Boolean}
 */
function isBalanced(root) {
  if (root === null) { return true; } // If node is empty then return true

  // Get the height of left and right sub trees
  var lh = height(root.left);
  var rh = height(root.right);

  if (Math.abs(lh - rh) <= 1 &&
      isBalanced(root.left)  &&
      isBalanced(root.right)) { return true; }

  // If we reach here then tree is not height-balanced
  return false;
}

/**
 * The function Compute the 'height' of a tree.
 * Height is the number of nodes along the longest path
 * from the root node down to the farthest leaf node.
 *
 * @param  {Node} node
 * @return {Number}
 */
function height(node) {
  return node ? (1 + Math.max(height(node.left), height(node.right))) : 0;
}

// function createNode (parent, left, right, height, key, data) {
//   return { parent, left, right, balanceFactor: height, key, data };
// }

/**
 * @typedef {{
 *   parent:        ?Node,
 *   left:          ?Node,
 *   right:         ?Node,
 *   balanceFactor: number,
 *   key:           Key,
 *   data:          Value
 * }} Node
 */

/**
 * @typedef {*} Key
 */

/**
 * @typedef {*} Value
 */

/**
 * Default comparison function
 * @param {Key} a
 * @param {Key} b
 * @returns {number}
 */
function DEFAULT_COMPARE (a, b) { return a > b ? 1 : a < b ? -1 : 0; }


/**
 * Single left rotation
 * @param  {Node} node
 * @return {Node}
 */
function rotateLeft (node) {
  var rightNode = node.right;
  node.right    = rightNode.left;

  if (rightNode.left) { rightNode.left.parent = node; }

  rightNode.parent = node.parent;
  if (rightNode.parent) {
    if (rightNode.parent.left === node) {
      rightNode.parent.left = rightNode;
    } else {
      rightNode.parent.right = rightNode;
    }
  }

  node.parent    = rightNode;
  rightNode.left = node;

  node.balanceFactor += 1;
  if (rightNode.balanceFactor < 0) {
    node.balanceFactor -= rightNode.balanceFactor;
  }

  rightNode.balanceFactor += 1;
  if (node.balanceFactor > 0) {
    rightNode.balanceFactor += node.balanceFactor;
  }
  return rightNode;
}


function rotateRight (node) {
  var leftNode = node.left;
  node.left = leftNode.right;
  if (node.left) { node.left.parent = node; }

  leftNode.parent = node.parent;
  if (leftNode.parent) {
    if (leftNode.parent.left === node) {
      leftNode.parent.left = leftNode;
    } else {
      leftNode.parent.right = leftNode;
    }
  }

  node.parent    = leftNode;
  leftNode.right = node;

  node.balanceFactor -= 1;
  if (leftNode.balanceFactor > 0) {
    node.balanceFactor -= leftNode.balanceFactor;
  }

  leftNode.balanceFactor -= 1;
  if (node.balanceFactor < 0) {
    leftNode.balanceFactor += node.balanceFactor;
  }

  return leftNode;
}


// function leftBalance (node) {
//   if (node.left.balanceFactor === -1) rotateLeft(node.left);
//   return rotateRight(node);
// }


// function rightBalance (node) {
//   if (node.right.balanceFactor === 1) rotateRight(node.right);
//   return rotateLeft(node);
// }


var AVLTree = function AVLTree (comparator, noDuplicates) {
  if ( noDuplicates === void 0 ) noDuplicates = false;

  this._comparator = comparator || DEFAULT_COMPARE;
  this._root = null;
  this._size = 0;
  this._noDuplicates = !!noDuplicates;
};

var prototypeAccessors = { size: {} };


/**
 * Clear the tree
 * @return {AVLTree}
 */
AVLTree.prototype.destroy = function destroy () {
  this._root = null;
  return this;
};

/**
 * Number of nodes
 * @return {number}
 */
prototypeAccessors.size.get = function () {
  return this._size;
};


/**
 * Whether the tree contains a node with the given key
 * @param{Key} key
 * @return {boolean} true/false
 */
AVLTree.prototype.contains = function contains (key) {
  if (this._root){
    var node     = this._root;
    var comparator = this._comparator;
    while (node){
      var cmp = comparator(key, node.key);
      if    (cmp === 0) { return true; }
      else if (cmp < 0) { node = node.left; }
      else              { node = node.right; }
    }
  }
  return false;
};


/* eslint-disable class-methods-use-this */

/**
 * Successor node
 * @param{Node} node
 * @return {?Node}
 */
AVLTree.prototype.next = function next (node) {
  var successor = node;
  if (successor) {
    if (successor.right) {
      successor = successor.right;
      while (successor && successor.left) { successor = successor.left; }
    } else {
      successor = node.parent;
      while (successor && successor.right === node) {
        node = successor; successor = successor.parent;
      }
    }
  }
  return successor;
};


/**
 * Predecessor node
 * @param{Node} node
 * @return {?Node}
 */
AVLTree.prototype.prev = function prev (node) {
  var predecessor = node;
  if (predecessor) {
    if (predecessor.left) {
      predecessor = predecessor.left;
      while (predecessor && predecessor.right) { predecessor = predecessor.right; }
    } else {
      predecessor = node.parent;
      while (predecessor && predecessor.left === node) {
        node = predecessor;
        predecessor = predecessor.parent;
      }
    }
  }
  return predecessor;
};
/* eslint-enable class-methods-use-this */


/**
 * Callback for forEach
 * @callback forEachCallback
 * @param {Node} node
 * @param {number} index
 */

/**
 * @param{forEachCallback} callback
 * @return {AVLTree}
 */
AVLTree.prototype.forEach = function forEach (callback) {
  var current = this._root;
  var s = [], done = false, i = 0;

  while (!done) {
    // Reach the left most Node of the current Node
    if (current) {
      // Place pointer to a tree node on the stack
      // before traversing the node's left subtree
      s.push(current);
      current = current.left;
    } else {
      // BackTrack from the empty subtree and visit the Node
      // at the top of the stack; however, if the stack is
      // empty you are done
      if (s.length > 0) {
        current = s.pop();
        callback(current, i++);

        // We have visited the node and its left
        // subtree. Now, it's right subtree's turn
        current = current.right;
      } else { done = true; }
    }
  }
  return this;
};


/**
 * Returns all keys in order
 * @return {Array<Key>}
 */
AVLTree.prototype.keys = function keys () {
  var current = this._root;
  var s = [], r = [], done = false;

  while (!done) {
    if (current) {
      s.push(current);
      current = current.left;
    } else {
      if (s.length > 0) {
        current = s.pop();
        r.push(current.key);
        current = current.right;
      } else { done = true; }
    }
  }
  return r;
};


/**
 * Returns `data` fields of all nodes in order.
 * @return {Array<Value>}
 */
AVLTree.prototype.values = function values () {
  var current = this._root;
  var s = [], r = [], done = false;

  while (!done) {
    if (current) {
      s.push(current);
      current = current.left;
    } else {
      if (s.length > 0) {
        current = s.pop();
        r.push(current.data);
        current = current.right;
      } else { done = true; }
    }
  }
  return r;
};


/**
 * Returns node at given index
 * @param{number} index
 * @return {?Node}
 */
AVLTree.prototype.at = function at (index) {
  // removed after a consideration, more misleading than useful
  // index = index % this.size;
  // if (index < 0) index = this.size - index;

  var current = this._root;
  var s = [], done = false, i = 0;

  while (!done) {
    if (current) {
      s.push(current);
      current = current.left;
    } else {
      if (s.length > 0) {
        current = s.pop();
        if (i === index) { return current; }
        i++;
        current = current.right;
      } else { done = true; }
    }
  }
  return null;
};


/**
 * Returns node with the minimum key
 * @return {?Node}
 */
AVLTree.prototype.minNode = function minNode () {
  var node = this._root;
  if (!node) { return null; }
  while (node.left) { node = node.left; }
  return node;
};


/**
 * Returns node with the max key
 * @return {?Node}
 */
AVLTree.prototype.maxNode = function maxNode () {
  var node = this._root;
  if (!node) { return null; }
  while (node.right) { node = node.right; }
  return node;
};


/**
 * Min key
 * @return {?Key}
 */
AVLTree.prototype.min = function min () {
  var node = this._root;
  if (!node) { return null; }
  while (node.left) { node = node.left; }
  return node.key;
};


/**
 * Max key
 * @return {?Key}
 */
AVLTree.prototype.max = function max () {
  var node = this._root;
  if (!node) { return null; }
  while (node.right) { node = node.right; }
  return node.key;
};


/**
 * @return {boolean} true/false
 */
AVLTree.prototype.isEmpty = function isEmpty () {
  return !this._root;
};


/**
 * Removes and returns the node with smallest key
 * @return {?Node}
 */
AVLTree.prototype.pop = function pop () {
  var node = this._root, returnValue = null;
  if (node) {
    while (node.left) { node = node.left; }
    returnValue = { key: node.key, data: node.data };
    this.remove(node.key);
  }
  return returnValue;
};


/**
 * Find node by key
 * @param{Key} key
 * @return {?Node}
 */
AVLTree.prototype.find = function find (key) {
  var root = this._root;
  // if (root === null)  return null;
  // if (key === root.key) return root;

  var subtree = root, cmp;
  var compare = this._comparator;
  while (subtree) {
    cmp = compare(key, subtree.key);
    if    (cmp === 0) { return subtree; }
    else if (cmp < 0) { subtree = subtree.left; }
    else              { subtree = subtree.right; }
  }

  return null;
};


/**
 * Insert a node into the tree
 * @param{Key} key
 * @param{Value} [data]
 * @return {?Node}
 */
AVLTree.prototype.insert = function insert (key, data) {
    var this$1 = this;

  if (!this._root) {
    this._root = {
      parent: null, left: null, right: null, balanceFactor: 0,
      key: key, data: data
    };
    this._size++;
    return this._root;
  }

  var compare = this._comparator;
  var node  = this._root;
  var parent= null;
  var cmp   = 0;

  if (this._noDuplicates) {
    while (node) {
      cmp = compare(key, node.key);
      parent = node;
      if    (cmp === 0) { return null; }
      else if (cmp < 0) { node = node.left; }
      else              { node = node.right; }
    }
  } else {
    while (node) {
      cmp = compare(key, node.key);
      parent = node;
      if    (cmp <= 0){ node = node.left; } //return null;
      else              { node = node.right; }
    }
  }

  var newNode = {
    left: null,
    right: null,
    balanceFactor: 0,
    parent: parent, key: key, data: data
  };
  var newRoot;
  if (cmp <= 0) { parent.left= newNode; }
  else       { parent.right = newNode; }

  while (parent) {
    cmp = compare(parent.key, key);
    if (cmp < 0) { parent.balanceFactor -= 1; }
    else       { parent.balanceFactor += 1; }

    if      (parent.balanceFactor === 0) { break; }
    else if (parent.balanceFactor < -1) {
      // inlined
      //var newRoot = rightBalance(parent);
      if (parent.right.balanceFactor === 1) { rotateRight(parent.right); }
      newRoot = rotateLeft(parent);

      if (parent === this$1._root) { this$1._root = newRoot; }
      break;
    } else if (parent.balanceFactor > 1) {
      // inlined
      // var newRoot = leftBalance(parent);
      if (parent.left.balanceFactor === -1) { rotateLeft(parent.left); }
      newRoot = rotateRight(parent);

      if (parent === this$1._root) { this$1._root = newRoot; }
      break;
    }
    parent = parent.parent;
  }

  this._size++;
  return newNode;
};


/**
 * Removes the node from the tree. If not found, returns null.
 * @param{Key} key
 * @return {?Node}
 */
AVLTree.prototype.remove = function remove (key) {
    var this$1 = this;

  if (!this._root) { return null; }

  var node = this._root;
  var compare = this._comparator;
  var cmp = 0;

  while (node) {
    cmp = compare(key, node.key);
    if    (cmp === 0) { break; }
    else if (cmp < 0) { node = node.left; }
    else              { node = node.right; }
  }
  if (!node) { return null; }

  var returnValue = node.key;
  var max, min;

  if (node.left) {
    max = node.left;

    while (max.left || max.right) {
      while (max.right) { max = max.right; }

      node.key = max.key;
      node.data = max.data;
      if (max.left) {
        node = max;
        max = max.left;
      }
    }

    node.key= max.key;
    node.data = max.data;
    node = max;
  }

  if (node.right) {
    min = node.right;

    while (min.left || min.right) {
      while (min.left) { min = min.left; }

      node.key= min.key;
      node.data = min.data;
      if (min.right) {
        node = min;
        min = min.right;
      }
    }

    node.key= min.key;
    node.data = min.data;
    node = min;
  }

  var parent = node.parent;
  var pp   = node;
  var newRoot;

  while (parent) {
    if (parent.left === pp) { parent.balanceFactor -= 1; }
    else                  { parent.balanceFactor += 1; }

    if      (parent.balanceFactor < -1) {
      // inlined
      //var newRoot = rightBalance(parent);
      if (parent.right.balanceFactor === 1) { rotateRight(parent.right); }
      newRoot = rotateLeft(parent);

      if (parent === this$1._root) { this$1._root = newRoot; }
      parent = newRoot;
    } else if (parent.balanceFactor > 1) {
      // inlined
      // var newRoot = leftBalance(parent);
      if (parent.left.balanceFactor === -1) { rotateLeft(parent.left); }
      newRoot = rotateRight(parent);

      if (parent === this$1._root) { this$1._root = newRoot; }
      parent = newRoot;
    }

    if (parent.balanceFactor === -1 || parent.balanceFactor === 1) { break; }

    pp   = parent;
    parent = parent.parent;
  }

  if (node.parent) {
    if (node.parent.left === node) { node.parent.left= null; }
    else                         { node.parent.right = null; }
  }

  if (node === this._root) { this._root = null; }

  this._size--;
  return returnValue;
};


/**
 * Bulk-load items
 * @param{Array<Key>}keys
 * @param{Array<Value>}[values]
 * @return {AVLTree}
 */
AVLTree.prototype.load = function load (keys, values) {
    var this$1 = this;
    if ( keys === void 0 ) keys = [];
    if ( values === void 0 ) values = [];

  if (Array.isArray(keys)) {
    for (var i = 0, len = keys.length; i < len; i++) {
      this$1.insert(keys[i], values[i]);
    }
  }
  return this;
};


/**
 * Returns true if the tree is balanced
 * @return {boolean}
 */
AVLTree.prototype.isBalanced = function isBalanced$1 () {
  return isBalanced(this._root);
};


/**
 * String representation of the tree - primitive horizontal print-out
 * @param{Function(Node):string} [printNode]
 * @return {string}
 */
AVLTree.prototype.toString = function toString (printNode) {
  return print(this._root, printNode);
};

Object.defineProperties( AVLTree.prototype, prototypeAccessors );

return AVLTree;

})));


},{}],2:[function(require,module,exports){
var Tree = require('avl'),
    Sweepline = require('./sweepline'),
    Point = require('./point'),
    utils = require('./utils');
/**
* @param {Array} segments set of segments intersecting sweepline [[[x1, y1], [x2, y2]] ... [[xm, ym], [xn, yn]]]
*/


function findIntersections(segments) {
  var sweepline = new Sweepline('before');

  try {
    var queue = new Tree(utils.comparePoints, true),
        status = new Tree(utils.compareSegments.bind(sweepline), true),
        output = new Tree(utils.comparePoints, true);
  } catch (uwu) {
    if (!/is not a constructor/i.test(uwu.message)) {
      throw uwu;
    }

    var queue = new Tree.default(utils.comparePoints, true),
        status = new Tree.default(utils.compareSegments.bind(sweepline), true),
        output = new Tree.default(utils.comparePoints, true);
  }

  for (let segmentID in segments) {
    let segment = segments[segmentID];
    segment[0].ID = segmentID;
    segment[1].ID = segmentID;
    segment.sort(utils.comparePoints);
    let begin = new Point(segment[0], 'begin', segmentID),
        end = new Point(segment[1], 'end', segmentID);
    queue.insert(begin, begin);
    begin = queue.find(begin).key;
    begin.segments.push(segment);
    queue.insert(end, end);
  }

  while (!queue.isEmpty()) {
    var point = queue.pop();
    handleEventPoint(point.key, status, output, queue, sweepline);
  }

  return output.keys().map(function (key) {
    return {
      x: key.x,
      y: key.y,
      segmentID: key.segmentID
    };
  });
}

function handleEventPoint(point, status, output, queue, sweepline) {
  sweepline.setPosition('before');
  sweepline.setX(point.x);
  var Up = point.segments,
      // segments, for which this is the left end
  Lp = [],
      // segments, for which this is the right end
  Cp = []; // // segments, for which this is an inner point
  // step 2

  status.forEach(function (node) {
    var segment = node.key,
        segmentBegin = segment[0],
        segmentEnd = segment[1]; // count right-ends

    if (Math.abs(point.x - segmentEnd[0]) < utils.EPS && Math.abs(point.y - segmentEnd[1]) < utils.EPS) {
      Lp.push(segment); // count inner points
    } else {
      // filter left ends
      if (!(Math.abs(point.x - segmentBegin[0]) < utils.EPS && Math.abs(point.y - segmentBegin[1]) < utils.EPS)) {
        if (Math.abs(utils.direction(segmentBegin, segmentEnd, [point.x, point.y])) < utils.EPS && utils.onSegment(segmentBegin, segmentEnd, [point.x, point.y])) {
          Cp.push(segment);
        }
      }
    }
  });

  if ([].concat(Up, Lp, Cp).length > 1) {
    output.insert(point, point);
  }

  ;

  for (var j = 0; j < Cp.length; j++) {
    status.remove(Cp[j]);
  }

  sweepline.setPosition('after');

  for (var k = 0; k < Up.length; k++) {
    if (!status.contains(Up[k])) {
      status.insert(Up[k]);
    }
  }

  for (var l = 0; l < Cp.length; l++) {
    if (!status.contains(Cp[l])) {
      status.insert(Cp[l]);
    }
  }

  if (Up.length === 0 && Cp.length === 0) {
    for (var i = 0; i < Lp.length; i++) {
      var s = Lp[i],
          sNode = status.find(s),
          sl = status.prev(sNode),
          sr = status.next(sNode);

      if (sl && sr) {
        findNewEvent(sl.key, sr.key, point, output, queue);
      }

      status.remove(s);
    }
  } else {
    var UCp = [].concat(Up, Cp).sort(utils.compareSegments),
        UCpmin = UCp[0],
        sllNode = status.find(UCpmin),
        UCpmax = UCp[UCp.length - 1],
        srrNode = status.find(UCpmax),
        sll = sllNode && status.prev(sllNode),
        srr = srrNode && status.next(srrNode);

    if (sll && UCpmin) {
      findNewEvent(sll.key, UCpmin, point, output, queue);
    }

    if (srr && UCpmax) {
      findNewEvent(srr.key, UCpmax, point, output, queue);
    }

    for (var p = 0; p < Lp.length; p++) {
      status.remove(Lp[p]);
    }
  }

  return output;
}

function findNewEvent(sl, sr, point, output, queue) {
  var intersectionCoords = utils.findSegmentsIntersection(sl, sr),
      intersectionPoint;

  if (intersectionCoords) {
    intersectionPoint = new Point(intersectionCoords, 'intersection', [sl[0].ID, sr[0].ID]);

    if (!output.contains(intersectionPoint)) {
      queue.insert(intersectionPoint, intersectionPoint);
    }

    output.insert(intersectionPoint, intersectionPoint);
  }
}

module.exports = findIntersections;

},{"./point":3,"./sweepline":4,"./utils":5,"avl":1}],3:[function(require,module,exports){
var Point = function (coords, type, segmentID) {
  this.segmentID = segmentID;
  this.x = coords[0];
  this.y = coords[1];
  this.type = type;
  this.segments = [];
};

module.exports = Point;

},{}],4:[function(require,module,exports){
function Sweepline(position) {
  this.x = null;
  this.position = position;
}

Sweepline.prototype.setPosition = function (position) {
  this.position = position;
};

Sweepline.prototype.setX = function (x) {
  this.x = x;
};

module.exports = Sweepline;

},{}],5:[function(require,module,exports){
var EPS = 1E-12;
/**
 * @param a vector
 * @param b vector
 * @param c vector
 */

function onSegment(a, b, c) {
  var x1 = a[0],
      x2 = b[0],
      x3 = c[0],
      y1 = a[1],
      y2 = b[1],
      y3 = c[1];
  return Math.min(x1, x2) <= x3 && x3 <= Math.max(x1, x2) && Math.min(y1, y2) <= y3 && y3 <= Math.max(y1, y2);
}
/**
 * ac x bc
 * @param a vector
 * @param b vector
 * @param c vector
 */


function direction(a, b, c) {
  var x1 = a[0],
      x2 = b[0],
      x3 = c[0],
      y1 = a[1],
      y2 = b[1],
      y3 = c[1];
  return (x3 - x1) * (y2 - y1) - (x2 - x1) * (y3 - y1);
}
/**
 * @param a segment1
 * @param b segment2
 */


function segmentsIntersect(a, b) {
  var p1 = a[0],
      p2 = a[1],
      p3 = b[0],
      p4 = b[1],
      d1 = direction(p3, p4, p1),
      d2 = direction(p3, p4, p2),
      d3 = direction(p1, p2, p3),
      d4 = direction(p1, p2, p4);

  if ((d1 > 0 && d2 < 0 || d1 < 0 && d2 > 0) && (d3 > 0 && d4 < 0 || d3 < 0 && d4 > 0)) {
    return true;
  } else if (d1 === 0 && onSegment(p3, p4, p1)) {
    return true;
  } else if (d2 === 0 && onSegment(p3, p4, p2)) {
    return true;
  } else if (d3 === 0 && onSegment(p1, p2, p3)) {
    return true;
  } else if (d4 === 0 && onSegment(p1, p2, p4)) {
    return true;
  }

  return false;
}
/**
 * @param a segment1
 * @param b segment2
 */


function findSegmentsIntersection(a, b) {
  var x1 = a[0][0],
      y1 = a[0][1],
      x2 = a[1][0],
      y2 = a[1][1],
      x3 = b[0][0],
      y3 = b[0][1],
      x4 = b[1][0],
      y4 = b[1][1];
  var x = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4));
  var y = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4));

  if (isNaN(x) || isNaN(y)) {
    return false;
  } else {
    if (x1 >= x2) {
      if (!between(x2, x, x1)) {
        return false;
      }
    } else {
      if (!between(x1, x, x2)) {
        return false;
      }
    }

    if (y1 >= y2) {
      if (!between(y2, y, y1)) {
        return false;
      }
    } else {
      if (!between(y1, y, y2)) {
        return false;
      }
    }

    if (x3 >= x4) {
      if (!between(x4, x, x3)) {
        return false;
      }
    } else {
      if (!between(x3, x, x4)) {
        return false;
      }
    }

    if (y3 >= y4) {
      if (!between(y4, y, y3)) {
        return false;
      }
    } else {
      if (!between(y3, y, y4)) {
        return false;
      }
    }
  }

  return [x, y];
}

function between(a, b, c) {
  return a - EPS <= b && b <= c + EPS;
}
/**
 * @param a segment1
 * @param b segment2
 */


function compareSegments(a, b) {
  var x1 = a[0][0],
      y1 = a[0][1],
      x2 = a[1][0],
      y2 = a[1][1],
      x3 = b[0][0],
      y3 = b[0][1],
      x4 = b[1][0],
      y4 = b[1][1];
  var currentX, ay, by, deltaY, deltaX1, deltaX2;

  if (a === b) {
    return 0;
  }

  currentX = this.x;
  ay = getY(a, currentX);
  by = getY(b, currentX);
  deltaY = ay - by;

  if (Math.abs(deltaY) > EPS) {
    return deltaY < 0 ? -1 : 1;
  } else {
    var aSlope = getSlope(a),
        bSlope = getSlope(b);

    if (aSlope !== bSlope) {
      if (this.position === 'before') {
        return aSlope > bSlope ? -1 : 1;
      } else {
        return aSlope > bSlope ? 1 : -1;
      }
    }
  }

  deltaX1 = x1 - x3;

  if (deltaX1 !== 0) {
    return deltaX1 < 0 ? -1 : 1;
  }

  deltaX2 = x2 - x4;

  if (deltaX2 !== 0) {
    return deltaX2 < 0 ? -1 : 1;
  }

  return 0;
}

;
/**
 * @param a point1
 * @param b point2
 */

function comparePoints(a, b) {
  var aIsArray = Array.isArray(a),
      bIsArray = Array.isArray(b),
      x1 = aIsArray ? a[0] : a.x,
      y1 = aIsArray ? a[1] : a.y,
      x2 = bIsArray ? b[0] : b.x,
      y2 = bIsArray ? b[1] : b.y;

  if (x1 - x2 > EPS || Math.abs(x1 - x2) < EPS && y1 - y2 > EPS) {
    return 1;
  } else if (x2 - x1 > EPS || Math.abs(x1 - x2) < EPS && y2 - y1 > EPS) {
    return -1;
  } else if (Math.abs(x1 - x2) < EPS && Math.abs(y1 - y2) < EPS) {
    return 0;
  }
}

function getSlope(segment) {
  var x1 = segment[0][0],
      y1 = segment[0][1],
      x2 = segment[1][0],
      y2 = segment[1][1];

  if (x1 === x2) {
    return y1 < y2 ? Infinity : -Infinity;
  } else {
    return (y2 - y1) / (x2 - x1);
  }
}

;

function getY(segment, x) {
  var begin = segment[0],
      end = segment[1],
      span = segment[1][0] - segment[0][0],
      deltaX0,
      deltaX1,
      ifac,
      fac;

  if (x <= begin[0]) {
    return begin[1];
  } else if (x >= end[0]) {
    return end[1];
  }

  deltaX0 = x - begin[0];
  deltaX1 = end[0] - x;

  if (deltaX0 > deltaX1) {
    ifac = deltaX0 / span;
    fac = 1 - ifac;
  } else {
    fac = deltaX1 / span;
    ifac = 1 - fac;
  }

  return begin[1] * fac + end[1] * ifac;
}

;
module.exports = {
  EPS: EPS,
  onSegment: onSegment,
  direction: direction,
  segmentsIntersect: segmentsIntersect,
  findSegmentsIntersection: findSegmentsIntersection,
  compareSegments: compareSegments,
  comparePoints: comparePoints
};

},{}]},{},[2])(2)
});