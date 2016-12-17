"use strict"

function Null(device_id, options) {
	var self = this
	options = options || {}
	this.universe = new Buffer(512)
	this.universe.fill(0)
	this.blackout = false;
	self.start()
}

Null.prototype.start = function() {
	var self = this
	self.timeout = setInterval(function() {
		if (this.blackout == false) { //send "data" only if no blackout
			console.log(self.universe)
		}
	}, 1000)
}

Null.prototype.stop = function() {
	clearInterval(this.timeout)
}

Null.prototype.close = function(cb) {
	cb(null)
}

Null.prototype.update = function(u) {
	for(var c in u) {
		this.universe[c] = u[c]
	}
	console.log(this.universe)
}

Null.prototype.updateAll = function(v){
	for(var i = 0; i < 512; i++) {
		this.universe[i] = v
	}
}

Null.prototype.toggleBlackout = function () { //TODO not tested
	if (this.blackout == false) {
		this.blackout = true;
		var nulluniverse = new Buffer(512)
		nulluniverse.fill(0)
		//send 0 to all channels here
		console.log(nulluniverse);
	} else {
		//this.updateAll(null, true); //send this,universe data complete again
		this.blackout = false;
	}
	return this.blackout.valueOf();
};

Null.prototype.get = function(c) {
	return this.universe[c]
}

module.exports = Null