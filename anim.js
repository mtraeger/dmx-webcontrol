"use strict"

var ease = require('./easing.js').ease
var resolution = 25

function Anim() {
	this.fx_stack = []
}

Anim.prototype.add = function(to, duration, easing) {
	var duration = duration || resolution
	var easing = easing || 'linear'
	this.fx_stack.push({'to': to, 'duration': duration, 'easing': easing})
	return this
}

//add relative chanels for multiple devices e.g. .addMultipleDevs({1: 255, 2:200}, 2000, [1,9]) -> channels 1,2,9,10 updated
Anim.prototype.addMultipleDevs = function (to, duration, startingchanels, easing) {
	var tonew = {}; //new to field value
	for (var i in startingchanels) {
		for (var k in to) {
			var newchannel = parseInt(k) + startingchanels[i] - 1; //new channel to manipulate
			tonew[newchannel] = to[k]; //assign value to new channel
			//console.log(k + " " + to[k] + " " + startingchanels[i] + " " + newchannel)
			//console.log(tonew)
		}
	}
	this.add(tonew, duration, easing)
	return this
}

Anim.prototype.delay = function(duration) {
	return this.add({}, duration)
}

Anim.prototype.run = function(universe, onFinish) {
	var config = {}
	var t = 0
	var d = 0
	var a

	var fx_stack = this.fx_stack;
	var ani_setup = function() {
		a = fx_stack.shift()
		t = 0
		d = a.duration
		config = {}
		for(var k in a.to) {
			config[k] = {
				'start': universe.get(k),
				'end':   a.to[k]
			}
		}
	}
	var ani_step = function() {
		var new_vals = {}
		for(var k in config) {
			new_vals[k] = Math.round(config[k].start + ease[a.easing](t, 0, 1, d) * (config[k].end - config[k].start))
		}
		t = t + resolution
		universe.update(new_vals)
		if(t > d) {
			if(fx_stack.length > 0) {
				ani_setup()
			} else {
				clearInterval(iid)
				if(onFinish) onFinish()
			}
		}
	}

	ani_setup()
	var iid = setInterval(ani_step, resolution)
}

module.exports = Anim