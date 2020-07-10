(function (global$1) {
    global$1 = global$1 && global$1.hasOwnProperty('default') ? global$1['default'] : global$1;
    var window$1 = global$1.window;
    var document$1 = global$1.document;
    var inBrowser = (window$1 && document$1);
    var BB = {};

    var Matter;

    if (inBrowser) {
        Matter = window$1.Matter;
    } else {
        Matter = require('matter-js');
    }

    var Engine = Matter.Engine,
        Render = Matter.Render,
        World = Matter.World,
        Bodies = Matter.Bodies;

    // create an engine
    var engine = Engine.create();

    if (inBrowser) {
        // create a renderer
        var render = Render.create({
            element: document$1.querySelector("#game-div"),
            engine: engine,
            options: {
                wireframes: false,
                hasBounds: true
            }
        });

        // run the renderer
        Render.run(render);

        var limit = 0;
        (function run() {
            limit++;
            //if (limit < 500) {
            window$1.requestAnimationFrame(run);
            Engine.update(engine, 1000 / 60);
            //}
        })();
    }

    BB.radiansToDegrees = function(rads) {
        return rads * (180/3.14);
    }

    BB.degreesToRadians = function(degs) {
        return degs * (3.14/180);
    }

    BB.timeForBallDrop = function(angleInRads) {
        var angleAbs = Math.abs(angleInRads);
        if (angleAbs > 0)
            return ((1.5 / angleAbs) + 2 * angleAbs) * 175;

        return 0;
    }

    BB.Game = function(startGate, successFunc) {
        this.start = startGate;
        this.successFunc = successFunc;

        this.advanceAllBalls = function(cb) {
            var self = this;
            var callback = function(error, finished) {
                if (finished) {
                    var success = successFunc(self.findBuckets());
                    if(inBrowser) {
                        if (success == true) {
                            document$1.body.append("Success");
                        } else {
                            document$1.body.append("Failed: " + success);
                        }
                    }
                    if (cb)
                        return cb(error, success);
                } else {
                    self.advanceBalls(callback);
                }
            }

            self.advanceBalls(callback);
        }

        this.advanceBalls = function(cb) {
            var nodesToVisit = [this.start];

            while(nodesToVisit.length > 0) {
                var node = nodesToVisit.shift();

                nodesToVisit = nodesToVisit.concat(node.next);

                var isNextReady = node.next.reduce((prev, curr) => prev || curr.isReadyToAdvance(), false);
                if(!isNextReady && node.isReadyToAdvance()) {
                    return node.advanceBalls(cb);
                }
            }
            cb(null, true);
        }

        this.findBuckets = function () {
            var nodesToVisit = [this.start];
            var buckets = [];
            while (nodesToVisit.length > 0) {
                var node = nodesToVisit.shift();

                if (node instanceof BB.BucketGate) {
                    buckets.push(node);
                }

                if (node.next)
                    nodesToVisit = nodesToVisit.concat(node.next);
            }

            return buckets;
        }
    }

    BB.Errors = {
        NotReadyToAdvance: "Not Ready To Advance"
    }

    BB.Gate = function(balls, x, y, defaultAdvanced, next) {
        this.balls = balls;
        if (!next)
            next = []
        else if (next.constructor != Array)
            next = [next];

        this.next = next;
        this.defaultAdvanceCount = defaultAdvanced;
        this.isAdvancing = false;
        this.x = x;
        this.y = y;
        this.angle = 0;

        this.onBallsAdvancing = function(count) {
            // override
        }

        this.onBallsAdvanced = function (count, cb) {
            // override
        }

        this.isReadyToAdvance = function() {
            return this.balls.length > 0 && 
                this.balls.length >= this.defaultAdvanceCount &&
                next.length > 0 && 
                !this.isAdvancing;
        }

        this.advanceBalls = function(cb) {
            this.advanceNBalls(this.defaultAdvanceCount, cb);
        }

        this.removeBalls = function(count) {
            return this.balls.splice(0, count);
        }

        this.addBalls = function(ballsToAdd) {
            this.balls = this.balls.concat(ballsToAdd);
        }

        this.advanceNBalls = function (count, cb) {
            var self = this;
            var callback = function(error) {
                self.isAdvancing = false;
                if(cb)
                    cb(error);
            }
            if (count < 1 || !self.isReadyToAdvance()) {
                return callback(BB.Errors.NotReadyToAdvance);
            }

            this.isAdvancing = true;
            setTimeout(function() {
                self.onBallsAdvancing(count);

                if (count < self.balls.length) {
                    Matter.Sleeping.set(self.balls[count].body, true);
                }

                setTimeout(function () {
                    self.onBallsAdvanced(count, function (numRemoved) {
                        if ((count - numRemoved) < self.balls.length) {
                            Matter.Sleeping.set(self.balls[count - numRemoved].body, false);
                        }

                        callback(null);
                    });
                }, BB.timeForBallDrop(self.angle) * count);
            }, 1);
        }

        this.remove = function() {
            World.remove(engine.world, this.body);
        }

        this.move = function(x, y) {
            this.remove();
            this.x = x;
            this.y = y;
            this.create();
        }
    }

    BB.InputGate = function(balls, x, y, next) {
        BB.Gate.call(this, balls, x, y, 1 /*defaultAdvanced*/, next);
        this.angle = .17;

        this.closeGate = function() {
            if (!this.gate) {
                this.gate = Bodies.rectangle(this.x + 500, this.y, 20, 150, { isStatic: true });
                this.body.push(this.gate);
                World.add(engine.world, this.gate);
            }
        }

        this.onBallsAdvanced = function(count, cb) {
            this.closeGate();
            var ballsAdvanced = this.removeBalls(count);
            var numRemoved = ballsAdvanced.length;

            if (this.next.length == 1) {
                this.next[0].addBalls(ballsAdvanced);
            }

            cb(numRemoved);
        }

        this.onBallsAdvancing = function (count) {
            if (this.gate)
                World.remove(engine.world, this.gate);
            this.gate = null;
        }

        this.create = function() {
            this.body = [];
            this.body.push(Bodies.rectangle(this.x, this.y, 1000, 20, { angle: this.angle, isStatic: true }));
            World.add(engine.world, this.body);

            this.closeGate();

            for(var i=0; i < this.balls.length; i++) {
                balls[i].render(this.x+450+(i*-50), this.y+(i*-10));
            }
        }

        this.remove = function () {
            World.remove(engine.world, this.body);
            if (this.gate)
                World.remove(engine.world, this.gate);
        }

        this.create();
    }

    BB.IfGate_Not = function(fn, a, b) { return !fn(a, b); };
    BB.IfGate_Eq = function(a, b) { return a == b; }
    BB.IfGate_Gt = function(a, b) { return a > b; }
    BB.IfGate_Lt = function(a, b) { return a < b; }
    BB.IfGate_Mod = function(a, b) { return a % b == 0; }

    var IfGate_BallFn = function(fn) { return function(a, b) { return fn(a.value, b);} }
    var IfGate_BallBallFn = function(fn) { return function(a, b) { return fn(a.value, b.value); } }

    BB.IfGate = function(balls, x, y, next, compFn, compVal) {
        BB.Gate.call(this, balls, x, y, 1 /*defaultAdvanced*/, next);
        this.compFn = compFn;
        this.compVal = compVal;
        this.body = [];
        this.leftGate = null;
        this.rightGate = null;
        this.angle = .78;

        this.openLeftGate = function() {
            World.remove(engine.world, this.leftGate);
            this.leftGate = null;
        }

        this.closeLeftGate = function () {
            this.leftGate = Bodies.rectangle(this.x + 50 / 4, this.y + 75, 5, 55, { angle: -1 * this.angle, isStatic: true });
            World.add(engine.world, this.leftGate);
        }

        this.openRightGate = function () {
            World.remove(engine.world, this.rightGate);
            this.rightGate = null;
        }

        this.closeRightGate = function() {
            this.rightGate = Bodies.rectangle(this.x + 30 + 50 / 4, this.y + 75, 5, 55, { angle: this.angle, isStatic: true });
            World.add(engine.world, this.rightGate);
        }

        this.onBallsAdvanced = function (count, cb) {
            var ballsRemoved = this.removeBalls(count);
            if (this.leftGate) {
                this.closeRightGate();
                this.next[1].addBalls(ballsRemoved);
            } else if (this.rightGate) {
                this.closeLeftGate();
                this.next[0].addBalls(ballsRemoved);
            }
            
            cb(count);
        }

        this.onBallsAdvancing = function (count) {
            var comp;
            if (count == 1)
                comp = IfGate_BallFn(this.compFn);
            else if (count == 2)
                comp = IfGate_BallBallFn(this.compFn);

            if (comp(this.balls[0], (count > 1) ? this.balls[1] : this.compVal)) {
                this.openLeftGate();
            } else {
                this.openRightGate();
            }
        }

        this.create = function () {
            var options = { isStatic: true };
            this.body = [];
            // top shaft
            this.body.push(Bodies.rectangle(x, y, 5, 100, options));
            this.body.push(Bodies.rectangle(x + 50, y, 5, 100, options));
            // top sides
            this.body.push(Bodies.rectangle(x - 25, y + 75, 5, 85, {angle: .78, isStatic: true}));
            this.body.push(Bodies.rectangle(x + 75, y + 75, 5, 85, { angle: -.78, isStatic: true }));
            // bottom sides
            this.body.push(Bodies.rectangle(x - 15, y + 125, 5, 100, { angle: .78, isStatic: true }));
            this.body.push(Bodies.rectangle(x + 65, y + 125, 5, 100, { angle: -.78, isStatic: true }));

            World.add(engine.world, this.body);

            this.closeLeftGate();
            this.closeRightGate();
        }

        this.remove = function() {
            World.remove(engine.world, this.body);
            if (this.leftGate)
                World.remove(engine.world, this.leftGate);
            if (this.rightGate)
                World.remove(engine.world, this.rightGate);
        }

        this.create();
    }

    BB.BucketGate = function(balls, x, y) {
        BB.Gate.call(this, balls, x, y, 1 /*defaultAdvanced*/, null);

        this.depth = 100;
        this.width = 300;

        this.create = function () {
            var options = { isStatic: true };
            this.body = [];
            this.body.push(Bodies.rectangle(x, y, this.width, 15, options));
            this.body.push(Bodies.rectangle(x - this.width / 2, y - this.depth / 2, 1, this.depth, options));
            this.body.push(Bodies.rectangle(x + this.width / 2, y - this.depth / 2, 1, this.depth, options));

            World.add(engine.world, this.body);
        }

        this.onBallsAdvanced = function (count, cb) {
            cb(0);
        }

        this.create();
    }

    BB.Ball = function(value) {
        this.value = value;
        this.type = 0;
        this.color = 0;
        this.radius = 15;
        this.x = 0;
        this.y = 0;

        this.render = function(x, y) {
            this.x = x;
            this.y = y;
            var inner = Bodies.circle(x, y+5, this.radius/2, { density: 1, isText: true, text: this.value});
            var outter = Bodies.circle(x, y, this.radius, { density: 1});
            this.body = Matter.Body.create({parts: [inner, outter], density: 1});

            World.add(engine.world, this.body);
        }
    }

    function exportBB(BB) {

        if (window$1) {

            // QUnit may be defined when it is preconfigured but then only QUnit and QUnit.config may be defined.
            if (window$1.BB) {
                throw new Error("QUnit has already been defined.");
            }

            window$1.BB = BB;
        }

        // For nodejs
        if (typeof module !== "undefined" && module && module.exports) {
            module.exports = BB;

            // For consistency with CommonJS environments' exports
            module.exports.BB = BB;
        }

        // For CommonJS with exports, but without module.exports, like Rhino
        if (typeof exports !== "undefined" && exports) {
            exports.BB = BB;
        }

        if (typeof define === "function" && define.amd) {
            define(function () {
                return BB;
            });
        }
    }

    exportBB(BB);
}((function () { return this; }())));