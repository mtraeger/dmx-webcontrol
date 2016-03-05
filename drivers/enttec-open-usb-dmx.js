"use strict"

var FTDI = require('ftdi')

function EnttecOpenUsbDMX(device_id, cb) {
	var self = this

	cb = cb || function() {}
	this.universe = new Buffer(512)
	this.universe.fill(0)
	this.blackout = false;

	self.sleepTime = 24
	self.timeout

	self.dev = new FTDI.FtdiDevice(device_id)
	self.dev.open({
		'baudrate': 57600,
		'databits': 8,
		'stopbits': 2,
		'parity': 'none'
	}, function(err) {
		cb(err, device_id)
		if(!err) {
			self.start()
		}
	})
}

EnttecOpenUsbDMX.prototype.send_universe = function() {
	if (this.blackout == false) { //send "data" only if no blackout
		this.dev.write(this.universe)
	}
}

EnttecOpenUsbDMX.prototype.start = function() {
	this.timeout = setInterval(this.send_universe.bind(this), this.sleepTime)
}

EnttecOpenUsbDMX.prototype.stop = function() {
	clearInterval(this.timeout)
}

EnttecOpenUsbDMX.prototype.close = function(cb) {
	this.stop()
	this.dev.close(cb)
}

EnttecOpenUsbDMX.prototype.update = function(u) {
	for(var c in u) {
		this.universe[c] = u[c]
	}
}

EnttecOpenUsbDMX.prototype.updateAll = function(v) {
	for(var i = 0; i < 512; i++) {
		this.universe[i] = v
	}
}

EnttecOpenUsbDMX.prototype.toggleBlackout = function () { //TODO not tested
	if (this.blackout == false) {
		this.blackout = true;
		var nulluniverse = new Buffer(512)
		nulluniverse.fill(0)
		this.dev.write(nulluniverse); //send 0 to all channels
	} else {
		this.dev.write(this.universe) //send this,universe data complete again
		this.blackout = false;
	}
	return this.blackout.valueOf();
};

EnttecOpenUsbDMX.prototype.get = function(c) {
	return this.universe[c]
}

module.exports = EnttecOpenUsbDMX
