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

    // EventHandler: a factory for producing event handlers w/ contextual scope
    // - context: an object with scope needed by handler
    // - handler: an event handler function
    var EventHandler = function( context, handler, e ){
      return(
        function( e ) {
          handler( context, e );
        }
      );
    };

