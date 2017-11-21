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
    this.mSecondsStrobeDuration = 100;
    this.mSecondsStrobeLimit = 200; //shorter steps have no strobe mode
    this.strobeModeEnabled = false;
    this.timeoutDurationId = null;
    this.setupconfig = msg.setup;
    this.setupdevices = msg.devices;
    this.presets = msg.setup.presets;

    for (var color in this.setupconfig.colors) { //assign IDs to color
        this.setupconfig.colors[color].id = color;
    }
    this.selectedColors = this.setupconfig.colors.slice();
    this.currentColorId = 0;
    this.randomizeColors = false;
    this.shuffleColors = false;

    this.selectedDevices = [];
    for (var universeNum in this.setupconfig.universes) {
        for (var deviceNum in this.setupconfig.universes[universeNum].devices) {
            var device = this.setupconfig.universes[universeNum].devices[deviceNum];
            if (this.setupdevices[device.type].hasOwnProperty("startRgbChannel")) {
                this.selectedDevices.push({universeNum: universeNum, device: device})
            }
        }
    }

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
    this.setStrategy(function () {
        //color switching

        var colors = this.selectedColors;
        if (this.randomizeColors && colors.length > 0) {
            colors = new Array(getRandomElemFromArray(colors));
        }else if (this.shuffleColors) {
            colors = shuffleArray(colors);
        }

        for (var colorNum in colors) {
            var color = colors[colorNum];
            var universesUpdate = {};
            for (var deviceId in this.selectedDevices) {
                var device = this.selectedDevices[deviceId].device;
                var universeNum = this.selectedDevices[deviceId].universeNum;
                if (universesUpdate[universeNum] === undefined) {
                    universesUpdate[universeNum] = {};
                }

                var firstRgbChannelForDevice = this.getFirstRgbChannelForDevice(device);
                for (var colorChannel in color.values) {
                    var updateChannel = parseInt(colorChannel) + firstRgbChannelForDevice;
                    universesUpdate[universeNum][updateChannel] = color.values[colorChannel];
                }
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
Switching.prototype.colorsDevByDevStrategy = function (options) {
    this.setStrategy(function () {
        //device by device update

        var singleDevByDev = false;
        if (options) {
            singleDevByDev = options.single || false
        }

        var colors = this.selectedColors;
        if (this.randomizeColors && colors.length > 0) {
            colors = new Array(getRandomElemFromArray(colors));
        }else if (this.shuffleColors) {
            colors = shuffleArray(colors);
        }

        for (var colorNum in colors) {
            var color = colors[colorNum];

            for (var deviceId in this.selectedDevices) {
                var device = this.selectedDevices[deviceId].device;
                var universeNum = this.selectedDevices[deviceId].universeNum;

                var firstRgbChannelForDevice = this.getFirstRgbChannelForDevice(device);
                var universesUpdate = {};
                if (universesUpdate[universeNum] === undefined) {
                    universesUpdate[universeNum] = {};
                }

                //combine singleDevByDev Strategy into this one
                if (singleDevByDev) {
                    this.makeAllSelectedColorDevicesBlackForUpdate(universesUpdate, color);
                }

                //write channels for current color
                for (var colorChannel in color.values) {
                    var updateChannel = parseInt(colorChannel) + firstRgbChannelForDevice;
                    universesUpdate[universeNum][updateChannel] = color.values[colorChannel];
                }

                this.fx_stack.push({'to': universesUpdate, 'id': parseInt(color.id)});
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
    this.setStrategy(function () {
        //single device by device update
        this.colorsDevByDevStrategy({single: true});
    });
};

/**
 * Strategy TODO buggy on changing color selection -> press select strategy button to refresh stack
 * Switch through all colors device by device with changing color for each device
 * (generated with startRgbChannel - see general color strategy)
 */
Switching.prototype.colorByColorDevByDev = function (options) {
    this.setStrategy(function () {
        //device by device update with changing colors

        var singleDevByDev = false;
        if (options) {
            singleDevByDev = options.single || false
        }

        var colors = this.selectedColors;
        if (this.shuffleColors) {
            colors = shuffleArray(colors);
        }

        var colorCount = 0;


        for (var deviceId in this.selectedDevices) {
            var device = this.selectedDevices[deviceId].device;
            var universeNum = this.selectedDevices[deviceId].universeNum;

            var firstRgbChannelForDevice = this.getFirstRgbChannelForDevice(device);
            var universesUpdate = {};
            if (universesUpdate[universeNum] === undefined) {
                universesUpdate[universeNum] = {};
            }


            //change color for every device
            if (colors.length === 0) {
                return;
            } else if (colorCount > colors.length - 1) {
                colorCount = 0;
            }
            var color = colors[colorCount++];

            //override for random color mode
            if (this.randomizeColors && colors.length > 0) {
                color = getRandomElemFromArray(colors);
            }


            if (singleDevByDev) {
                this.makeAllSelectedColorDevicesBlackForUpdate(universesUpdate, color);
            }

            //write channels for current color
            for (var colorChannel in color.values) {
                var updateChannel = parseInt(colorChannel) + firstRgbChannelForDevice;
                universesUpdate[universeNum][updateChannel] = color.values[colorChannel];
            }

            this.fx_stack.push({'to': universesUpdate, 'id': parseInt(color.id)});
        }
    });
};

/**
 * Strategy TODO buggy on changing color selection -> press select strategy button to refresh stack
 * Switch through all colors device by device with changing color for each device
 * But only one device is active - all other in this animation affected RGB devices are black
 * (generated with startRgbChannel - see general color strategy)
 */
Switching.prototype.colorByColorSingleDevByDev = function () {
    this.setStrategy(function () {
        //single device by device update with changing colors
        this.colorByColorDevByDev({single: true});
    });
};

function shuffleArray(array) {
    var result = array.slice();
    for (var i = result.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = result[i];
        result[i] = result[j];
        result[j] = temp;
    }
    return result;
}

function getRandomElemFromArray(array) {
    return array[Math.floor(Math.random() * array.length)];
}

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
 * Helper for turning all RGB channels of selected devices to black
 * @param universesUpdate updateObject where all color values should be 0
 * @param color for getting 1,2 and 3 (rgb color IDs)
 */
Switching.prototype.makeAllSelectedColorDevicesBlackForUpdate = function (universesUpdate, color) {
//make alle the other selected devices black (previously selected devices will be not modified)
    for (var allDeviceId in this.selectedDevices) {
        var deviceAllForBlack = this.selectedDevices[allDeviceId].device;
        var universeAllForBlack = this.selectedDevices[allDeviceId].universeNum;
        if (universesUpdate[universeAllForBlack] === undefined) {
            universesUpdate[universeAllForBlack] = {};
        }

        var firstRgbChannelForDevice = this.getFirstRgbChannelForDevice(deviceAllForBlack);
        for (var colorChannel in color.values) {
            universesUpdate[universeAllForBlack][parseInt(colorChannel) + firstRgbChannelForDevice] = 0;
        }
    }
};


/**
 * Helper for getting first color channel for RGB
 * @param device to get channel for
 */
Switching.prototype.getFirstRgbChannelForDevice = function (device) {
    var startRgb = this.setupdevices[device.type].startRgbChannel;
    return device.address + startRgb;
};


/**
 * Helper for clearing the animation stack
 */
Switching.prototype.clearSwitchingStepsStack = function () {
    while (this.fx_stack.length > 0) {
        this.fx_stack.shift();
    }
};

/**
 * Helper for reloading the animation stack after current step
 */
Switching.prototype.reloadSwitchingStepsStack = function () {
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
 * @param enabled boolean whether color should be active or not
 * @return boolean, whether the request was fulfilled or not
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

    this.reloadSwitchingStepsStack();

    return true;
};

/**
 * @return current selected colors for color animations
 */
Switching.prototype.getSelectedColors = function () {
    return this.selectedColors;
};


/**
 * toggle strobe mode
 * @return boolean, whether mode is active or not
 */
Switching.prototype.toggleStrobeMode = function () {
    this.strobeModeEnabled = this.strobeModeEnabled !== true;
    return this.strobeModeEnabled;
};

/**
 * @return strobe mode status
 */
Switching.prototype.isStrobeMode = function () {
    return this.strobeModeEnabled;
};


/**
 * toggle random color mode
 * @return boolean, whether mode is active or not
 */
Switching.prototype.toggleRandomColorMode = function () {
    this.randomizeColors = this.randomizeColors !== true;
    this.reloadSwitchingStepsStack();
    return this.randomizeColors;
};

/**
 * @return random color mode status
 */
Switching.prototype.isRandomColorMode = function () {
    return this.randomizeColors;
};

/**
 * sets random color mode on or off
 */
Switching.prototype.setRandomColorMode = function (active) {
    this.randomizeColors = active;
};

/**
 * toggle shuffle color mode
 * @return boolean, whether mode is active or not
 */
Switching.prototype.toggleShuffleColorMode = function () {
    this.shuffleColors = this.shuffleColors !== true;
    this.reloadSwitchingStepsStack();
    return this.shuffleColors;
};

/**
 * @return shuffle color mode status
 */
Switching.prototype.isShuffleColorMode = function () {
    return this.shuffleColors;
};

/**
 * sets shuffle color mode on or off
 */
Switching.prototype.setShuffleColorMode = function (active) {
    this.shuffleColors = active;
};


/**
 * Starts animation process with processing the animation stack.
 * Will stop onyl if .abort is called
 * Updating animation-content possible with different strategy methods (see above)
 *
 */
Switching.prototype.run = function () {
    this.running = true;
    var self = this;
    self.aborted = false;

    var singleStep = function () {

        if (self.aborted) {
            self.running = false;
            clearInterval(self.intervalId);
            clearTimeout(self.timeoutDurationId);
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
    var self = this;

    if (this.fx_stack.length < 1) {
        this.addPresetsToAnimations();
    }

    if (this.fx_stack.length > 0) { //update dmx only if elements in stack
        var currentStep = this.fx_stack.shift();
        this.currentColorId = currentStep.id;

        for (var universe in currentStep.to) {
            this.updateDmx(universe, currentStep.to[universe], false);
        }


        //Flashing - strobeMode
        if (this.strobeModeEnabled && (this.mSecondsPerStep > this.mSecondsStrobeLimit || !this.running )) {
            var makeBlack = function () {
                for (var universe in currentStep.to) {
                    var update = {};
                    for (var channel in currentStep.to[universe]) {
                        update[channel] = 0;
                    }
                    self.updateDmx(universe, update, false);
                }
            };
            self.timeoutDurationId = setTimeout(makeBlack, this.mSecondsStrobeDuration);
        }

    }
};

module.exports = Switching;
