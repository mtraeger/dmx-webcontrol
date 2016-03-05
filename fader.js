"use strict"

var ease = require('./easing.js').ease

function Fader(universe, channel) {
	this.universe = universe;
	this.channel = channel;
	this.fadingGoal = 0;
	this.finished = false;
}

Fader.prototype.updateValue = function(fadingGoal) {
	this.fadingGoal = fadingGoal;
};

Fader.prototype.run = function(fadingGoal, speed, onFinish, onUpdate) {
	this.fadingGoal = fadingGoal;
	var self = this;

	var singleStep = function () {
		var currentValue = self.universe.get(self.channel);

		if (currentValue == self.fadingGoal) {//finished
			clearInterval(iid);
			self.finished = true;
			//if(onFinish) onFinish(...singleUpdate-format..); //TODO ?
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
		}
	};

	var iid = setInterval(singleStep, speed); //TODO speed from local var?
};

module.exports = Fader