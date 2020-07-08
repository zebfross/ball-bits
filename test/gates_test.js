

var BB = require('../scripts/index').BB;

BB.timeForBallDrop = function(angle) {
    return 0;
}

QUnit.test("input gate releases balls", function (assert) {
    var done = assert.async()
    var balls = [];
    for (var i = 0; i < 6; i++) {
        balls.push(new BB.Ball(i));
    }

    var bucket1 = new BB.BucketGate([], 0, 0);
    var model = new BB.InputGate(balls, 0, 0, bucket1);

    assert.ok(model != undefined);
    assert.ok(model.gate != undefined);

    model.advanceBalls(function() {
        assert.equal(model.balls.length, 5);
        done();
    });
});

QUnit.test("if gate releases balls into bucket", function (assert) {
    var done = assert.async()
    var balls = [];
    for (var i = 0; i < 6; i++) {
        balls.push(new BB.Ball(i));
    }

    var bucket1 = new BB.BucketGate([], 0, 0);
    var bucket2 = new BB.BucketGate([], 0, 0);

    var ifGate = new BB.IfGate([], 0, 0, [bucket1, bucket2], BB.IfGate_BallFn(BB.IfGate_Mod), 2);
    var model = new BB.InputGate(balls, 0, 0, ifGate)
    var game = new BB.Game(model);
    assert.ok(game != undefined);

    game.advanceBalls(function () {
        assert.equal(model.balls.length, 5);
        assert.equal(ifGate.balls.length, 1);
        done();
    });
});

QUnit.test("Game advances all balls", function (assert) {
    var done = assert.async()
    var balls = [];
    for (var i = 0; i < 6; i++) {
        balls.push(new BB.Ball(i));
    }

    var bucket1 = new BB.BucketGate([], 0, 0);
    var bucket2 = new BB.BucketGate([], 0, 0);

    var ifGate = new BB.IfGate([], 0, 0, [bucket1, bucket2], BB.IfGate_BallFn(BB.IfGate_Mod), 2);
    var model = new BB.InputGate(balls, 0, 0, ifGate)
    var game = new BB.Game(model);
    assert.ok(game != undefined);

    game.advanceAllBalls(function (error) {
        assert.notOk(error);
        assert.equal(model.balls.length, 0);
        assert.equal(ifGate.balls.length, 0);
        assert.equal(bucket1.balls.length, 3);
        assert.equal(bucket2.balls.length, 3);

        done();
    });
});
