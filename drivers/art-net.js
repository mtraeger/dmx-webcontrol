"use strict"

var options = {
    host: '192.168.1.10',
    refresh: '4000'
}
var artnet = require('artnet')(options);

function ArtNet(device_id, cb) {
    var self = this
    cb = cb || function () {
        }
    this.universe = new Buffer(512)
    this.universe.fill(0)
    this.blackout = false;
    self.start()
}

ArtNet.prototype.start = function () {
    var self = this
    self.timeout = setInterval(function () {
        console.log(self.universe)
    }, 2000)
}

ArtNet.prototype.stop = function () {
    clearInterval(this.timeout)
}

ArtNet.prototype.close = function (cb) {
    cb = cb || function () {
        };
    this.stop();
    artnet.close();
    console.log("######### closing art-net ##########");
    cb();
}

ArtNet.prototype.update = function (u) {
    for (var c in u) {
        this.universe[c] = u[c]
        if (this.blackout == false) {
            var setC = parseInt(c) + 1
            artnet.set(setC, this.universe[c])
        }
        //console.log("updateSingle c=" + c + " u[c]="+u[c]+" setC="+setC)
    }
    //console.log(this.universe)
}

ArtNet.prototype.updateAll = function (v) {
    for (var i = 0; i < 512; i++) {
        this.universe[i] = v;
        if (this.blackout == false) {
            var setC = parseInt(i) + 1
            artnet.set(setC, this.universe[i])
        }
    }
}

ArtNet.prototype.toggleBlackout = function () {
    if (this.blackout == false) {
        this.blackout = true;
        for (var i = 1; i <= 512; i++) {
            artnet.set(i, 0);//set all channels to 0
        }
    } else {
        for (var i = 0; i < 512; i++) {
            var setC = parseInt(i) + 1;
            artnet.set(setC, this.universe[i]); //set back to original value
        }
        this.blackout = false;
    }
    return this.blackout.valueOf();
};

ArtNet.prototype.get = function (c) {
    return this.universe[c]
}

module.exports = ArtNet