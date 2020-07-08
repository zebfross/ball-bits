var BB = window.BB;

var balls = [];
for (var i=0; i < 6; i++) {
    balls.push(new BB.Ball(i));
}

var bucket1 = new BB.BucketGate([], 550, 550);
var bucket2 = new BB.BucketGate([], 200, 550);
var ifCond = new BB.IfGate([], 300, 200, [bucket1, bucket2], BB.IfGate_BallFn(BB.IfGate_Mod), 2);
var input = new BB.InputGate(balls, -200, 50, ifCond);

var game = new BB.Game(input);
