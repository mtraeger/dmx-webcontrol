"use strict"

var ease = require('./easing.js').ease

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

Fader.prototype.updateSpeed = function (newspeed) {
	Fader.speed = newspeed;
	if (this.intervalId != null && this.finished == false && this.speedUpdated == false) {
		this.speedUpdated = true;
		clearInterval(this.intervalId);
		this.run(this.fadingGoal, Fader.speed, this.onFinish, this.onUpdate);
	}
};

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

Fader.prototype.updateValue = function(fadingGoal) {
	this.fadingGoal = fadingGoal;
};

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