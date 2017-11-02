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

    for (var color in this.setupconfig.colors) { //assign IDs to color
        this.setupconfig.colors[color].id = color;
    }
    this.selectedColors = this.setupconfig.colors.slice();
	this.currentColorId = 0;

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
		for (var colorNum in this.selectedColors) {
			var color = this.selectedColors[colorNum];
			var universesUpdate = {};
			for (var universeNum in this.setupconfig.universes) {
				var update = {};
				for (var deviceNum in this.setupconfig.universes[universeNum].devices) {
					var device = this.setupconfig.universes[universeNum].devices[deviceNum];
					if (this.setupdevices[device.type].hasOwnProperty("startRgbChannel")) {
						var startRgb = this.setupdevices[device.type].startRgbChannel;
						var firstRgbChannelForDevice = device.address + startRgb;
						for (var colorChannel in color.values) {
							var updateChannel = parseInt(colorChannel) + firstRgbChannelForDevice;
							update[updateChannel] = color.values[colorChannel];
						}

						// Maybe override colors here if special device colors
					}
				}
				universesUpdate[universeNum] = update;
			}
			this.fx_stack.push({'to': universesUpdate, 'id': parseInt(color.id)});
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
		for (var colorNum in this.selectedColors) {
            var color = this.selectedColors[colorNum];
			for (var universeNum in this.setupconfig.universes) {
				for (var deviceNum in this.setupconfig.universes[universeNum].devices) {
					var universesUpdate = {};
					var update = {};
					var device = this.setupconfig.universes[universeNum].devices[deviceNum];
					if (this.setupdevices[device.type].hasOwnProperty("startRgbChannel")) {
						var startRgb = this.setupdevices[device.type].startRgbChannel;
						var firstRgbChannelForDevice = device.address + startRgb;
						for (var colorChannel in color.values) {
							var updateChannel = parseInt(colorChannel) + firstRgbChannelForDevice;
							update[updateChannel] = color.values[colorChannel];
						}


						universesUpdate[universeNum] = update;
						this.fx_stack.push({'to': universesUpdate, 'id': parseInt(color.id)});
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
		for (var colorNum in this.selectedColors) {
            var color = this.selectedColors[colorNum];
            for (var universeNum in this.setupconfig.universes) {
                for (var deviceNum in this.setupconfig.universes[universeNum].devices) {
                    var universesUpdate = {};
                    var update = {};
                    var device = this.setupconfig.universes[universeNum].devices[deviceNum];
                    if (this.setupdevices[device.type].hasOwnProperty("startRgbChannel")) {
                        var startRgb = this.setupdevices[device.type].startRgbChannel;
                        var firstRgbChannelForDevice = device.address + startRgb;

                        //Special of this strategy: make alle the oters black
                        for (var allDeviceNum in this.setupconfig.universes[universeNum].devices) {
                            var deviceAllForBlack = this.setupconfig.universes[universeNum].devices[allDeviceNum];
                            if (this.setupdevices[deviceAllForBlack.type].hasOwnProperty("startRgbChannel")) {
                                var startRgbCopy = this.setupdevices[deviceAllForBlack.type].startRgbChannel;
                                var firstRgbChannelForDeviceCopy = deviceAllForBlack.address + startRgbCopy;
                                for (var colorChannel2 in color.values) {
                                    update[parseInt(colorChannel2) + firstRgbChannelForDeviceCopy] = 0;
                                }
                            }

                        }

                        //old part
                        for (var colorChannel in color.values) {
                            var updateChannel = parseInt(colorChannel) + firstRgbChannelForDevice;
                            update[updateChannel] = color.values[colorChannel];
                        }


                        universesUpdate[universeNum] = update;
                        this.fx_stack.push({'to': universesUpdate, 'id': parseInt(color.id)});
                    }
                }
            }
		}
	});
};


//TODO flashing strategy -> only short flash? (zeit bleibt immer gleich kurz? oder abhängig von wechsel zeit? - soll strobo lang - kurz verhältnis imitieren
//evtl als option für alle efekte? -> 1x zeit zwischen effekten und 1x dauer des lichts (evtl in prozent zur wechsel zeit? oder absolut? -> prozent zur anderen zeit wäre gut, eher 10 prozent schritte? -> würde mehrmals schwarz noch mit einbauen für den restlichen anteil des steps)

//TODO random strategy -> random device and random color (and combined?)
//could solve thunderstorm flashes effect

//TODO select devices -> should be in here for later switching order
//but: devices over multiple universes - identification required?
//or bettr add do sliders page as ignoreSwitching?



/**
 * Strategy
 * Show one preset after each other
 */
Switching.prototype.presetsStrategy = function () {
	this.setStrategy(function () {
		// presets switching
		for (var preset in this.presets) {
			this.fx_stack.push({'to': this.presets[preset].values, 'id': parseInt(preset)})
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

    //add or remove color, abort if nothing would change
    if (!enabled && matchPosition > -1) {
        this.selectedColors.splice(matchPosition, 1);
    } else if (enabled && matchPosition < 0) {
        this.selectedColors.push(match);
    } else {
        return false;
    }

    //clear steps after current ID
    var lastOldColorPosition = this.fx_stack.length;
    while (--lastOldColorPosition >= 0 && this.fx_stack[lastOldColorPosition].id !== this.currentColorId) {
        this.fx_stack.splice(lastOldColorPosition, 1);
    }

    //add animation steps and remove all until including current color (to continue flawlessly)
    this.addPresetsToAnimations();
    var step = lastOldColorPosition + 1;
    while (this.fx_stack.length > step && this.fx_stack[step].id !== this.currentColorId) {
        this.fx_stack.splice(step, 1);
    }
    while (this.fx_stack.length > step && this.fx_stack[step].id === this.currentColorId) {
        this.fx_stack.splice(step, 1);
    }

    return true;
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
        var currentStep = this.fx_stack.shift();
        this.currentColorId = currentStep.id;

        for (var universe in currentStep.to) {
            this.updateDmx(universe, currentStep.to[universe], false);
        }
    }
};

module.exports = Switching;
