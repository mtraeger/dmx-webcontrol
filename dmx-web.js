#!/usr/bin/env node
"use strict"

var fs       = require('fs')
var http     = require('http')
var body     = require('body-parser')
var express  = require('express')
var socketio = require('socket.io')
var program  = require('commander')
var DMX      = require('./dmx')
var A        = DMX.Animation
var Fader    = DMX.Fader
var Switching    = require('./switching')
var easingF  = require('./easing.js').ease

program
	.version("0.0.1")
	.option('-c, --config <file>', 'Read config from file [./dmx-web.conf]', './dmx-web.conf')
	.parse(process.argv)


var	config = JSON.parse(fs.readFileSync(program.config, 'utf8'))

function DMXWeb() {
	var app    = express()
	var server = http.createServer(app)
	var io     = socketio.listen(server)

	var dmx = new DMX()

	var animations = [];
	var fadingDelayer = [];
	config.allowColorOverride = config.allowColorOverride === true;

	for(var universe in config.universes) {
		dmx.addUniverse(
			universe,
			config.universes[universe].output.driver,
			config.universes[universe].output.device,
			config.universes[universe].output.options
		)
		animations[universe] = [];
		fadingDelayer[universe] = [];

		//preset values
		for (var device in config.universes[universe].devices) {
			var dev = config.universes[universe].devices[device];
			if(DMX.devices[dev.type].hasOwnProperty("channelPresets")){
				var presets = DMX.devices[dev.type].channelPresets
				var toUpdate = {};
				for(var devStart in presets){
					toUpdate[parseInt(devStart)+dev.address] = presets[devStart];
				}
				dmx.update(universe, toUpdate);
			}
		}
	}

	var listen_port = config.server.listen_port || 8080
	var listen_host = config.server.listen_host || '::'

	server.listen(listen_port, listen_host, null, function() {
		if(config.server.uid && config.server.gid) {
			try {
				process.setuid(config.server.uid)
				process.setgid(config.server.gid)
			} catch (err) {
				console.log(err)
				process.exit(1)
			}
		}
	})

	app.use(body.json())

	app.get('/', function(req, res) {
		res.sendFile(__dirname + '/index.html')
	})

    //css and js offline
    app.get('/css/bootstrap-combined.min.css', function(req, res) {
        res.sendFile(__dirname + '/css/bootstrap-combined.min.css')
    })
    app.get('/js/jquery.min.js', function(req, res) {
        res.sendFile(__dirname + '/js/jquery.min.js')
    })
    app.get('/js/jquery-ui.min.js', function(req, res) {
        res.sendFile(__dirname + '/js/jquery-ui.min.js')
    })
    app.get('/js/bootstrap.min.js', function(req, res) {
        res.sendFile(__dirname + '/js/bootstrap.min.js')
    })
    app.get('/css/slider.css', function(req, res) {
        res.sendFile(__dirname + '/css/slider.css')
    })
    app.get('/css/style.css', function(req, res) {
        res.sendFile(__dirname + '/css/style.css')
    })

    app.use('/beat', express.static('beatDetect'));

	app.get('/config', function(req, res) {
		var response = {"devices": DMX.devices, "universes": {}}
		Object.keys(config.universes).forEach(function(key) {
			response.universes[key] = config.universes[key].devices
		})

		res.json(response)
	})

	app.get('/state/:universe', function(req, res) {
		if(!(req.params.universe in dmx.universes)) {
			res.status(404).json({"error": "universe not found"})
			return
		}

		res.json({"state": dmx.universeToObject(req.params.universe)})
	})

	app.post('/state/:universe', function(req, res) {
		if(!(req.params.universe in dmx.universes)) {
			res.status(404).json({"error": "universe not found"})
			return
		}

		dmx.update(req.params.universe, req.body)
		res.json({"state": dmx.universeToObject(req.params.universe)})
	})

	app.post('/animation/:universe', function(req, res) {
		try {
			var universe = req.params.universe

			// preserve old states
			var old = dmx.universeToObject(req.params.universe)

			var animation = new A(dmx)
			for(var step in req.body) {
				if(req.body[step].delay){
					animation.delay(req.body[step].delay);
				} else if (req.body[step].startingchannels) {
					animation.addMultipleDevs(
						req.body[step].to,
						req.body[step].duration || 0,
						req.body[step].startingchannels,
						req.body[step].options || {}
					)
				} else {
					animation.add(
						req.body[step].to,
						req.body[step].duration || 0,
						req.body[step].options || {}
					)
				}
			}
			animation.add(old, 0)
			animation.run(universe, null, function (newvals) {
				//onUpdate
				io.sockets.emit('displayslider', universe, newvals)
			})
			res.json({"success": true})
		} catch(e) {
			console.log(e)
			res.json({"error": String(e)})
		}
	})


	var switchExternalDisabled = false;

    app.get('/switchNextStep', function(req, res) {
        if (switchExternalDisabled) {
            res.status(403).json({"success": false});
        } else {
            switching.nextStep();
            res.status(200).json({"success": true});
        }
    });

	var fading = 0;
	var fadingease = 'linear-flexible';
	var fadingTime = 0;
	var blackout = false;
	var switchingTimeFader = 0;
	var switchingTime = 0;
	var switchingStrategy = 'colors';

	var switching = new Switching({'devices': DMX.devices, 'setup': config}, function (universe, update, effect) {
		updateDmx(universe, update, effect);
	});

	io.sockets.on('connection', function(socket) {
        socket.on('request_refresh', function() {
            for(var universe in config.universes) {
                socket.emit('update', universe, dmx.universeToObject(universe));
            }
            socket.emit('fade', fading, fadingTime);
            socket.emit('fadingEase', fadingease);
            socket.emit('blackout', blackout);

            socket.emit('switching', switchingTimeFader, switchingTime);
            socket.emit('switchingStrategy', switchingStrategy);
            socket.emit('strobeMode', switching.isStrobeMode());
            socket.emit('fadeBlackMode', switching.isFadeBlackMode());
            socket.emit('switchExternalEnabled', switchExternalDisabled);

            for(var color in switching.getSelectedColors()) {
                var selectedColor = switching.getSelectedColors()[color];
                socket.emit('selectedColor', selectedColor.label, true);
            }
            socket.emit('randomColorMode', switching.isRandomColorMode());
            socket.emit('shuffleColorMode', switching.isShuffleColorMode());

            for(var device in switching.getSelectedDevices()) {
                var selectedDevice = switching.getSelectedDevices()[device];
                socket.emit('selectedDevice', selectedDevice.id, true);
            }
            socket.emit('randomDeviceMode', switching.isRandomDeviceMode());
            socket.emit('shuffleDeviceMode', switching.isShuffleDeviceMode());

        });

        socket.emit('init', {'devices': DMX.devices, 'setup': config, 'switchingAllDevices': switching.getAllDevices()});

		socket.on('update', function (universe, update, effect) {
			updateDmx(universe, update, effect);
		});


		socket.on('fading', function(duration) {
			fading = duration || 0;

			if(duration != 0) {
                //see also fader.js in getModifiedSpeed
                var time = 0.1 * Math.exp((fading / 13) + 1) -0.15; //-0.15 for correction of start value
                fadingTime = Math.round(time * 100) / 100;
            }else{
				fadingTime = 0;
			}

			io.sockets.emit('fade', fading, fadingTime);

            switching.updateFadeBlackTime(fadingTime * 1000);

			for (var universe in fadingDelayer) {
				for (var channel in fadingDelayer[universe]) {
					if (fadingDelayer[universe][channel] instanceof Fader && !fadingDelayer[universe][channel].finished) {
						fadingDelayer[universe][channel].updateSpeed(duration);
					}
				}
			}

            // abort animation and start again for allowing redefining fade value
            for (var universe in animations) {
                for (var channel in animations[universe]) {
                    if (animations[universe][channel] instanceof A && !animations[universe][channel].aborted && !animations[universe][channel].finished) {
                        var values = animations[universe][channel].getCurrentStepFinalValues();
                        var remainingPercent = 1 - animations[universe][channel].getAnimationPercent();
                        var newFadingTime = fadingTime * 1000 * remainingPercent;

                        animations[universe][channel].abort();

                        animations[universe][channel] = new A(dmx);
						// TODO hotfix: use linear if linear-flexible to prevent race condition
                        animations[universe][channel]
                            .add(values, newFadingTime, {easing: fadingease === 'linear-flexible' ? 'linear' : fadingease})
                            .run(universe, function (universe) {
                                //onFinish
                                return function (finalvals) {
                                    io.sockets.emit('update', universe, finalvals);
                                }
                            }(universe), function (universe) {
                                //onUpdate
                                return function (newvals) {
                                    io.sockets.emit('displayslider', universe, newvals)
                                }
                            }(universe));
                    }
                }
            }

		});

		socket.on('blackout', function(universe) {
			dmx.toggleBlackout(universe);
		});

		socket.on('switchingPause', function() {
			if(switching.running) {
				switching.abort();
				io.sockets.emit('switchingPause', true);
			}else if(switchingTimeFader != 0) {
				switching.run();
				io.sockets.emit('switchingPause', false);
			}
		});

		socket.on('switching', function(value) {
			io.sockets.emit('switchingPause', false); //do also disable switching to zero
			switchingTimeFader = value;

			if(switchingTimeFader == 0){
				switching.abort();
				switchingTime = 0;
			}else{
				if(!switching.running) {
					switching.run();
				}
				if(switchingTimeFader == 100){
					switchingTimeFader = 110; //should be 0.05 as switching time
				}

				var time = 300 * Math.exp(-0.8 * switchingTimeFader/10); //divide by 10 because function in range x 0-10
                switching.setResolution(time * 1000); //in milliSec * 1000
				switchingTime =  Math.round(time*100)/100;
			}

			io.sockets.emit('switching', switchingTimeFader, switchingTime);
		});

		socket.on('nextSwitchStep', function () {
			switching.nextStep();
		});

		socket.on('switchExternalEnabled', function () {
			switchExternalDisabled = switchExternalDisabled !== true;
			io.sockets.emit('switchExternalEnabled', switchExternalDisabled);
		});

		socket.on('strobeMode', function (target_value) {
			let active;
			if (target_value === true || target_value === false) {
				active = switching.toggleStrobeMode(target_value);
			} else {
				active = switching.toggleStrobeMode();
			}

			io.sockets.emit('strobeMode', active);

			if (active) {
				//deactivate conflicting
				switching.toggleFadeBlackMode(false);
				io.sockets.emit('fadeBlackMode', false);
			}
		});

		socket.on('fadeBlackMode', function (target_value) {
			let active;
			if (target_value === true || target_value === false) {
				active = switching.toggleFadeBlackMode(target_value);
			} else {
				active = switching.toggleFadeBlackMode();
			}
			io.sockets.emit('fadeBlackMode', active);

			if (active) {
				//deactivate conflicting
				switching.toggleStrobeMode(false);
				io.sockets.emit('strobeMode', false);
			}
		});

		socket.on('switchingStrategy', function (strategy) {
			// console.log(strategy)
			if(strategy == 'colors'){
				switching.colorsStrategy();
			}else if (strategy == 'colorsDevByDev') {
				switching.colorsDevByDevStrategy();
			}else if (strategy == 'presets') {
				switching.presetsStrategy();
			}else if (strategy == 'colorsSingleDevByDev'){
				switching.colorsSingleDevByDev();
			}else if (strategy == 'colorByColor'){
				switching.colorByColor();
			}else if (strategy == 'colorByColorDevByDev'){
				switching.colorByColorDevByDev();
			}else if (strategy == 'colorByColorDevByDevEndless'){
				switching.colorByColorDevByDevEndless();
			}else if (strategy == 'colorByColorSingleDevByDev'){
				switching.colorByColorSingleDevByDev();
			}else if (strategy == 'colorByColorSingleDevByDevEndless'){
				switching.colorByColorSingleDevByDevEndless();
			}else if (strategy == 'colorByColorSingleDevByDevStatic'){
				switching.colorByColorSingleDevByDevStatic();
			}

			switchingStrategy = strategy;
			io.sockets.emit('switchingStrategy', switchingStrategy);
		});

        socket.on('selectedColor', function (color, enabled) {
            const updated = switching.setSelectedColors(color, enabled);
            if (updated) {
                io.sockets.emit('selectedColor', color, enabled);
            }
        });

		socket.on('selectedColors', function (colors) {
			const allColors = config.colors.map(color => color.label)
			let updateColors = colors;
			if (updateColors.length === 0){
				updateColors = allColors;
			}

			updateColors.forEach(color => {
				const updated = switching.setSelectedColors(color, true);
				if (updated) {
					io.sockets.emit('selectedColor', color, true);
				}
			});

			const disableColors = allColors.filter(color => updateColors.indexOf(color) < 0);
			disableColors.forEach(color => {
				const updated = switching.setSelectedColors(color, false);
				if (updated) {
				   io.sockets.emit('selectedColor', color, false);
				}
			});

        });

        socket.on('randomColorMode', function (target_value) {
			let active;
			if (target_value === true || target_value === false) {
				switching.setRandomColorMode(target_value);
				active = target_value
			} else {
				active = switching.toggleRandomColorMode();
			}
			io.sockets.emit('randomColorMode', active);

			if (active) {
				//deactivate conflicting
				switching.setShuffleColorMode(false);
				io.sockets.emit('shuffleColorMode', false);
			}
        });

        socket.on('shuffleColorMode', function (target_value) {
			let active;
			if (target_value === true || target_value === false) {
				switching.setShuffleColorMode(target_value);
				active = target_value
			} else {
				active = switching.toggleShuffleColorMode();
			}
			io.sockets.emit('shuffleColorMode', active);

			if (active) {
				//deactivate conflicting
				switching.setRandomColorMode(false);
				io.sockets.emit('randomColorMode', false);
			}
        });

        socket.on('selectedDevice', function (device, enabled) {
            var updated = switching.setSelectedDevices(device, enabled);
            if (updated) {
                io.sockets.emit('selectedDevice', device, enabled);
            }
        });

		socket.on('selectedDevices', function (devices) {
			const allDevices = switching.getAllDevices().map(device => device.id)

			let updateDevices = devices;
			if (updateDevices.length === 0){
				updateDevices = allDevices;
			}else{
				updateDevices = updateDevices.flatMap(
					device => switching.getAllDevices().filter(switchingDevice => switchingDevice.device.label == device)
				).map(device => device.id)
			}

			updateDevices.forEach(device => {
				const updated = switching.setSelectedDevices(device, true);
				if (updated) {
					io.sockets.emit('selectedDevice', device, true);
				}
			});

			const disabledDevices = allDevices.filter(device => updateDevices.indexOf(device) < 0);
			disabledDevices.forEach(device => {
				const updated = switching.setSelectedDevices(device, false);
				if (updated) {
				   io.sockets.emit('selectedDevice', device, false);
				}
			});

        });

        socket.on('randomDeviceMode', function (target_value) {
			let active;
			if (target_value === true || target_value === false) {
				switching.setRandomDeviceMode(target_value);
				active = target_value
			} else {
				active = switching.toggleRandomDeviceMode();
			}
			io.sockets.emit('randomDeviceMode', active);

			if (active) {
				//deactivate conflicting
				switching.setShuffleDeviceMode(false);
				io.sockets.emit('shuffleDeviceMode', false);
			}
        });

        socket.on('shuffleDeviceMode', function (target_value) {
			let active;
			if (target_value === true || target_value === false) {
				switching.setShuffleDeviceMode(target_value);
				active = target_value
			} else {
				active = switching.toggleShuffleDeviceMode();
			}
			io.sockets.emit('shuffleDeviceMode', active);

			if (active) {
				//deactivate conflicting
				switching.setRandomDeviceMode(false);
				io.sockets.emit('randomDeviceMode', false);
			}
        });

        socket.on('allColorSwitchingDevicesBlack', function (onlyNotSelectedDevices) {
            switching.allColorDevicesBlack(onlyNotSelectedDevices);
        });

		socket.on('fadingEase', function (easeEffect) {
			fadingease = easeEffect;
			io.sockets.emit('fadingEase', fadingease);
		});

	});

	dmx.on('blackout', function (bout) {
		if(bout !== blackout) {
			io.sockets.emit('blackout', bout);
		}
		blackout = bout;
	});

	dmx.on('update', function(universe, update) {
		io.sockets.emit('update', universe, update);
	});

	function updateDmx(universe, update, effect) {
		if (fading == 0) {
			//noFading: normal update
			for (var channel in update) { //abort fading and continue with normal movement
				if (fadingDelayer[universe][channel] instanceof Fader && !fadingDelayer[universe][channel].finished) {
					fadingDelayer[universe][channel].abort();
				}

				if(animations[universe][channel] instanceof A && !animations[universe][channel].aborted){
					animations[universe][channel].abort(); //abort old still running animation on same channel
				}
			}
			dmx.update(universe, update);
		}else if (effect && fadingease != 'linear-flexible') {
			for (var channel in update) { //effect animation for each channel

				var singleUpdate = {}; //creating new object with one single channel target value
				singleUpdate[channel] = update[channel];

				//abort fading movement type
				if (fadingDelayer[universe][channel] instanceof Fader && !fadingDelayer[universe][channel].finished) {
					fadingDelayer[universe][channel].abort();
				}

				if(animations[universe][channel] instanceof A && !animations[universe][channel].aborted){
					animations[universe][channel].abort(); //abort old still running animation on same channel
				}

				animations[universe][channel] = new A(dmx);
				animations[universe][channel]
					.add(singleUpdate, fadingTime * 1000, {easing: fadingease})
					.run(universe, function (finalvals) {
						//onFinish
						io.sockets.emit('update', universe, finalvals);
					}, function (newvals) {
						//onUpdate
						io.sockets.emit('displayslider', universe, newvals)
					});

			}
		} else {
			for (var channel in update) { //single animation for each channel

				var fadingGoal = update[channel];

				//abort old still running animation on same channel
				if(animations[universe][channel] instanceof A && !animations[universe][channel].aborted){
					animations[universe][channel].abort();
				}

				if (fadingDelayer[universe][channel] instanceof Fader && !fadingDelayer[universe][channel].finished) {
					fadingDelayer[universe][channel].updateValue(fadingGoal);

				} else {
					fadingDelayer[universe][channel] = new Fader(dmx, universe, channel);
					fadingDelayer[universe][channel].run(fadingGoal, fading,
						function (finalvals) {
							//onFinish
							io.sockets.emit('update', universe, finalvals);
						}, function (newvals) {
							//onUpdate
							io.sockets.emit('displayslider', universe, newvals)
						});
				}
			}
		}
	}

}

DMXWeb();
