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
    this.mSecondsStrobeLimit = 150; //shorter steps have no strobe mode
    this.strobeModeEnabled = false;
    this.fadeBlackModeEnabled = false;
    this.fadeBlackDuration = 0;
    this.timeoutDurationId = null;
    this.setupconfig = msg.setup;
    this.setupdevices = msg.devices;
    this.presets = msg.setup.presets;

    for (var color in this.setupconfig.colors) { //assign IDs to color
        this.setupconfig.colors[color].id = color;
    }
    this.selectedColors = this.setupconfig.colors.slice();
    this.currentColorId = -1;
    this.randomizeColors = false;
    this.shuffleColors = false;
    this.randomizeDevices = false;
    this.shuffleDevices = false;

    this.allDevices = [];
    var deviceId = 0; //assign id to all devices
    for (var universe in this.setupconfig.universes) {
        for (var deviceNum in this.setupconfig.universes[universe].devices) {
            var device = this.setupconfig.universes[universe].devices[deviceNum];
            if (this.setupdevices[device.type].hasOwnProperty("startRgbChannel")) {
                this.allDevices.push({universe: universe, device: device, id: deviceId});
                deviceId++;
            }
        }
    }
    this.selectedDevices = this.allDevices.slice();

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
        var colors = this.getColorsForStrategy();

        for (var colorNum in colors) {
            var color = colors[colorNum];
            var universesUpdate = {};

            for (var deviceId in this.selectedDevices) {
                var device = this.selectedDevices[deviceId].device;
                var universe = this.selectedDevices[deviceId].universe;
                if (universesUpdate[universe] === undefined) {
                    universesUpdate[universe] = {};
                }

                var firstRgbChannelForDevice = this.getFirstRgbChannelForDevice(device);
                var colorValues = this.getOverrideColorIfConfigured(device, color);

                for (var colorChannel in colorValues) {
                    var updateChannel = parseInt(colorChannel) + firstRgbChannelForDevice;
                    universesUpdate[universe][updateChannel] = colorValues[colorChannel];
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

        var colors = this.getColorsForStrategy();

        for (var colorNum in colors) {
            var color = colors[colorNum];

            var devices = this.getDevicesForStrategy();
            for (var deviceId in devices) {
                var device = devices[deviceId].device;
                var universe = devices[deviceId].universe;

                var firstRgbChannelForDevice = this.getFirstRgbChannelForDevice(device);
                var colorValues = this.getOverrideColorIfConfigured(device, color);

                var universesUpdate = {};
                if (universesUpdate[universe] === undefined) {
                    universesUpdate[universe] = {};
                }

                //combine singleDevByDev Strategy into this one
                if (singleDevByDev) {
                    this.makeAllSelectedColorDevicesBlackForUpdate(universesUpdate, color);
                }

                //write channels for current color
                for (var colorChannel in colorValues) {
                    var updateChannel = parseInt(colorChannel) + firstRgbChannelForDevice;
                    universesUpdate[universe][updateChannel] = colorValues[colorChannel];
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
 * Strategy
 * Colorful :)
 * Next color for next device - all at same time
 * The next color in order will start on first device
 * (generated with startRgbChannel - see general color strategy)
 */
Switching.prototype.colorByColor = function (options) {
    this.setStrategy(function () {
        //all device update with different colors

        var colorCount = 0;

        var colors = this.selectedColors;
        if (this.shuffleColors) {
            colors = shuffleArray(colors);

        } else if (this.currentColorId >= 0 && colors.indexOf(this.setupconfig.colors[this.currentColorId]) >= 0) { // prevent same start color
            colorCount = colors.indexOf(this.setupconfig.colors[this.currentColorId]) + 1;
        }

        var firstColor;
        var universesUpdate = {};

        var devices = this.getDevicesForStrategy();
        for (var deviceId in devices) {
            var device = devices[deviceId].device;

            var universe = devices[deviceId].universe;
            var firstRgbChannelForDevice = this.getFirstRgbChannelForDevice(device);
            if (universesUpdate[universe] === undefined) {
                universesUpdate[universe] = {};
            }

            //change color for every device
            if (colors.length === 0) {
                return;
            } else if (colorCount > colors.length - 1) {
                colorCount = 0;
            }
            var color = colors[colorCount++];

            //store first color for determining next color
            if (!firstColor) {
                firstColor = color;
            }

            //override for random color mode
            if (this.randomizeColors && colors.length > 0) {
                color = getRandomElemFromArray(colors);
            }

            var colorValues = this.getOverrideColorIfConfigured(device, color);

            //write channels for current color
            for (var colorChannel in colorValues) {
                var updateChannel = parseInt(colorChannel) + firstRgbChannelForDevice;
                universesUpdate[universe][updateChannel] = colorValues[colorChannel];
            }

        }

        if (firstColor !== undefined) {
            this.fx_stack.push({'to': universesUpdate, 'id': parseInt(firstColor.id)});
        }
    });
};

/**
 * Strategy
 * Switch through all colors device by device with changing color for each device
 * (generated with startRgbChannel - see general color strategy)
 */
Switching.prototype.colorByColorDevByDev = function (options) {
    this.setStrategy(function () {
        //device by device update with changing colors

        var singleDevByDev = false;
        var staticColors = false;
        var endlessColorLoop = false;
        if (options) {
            singleDevByDev = options.single || false;
            staticColors = options.static || false;
            endlessColorLoop = options.endless || false;
        }

        var colorCount = 0;

        var colors = this.selectedColors;
        if (this.shuffleColors) {
            colors = shuffleArray(colors);

        } else if (this.currentColorId >= 0 && colors.indexOf(this.setupconfig.colors[this.currentColorId]) >= 0 && !staticColors) {// prevent same start color
            colorCount = colors.indexOf(this.setupconfig.colors[this.currentColorId]) + 1;
        }

        var firstColor;

        var devices = this.getDevicesForStrategy();
        for (var deviceId in devices) {
            var device = devices[deviceId].device;
            var universe = devices[deviceId].universe;

            var firstRgbChannelForDevice = this.getFirstRgbChannelForDevice(device);
            var universesUpdate = {};
            if (universesUpdate[universe] === undefined) {
                universesUpdate[universe] = {};
            }


            //change color for every device
            if (colors.length === 0) {
                return;
            } else if (colorCount > colors.length - 1) {
                colorCount = 0;
            }
            var color = colors[colorCount++];

            //store first color for determining next color (or last for endless)
            if (!firstColor || endlessColorLoop) {
                firstColor = color;
            }

            //override for random color mode
            if (this.randomizeColors && colors.length > 0) {
                color = getRandomElemFromArray(colors);
            }

            if (singleDevByDev) {
                this.makeAllSelectedColorDevicesBlackForUpdate(universesUpdate, color);
            }

            var colorValues = this.getOverrideColorIfConfigured(device, color);

            //write channels for current color
            for (var colorChannel in colorValues) {
                var updateChannel = parseInt(colorChannel) + firstRgbChannelForDevice;
                universesUpdate[universe][updateChannel] = colorValues[colorChannel];
            }

            this.fx_stack.push({'to': universesUpdate, 'id': parseInt(firstColor.id)});
        }
    });
};

/**
 * Strategy
 * Switch through all colors device by device with changing color for each device
 * Will continue with the color that should come after the last device on the first device - colors could stick on same device if devices.length % colors.length === 0
 * (generated with startRgbChannel - see general color strategy)
 */
Switching.prototype.colorByColorDevByDevEndless = function () {
    this.setStrategy(function () {
        //single device by device update with changing colors
        this.colorByColorDevByDev({endless: true});
    });
};

/**
 * Strategy
 * Switch through all colors device by device with changing color for each device
 * The next color in order will start on first device and the color order will distribute to the others
 * But only one device is active - all other in this animation affected RGB devices are black
 * (generated with startRgbChannel - see general color strategy)
 */
Switching.prototype.colorByColorSingleDevByDev = function () {
    this.setStrategy(function () {
        //single device by device update with changing colors
        this.colorByColorDevByDev({single: true});
    });
};

/**
 * Strategy
 * Switch through all colors device by device with changing color for each device
 * Will continue with the color that should come after the last device on the first device - colors could stick on same device if devices.length % colors.length === 0
 * But only one device is active - all other in this animation affected RGB devices are black
 * (generated with startRgbChannel - see general color strategy)
 */
Switching.prototype.colorByColorSingleDevByDevEndless = function () {
    this.setStrategy(function () {
        //single device by device update with changing colors - but static color positions
        this.colorByColorDevByDev({single: true, endless: true});
    });
};

/**
 * Strategy
 * Switch through all colors device by device with changing color for each device
 * The Color will stick on the devices
 * But only one device is active - all other in this animation affected RGB devices are black
 * (generated with startRgbChannel - see general color strategy)
 */
Switching.prototype.colorByColorSingleDevByDevStatic = function () {
    this.setStrategy(function () {
        //single device by device update with changing colors - but static color positions
        this.colorByColorDevByDev({single: true, static: true});
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
 * Helper for turning all RGB channels of selected devices to black.
 * If enabled, also turns override channels black.
 * @param universesUpdate updateObject where all color values should be 0
 * @param color for getting 1,2 and 3 (rgb color IDs)
 * @param devices to black (optional)
 */
Switching.prototype.makeAllSelectedColorDevicesBlackForUpdate = function (universesUpdate, color, devices) {
//make alle the other selected devices black (previously selected devices will be not modified)
    var devices = devices || this.selectedDevices;
    for (var allDeviceId in devices) {
        var deviceAllForBlack = devices[allDeviceId].device;
        var universeAllForBlack = devices[allDeviceId].universe;
        if (universesUpdate[universeAllForBlack] === undefined) {
            universesUpdate[universeAllForBlack] = {};
        }

        var firstRgbChannelForDevice = this.getFirstRgbChannelForDevice(deviceAllForBlack);

        var colorValues = color.values;
        // turn black override colors out of rgb range
        if (this.setupdevices[deviceAllForBlack.type].hasOwnProperty("overrideColors") && this.setupconfig.allowColorOverride === true) {
            var resetOverrideColor = this.setupdevices[deviceAllForBlack.type].overrideColors
                .filter(function (colorItem) {
                    return colorItem.label === 'OVERRIDE_ZERO';
                });
            if (resetOverrideColor[0]) {
                colorValues = Object.assign({}, resetOverrideColor[0].values, color.values)
            }
        }


        for (var colorChannel in colorValues) {
            var updateChannel = parseInt(colorChannel) + firstRgbChannelForDevice;
            universesUpdate[universeAllForBlack][updateChannel] = 0;
        }
    }
};

/**
 * Helper for getting selected colors - either normal, shuffled or one random color
 * @return colors array
 */
Switching.prototype.getColorsForStrategy = function () {
    var colors = this.selectedColors;
    if (this.randomizeColors && colors.length > 0) {
        colors = new Array(getRandomElemFromArray(colors));
    } else if (this.shuffleColors) {
        colors = shuffleArray(colors);
    }
    return colors;
};

/**
 * Helper for getting selected devices - either normal, shuffled or one random color
 * @return devices array (with objects)
 */
Switching.prototype.getDevicesForStrategy = function () {
    var devices = this.selectedDevices;
    if (this.randomizeDevices && devices.length > 0) {
        devices = new Array(getRandomElemFromArray(devices));
    } else if (this.shuffleDevices) {
        devices = shuffleArray(devices);
    }
    return devices;
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
 * Helper for getting Override color channels for given device if configured
 * @param device to get override config for
 * @param color to override if available
 * @return color.values of device if configured or via args passed colors otherwise
 */
Switching.prototype.getOverrideColorIfConfigured = function (device, color) {
    var self = this;

    function findOverrideColor(findColor) {
        return self.setupdevices[device.type].overrideColors
            .filter(function (colorItem) {
                return colorItem.label === findColor;
            });
    }

    if (this.setupdevices[device.type].hasOwnProperty("overrideColors") && this.setupconfig.allowColorOverride === true) {
        var matchingOverrideColor = findOverrideColor(color.label);
        if (matchingOverrideColor.length === 1) { // if override for passed color is configured
            return matchingOverrideColor[0].values;

        } else { //if no override for passed color configured search for reset configuration
            var resetOverrideColor = findOverrideColor('OVERRIDE_ZERO');
            if (resetOverrideColor[0]) {
                return Object.assign({}, resetOverrideColor[0].values, color.values)
            }
        }
    }

    return color.values;
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
    this.mSecondsPerStep = mSecondsPerStep;
    if (this.intervalId != null && this.running == true) {
        clearInterval(this.intervalId);
        this.run();
    }
};

/**
 * toggle strobe mode
 * conflicts with fadeBlack mode
 * @param setStatus do not toggle but override status
 * @return boolean, whether mode is active or not
 */
Switching.prototype.toggleStrobeMode = function (setStatus) {
    if (setStatus === undefined) {
        this.strobeModeEnabled = this.strobeModeEnabled !== true;
        return this.strobeModeEnabled;
    } else {
        this.strobeModeEnabled = setStatus;
        return this.strobeModeEnabled;
    }
};

/**
 * @return strobe mode status
 */
Switching.prototype.isStrobeMode = function () {
    return this.strobeModeEnabled;
};

/**
 * toggle fade black mode
 * conflicts with strobeMode
 * @param setStatus do not toggle but override status
 * @return boolean, whether mode is active or not
 */
Switching.prototype.toggleFadeBlackMode = function (setStatus) {
    if (setStatus === undefined) {
        this.fadeBlackModeEnabled = this.fadeBlackModeEnabled !== true;
        return this.fadeBlackModeEnabled;
    } else {
        this.fadeBlackModeEnabled = setStatus;
        return this.fadeBlackModeEnabled;
    }
};

/**
 * @return fade black mode status
 */
Switching.prototype.isFadeBlackMode = function () {
    return this.fadeBlackModeEnabled;
};

/**
 * Set fade duration for fade to black duration from fading time mseconds
 * time before fade to black will be calculated each time fro mSecondsPerStep - fadeBlackDuration
 * @param fadeDuration
 */
Switching.prototype.updateFadeBlackTime = function (fadeDuration) {
    this.fadeBlackDuration = fadeDuration;
};


/* ##### Colors ###### */

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
 * toggle random color mode
 * conflicts with shuffle color mode
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
 * conflicts with shuffle color mode
 */
Switching.prototype.setRandomColorMode = function (active) {
    this.randomizeColors = active;
};

/**
 * toggle shuffle color mode
 * conflicts with random color mode
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
 * conflicts with random color mode
 */
Switching.prototype.setShuffleColorMode = function (active) {
    this.shuffleColors = active;
};


/* ##### Devices ###### */

/**
 * get list of all rgb switching devices
 * @return list of objects with fields universe and device (not directly the devices!)
 */
Switching.prototype.getAllDevices = function () {
    return this.allDevices;
};

/**
 * update used Devices for Device animations
 * @param selectedDevice Device id to add or remove
 * @param enabled boolean whether Device should be active or not
 * @return boolean, whether the request was fulfilled or not
 */
Switching.prototype.setSelectedDevices = function (selectedDevice, enabled) {

    var match = this.allDevices.filter(function (obj) {
        return obj.id === parseInt(selectedDevice);
    });

    match = match[0];
    var matchPosition = this.selectedDevices.indexOf(match);

    //add or remove Device, abort if nothing would change
    if (!enabled && matchPosition > -1) {
        this.selectedDevices.splice(matchPosition, 1);
    } else if (enabled && matchPosition < 0) {
        this.selectedDevices.push(match);
    } else {
        return false;
    }

    this.reloadSwitchingStepsStack();

    return true;
};

/**
 * @return current selected Devices for Device animations
 */
Switching.prototype.getSelectedDevices = function () {
    return this.selectedDevices;
};


/**
 * toggle random Device mode
 * conflicts with shuffle devices
 * @return boolean, whether mode is active or not
 */
Switching.prototype.toggleRandomDeviceMode = function () {
    this.randomizeDevices = this.randomizeDevices !== true;
    this.reloadSwitchingStepsStack();
    return this.randomizeDevices;
};

/**
 * @return random Device mode status
 */
Switching.prototype.isRandomDeviceMode = function () {
    return this.randomizeDevices;
};

/**
 * sets random Device mode on or off
 * conflicts with shuffle devices
 */
Switching.prototype.setRandomDeviceMode = function (active) {
    this.randomizeDevices = active;
};

/**
 * toggle shuffle Device mode
 * conflicts with randomDeviceMode
 * @return boolean, whether mode is active or not
 */
Switching.prototype.toggleShuffleDeviceMode = function () {
    this.shuffleDevices = this.shuffleDevices !== true;
    this.reloadSwitchingStepsStack();
    return this.shuffleDevices;
};

/**
 * @return shuffle Device mode status
 */
Switching.prototype.isShuffleDeviceMode = function () {
    return this.shuffleDevices;
};

/**
 * sets shuffle Device mode on or off
 * conflicts with randomDeviceMode
 */
Switching.prototype.setShuffleDeviceMode = function (active) {
    this.shuffleDevices = active;
};

/**
 * Turns all color switching capable devices black.
 * @param onlyNotSelected boolean, whether all color devices or only not currently selected devices should be black
 */
Switching.prototype.allColorDevicesBlack = function (onlyNotSelected) {

    var color = this.setupconfig.colors[0];
    var devices = this.allDevices;
    var self = this;

    if (onlyNotSelected) {
        devices = devices.filter(function (elem) {
            return self.selectedDevices.indexOf(elem) < 0;
        });
    }

    var universesUpdate = {};
    this.makeAllSelectedColorDevicesBlackForUpdate(universesUpdate, color, devices);

    for (var universe in universesUpdate) {
        this.updateDmx(universe, universesUpdate[universe], true);
    }
};


/* ##### Run Animation ###### */

/**
 * Starts animation process with processing the animation stack.
 * Will stop onyl if .abort is called
 * Updating animation-content possible with different strategy methods (see above)
 *
 */
Switching.prototype.run = function () {
    this.running = true;
    const self = this;
    self.aborted = false;

    const singleStep = function () {

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

function generateMakeBlack(currentStep, self) {
    return function () {
        for (const universe in currentStep.to) {
            const update = {};
            for (const channel in currentStep.to[universe]) {
                update[channel] = 0;
            }
            self.updateDmx(universe, update, true);
        }
    };
}

/**
 * Forcing next step of the animation
 * Can be called while animation is running or while not running
 */
Switching.prototype.nextStep = function () {
    const self = this;

    if (this.fx_stack.length < 1) {
        this.addPresetsToAnimations();
    }

    if (this.fx_stack.length > 0) { //update dmx only if elements in stack
        const currentStep = this.fx_stack.shift();
        this.currentColorId = currentStep.id;

        const makeUpdate = function () {
            for (const universe in currentStep.to) {
                self.updateDmx(universe, currentStep.to[universe], true);
            }
        };

        clearInterval(self.timeoutDurationId);

        if (this.fadeBlackModeEnabled && this.fadeBlackDuration > 0) {
            const blackDuration = (this.fadeBlackDuration * 1.1); //scaling factor
            generateMakeBlack(currentStep, self)(); // and execute

            // delay update
            self.timeoutDurationId = setTimeout(makeUpdate, blackDuration);
        } else {
            // normal value update
            makeUpdate();
        }

        //Flashing - strobeMode
        if (this.strobeModeEnabled && (this.mSecondsPerStep > this.mSecondsStrobeLimit || !this.running)) {
            const makeBlack = generateMakeBlack(currentStep, self);
            self.timeoutDurationId = setTimeout(makeBlack, this.mSecondsStrobeDuration);
        }

    }
};

module.exports = Switching;
