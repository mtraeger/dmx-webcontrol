"use strict"

var FTDI = require('ftdi')

var	  ENTTEC_PRO_DMX_STARTCODE = 0x00
	, ENTTEC_PRO_START_OF_MSG  = 0x7e
	, ENTTEC_PRO_END_OF_MSG    = 0xe7
	, ENTTEC_PRO_SEND_DMX_RQ   = 0x06
	, ENTTEC_PRO_RECV_DMX_PKT  = 0x05
	;

function EnttecUSBDMXPRO(device_id, cb) {
	var self = this
	cb = cb || function() {}
	this.universe = new Buffer(512)
	this.universe.fill(0)
	this.blackout = false;
	
	this.dev = new FTDI.FtdiDevice(device_id)
	this.dev.open({
		'baudrate': 250000,
		'databits': 8,
		'stopbits': 2,
		'parity': 'none'
	}, function(err) {
		cb(err, device_id)
		if(!err) {
			self.send_universe()
		}
	})
}
/**
 *
 * @param customuniverse must not be set, can be used to send 0 out of order for blackout
 */
EnttecUSBDMXPRO.prototype.send_universe = function(customuniverse) {

	var sendUniverse = customuniverse || this.universe; //TODO not tested

	var hdr = Buffer([
		ENTTEC_PRO_START_OF_MSG,
		ENTTEC_PRO_SEND_DMX_RQ,
		 (this.universe.length + 1)       & 0xff,
		((this.universe.length + 1) >> 8) & 0xff,
		ENTTEC_PRO_DMX_STARTCODE
	])

	var msg = Buffer.concat([
		hdr,
		sendUniverse,
		Buffer([ENTTEC_PRO_END_OF_MSG])
	])
	this.dev.write(msg)
}

EnttecUSBDMXPRO.prototype.start = function() {}
EnttecUSBDMXPRO.prototype.stop = function() {}

EnttecUSBDMXPRO.prototype.close = function(cb) {
	this.dev.close(cb)
}

EnttecUSBDMXPRO.prototype.update = function(u) {
	for(var c in u) {
		this.universe[c] = u[c]
	}
	if (this.blackout == false) { //send "data" only if no blackout
		this.send_universe()
	}
}

EnttecUSBDMXPRO.prototype.updateAll = function(v){
	for(var i = 0; i < 512; i++) {
		this.universe[i] = v
	}
	if (this.blackout == false) { //send "data" only if no blackout
		this.send_universe(); //TODO added by me, missed before?
	}
}

EnttecUSBDMXPRO.prototype.toggleBlackout = function () { //TODO not tested
	if (this.blackout == false) {
		this.blackout = true;
		var nulluniverse = new Buffer(512)
		nulluniverse.fill(0)
		this.send_universe(nulluniverse); //send 0 to all channels
	} else {
		this.send_universe(); //send this,universe data complete again
		this.blackout = false;
	}
	return this.blackout.valueOf();
};

EnttecUSBDMXPRO.prototype.get = function(c) {
	return this.universe[c]
}

module.exports = EnttecUSBDMXPRO