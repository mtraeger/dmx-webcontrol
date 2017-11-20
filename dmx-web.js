#!/usr/bin/env node
"use strict"

var fs       = require('fs')
var http     = require('http')
var connect  = require('connect')
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
	io.set('log level', 1)

	app.configure(function() {
		app.use(connect.json())
	})

	app.get('/', function(req, res) {
		res.sendfile(__dirname + '/index.html')
	})

    //css and js offline
    app.get('/css/bootstrap-combined.min.css', function(req, res) {
        res.sendfile(__dirname + '/css/bootstrap-combined.min.css')
    })
    app.get('/js/jquery.min.js', function(req, res) {
        res.sendfile(__dirname + '/js/jquery.min.js')
    })
    app.get('/js/jquery-ui.min.js', function(req, res) {
        res.sendfile(__dirname + '/js/jquery-ui.min.js')
    })
    app.get('/js/bootstrap.min.js', function(req, res) {
        res.sendfile(__dirname + '/js/bootstrap.min.js')
    })
    app.get('/css/slider.css', function(req, res) {
        res.sendfile(__dirname + '/css/slider.css')
    })
    app.get('/css/style.css', function(req, res) {
        res.sendfile(__dirname + '/css/style.css')
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
				animation.add(
					req.body[step].to,
					req.body[step].duration || 0,
					req.body[step].options  || {}
				)
			}
			animation.add(old, 0)
			animation.run(universe)
			res.json({"success": true})
		} catch(e) {
			console.log(e)
			res.json({"error": String(e)})
		}
	})

    app.get('/switchNextStep', function(req, res) {
        switching.nextStep();
        res.status(200).json({"success": true});
    })

	var fading = 0;
	var fadingease = 'linear';
	var fadingTime = 0;
	var blackout = false;
	var switchingTimeFader = 0;
	var switchingTime = 0;

	var switching = new Switching({'devices': DMX.devices, 'setup': config}, function (universe, update, effect) {
        if(fadingease == 'linear'){
            updateDmx(universe, update, false);
        }else{
            updateDmx(universe, update, true);
        }
		// updateDmx(universe, update, effect);
	});

	io.sockets.on('connection', function(socket) {
        socket.emit('init', {'devices': DMX.devices, 'setup': config});

		socket.on('request_refresh', function() {
			for(var universe in config.universes) {
				socket.emit('update', universe, dmx.universeToObject(universe));
			}
            socket.emit('fade', fading, fadingease, fadingTime);
            socket.emit('fadingEaseChange', fadingease);
            socket.emit('blackout', blackout);
            socket.emit('switching', switchingTimeFader, switchingTime);
            for(var color in switching.getSelectedColors()) {
                var selectedColor = switching.getSelectedColors()[color];
                socket.emit('selectedColors', selectedColor.label, true);
            }
            socket.emit('strobeMode', switching.isStrobeMode());
            socket.emit('randomColorMode', switching.isRandomColorMode());
            socket.emit('shuffleColorMode', switching.isShuffleColorMode());
		});

		socket.on('update', function (universe, update, effect) {
			updateDmx(universe, update, effect);
		});


		socket.on('fading', function(duration, ease) {
			fading = duration || 0;
			fadingease = ease || fadingease || 'linear';
			//console.log(fading);

			if(duration != 0) {
                //see also fader.js in getModifiedSpeed
                var time = 0.1 * Math.exp((fading / 13) + 1) -0.15; //-0.15 for correction of start value
                fadingTime = Math.round(time * 100) / 100;
            }else{
				fadingTime = 0;
			}

			io.sockets.emit('fade', duration, fadingease, fadingTime);
			for (var universe in fadingDelayer) {
				for (var channel in fadingDelayer[universe]) {
					if (fadingDelayer[universe][channel] instanceof Fader && !fadingDelayer[universe][channel].finished) {
						fadingDelayer[universe][channel].updateSpeed(duration);
					}
				}
			}
		});

		socket.on('blackout', function(universe) {
			dmx.toggleBlackout(universe);
		});

		socket.on('switching', function(value) {
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

		socket.on('selectedColors', function (color, enabled) {
            var updated = switching.setSelectedColors(color, enabled);
            if (updated) {
                io.sockets.emit('selectedColors', color, enabled);
            }
        });

        socket.on('strobeMode', function () {
            var active = switching.toggleStrobeMode();
			io.sockets.emit('strobeMode', active);
        });

        socket.on('randomColorMode', function () {
            var active = switching.toggleRandomColorMode();
            io.sockets.emit('randomColorMode', active);

            //deactivate conflicting
            switching.setShuffleColorMode(false);
            io.sockets.emit('shuffleColorMode', false);
        });

        socket.on('shuffleColorMode', function () {
            var active = switching.toggleShuffleColorMode();
            io.sockets.emit('shuffleColorMode', active);

            //deactivate conflicting
            switching.setRandomColorMode(false);
            io.sockets.emit('randomColorMode', false);
        });

		socket.on('nextSwitchStep', function () {
			switching.nextStep();
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
			}else if (strategy == 'colorByColorSingleDevByDev'){
                switching.colorByColorSingleDevByDev();
            }
		});

		socket.on('fadingEaseChange', function (easeEffect) {
			fadingease = easeEffect;
			io.sockets.emit('fadingEaseChange', fadingease);
		});

		dmx.on('blackout', function (bout) {
			socket.emit('blackout', bout);
			blackout = bout;
		});

		dmx.on('update', function(universe, update) {
			socket.emit('update', universe, update)
		})
	});

	function updateDmx(universe, update, effect) {
		//console.log("Clicked: " + clicked);
		if (fading == 0) {
			//noFading: normal update
			for (var channel in update) { //abort fading and continue with normal movement
				if (fadingDelayer[universe][channel] instanceof Fader && !fadingDelayer[universe][channel].finished) {
					fadingDelayer[universe][channel].abort();
				}
			}
			dmx.update(universe, update);
		}else if (effect) {
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
					.add(singleUpdate, fadingTime*1000, {easing: fadingease})
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

DMXWeb()
