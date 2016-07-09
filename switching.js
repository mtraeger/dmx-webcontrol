"use strict"

Switching.abort = false;

function Switching(updateDmx, presets) {
	this.fx_stack = [];
	this.aborted = false;
	this.running = false;
	this.updateDmx = updateDmx;
	this.presets = presets
	this.mSecondsPerStep = 2000; //TODO check
	this.addPresetsToAnimations();
	this.intervalId = null;
	this.speedUpdated = false;

}

Switching.prototype.addPresetsToAnimations = function () {
	for (var preset in this.presets) {
		this.fx_stack.push({'to': this.presets[preset].values})
	}
}

/**
 * Abort all animations (while 500ms in update)
 */
Switching.abortAnimations = function(){
	console.log("Aborting all animations");
	Switching.abort = true;
	setTimeout(function() {
		Switching.abort = false;
	}, 200);
}

/**
 * Abort this single animation
 */
Switching.prototype.abort = function () {
	console.log("Aborting single animation");
	this.aborted = true;
}

Switching.prototype.setResolution = function (mSecondsPerStep) {
	console.log("Update Resolution");
	this.mSecondsPerStep = mSecondsPerStep;
	if (this.intervalId != null && this.running == true && this.speedUpdated == false) {
		this.speedUpdated = true;
		clearInterval(this.intervalId);
		this.run();
	}
}

/**
 * add animations step
 *
 * @param to channels to update e.g. {1: 255, 2:200} starting at 0!
 * @param duration of step e.g. 2000 for 2 sec
 * @param easing function e.g. linear (default) or inOutCubic or outBounce from easings.js
 * @returns {Switching}
 */
// Switching.prototype.add = function(to, duration, easing) {
// 	var duration = duration || resolution
// 	var easing = easing || 'linear'
// 	this.fx_stack.push({'to': to, 'duration': duration, 'easing': easing})
// 	return this
// }


// Switching.prototype.delay = function(duration) {
// 	return this.add({}, duration)
// }


/** starts animation
 *
 * @param universe
 * @param onFinish callbac called nearly on end (if want garuanteed on end, call .delay(msec) before )
 *                    with argument final-value (not called if aborted)
 * @param onUpdate callback called on every value update, argument are the new values
 */
Switching.prototype.run = function() {
	this.running = true;
	var to
	var a

	var fx_stack = this.fx_stack;
	var self = this;


	// while(!(Switching.abort || self.aborted)) {
	// 	ani_setup();
	// 	ani_step();
	// 		}
	// self.running = false;

	var singleStep = function () {

		if(fx_stack.length < 1){
			self.addPresetsToAnimations(); //TODO required here?
		}
		a = fx_stack.shift()
		to = a.to;

		if(Switching.abort || self.aborted){
			self.running = false;
			clearInterval(self.intervalId);
			return;
		}

		for (var universe in to) {
			self.updateDmx(universe,  to[universe], false); //TODO effect?
		}

		self.speedUpdated = false;
	};


	self.intervalId = setInterval(singleStep, this.mSecondsPerStep);
}

module.exports = Switching