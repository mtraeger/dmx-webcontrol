"use strict"

var ease = require('./easing.js').ease;
var resolution = 10; //for faster fading, default 25

/**
 * Animations with fix start and end. But can be aborted.
 * @constructor
 *
 * @param dmx dmx.js instance
 */
function Anim(dmx) {
	this.dmx = dmx;
	this.fx_stack = [];
	this.interval = null;
	this.aborted = false;
	this.finished = false;
	this.currentStepFinalValues = {};
	this.animationTimePercent = 0;
}

/**
 * Abort this single animation
 */
Anim.prototype.abort = function () {
    this.stop();
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
 * Add relative chanels for multiple devices
 * e.g. .addMultipleDevs({1: 255, 2:200}, 2000, [1,9]) -> channels 1,2,9,10 updated
 *
 * @param to channels to update e.g. {1: 255, 2:200}
 * @param duration of step in ms e.g. 2000 for 2 sec
 * @param startingchannels array with initial channels for starting e.g. [1,9]
 *            second value -1 is added to channels in to and also executed
 * @param options object with e.g. easing key (e.g. linear (default) or inOutCubic or outBounce from easings.js)
 * @returns {Anim}
 */
Anim.prototype.addMultipleDevs = function (to, duration, startingchannels, options) {
	var tonew = {}; //new to field value
	for (var i in startingchannels) {
		for (var k in to) {
			var newchannel = parseInt(k) + startingchannels[i] - 1; //new channel to manipulate
			tonew[newchannel] = to[k]; //assign value to new channel
		}
	}
	this.add(tonew, duration, options)
	return this
}

/**
 * Add delay between animation steps
 * @param duration
 * @return {Anim}
 */
Anim.prototype.delay = function(duration) {
	return this.add({}, duration)
}


Anim.prototype.stop = function () {
	this.aborted = true;
	if(this.interval) {
		clearInterval(this.interval)
	}
	this.fx_stack = []
}

/**
 * @return final channel value for current animation step
 */
Anim.prototype.getCurrentStepFinalValues = function() {
    return this.currentStepFinalValues;
};


/**
 * @return animation percent - between 0 and 1
 */
Anim.prototype.getAnimationPercent = function() {
    return this.animationTimePercent;
};


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
		a = fx_stack.shift();
		t = 0;
		d = a.duration;
		config = {};
		for(var k in a.to) {
			config[k] = {
				'start': self.dmx.get(universe, k),
				'end':   a.to[k]
			}
		}

		self.currentStepFinalValues = a.to;
	}
	var ani_step = function() {

		self.animationTimePercent = t / d;

		var new_vals = {};
		for(var k in config) {
			new_vals[k] = Math.round(config[k].start + ease[a.options['easing']](t, 0, 1, d) * (config[k].end - config[k].start));
			if(new_vals[k] < 0) new_vals[k] = 0;
			if(new_vals[k] > 255) new_vals[k] = 255;
		}
		t = t + resolution;
		self.dmx.update(universe, new_vals, !onUpdate); // update values if from animation scripts - and no display update configured

        if(onUpdate) onUpdate(new_vals);
        // comment line above and uncomment lines below for better performance on display-slider update in browser
        // if(onUpdate && new Date().getTime() - lastUpdate > 100){ //update display slider only every 100 ms
        //     onUpdate(new_vals);
        //     lastUpdate = new Date().getTime();
        // };

		if(t > d) {
			if(fx_stack.length > 0) {
				ani_setup();
			} else {
				clearInterval(iid);
				self.finished = true;
				if(onFinish) onFinish(a.to);
			}
		}
	};

	ani_setup();
	var iid = this.interval = setInterval(ani_step, resolution);
};

module.exports = Anim;
