"use strict"

var ease = require('./easing.js').ease

/**
 * Fading effect with adaption of target while animating. Smooth delay of input values from one channel.
 * Runs only on a single specific channel.
 * Adaption of delay possible while animation is possible as well as aborting an animation.
 *
 * @param dmx dmx.js instance
 * @param universe
 * @param channel
 * @constructor
 */
function Fader(dmx, universe, channel) {
	this.dmx = dmx;
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
	// see function also in dmx-web for static animation -> socket_on-fading
	return (0.1 * Math.exp((Fader.speed/13)+1)*1000 - 0.15)/ 256; //*1000 for millisec and div by 256 for size per step
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
	var lastUpdate = new Date().getTime();

	var singleStep = function () {
		var currentValue = self.dmx.get(self.universe, self.channel);

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
			self.dmx.update(self.universe, singleUpdate, false);

            // if(onUpdate) onUpdate(singleUpdate);
			if(onUpdate && new Date().getTime() - lastUpdate > 100){ //update display slider only every 100 ms
                onUpdate(singleUpdate);
                lastUpdate = new Date().getTime();
			};
		}
		self.speedUpdated = false;
	};

	self.intervalId = setInterval(singleStep, self.getModifiedSpeed());
};

module.exports = Fader