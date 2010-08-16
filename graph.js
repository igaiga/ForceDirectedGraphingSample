//
// This work is licensed under the Creative Commons Attribution 2.5 License. To 
// view a copy of this license, visit
// http://creativecommons.org/licenses/by/2.5/
// or send a letter to Creative Commons, 543 Howard Street, 5th Floor, San
// Francisco, California, 94105, USA.
//
// All copies and derivatives of this source must contain the license statement 
// above and the following attribution:
//
// Author: Kyle Scholz      http://kylescholz.com/
// Copyright: 2006
//

// Node:
var Node = function( id, mass, x, y ) {
  this['id'] = id;
  this['mass'] = mass;

  this['neighbors']=0;

  this['position']=new Object();
  this['position']['x']=x;
  this['position']['y']=y;

  this['force']=new Object();
  this['force']['x']=0;
  this['force']['y']=0;
};

// Distance:
var Distance = function(){};
Distance.prototype = {
  calculate: function( pointA, pointB ) {
    // X Distance
    this['dx'] = pointA['x'] - pointB['x'];
    // Y Distance
    this['dy'] = pointA['y'] - pointB['y'];
    this['d2'] = (this['dx']*this['dx']+this['dy']*this['dy']);
    // Distance
    this['d'] = Math.sqrt(this['d2']);
  }
};

// Graph:
var Graph = function(){};
Graph.prototype = {
  initialize: function( frame_width, frame_height ) {
    this['frame_width']=frame_width;
    this['frame_height']=frame_height;

    // an attractive force is applied between each node and the origin
    this['origin'] = new Node( 'origin', 1, parseInt(this['frame_width']/2), parseInt(this['frame_height']/2));
    this['originWeight']=48;

    // a "speed" multiple applied to all of the forces in each iteration
    // (a higher number makes the graph move faster but also makes it more volatile)
    this['speed'] = 12;

    // actually an _inverse_ gravity constant, used in calculating repulsive force
    this['gravity']=96;

    // the maximum repulsive force that can be aqpplied in an iteration
    this['max_repulsive_force_distance']=512;

    // the UI that will listen to this graph
    this['ui'];

    // the current selected node (when a node is selected, no forces may be applied to it
    this['selectedNode']=-1;

    // parallel arrays
    this['nodes'] = new Array();
    this['edges'] = new Array();
    this['originEdges'] = new Array();

    this['nodesText'] = new Object();
  },

  // add observers to subscribers queue
  setUI: function( ui ) {
    this['ui']=ui;
    ui.drawFrame( this['frame_width'], this['frame_height'] );
    ui.drawOrigin( this['origin'] );
  },

  // Graph is a TimerControl Listener. This is the function the TimerControl event handler calls
  update: function() {
    this.applyForce();
  },

  //
  getOrigin: function() {
    return this['origin'];
  },

  // apply an attractive force between a node and the origin
  // F = (currentLength - desiredLength)
  originForce: function( nodeI, distance ) {

    if ( this['originEdges'][nodeI.id] ) {
      if ( nodeI.id != this['selectedNode'] ) {
        var weight = this.originEdges[nodeI.id];
        var attractive_force = (distance['d'] - weight)/weight;
        nodeI['force']['x'] += attractive_force * (distance['dx'] / distance['d']);
        nodeI['force']['y'] += attractive_force * (distance['dy'] / distance['d']);
      }

    } else if ( nodeI.id != this['selectedNode'] ) {

      var repulsive_force=this['gravity']*nodeI['mass']*this.origin['mass']/distance['d2'];
      var df = this['max_repulsive_force_distance']-distance['d'];
      if ( df > 0 ) {
        repulsive_force *= (Math.log(df));
      }

      if ( repulsive_force < 1024 ) {
        nodeI['force']['x'] -= repulsive_force * distance['dx'] / distance['d'];
        nodeI['force']['y'] -= repulsive_force * distance['dy'] / distance['d'];
      }

    }
  },

  // apply an attractive force between two nodes
  attractiveForce: function( nodeI, nodeJ, distance ) {
    //   F = (currentLength - desiredLength)
    var weight = this['edges'][nodeI.id][nodeJ.id];
    weight += (3 * (nodeI.neighbors+nodeJ.neighbors));

    if ( weight ) {
      var attractive_force = (distance['d'] - weight)/weight;

      if ( nodeI.id != this['selectedNode'] ) {
        nodeI['force']['x'] -= attractive_force * distance['dx'] / distance['d'];
        nodeI['force']['y'] -= attractive_force * distance['dy'] / distance['d'];
      }

      // since edges are one way in our data structure, we need to explicitly add
      // an equal attractive force to our neighbor
      if ( nodeJ.id != this['selectedNode'] ) {
        nodeJ['force']['x'] += attractive_force * distance['dx'] / distance['d'];
        nodeJ['force']['y'] += attractive_force * distance['dy'] / distance['d'];
      }

    }
  },

  // apply a repulsive force between two nodes
  repulsiveForce: function( nodeI, nodeJ, distance ) {
    //   force = gravity*(mass1*mass2)/distance^2.
    var repulsive_force=this['gravity']*nodeI['mass']*nodeJ['mass']/distance['d2'];
    var df = this['max_repulsive_force_distance']-distance['d'];
    if ( df > 0 ) {
      repulsive_force *= (Math.log(df));
    }

    if ( repulsive_force < 1024 ) {
      nodeI['force']['x'] += repulsive_force * distance['dx'] / distance['d'];
      nodeI['force']['y'] += repulsive_force * distance['dy'] / distance['d'];
    }
  },

  // iterate through all of the nodes, calculating applicable forces, then apply to the node's position
  applyForce: function() {

	// draw nodes
    try {
      this.ui.drawNodes();
    } catch( e ) {
      alert( "Error Drawing Nodes: " + e );
    }

	// draw edges
    try {
      this.ui.drawEdges();
    } catch( e ) {
      alert( "Error Drawing Edges: " + e );
    }

	// reposition nodes
    for( var i=0; i<this['nodes'].length; i++ ) {
      var nodeI = this['nodes'][i];

      for( var j=0; j<this['nodes'].length; j++ ) {
        if ( i != j ) {

          var nodeJ = this['nodes'][j];

          // get the distance between nodes
          var distance = new Distance();
          distance.calculate( nodeI.position, nodeJ.position );

          // attractive force applied across an edge
          if ( this['edges'][nodeI.id] && this['edges'][nodeI.id][nodeJ.id] ) {
            this.attractiveForce(nodeI, nodeJ, distance);
          }
          // repulsive force between any two nodes
          if ( i != this['selectedNode'] ) {
            this.repulsiveForce(nodeI, nodeJ, distance);
          }
        }
      }

      // attractive force to the origin
      // get the distance between node and origin
      var distance = new Distance();
      distance.calculate( this['origin'].position, nodeI.position );
      this.originForce(nodeI, distance);

      // speed multiple
      nodeI['force']['x']*=this['speed'];
      nodeI['force']['y']*=this['speed'];

      // add forces to node position
      nodeI['position']['x'] += nodeI['force']['x'];
      nodeI['position']['y'] += nodeI['force']['y'];

      // wipe forces for iteration
      nodeI['force']['x']=0;
      nodeI['force']['y']=0;

      // keep the node in our frame
      this.bounds(nodeI);

    } // for
  },

  // force a node to stay in bounds {
  bounds: function( node ) {
    var d = (this.ui.nodeRadius( node )*2) + 4;

    var cxl = node['position']['x'];
    var cxm = node['position']['x'] + d;
    var cyl = node['position']['y'];
    var cym = node['position']['y'] + d;

    if ( cxl < 0 ) { node['position']['x']  = 0; }
    if ( cyl < 0 ) { node['position']['y']  = 0; }

    if ( cxm > this['frame_width'] ) { node['position']['x']  = this['frame_width'] - d; }
    if ( cym > this['frame_height'] ) { node['position']['y']  = this['frame_height'] - d; }
  },

  // add an edge to the graph
  addEdge: function( node1, node2, weight ) {

    if ( !this['edges'][node1.id] ) {
      this['edges'][node1.id]=new Object();
    }
    this['edges'][node1.id][node2.id]=weight;
    try {
      this.ui.addEdge( node1, node2, weight );
      node1['neighbors']++;
      node2['neighbors']++;
    } catch( e ) {
      //TODO: handle
      alert( "Error Adding Edge: " + e );
    }
  },

  // add an edge to the graph
  addOriginEdge: function( node, weight ) {
    try {
      this['originEdges'][node.id]=weight;
    } catch( e ) {
      //TODO: handle
      alert( "Error Adding Origin Edge: " + e );
    }
  },

  // add a node to the graph
  addNode: function( mass, text ) {
    // initialize the new node at a random offset from the origin
    var offsetx = (Math.random()*100)-50;
    var offsety = (Math.random()*100)-50;

    // store floats that represent the 'real' position of a node
    var x =this['frame_width']/2 - offsetx;
    var y =this['frame_height']/2 - offsety;

    // create the Node and add it to the collection
    var i = this['nodes'].length;
    var node = new Node( i, mass, x, y );
    this['nodes'].push(node);

    this['nodesText'][text] = node;

    try {
      this.ui.addNode(node,text);
    } catch( e ) {
      alert( "Error Adding Node: " + e );
      //todo: handle
    }
    return node;
  },

  // support access to nodes by their text value
  getNodeByText: function( text ) {
    if (this['nodesText'][text]) {
      return this['nodesText'][text];
    } else {
      return null;
    }
  },

  // set the selected node (by id)
  setSelected: function( nodeId ) {
    this['selectedNode'] = nodeId;
  },

  // get the selected node (returns id)
  getSelected: function() {
    return this['selectedNode'];
  },

  // clear the selected node
  clearSelected: function() {
    this['selectedNode'] = -1;
  },

  // indicate wif we have a selected node
  hasSelected: function() {
    return (this['selectedNode'] != -1 );
  },

  // get a node by id
  getNode: function( nodeId ) {
    return this['nodes'][nodeId];
  }
}

