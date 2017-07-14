var playCanvasID="";
var handleStatus=false;
var mystatus="";
var SignaturePad = (function (document) {
    "use strict";

    var SignaturePad = function (canvas, options) {
        var self = this,
            opts = options || {};
        // this.velocityFilterWeight = opts.velocityFilterWeight || 0.7;
        // this.minWidth = opts.minWidth || 0.5;
        // this.maxWidth = opts.maxWidth || 2.5;
        var xpen=2;
        this.velocityFilterWeight = opts.velocityFilterWeight || 0.4;
        this.minWidth = opts.minWidth || 0.5+1.5;
        this.maxWidth = opts.maxWidth || 2.5+xpen;
        this.dotSize = opts.dotSize || function () {
            return (this.minWidth + this.maxWidth) / 2;
        };
        this.penColor = opts.penColor || "#00008B";
        this.backgroundColor = opts.backgroundColor || "rgba(0,0,0,0)";
        this.onEnd = opts.onEnd;
        this.onBegin = opts.onBegin;
		
        this._canvas = canvas;
        this._ctx = canvas.getContext("2d");
        this.clear();
		this.PlayCanvasID='';

//-----------------------------------------------------------
        this.actions = new Array();
        this.currentRecording = null; //instance of Recording
        this.recordings = new Array(); //array of Recording objects
        var pauseInfo = null;
//-----------------------------------------------------------


        // we need add these inline so they are available to unbind while still having
        //  access to 'self' we could use _.bind but it's not worth adding a dependency
        this._handleMouseDown = function (event) {
            if (event.which === 1) {
                self._mouseButtonDown = true;
                self._strokeBegin(event);
            }
        };

        this._handleMouseMove = function (event) {
            if (self._mouseButtonDown) {
                self._strokeUpdate(event);
            }
        };

        this._handleMouseUp = function (event) {
            if (event.which === 1 && self._mouseButtonDown) {
                self._mouseButtonDown = false;
                self._strokeEnd(event);
            }
        };

        this._handleTouchStart = function (event) {
            if (event.targetTouches.length == 1) {
                var touch = event.changedTouches[0];
                self._strokeBegin(touch);
             }
        };

        this._handleTouchMove = function (event) {
            // Prevent scrolling.
            event.preventDefault();

            var touch = event.targetTouches[0];
            self._strokeUpdate(touch);
        };

        this._handleTouchEnd = function (event) {
            var wasCanvasTouched = event.target === self._canvas;
            if (wasCanvasTouched) {
                event.preventDefault();
                self._strokeEnd(event);
            }
        };



//-----------------------------------------------------------        
        this.startRecording = function()
        {
            self.currentRecording = new Recording(this);
            self.recordings = new Array();
            self.recordings.push(self.currentRecording);
            //console.log(self.currentRecording);
            self.currentRecording.start();
            //console.log("Start");
        }
        
        this.stopRecording = function()
        {
            if (self.currentRecording != null)
                self.currentRecording.stop();
            self.currentRecording = null;
            //console.log("Stop");
            var serResult = serializeDrawing(self);
            if (serResult != null){
                //$("#recordData").val(serResult);
                localStorage.setItem("signPath", serResult);
                //console.debug("canvas2 %o",window.localStorage.getItem("signPath"))
                self.currentRecording = null;
                //console.log(serResult);
                //alert(serResult);
            }else{
                alert("Error serializing data");
            }
            
        }
        
        this.playRecording = function(onPlayStart, onPlayEnd, onPause, interruptActionStatus,canvasID,signAction)
        {
            if (typeof interruptActionStatus == 'undefined')
                interruptActionStatus = null;
            var dePathAction=deserializeDrawing(signAction);
            self.recordings[0]=dePathAction[0];
            mystatus="";
            //console.debug(signAction);
            if (self.recordings.length == 0)
            {
                alert("No recording loaded to play");
                onPlayEnd();
                return;
            }
			playCanvasID=canvasID;
            console.debug("playCanvasID %o",playCanvasID)
            var ctx = $("#"+playCanvasID).get(0).getContext("2d");
            //resizeCanvas();
            //ctx.clearRect(0, 0, $("#"+playCanvasID).width(), $("#"+playCanvasID).height());
            //var canvas2 = document.querySelector('canvas#canvas2');
            //var ctx=canvas2.getContext("2d");
            var width = $(window).width()/2;
            var height = $(window).height()/2;
            var canvas2 = document.getElementById(playCanvasID);
            /*canvas2.setAttribute('width', width/2);
            canvas2.setAttribute('height', height/2);
            canvas2.setAttribute('style', "margin-left:-"+width/4+"px;"+"margin-top:-"+height/4+"px;");*/
            canvas2.setAttribute('width', "200");
            canvas2.setAttribute('height', "200");
            //ctx.fillStyle = "#ff0000";
            //ctx.fillRect(0, 0, $("#"+playCanvasID).width(), $("#"+playCanvasID).height());
            self.clear();
            onPlayStart();
            
            self.pausedRecIndex = -1;
            
            for (var rec = 0; rec < self.recordings.length; rec++)
            {
                if (interruptActionStatus != null)
                {
                    var status = interruptActionStatus();
                    if (status == "stop") {
                        pauseInfo = null;
                        break;
                    }
                    else 
                        if (status == "pause") {
                            __onPause(rec-1, onPlayEnd, onPause, interruptActionStatus);
                            break;
                        }
                }
                
                self.recordings[rec].playRecording(self.drawActions, onPlayEnd, function(){
                    __onPause(rec-1, onPlayEnd, onPause, interruptActionStatus);
                }, interruptActionStatus);
            }
        }
        function __onPause(index, onPlayEnd, onPause, interruptActionStatus)
        {
            pauseInfo = {
                "index": index,
                "onPlayend": onPlayEnd,
                "onPause":onPause,
                "interruptActionStatus": interruptActionStatus
            };
            if (onPause)
                onPause();
        }
//-----------------------------------------------------------
        this._handleMouseEvents();
        this._handleTouchEvents();
    };

    SignaturePad.prototype.clear = function () {
        var ctx = this._ctx,
        canvas = this._canvas;
        ctx.fillStyle = this.backgroundColor;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        this._reset();
    };

    SignaturePad.prototype.toDataURL = function (imageType, quality) {
        var canvas = this._canvas;
        return canvas.toDataURL.apply(canvas, arguments);
    };

    SignaturePad.prototype.fromDataURL = function (dataUrl) {
        var self = this,
            image = new Image(),
            ratio = window.devicePixelRatio || 1,
            width = this._canvas.width / ratio,
            height = this._canvas.height / ratio;

        this._reset();
        image.src = dataUrl;
        image.onload = function () {
            self._ctx.drawImage(image, 0, 0, width, height);
        };
        this._isEmpty = false;
    };

    SignaturePad.prototype._strokeUpdate = function (event) {
        var point = this._createPoint(event);
        this._addPoint(point);
    };

    SignaturePad.prototype._strokeBegin = function (event) {
        this._reset();
        this._strokeUpdate(event);
        if (typeof this.onBegin === 'function') {
            this.onBegin(event);
        }
    };

    SignaturePad.prototype._strokeDraw = function (point) {
        var ctx = this._ctx,
            dotSize = typeof(this.dotSize) === 'function' ? this.dotSize() : this.dotSize;

        ctx.beginPath();
        this._drawPoint(point.x, point.y, dotSize);
        ctx.closePath();
        ctx.fill();
    };

    SignaturePad.prototype._strokeEnd = function (event) {
        var canDrawCurve = this.points.length > 2,
            point = this.points[0];

        if (!canDrawCurve && point) {
            this._strokeDraw(point);
        }
        if (typeof this.onEnd === 'function') {
            this.onEnd(event);
        }
    };

    SignaturePad.prototype._handleMouseEvents = function () {
        this._mouseButtonDown = false;
		if(handleStatus==true){
	        this._canvas.addEventListener("mousedown", this._handleMouseDown);
	        this._canvas.addEventListener("mousemove", this._handleMouseMove);
	        document.addEventListener("mouseup", this._handleMouseUp);
    	}
    };

    SignaturePad.prototype._handleTouchEvents = function () {
        // Pass touch events to canvas element on mobile IE.
        this._canvas.style.msTouchAction = 'none';
		if(handleStatus==true){
	        this._canvas.addEventListener("touchstart", this._handleTouchStart);
	        this._canvas.addEventListener("touchmove", this._handleTouchMove);
	        document.addEventListener("touchend", this._handleTouchEnd);
        }
    };

    SignaturePad.prototype.on = function () {
        this._handleMouseEvents();
        this._handleTouchEvents();
    };

    SignaturePad.prototype.off = function () {
    	if(handleStatus==true){
	        this._canvas.removeEventListener("mousedown", this._handleMouseDown);
	        this._canvas.removeEventListener("mousemove", this._handleMouseMove);
	        document.removeEventListener("mouseup", this._handleMouseUp);

	        this._canvas.removeEventListener("touchstart", this._handleTouchStart);
	        this._canvas.removeEventListener("touchmove", this._handleTouchMove);
	        document.removeEventListener("touchend", this._handleTouchEnd);
    	}
    };

    SignaturePad.prototype.isEmpty = function () {
        return this._isEmpty;
    };

    SignaturePad.prototype._reset = function () {
        this.points = [];
        this._lastVelocity = 0;
        this._lastWidth = (this.minWidth + this.maxWidth) / 2;
        this._isEmpty = true;
        this._ctx.fillStyle = this.penColor;
    };

    SignaturePad.prototype._createPoint = function (event) {
        var rect = this._canvas.getBoundingClientRect();
        return new Point(
            event.clientX - rect.left,
            event.clientY - rect.top
        );
    };

    SignaturePad.prototype._addPoint = function (point) {
        var points = this.points,
            c2, c3,
            curve, tmp;

        points.push(point);
        //console.log(point);
        if (points.length > 2) {
            // To reduce the initial lag make it work with 3 points
            // by copying the first point to the beginning.
            if (points.length === 3) points.unshift(points[0]);

            tmp = this._calculateCurveControlPoints(points[0], points[1], points[2]);
            c2 = tmp.c2;
            tmp = this._calculateCurveControlPoints(points[1], points[2], points[3]);
            c3 = tmp.c1;
            curve = new Bezier(points[1], c2, c3, points[2]);
            this._addCurve(curve);

            // Remove the first element from the list,
            // so that we always have no more than 4 points in points array.
            points.shift();
        }
    };

    SignaturePad.prototype._calculateCurveControlPoints = function (s1, s2, s3) {
        var dx1 = s1.x - s2.x, dy1 = s1.y - s2.y,
            dx2 = s2.x - s3.x, dy2 = s2.y - s3.y,

            m1 = {x: (s1.x + s2.x) / 2.0, y: (s1.y + s2.y) / 2.0},
            m2 = {x: (s2.x + s3.x) / 2.0, y: (s2.y + s3.y) / 2.0},

            l1 = Math.sqrt(dx1*dx1 + dy1*dy1),
            l2 = Math.sqrt(dx2*dx2 + dy2*dy2),

            dxm = (m1.x - m2.x),
            dym = (m1.y - m2.y),

            k = l2 / (l1 + l2),
            cm = {x: m2.x + dxm*k, y: m2.y + dym*k},

            tx = s2.x - cm.x,
            ty = s2.y - cm.y;

        return {
            c1: new Point(m1.x + tx, m1.y + ty),
            c2: new Point(m2.x + tx, m2.y + ty)
        };
    };

    SignaturePad.prototype._addCurve = function (curve) {
        var startPoint = curve.startPoint,
            endPoint = curve.endPoint,
            velocity, newWidth;

        velocity = endPoint.velocityFrom(startPoint);
        velocity = this.velocityFilterWeight * velocity
            + (1 - this.velocityFilterWeight) * this._lastVelocity;

        newWidth = this._strokeWidth(velocity);
        this._drawCurve(curve, this._lastWidth, newWidth);

        this._lastVelocity = velocity;
        this._lastWidth = newWidth;
    };


//-----------------------------------------------------------  
    SignaturePad.prototype._drawPointRE = function (x, y, size) {  

        //var destCtx=document.getElementById("playVideo1");
        // canvas.width = window.innerWidth * ratio;
        // canvas.height = (window.innerHeight-140) * ratio;
        //destCtx=document.getElementById("playVideo1");
        //destCtx.getContext("2d").scale(ratio, ratio);
        var ctx = $("#"+playCanvasID).get(0).getContext("2d");
        //var ctx=destCtx.getContext("2d");
        //var ctx=destCtx.getContext("2d");
        //var ctx = this._ctx;
        ctx.beginPath();
        ctx.fillStyle = "#00008B";
        //ctx.moveTo(x*0.3, y*0.3);//軌跡回播尺寸調整
        //ctx.arc(x*0.3, y*0.3, size*0.3, 0, 2 * Math.PI, false);
        var x_size = canvas2.width / canvas.width;
        var y_size = canvas2.height / canvas.height;
        ctx.moveTo(x*x_size, y*y_size);
        ctx.arc(x*x_size, y*y_size, size*0.3, 0, 2 * Math.PI, false);
        ctx.closePath();
        ctx.fill();
        this._isEmpty = false;
    };
//-----------------------------------------------------------  

    SignaturePad.prototype._drawPoint = function (x, y, size) {
        var ctx = this._ctx;
//-----------------------------------------------------------  
        var currAction = new PointX(x,y,size);
        if (this.currentRecording != null){
            this.currentRecording.addAction(currAction);
        }
//-----------------------------------------------------------               
        //this.actions.push(currAction);
        //console.log(currAction);
        //console.log(size);
        ctx.moveTo(x, y);
        ctx.arc(x, y, size, 0, 2 * Math.PI, false);
        this._isEmpty = false;
    };

    SignaturePad.prototype._drawCurve = function (curve, startWidth, endWidth) {
        var ctx = this._ctx,
            widthDelta = endWidth - startWidth,
            drawSteps, width, i, t, tt, ttt, u, uu, uuu, x, y;

        drawSteps = Math.floor(curve.length());
        ctx.beginPath();
        for (i = 0; i < drawSteps; i++) {
            // Calculate the Bezier (x, y) coordinate for this step.
            t = i / drawSteps;
            tt = t * t;
            ttt = tt * t;
            u = 1 - t;
            uu = u * u;
            uuu = uu * u;

            x = uuu * curve.startPoint.x;
            x += 3 * uu * t * curve.control1.x;
            x += 3 * u * tt * curve.control2.x;
            x += ttt * curve.endPoint.x;

            y = uuu * curve.startPoint.y;
            y += 3 * uu * t * curve.control1.y;
            y += 3 * u * tt * curve.control2.y;
            y += ttt * curve.endPoint.y;

            width = startWidth + ttt * widthDelta;
            this._drawPoint(x, y, width);
        }
        ctx.closePath();
        ctx.fill();
    };

    SignaturePad.prototype._strokeWidth = function (velocity) {
        return Math.max(this.maxWidth / (velocity + 1), this.minWidth);
    };


    var Point = function (x, y, time) {
        this.x = x;
        this.y = y;
        this.time = time || new Date().getTime();
    };

    Point.prototype.velocityFrom = function (start) {
        return (this.time !== start.time) ? this.distanceTo(start) / (this.time - start.time) : 1;
    };

    Point.prototype.distanceTo = function (start) {
        return Math.sqrt(Math.pow(this.x - start.x, 2) + Math.pow(this.y - start.y, 2));
    };

    var Bezier = function (startPoint, control1, control2, endPoint) {
        this.startPoint = startPoint;
        this.control1 = control1;
        this.control2 = control2;
        this.endPoint = endPoint;
    };

    // Returns approximated length.
    Bezier.prototype.length = function () {
        var steps = 10,
            length = 0,
            i, t, cx, cy, px, py, xdiff, ydiff;

        for (i = 0; i <= steps; i++) {
            t = i / steps;
            cx = this._point(t, this.startPoint.x, this.control1.x, this.control2.x, this.endPoint.x);
            cy = this._point(t, this.startPoint.y, this.control1.y, this.control2.y, this.endPoint.y);
            if (i > 0) {
                xdiff = cx - px;
                ydiff = cy - py;
                length += Math.sqrt(xdiff * xdiff + ydiff * ydiff);
            }
            px = cx;
            py = cy;
        }
        return length;
    };

    Bezier.prototype._point = function (t, start, c1, c2, end) {
        return          start * (1.0 - t) * (1.0 - t)  * (1.0 - t)
               + 3.0 *  c1    * (1.0 - t) * (1.0 - t)  * t
               + 3.0 *  c2    * (1.0 - t) * t          * t
               +        end   * t         * t          * t;
    };

    return SignaturePad;
})(document);

//-----------------------------------------------------------  
Recording = function (drawingArg)
{
    var self = this;
    this.drawing = drawingArg;
    this.timeSlots = new Object(); //Map with key as time slot and value as array of Point objects
    
    this.buffer = new Array(); //array of Point objects 
    this.timeInterval = 0; //10 miliseconds
    this.currTime = 0;
    this.started = false;
    this.intervalId = null;
    this.currTimeSlot = 0;
    this.actionsSet = null;
    this.currActionSet = null;
    this.recStartTime = null;
    this.pauseInfo = null;
    
    this.start = function()
    {
        self.currTime = 0;
        self.currTimeSlot = -1;
        self.actionsSet = null;
        self.pauseInfo = null;
        
        self.recStartTime = (new Date()).getTime();
        self.intervalId = window.setInterval(self.onInterval, self.timeInterval);
        self.started = true;
    }
    
    this.stop = function()
    {
        if (self.intervalId != null)
        {
            window.clearInterval(self.intervalId);
            self.intervalId = null;
        }
        self.started = false;
    }
    
    this.onInterval = function()
    {
        if (self.buffer.length > 0)
        {
            var timeSlot = (new Date()).getTime() - self.recStartTime;
        
            if (self.currActionSet == null)
            {
                self.currActionSet = new ActionsSet(timeSlot, self.buffer);
                self.actionsSet = self.currActionSet;
            }
            else
            {
                var tmpActionSet = self.currActionSet;
                self.currActionSet = new ActionsSet(timeSlot, self.buffer);
                tmpActionSet.next = self.currActionSet;
            }
            
            self.buffer = new Array();
        }
        self.currTime += self.timeInterval;
    }
    
    this.addAction = function(actionArg)
    {
        if (!self.started)
            return;
        self.buffer.push(actionArg);
    }
    
    this.playRecording = function(callbackFunctionArg, onPlayEnd, onPause, interruptActionStatus)
    {
    	//console.log(callbackFunctionArg);
        if (self.actionsSet == null)
        {
            if (typeof onPlayEnd != 'undefined' && onPlayEnd != null)
                onPlayEnd();
            return;
        }   
        if(mystatus!="false"){
        self.scheduleDraw(self.actionsSet,self.actionsSet.interval,callbackFunctionArg, onPlayEnd, onPause, true, interruptActionStatus);
    	}
    }

    this.scheduleDraw = function (actionSetArg, interval, callbackFunctionArg, onPlayEnd, onPause, isFirst, interruptActionStatus)
    {
    	if(mystatus=="false"){
    		var lastVideo=document.getElementById($("[playing='playing']>video").attr("id"));
			lastVideo.pause();
    		$("[playing='playing']").removeAttr("playing");
    		actionSetArg={};
    	}
    	//console.log(actionSetArg);
        window.setTimeout(function(){
            var status = "";
            if (interruptActionStatus != null)
            {
                status = interruptActionStatus();
                if (status == 'stop')
                {
                    self.pauseInfo = null;
                    onPlayEnd();
                    return;
                }
            }
            
            if (status == "pause")
            {
                self.pauseInfo = {
                    "actionset":actionSetArg,
                    "callbackFunc":callbackFunctionArg,
                    "onPlaybackEnd":onPlayEnd,
                    "onPause":onPause,
                    "isFirst":isFirst,
                    "interruptActionsStatus":interruptActionStatus
                };
                
                if (onPause)
                    onPause();
                return;
            }
            
            var intervalDiff = -1;
            var isLast = true;
            if (actionSetArg.next != null)
            {
                isLast = false;
                intervalDiff = actionSetArg.next.interval - actionSetArg.interval;
            }
            if (intervalDiff >= 0)
                self.scheduleDraw(actionSetArg.next, intervalDiff, callbackFunctionArg, onPlayEnd, onPause, false,interruptActionStatus);
	
            self.drawActions(actionSetArg.actions, onPlayEnd, isFirst, isLast);
        },interval);
    }
    
    this.resume = function()
    {
        if (!self.pauseInfo)
            return;
        
        self.scheduleDraw(self.pauseInfo.actionset, 0, 
            self.pauseInfo.callbackFunc, 
            self.pauseInfo.onPlaybackEnd, 
            self.pauseInfo.onPause,
            self.pauseInfo.isFirst,
            self.pauseInfo.interruptActionsStatus);
            
        self.pauseInfo = null;
    }   
    
    this.drawActions = function (actionArray, onPlayEnd, isFirst, isLast)
    {
        for (var i = 0; i < actionArray.length; i++)
            SignaturePad.prototype._drawPointRE(actionArray[i].x,actionArray[i].y,actionArray[i].type);
            
        if (isLast)
        {
            onPlayEnd();
        }
    }
}


Action = function()
{
    var self = this;
    this.actionType; // 1 - Point, other action types could be added later
    this.x = 0;
    this.y = 0;
    this.isMovable = false;
    this.index = 0;
    
    if (arguments.length > 0)
    {
        self.actionType = arguments[0];
    }
    if (arguments.length > 2)
    {
        self.x = arguments[1];
        self.y = arguments[2];
    }
}

PointX = function (argX,argY,typeArg)
{
    var self = this;
    this.type = typeArg; //0 - moveto, 1 - lineto
    
    Action.call(this,1,argX,argY);
}

PointX.prototype = new Action();

ActionsSet = function (interalArg, actionsArrayArg)
{
    var self = this;
    
    this.actions = actionsArrayArg;
    this.interval = interalArg;
    this.next = null;
   //console.log(interalArg);
}