"use strict"

var util = require('util')
var EventEmitter = require('events').EventEmitter

function DMX(options) {
	var options = options || {}
	this.universes = {}
	this.drivers   = {}
	this.devices   = options.devices || require('./devices')
    this.blackout  = false;
	this.blackoutBuffer = {};

	this.registerDriver('null',                require('./drivers/null'))
	this.registerDriver('enttec-usb-dmx-pro',  require('./drivers/enttec-usb-dmx-pro'))
	this.registerDriver('enttec-open-usb-dmx', require('./drivers/enttec-open-usb-dmx'))
	this.registerDriver('art-net',             require('./drivers/art-net'))
}

util.inherits(DMX, EventEmitter)

DMX.devices   = require('./devices')
DMX.Animation = require('./anim')
DMX.Fader = require('./fader')

DMX.prototype.registerDriver = function(name, module) {
	this.drivers[name] = module
}

DMX.prototype.addUniverse = function(name, driver, device_id) {
	return this.universes[name] = new this.drivers[driver](device_id)
}

DMX.prototype.update = function(universe, channels) {
	if (this.blackout == false) { //send "data" only if no blackout
		this.universes[universe].update(channels)
	}else { //update buffer on changes while blackout
        for (var channel in channels) {
            this.blackoutBuffer[channel] = channels[channel];
        }
	}
	this.emit('update', universe, channels)
}

DMX.prototype.updateAll = function(universe, value) {
    if (this.blackout == false) { //send "data" only if no blackout
        this.universes[universe].updateAll(value)
	} else { //update buffer on changes while blackout
        for (var i = 0; i < 512; i++) {
            this.blackoutBuffer[i] = value;
        }
	}
	this.emit('updateAll', universe, value)
}

DMX.prototype.toggleBlackout = function(universe) {
	if (this.blackout == false) {
		this.blackout = true;
		for (var i = 0; i < 512; i++) { //store current state
            this.blackoutBuffer[i] = this.universes[universe].get(i);
        }
        this.universes[universe].updateAll(0)
    } else {
        this.universes[universe].update(this.blackoutBuffer); //restore values
        this.blackoutBuffer = {};
		this.blackout = false;
	}
    this.emit('blackout', this.blackout);
}

module.exports = DMX
