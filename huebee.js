/*jshint browser: true, unused: true, undef: true */
/*globals Unipointer, EvEmitter */

function Huebee( input, options ) {
  this.input = input;
  // options
  this.options = {};
  this.option( Huebee.defaults );
  this.option( options );
  // kick things off
  this.create();
}

Huebee.defaults = {
  gridSize: 15,
  mode: 'hsl',
};

var proto = Huebee.prototype = Object.create( EvEmitter.prototype );

proto.option = function( options ) {
  this.options = extend( this.options, options );
};

var svgURI = 'http://www.w3.org/2000/svg';

proto.create = function() {
  this.input.addEventListener( 'focus', this.open.bind( this ) );
  // create element
  this.element = document.createElement('div');
  this.element.className = 'huebee';
  // create canvas
  this.canvas = document.createElement('canvas');
  this.ctx = this.canvas.getContext('2d');
  this.canvas.className = 'huebee__canvas';
  this.canvas.width = this.options.gridSize * 14;
  this.canvas.height = this.options.gridSize * 15;
  this.renderColors();

  var canvasPointer = this.canvasPointer = new Unipointer();
  canvasPointer._bindStartEvent( this.canvas );
  canvasPointer.on( 'pointerDown', this.canvasPointerDown.bind( this ) );
  canvasPointer.on( 'pointerMove', this.canvasPointerMove.bind( this ) );
  this.element.appendChild( this.canvas );

  // create close button

  var svg = document.createElementNS( svgURI, 'svg');
  svg.setAttribute( 'class', 'huebee__close-button' );
  svg.setAttribute( 'viewBox', '0 0 24 24' );
  var path = document.createElementNS( svgURI, 'path');
  path.setAttribute( 'd', 'M 7,7 L 17,17 M 17,7, L 7,17' );
  path.setAttribute( 'class', 'huebee__close-button__x' );
  svg.appendChild( path );
  svg.addEventListener( 'click', this.close.bind( this ) );
  this.element.appendChild( svg );

  this.onDocPointerDown = this.docPointerDown.bind( this );
};

proto.renderColors = function() {
  var ctx = this.ctx;
  var gridSize = this.options.gridSize;
  this.renderColorGrid( 1 );
  ctx.save();
  ctx.translate( 0, gridSize * 5 );
  this.renderColorGrid( 0.66 );
  ctx.restore();
  ctx.save();
  ctx.translate( 0, gridSize * 10 );
  this.renderColorGrid( 0.33 );
  ctx.restore();
  // grays
  var grayGridSize = gridSize * 2;
  var moder = this.getColorModer();
  for ( var i=0; i<7; i++ ) {
    var lum = 1 - i/6;
    this.ctx.fillStyle = moder( 0, 0, lum );
    this.ctx.fillRect( gridSize * 13, i * gridSize, gridSize, gridSize );
  }

};


proto.renderColorGrid = function( sat ) {
  var count = 7;
  var count1 = count - 1;
  var gridSize = this.options.gridSize;
  var moder = this.getColorModer();

  for ( var row = 1; row < count1; row++ ) {
    for ( var col = 0; col < 12; col++ ) {
      var hue = col * 30;
      var lum = 1 - row / count1;
      this.ctx.fillStyle = moder( hue, sat, lum );
      var x = gridSize * col;
      var y = gridSize * (row-1);
      this.ctx.fillRect( x, y, gridSize, gridSize );
    }
  }
};

var colorModers = {
  hsl: function( h, s, l ) {
    s = Math.round( s * 100 );
    l = Math.round( l * 100 );
    return 'hsl(' + h + ', ' + s + '%, ' + l + '%)';
  },
  hex: hsl2hex,
  'roundHex': function( h, s, l ) {
    var hex = hsl2hex( h, s, l );
    return roundHex( hex );
  }
};

proto.getColorModer = function() {
  return colorModers[ this.options.mode ] || colorModers.hsl;
};

// ----- events ----- //

proto.open = function() {
  if ( this.isOpen ) {
    return;
  }
  var boundingRect = this.input.getBoundingClientRect();
  this.element.style.left = boundingRect.left + 'px';
  this.element.style.top = boundingRect.top + this.input.offsetHeight + 5 + 'px';
  document.documentElement.addEventListener( 'mousedown', this.onDocPointerDown );
  document.documentElement.addEventListener( 'touchstart', this.onDocPointerDown );
  // add canvas to DOM
  this.input.parentNode.insertBefore( this.element, this.input.nextSibling );
  this.isOpen = true;
};

proto.docPointerDown = function( event ) {
  if ( !this.element.contains( event.target ) && event.target != this.input ) {
    this.close();
  }
};

proto.close = function() {
  if ( !this.isOpen ) {
    return;
  }
  this.element.parentNode.removeChild( this.element );
  document.documentElement.removeEventListener( 'mousedown', this.onDocPointerDown );
  document.documentElement.removeEventListener( 'touchstart', this.onDocPointerDown );
  this.isOpen = false;
};

// ----- canvas pointer ----- //

proto.canvasPointerDown = function( event, pointer ) {
  event.preventDefault();
  var boundingRect = this.canvas.getBoundingClientRect();
  this.offset = {
    x: boundingRect.left + window.pageXOffset,
    y: boundingRect.top + window.pageYOffset,
  };
  this.canvasPointerChange( pointer );
};

proto.canvasPointerMove = function( event, pointer ) {
  this.canvasPointerChange( pointer );
};

proto.canvasPointerChange = function( pointer ) {
  var x = Math.round( pointer.pageX - this.offset.x );
  var y = Math.round( pointer.pageY - this.offset.y );
  var size = this.options.gridSize;
  x = Math.max( 0, Math.min( x, size * 14 ) );
  y = Math.max( 0, Math.min( y, size * 14 ) );
  var hue, sat, lum;
  if ( x <= size * 12 ) {
    // colors
    hue = Math.floor( x / size ) * 30;
    sat = 1 - Math.floor( Math.floor( y / size ) / 5 ) / 3;
    lum = 1 - ( Math.floor( y / size ) % 5 / 6 + 1/6 );
  } else if ( x >= size * 13 & y < size * 7 ) {
    // grays
    hue = 0;
    sat = 0;
    lum = 1 - ( Math.floor( y / size ) / 6 );
  } else {
    return;
  }

  var moder = colorModers[ this.options.mode ] || colorModers.hsl;
  var color = moder( hue, sat, lum );

  if ( color == this.color ) {
    return;
  }
  // new color
  this.color = color;
  this.input.value = color;
  this.emitEvent( 'change', [ this.color ] );
};

// -------------------------- utils -------------------------- //

function extend( a, b ) {
  for ( var prop in b ) {
    a[ prop ] = b[ prop ];
  }
  return a;
}

function hsl2hex( h, s, l ) {
  var rgb = hsl2rgb( h, s, l );
  return rgb2hex( rgb );
}

// thx jfsiii
// https://github.com/jfsiii/chromath/blob/master/src/static.js#L312

function hsl2rgb(h, s, l) {

  var C = (1 - Math.abs(2*l-1)) * s;
  var hp = h/60;
  var X = C * (1-Math.abs(hp%2-1));
  var rgb, m;

  switch ( Math.floor(hp) ) {
    case 0:  rgb = [C,X,0]; break;
    case 1:  rgb = [X,C,0]; break;
    case 2:  rgb = [0,C,X]; break;
    case 3:  rgb = [0,X,C]; break;
    case 4:  rgb = [X,0,C]; break;
    case 5:  rgb = [C,0,X]; break;
    default: rgb = [0,0,0];
  }

  m = l - (C/2);
  rgb = rgb.map( function( v ) {
    return v + m;
  });

  return rgb;
}

function rgb2hex( rgb ) {
  var hex = rgb.map( function( value ) {
    value = Math.round( value * 255 );
    var hexNum = value.toString(16).toUpperCase();
    // left pad 0
    hexNum = hexNum.length < 2 ? '0' + hexNum : hexNum;
    return hexNum;
  });

  return '#' + hex.join('');
}

function roundHex( hex ) {
  return '#' + hex[1] + hex[3] + hex[5];
}