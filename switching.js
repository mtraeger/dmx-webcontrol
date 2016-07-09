"use strict"

Switching.abort = false;

function Switching(msg, updateDmx) {
	this.fx_stack = [];
	this.aborted = false;
	this.running = false;
	this.updateDmx = updateDmx;

	this.mSecondsPerStep = 2000; //TODO check
	// this.addPresetsToAnimations(); //TODO required?
	this.intervalId = null;
	this.speedUpdated = false;
	//TODO dirty? -> maybe function to dmx-web?
	this.setupconfig = msg.setup
	this.setupdevices = msg.devices
	this.presets = this.setupconfig.presets;
	// this.colorstuff = colorStuff;
}

Switching.prototype.addPresetsToAnimations = function () {
	// presets switching
	// for (var preset in this.presets) {
	// 	this.fx_stack.push({'to': this.presets[preset].values})
	// }

	//color switching
	//TODO fix duplication with index.html
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
			// if(fadingEffect == 'linear'){
			// 	socket.emit('update', universe, update);
			// }else{
			// 	socket.emit('update', universe, update, true);
			// }
			//TODO enable effect mode by button also here
		}
		this.fx_stack.push({'to': universesUpdate});
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


/** starts switching between channels / colors
 *
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