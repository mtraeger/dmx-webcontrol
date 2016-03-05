"use strict"

var ease = require('./easing.js').ease

function Fader(universe, channel) {
	this.universe = universe;
	this.channel = channel;
	this.fadingGoal = 0;
	this.finished = false;
	this.aborted = false;
}

Fader.speed = 1;

Fader.prototype.updateSpeed = function(newspeed) {
	Fader.speed = newspeed;
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
	var self = this;

	var singleStep = function () {
		var currentValue = self.universe.get(self.channel);

		if (currentValue == self.fadingGoal || self.aborted) {//finished
			clearInterval(iid);
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
			//TODO easing function? - only for still clicked events?
			var singleUpdate = {}; //creating new object with one single channel target value
			singleUpdate[self.channel] = newvalue;
			self.universe.update(singleUpdate);
			if(onUpdate) onUpdate(singleUpdate);
		}
	};

	//TODO no special transformation or to choose?
	var iid = setInterval(singleStep, 1+Math.pow(Fader.speed,2)/200); //TODO speed from local var?
	//console.log(1+Math.pow(Fader.speed,2)/200)
};

module.exports = Fader