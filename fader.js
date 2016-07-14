"use strict"

var ease = require('./easing.js').ease

/**
 * Fading effect with adaption of target while animating. Smooth delay of input values from one channel.
 * Runs only on a single specific channel.
 * Adaption of delay possible while animation is possible as well as aborting an animation.
 *
 * @param universe
 * @param channel
 * @constructor
 */
function Fader(universe, channel) {
	this.universe = universe;
	this.channel = channel;
	this.fadingGoal = 0;
	this.finished = false;
	this.aborted = false;
	this.intervalId = null;
	this.onFinish = false;
	this.onUpdate = false;
	this.speedUpdated = false;
}

Fader.speed = 1;

/**
 * Set the new speed of this animation - possible while animatoin is running
 * @param newspeed
 */
Fader.prototype.updateSpeed = function (newspeed) {
	Fader.speed = newspeed;
	if (this.intervalId != null && this.finished == false && this.speedUpdated == false) {
		this.speedUpdated = true;
		clearInterval(this.intervalId);
		this.run(this.fadingGoal, Fader.speed, this.onFinish, this.onUpdate);
	}
};

/**
 * Modify speed values for "higher accuracy" at lower values
 * @returns {number}
 */
Fader.prototype.getModifiedSpeed = function() {
	return 1+Math.pow(Fader.speed,2)/200;
};

/**
 * Abort this single animation
 */
Fader.prototype.abort = function () {
	//console.log("Aborting single animation");
	this.aborted = true;
}

/**
 * Set new target value where to end the animation - possible while animation is running.
 * @param fadingGoal
 */
Fader.prototype.updateValue = function(fadingGoal) {
	this.fadingGoal = fadingGoal;
};

/**
 * Setup animation and start it
 * Modification of parameters possible while running - see updateValue, updateSpeed
 * Aborting with abort possible
 *
 * @param fadingGoal initial goal where it should finish
 * @param speed initial how fast
 * @param onFinish
 * @param onUpdate
 */
Fader.prototype.run = function(fadingGoal, speed, onFinish, onUpdate) {
	Fader.speed = speed;
	this.fadingGoal = fadingGoal;
	this.onFinish = onFinish;
	this.onUpdate = onUpdate;

	var self = this;

	var singleStep = function () {
		var currentValue = self.universe.get(self.channel);

		if (currentValue == self.fadingGoal || self.aborted) {//finished
			clearInterval(self.intervalId);
			self.finished = true;

			var singleUpdate = {}; //creating new object with one single channel target value
			singleUpdate[self.channel] = currentValue;
			if(onFinish) onFinish(singleUpdate);
		} else {
			var newvalue = currentValue;
			if (currentValue < self.fadingGoal) {
				newvalue++;
			} else { //current bigger
				newvalue--;
			}

			var singleUpdate = {}; //creating new object with one single channel target value
			singleUpdate[self.channel] = newvalue;
			self.universe.update(singleUpdate);
			if(onUpdate) onUpdate(singleUpdate);
		}
		self.speedUpdated = false;
	};

	self.intervalId = setInterval(singleStep, self.getModifiedSpeed());
	//console.log(1+Math.pow(Fader.speed,2)/200)
};

module.exports = Fader