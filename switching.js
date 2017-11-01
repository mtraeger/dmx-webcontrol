"use strict"

/**
 * Switch automatically between different light situations.
 * Selection of strategy possible
 *
 * @param msg -> {'devices': DMX.devices, 'setup': config}
 * @param updateDmx function for updating dmx with at least universe, update and maybe effect
 * @constructor
 */
function Switching(msg, updateDmx) {
	this.fx_stack = [];
	this.aborted = false;
	this.running = false;
	this.updateDmx = updateDmx;

	this.mSecondsPerStep = 2000;
	this.intervalId = null;
	this.setupconfig = msg.setup;
	this.setupdevices = msg.devices;
	this.presets = msg.setup.presets;

    // for (var color in self.setupconfig.colors) { //assign IDs to color
    //     self.setupconfig.colors[color].id = color;
    // }
    this.selectedColors = this.setupconfig.colors.slice();

	this.colorsStrategy();
	this.strategy = this.colorsStrategy;

}

/**
 * Continuously called, adds all animation steps of one round to animation stack.
 * Called when stack will become empty
 */
Switching.prototype.addPresetsToAnimations = function () {

	//Strategies see below
	this.strategy();

};

/* Set Strategies */

/**
 * Strategy
 * Show all colors one after each other (generated from settings with help of param startRgbChannel)
 * (startRgbChannel in dev settings should mark the first RGB channel (R) from wich GB will be found as next channels)
 */
Switching.prototype.colorsStrategy = function () {
	this.setStrategy(function() {
		//color switching
		//TODO fix duplication with index.html
		//TODO generate not new color list all the time - generate once and store it
		for (var color in this.selectedColors) {
			var universesUpdate = {};
			for (var universe in this.setupconfig.universes) {
				var update = {};
				for (var device in this.setupconfig.universes[universe].devices) {
					var dev = this.setupconfig.universes[universe].devices[device];
					if (this.setupdevices[dev.type].hasOwnProperty("startRgbChannel")) {
						var startRgb = this.setupdevices[dev.type].startRgbChannel;
						var firstRgbChannelForDevice = dev.address + startRgb;
						for (var colorChannel in this.selectedColors[color].values) {
							var updateChannel = parseInt(colorChannel) + firstRgbChannelForDevice;
							update[updateChannel] = this.selectedColors[color].values[colorChannel];
						}

						// Maybe override colors here if special device colors
					}
				}
				universesUpdate[universe] = update;
			}
			this.fx_stack.push({'to': universesUpdate});
		}
	});
};

/**
 * Strategy
 * Switch through all colors device by device
 * (generated with startRgbChannel - see general color strategy)
 */
Switching.prototype.colorsDevByDevStrategy = function () {
	this.setStrategy(function() {
//Test device by device update //TODO reduce code duplication?
		for (var color in this.selectedColors) {
			for (var universe in this.setupconfig.universes) {
				for (var device in this.setupconfig.universes[universe].devices) {
					var universesUpdate = {};
					var update = {};
					var dev = this.setupconfig.universes[universe].devices[device];
					if (this.setupdevices[dev.type].hasOwnProperty("startRgbChannel")) {
						var startRgb = this.setupdevices[dev.type].startRgbChannel;
						var firstRgbChannelForDevice = dev.address + startRgb;
						for (var colorChannel in this.selectedColors[color].values) {
							var updateChannel = parseInt(colorChannel) + firstRgbChannelForDevice;
							update[updateChannel] = this.selectedColors[color].values[colorChannel];
						}


						universesUpdate[universe] = update;
						this.fx_stack.push({'to': universesUpdate});
					}
				}

			}

		}
	});
};

/**
 * Strategy
 * Switch through all colors device by device
 * But only one device is active - all other in this animation affected RGB devices are black
 * (generated with startRgbChannel - see general color strategy)
 */
Switching.prototype.colorsSingleDevByDev = function () {
	this.setStrategy(function() {
//Test device by device update //TODO reduce code duplication?
		for (var color in this.selectedColors) {
            for (var universe in this.setupconfig.universes) {
                for (var device in this.setupconfig.universes[universe].devices) {
                    var universesUpdate = {};
                    var update = {};
                    var dev = this.setupconfig.universes[universe].devices[device];
                    if (this.setupdevices[dev.type].hasOwnProperty("startRgbChannel")) {
                        var startRgb = this.setupdevices[dev.type].startRgbChannel;
                        var firstRgbChannelForDevice = dev.address + startRgb;

                        //Special of this strategy: make alle the oters black
                        for (var allDevice in this.setupconfig.universes[universe].devices) {
                            var dev2 = this.setupconfig.universes[universe].devices[allDevice];
                            if (this.setupdevices[dev2.type].hasOwnProperty("startRgbChannel")) {
                                var startRgbCopy = this.setupdevices[dev2.type].startRgbChannel;
                                var firstRgbChannelForDeviceCopy = dev2.address + startRgbCopy;
                                for (var colorChannel2 in this.selectedColors[color].values) {
                                    update[parseInt(colorChannel2) + firstRgbChannelForDeviceCopy] = 0;
                                }
                            }

                        }

                        //old part
                        for (var colorChannel in this.selectedColors[color].values) {
                            var updateChannel = parseInt(colorChannel) + firstRgbChannelForDevice;
                            update[updateChannel] = this.selectedColors[color].values[colorChannel];
                        }


                        universesUpdate[universe] = update;
                        this.fx_stack.push({'to': universesUpdate});
                    }
                }
            }
		}
	});
};

/**
 * Strategy
 * Show one preset after each other
 */
Switching.prototype.presetsStrategy = function () {
	this.setStrategy(function () {
		// presets switching
		for (var preset in this.presets) {
			this.fx_stack.push({'to': this.presets[preset].values})
		}
	})
};

/**
 * Helper for setting strategy
 * clears stack for animation and sets new strategy
 * afterwards reinitializes the new animation steps
 *
 * @param strategy to set
 */
Switching.prototype.setStrategy = function (strategy) {
	this.strategy = strategy;
    this.clearSwitchingStepsStack();
	this.addPresetsToAnimations();
};


/**
 * Helper for clearing the animation stack
 */
Switching.prototype.clearSwitchingStepsStack = function () {
    while(this.fx_stack.length > 0){
        this.fx_stack.shift();
    }
};

/**
 * Abort this single animation
 */
Switching.prototype.abort = function () {
	// console.log("Aborting single animation");
	this.aborted = true;
};

/**
 * set resolution in seconds per step -> time until next switch
 * @param mSecondsPerStep
 */
Switching.prototype.setResolution = function (mSecondsPerStep) {
	// console.log("Update Resolution");
	this.mSecondsPerStep = mSecondsPerStep;
	if (this.intervalId != null && this.running == true) {
		clearInterval(this.intervalId);
		this.run();
	}
};

/**
 * update used colors for color animations
 * @param selectedColor color to add or remove
 * @param enabled boolean wether color should be active or not
 */
Switching.prototype.setSelectedColors = function (selectedColor, enabled) {

    var match = this.setupconfig.colors.filter(function (obj) {
        return obj.label === selectedColor;
    });

    match = match[0];
    var matchPosition = this.selectedColors.indexOf(match);

    if (!enabled && matchPosition > -1) {
        this.selectedColors.splice(matchPosition, 1);
    } else if (enabled) {
        this.selectedColors.push(match);
    }

    // this.clearSwitchingStepsStack();
    // this.addPresetsToAnimations();
    //TODO restart color cycle from current position
};


/**
 * @return current selected colors for color animations
 */
Switching.prototype.getSelectedColors = function () {
    return this.selectedColors;
};


/**
 * Starts animation process with processing the animation stack.
 * Will stop onyl if .abort is called
 * Updating animation-content possible with different strategy methods (see above)
 *
 */
Switching.prototype.run = function() {
	this.running = true;
	var to;

	var fx_stack = this.fx_stack;
	var self = this;
	self.aborted = false;

	var singleStep = function () {

		if(self.aborted){
			self.running = false;
			clearInterval(self.intervalId);
			self.aborted = false;
			return;
		}

		self.nextStep();
    };

	self.intervalId = setInterval(singleStep, this.mSecondsPerStep);
};


/**
 * Forcing next step of the animation
 * Can be called while animation is running or while not running
 */
Switching.prototype.nextStep = function () {
	if(this.fx_stack.length < 1){
		this.addPresetsToAnimations();
	}

    if (this.fx_stack.length > 0) { //update dmx only if elements in stack
        var to = this.fx_stack.shift().to;

        for (var universe in to) {
            this.updateDmx(universe, to[universe], false);
        }
    }
};

module.exports = Switching;
