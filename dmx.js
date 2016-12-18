"use strict"

var util = require('util')
var EventEmitter = require('events').EventEmitter

function DMX(options) {
	var options = options || {}
	this.universes = {}
	this.drivers   = {}
	this.devices   = options.devices || require('./devices')
    this.blackout  = [];

	this.registerDriver('null',                require('./drivers/null'))
	this.registerDriver('dmx4all',             require('./drivers/dmx4all'))
	this.registerDriver('enttec-usb-dmx-pro',  require('./drivers/enttec-usb-dmx-pro'))
	this.registerDriver('enttec-open-usb-dmx', require('./drivers/enttec-open-usb-dmx'))
	this.registerDriver('artnet',              require('./drivers/artnet'))
	this.registerDriver('bbdmx',               require('./drivers/bbdmx'))
}

util.inherits(DMX, EventEmitter)

DMX.devices   = require('./devices')
DMX.Animation = require('./anim')
DMX.Fader = require('./fader')

DMX.prototype.registerDriver = function(name, module) {
	this.drivers[name] = module
}

DMX.prototype.addUniverse = function(name, driver, device_id) {
    this.blackout[name] = {};
	this.blackout[name].state = false;
	return this.universes[name] = new this.drivers[driver](device_id)
}

DMX.prototype.update = function(universe, channels, emit) {
	if (this.blackout[universe].state == false) { //send "data" only if no blackout
		this.universes[universe].update(channels);
	}else { //update buffer on changes while blackout
        for (var channel in channels) {
            this.blackout[universe].buffer[channel] = channels[channel];
        }
	}
    var emitUpdate = emit !== false; //prevent emit only if false
	if(emitUpdate) {
        this.emit('update', universe, channels);
    }
}

DMX.prototype.updateAll = function(universe, value) {
    if (this.blackout[universe].state == false) { //send "data" only if no blackout
        this.universes[universe].updateAll(value);
	} else { //update buffer on changes while blackout
        for (var i = 0; i < 512; i++) {
            this.blackout[universe].buffer[i] = value;
        }
	}
	this.emit('updateAll', universe, value)
}

DMX.prototype.toggleBlackout = function(universe) {
    if (this.blackout[universe].state == false) {
        this.blackout[universe].buffer = {};
        this.blackout[universe].state = true;
		for (var i = 0; i < 512; i++) { //store current state
            this.blackout[universe].buffer[i] = this.universes[universe].get(i);
        }
        this.universes[universe].updateAll(0);
    } else {
        this.universes[universe].update(this.blackout[universe].buffer); //restore values
        this.blackout[universe].buffer = {};
        this.blackout[universe].state = false;
	}
    this.emit('blackout', this.blackout[universe].state, universe);
}

DMX.prototype.get = function(universe, channel) {
    if (this.blackout[universe].state == false) { //send "data" only if no blackout
        return this.universes[universe].get(channel);
    } else { //return buffer value
        return this.blackout[universe].buffer[channel];
    }
}

DMX.prototype.universeToObject = function(universe) {
    var u = {}
    for(var i = 0; i < 512; i++) {
        u[i] = this.get(universe, i)
    }
    return u
}

module.exports = DMX
