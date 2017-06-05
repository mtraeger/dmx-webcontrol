"use strict"

var ease = require('./easing.js').ease
var resolution = 25

Anim.abort = false;

/**
 * Animations with fix start and end. But can be aborted.
 * @constructor
 *
 * @param dmx dmx.js instance
 */
function Anim(dmx) {
	this.dmx = dmx;
	this.fx_stack = [];
	this.aborted = false;
}

/**
 * Abort all animations (while 500ms in update)
 */
Anim.abortAnimations = function(){
	// console.log("Aborting all animations");
	Anim.abort = true;
}

/**
 * Abort this single animation
 */
Anim.prototype.abort = function () {
	// console.log("Aborting single animation");
	this.aborted = true;
}

/**
 * add animations step
 *
 * @param to channels to update e.g. {1: 255, 2:200} starting at 0!
 * @param duration of step e.g. 2000 for 2 sec
 * @param options object with e.g. easing key (e.g. linear (default) or inOutCubic or outBounce from easings.js)
 * @returns {Anim}
 */
Anim.prototype.add = function(to, duration, options) {
	var duration = duration || resolution
	var options  = options  || {}
	options['easing'] = options['easing'] || 'linear'
	this.fx_stack.push({'to': to, 'duration': duration, 'options': options})
	return this
}



/**
 * add relative chanels for multiple devices
 * e.g. .addMultipleDevs({1: 255, 2:200}, 2000, [1,9]) -> channels 1,2,9,10 updated
 *
 * @param to channels to update e.g. {1: 255, 2:200} starting at 0!
 * @param duration of step e.g. 2000 for 2 sec
 * @param startingchanels array with initial channels for starting e.g. [1,9]
 *            second value -1 is added to channels in to and also executed
 * @param options object with e.g. easing key (e.g. linear (default) or inOutCubic or outBounce from easings.js)
 * @returns {Anim}
 */
Anim.prototype.addMultipleDevs = function (to, duration, startingchanels, options) {
	var tonew = {}; //new to field value
	for (var i in startingchanels) {
		for (var k in to) {
			var newchannel = parseInt(k) + startingchanels[i] - 1; //new channel to manipulate
			tonew[newchannel] = to[k]; //assign value to new channel
			//console.log(k + " " + to[k] + " " + startingchanels[i] + " " + newchannel)
			//console.log(tonew)
		}
	}
	this.add(tonew, duration, options)
	return this
}

Anim.prototype.delay = function(duration) {
	return this.add({}, duration)
}

/** starts animation
 *
 * @param universe
 * @param onFinish callbac called nearly on end (if want garuanteed on end, call .delay(msec) before )
 *                    with argument final-value (not called if aborted)
 * @param onUpdate callback called on every value update, argument are the new values
 */
Anim.prototype.run = function(universe, onFinish, onUpdate) {
	var config = {};
	var t = 0;
	var d = 0;
	var a;

    var lastUpdate = new Date().getTime();

    var fx_stack = this.fx_stack;
	var self = this;
	var ani_setup = function() {
		a = fx_stack.shift()
		t = 0
		d = a.duration
		config = {}
		for(var k in a.to) {
			config[k] = {
				'start': self.dmx.get(universe, k),
				'end':   a.to[k]
			}
		}
	}
	var ani_step = function() {
		if(Anim.abort || self.aborted){
			clearInterval(iid);
            Anim.abort = false;
			return;
		}

		var new_vals = {}
		for(var k in config) {
			new_vals[k] = Math.round(config[k].start + ease[a.options['easing']](t, 0, 1, d) * (config[k].end - config[k].start))
		}
		t = t + resolution
		self.dmx.update(universe, new_vals, false) //only value updates of dmx

        // if(onUpdate) onUpdate(new_vals);
        if(onUpdate && new Date().getTime() - lastUpdate > 100){ //update display slider only every 100 ms
            onUpdate(new_vals);
            lastUpdate = new Date().getTime();
        };


		if(t > d) {
			if(fx_stack.length > 0) {
				ani_setup()
			} else {
				clearInterval(iid)
				if(onFinish) onFinish(a.to);
			}
		}
	}

	ani_setup()
	var iid = setInterval(ani_step, resolution)
}

module.exports = Anim