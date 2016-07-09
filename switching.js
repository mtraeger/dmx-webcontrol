"use strict"

function Switching(msg, updateDmx) {
	this.fx_stack = [];
	this.aborted = false;
	this.running = false;
	this.updateDmx = updateDmx;

	this.mSecondsPerStep = 2000;
	this.intervalId = null;
	this.setupconfig = msg.setup
	this.setupdevices = msg.devices
	this.presets = this.setupconfig.presets;
}

Switching.prototype.addPresetsToAnimations = function () {
	// presets switching
	// for (var preset in this.presets) {
	// 	this.fx_stack.push({'to': this.presets[preset].values})
	// }

	//color switching //TODO different strategies by button
	//TODO fix duplication with index.html
	//TODO generate not new color list all the time - generate once and store it
	for (var color in this.setupconfig.colors) {
		var universesUpdate = {};
		for (var universe in this.setupconfig.universes) {
			var update = {};
			for (var device in this.setupconfig.universes[universe].devices) {
				var dev = this.setupconfig.universes[universe].devices[device];
				if (this.setupdevices[dev.type].hasOwnProperty("startRgbChannel")) {
					var startRgb = this.setupdevices[dev.type].startRgbChannel;
					var firstRgbChannelForDevice = dev.address + startRgb;
					for (var colorChannel in this.setupconfig.colors[color].values) {
						var updateChannel = parseInt(colorChannel) + firstRgbChannelForDevice;
						update[updateChannel] = this.setupconfig.colors[color].values[colorChannel];
					}

					//TODO special override colors from device config - code below from sliders...
					//use color.label for naming convention
//                                    for (var overrideColor in devices[dev.type].colors) {
//                                        var channel_id = dev.address + Number(overrideColor)
//                                        html += '<label for="' + html_id + '">' + devices[dev.type].channels[overrideColor] + '</label>';
//                                    }

				}
			}
			universesUpdate[universe] = update;
		}
		this.fx_stack.push({'to': universesUpdate});
	}
}

/**
 * Abort this single animation
 */
Switching.prototype.abort = function () {
	console.log("Aborting single animation");
	this.aborted = true;
}

/**
 * set resolution seconds per step - time until next switch
 * @param mSecondsPerStep
 */
Switching.prototype.setResolution = function (mSecondsPerStep) {
	console.log("Update Resolution");
	this.mSecondsPerStep = mSecondsPerStep;
	if (this.intervalId != null && this.running == true) {
		clearInterval(this.intervalId);
		this.run();
	}
}


/** starts switching between channels / colors
 *
 */
Switching.prototype.run = function() {
	this.running = true;
	var to
	var a

	var fx_stack = this.fx_stack;
	var self = this;
	self.aborted = false;

	var singleStep = function () {

		if(self.aborted){
			console.log(self.running)
			self.running = false;
			clearInterval(self.intervalId);
			self.aborted = false; //TODO also required here?
			return;
		}

		if(fx_stack.length < 1){
			self.addPresetsToAnimations();
		}
		a = fx_stack.shift()
		to = a.to;

		for (var universe in to) {
			self.updateDmx(universe,  to[universe], false);
		}
	};

	self.intervalId = setInterval(singleStep, this.mSecondsPerStep);
}

module.exports = Switching