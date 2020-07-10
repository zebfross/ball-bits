var BB = window.BB;

var balls = [];
for (var i=0; i < 6; i++) {
    balls.push(new BB.Ball(Math.floor(Math.random() * 100)));
}

var bucket1 = new BB.BucketGate([], 550, 550);
var bucket2 = new BB.BucketGate([], 200, 550);
var ifCond = new BB.IfGate([], 300, 200, [bucket1, bucket2], BB.IfGate_Mod, 2);
var input = new BB.InputGate(balls, -200, 50, ifCond);

var game = new BB.Game(input, function(buckets) {
    if (buckets.length != 2)
        return "Should have two buckets"

    for(var b in buckets[0].balls) {
        if(buckets[0].balls[b].value % 2 != 0) {
            return "Left bucket should only have even numbers"
        }
    }
    for (var b in buckets[1].balls) {
        if (buckets[1].balls[b].value % 2 == 0) {
            return "Left bucket should only have odd numbers"
        }
    }
    return true;
} /*success*/);
