"use strict"

var options = {
    host: '192.168.1.10',
    refresh: 20000
}
var artnet = require('artnet')(options);

function ArtNet(device_id, cb) {
    var self = this
    cb = cb || function () {
        }
    this.universe = new Buffer(512)
    this.universe.fill(0)
    self.start()
}

ArtNet.prototype.start = function () {
    var self = this
    self.timeout = setInterval(function () {
        console.log(self.universe)
    }, 1000)
}

ArtNet.prototype.stop = function () {
    clearInterval(this.timeout)
}

ArtNet.prototype.close = function (cb) {
    artnet.close()
    cb(null)
}

ArtNet.prototype.update = function (u) {
    for (var c in u) {
        this.universe[c] = u[c]
        artnet.set(c,u[c])
    }
    console.log(this.universe)
}

ArtNet.prototype.updateAll = function (v) {
    for (var i = 0; i < 512; i++) {
        this.universe[i] = v
        artnet.set(i,v)
    }
}

ArtNet.prototype.get = function (c) {
    return this.universe[c]
}

module.exports = ArtNet