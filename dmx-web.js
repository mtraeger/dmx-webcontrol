#!/usr/bin/env node
"use strict"

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


var	config = require(program.config)

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
			config.universes[universe].output.device
		)
		animations[universe] = [];
		fadingDelayer[universe] = [];
	}

	//TODO set devices.channelPresets to specified value in devices config

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

	app.post('/animation/:universe', function(req, res) {
		try {
			var universe = dmx.universes[req.params.universe]

			// preserve old states
			var old = {}
			for(var i = 0; i < 256; i++) {
				old[i] = universe.get(i)
			}

			var animation = new A()
			for(var step in req.body) {
				animation.add(
					req.body[step].to,
					req.body[step].duration || 0,
					req.body[step].options  || {} //TODO update or bring back original options in anim.js add()
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

	var fading = 0;
	var fadingease = 'linear';
	var blackout = false;
	var switchingTime = 0;

	//TODO more global scope?
	// console.log({'devices': DMX.devices, 'setup': config})
	var switching = new Switching({'devices': DMX.devices, 'setup': config}, function (universe, update, effect) {
		updateDmx(universe, update, effect);
	});

// 	function generateColors(){
// 		var result = [];
// 		for (var color in config.colors) {
// 			var universesUpdate = {};
// 			for (var universe in config.universes) {
// 				var update = {};
// 				for (var device in config.universes[universe].devices) {
// 					var dev = config.universes[universe].devices[device];
// 					if (DMX.devices[dev.type].hasOwnProperty("startRgbChannel")) {
// 						var startRgb = DMX.devices[dev.type].startRgbChannel;
// 						var firstRgbChannelForDevice = dev.address + startRgb;
// 						for (var colorChannel in config.colors[color].values) {
// 							var updateChannel = parseInt(colorChannel) + firstRgbChannelForDevice;
// 							update[updateChannel] = config.colors[color].values[colorChannel];
// 						}
//
// 						//TODO special override colors from device config - code below from sliders...
// 						//use color.label for naming convention
// //                                    for (var overrideColor in devices[dev.type].colors) {
// //                                        var channel_id = dev.address + Number(overrideColor)
// //                                        html += '<label for="' + html_id + '">' + devices[dev.type].channels[overrideColor] + '</label>';
// //                                    }
//
// 					}
// 				}
// 				universesUpdate[universe] = update;
// 				// if(fadingEffect == 'linear'){
// 				// 	socket.emit('update', universe, update);
// 				// }else{
// 				// 	socket.emit('update', universe, update, true);
// 				// }
// 				//TODO enable effect mode by button also here
//
// 			}
// 			result[color] = {
// 				label: color,
// 					values: universesUpdate[universe]
// 			}
// 		}
// 		return result;
// 	}


	io.sockets.on('connection', function(socket) {
		socket.emit('init', {'devices': DMX.devices, 'setup': config})

		socket.on('request_refresh', function() {
			for(var universe in config.universes) {
				var u = {}
				for(var i = 0; i < 256; i++) {
					u[i] = dmx.universes[universe].get(i)
				}
				socket.emit('update', universe, u)
				socket.emit('fade', fading, fadingease);
				socket.emit('blackout', blackout);
				socket.emit('switching', switchingTime);
			}
		})

		socket.on('update', function (universe, update, effect) {
			updateDmx(universe, update, effect);
		});


		//TODO lightshow: list of presets and slider for switching-speed (select presets from list?)
		//TODO fade through presets -> switch presets and controll fade via fade fader -> fader for speed -> list to select which presets should be used
		//TODO list with extended presets, not shown by default?

		//TODO js file with references to animations and effect files -> read in and select (start / stop)

		//TODO general sliders (fade time, switch fader) and black out button in top bar?

		//TODO music detectoin / chord detection https://github.com/cwilso/PitchDetect https://www.npmjs.com/package/beats
		//TODO audio player, dj mixer?

		//TODO chord detection / beatdetection -> chords: cange -> change color or specific color for each chord

		//TODO connect two or more (same or different type) dmx devices
		// connect simply by duplicating channel signals or by mapping channels (r,g,b,w,a,uv)
		// make groups where input is given to all group members (mapped by channel name?)
		// or additional auto groups containing all same type devices?

		//TODO master slider for each color of all lights
		
		//TODO animations for whole group / type of light device (also in script A() )
		// delay animations for each device in group for a given time (1 -> 2 (+x sec) -> 3 (2+x sec) ...)
		// from front or backwards (see light fading through the room from device to device)
		// also from middle? with effects? 
		// add device to more than one group? type of device group like normal group? (device type group only special name?)
		// start effects on devices der reihe nach (number by number? - delayed)
		
		//TODO random device for next animation step optional
		// random animation?
		// change (color?, continue to animation step) if sound over threshold, change all devices if sound is over highter threshold
		
		//TODO color groups? all colors? all with colors? all with same colors?
		//TODO presets? simple out of the box baukasten (presets per device type? -> available for all devices of type)
		// simple drag n drop lightshow builder?
		// different depth of effect: change one color for all and other color only for sub group?
		
		//TODO stacking groups: group in group - subgroups?
		// special group: all

		//TODO easing drop down
		//for (var seaseing in easingF) {
		//	console.log(seaseing);
		//}

		socket.on('fading', function(duration, ease) {
			fading = duration || 0;
			fadingease = ease || fadingease || 'outBounce'; //TODO CHECK use default value from var above (on top) -> do not override if not set
			//console.log(fading);
			io.sockets.emit('fade', duration, fadingease);
			for (var universe in fadingDelayer) {
				for (var channel in fadingDelayer[universe]) {
					if (fadingDelayer[universe][channel] instanceof Fader && !fadingDelayer[universe][channel].finished) {
						fadingDelayer[universe][channel].updateSpeed(duration);
					}
				}
			}
		});

		socket.on('blackout', function(universe) {
			//A.abortAnimations();
			dmx.toggleBlackout(universe);
		});

		socket.on('switching', function(value) {
			switchingTime = value;

			if(switchingTime == 0){
				switching.abort();
			}else{
				if(!switching.running) {
					switching.run();
				}
				var secondInMilliSec = 60*1000;
				var updateMod = 1+Math.pow(switchingTime,2)/200;
				switching.setResolution(secondInMilliSec/updateMod)
			}

			io.sockets.emit('switching', switchingTime);
		});

		socket.on('nextSwitchStep', function () {
			switching.nextStep();
		})

		socket.on('fadingEaseChange', function (easeEffect) {
			fadingease = easeEffect;
			io.sockets.emit('fadingEaseChange', fadingease);
		})

		dmx.on('blackout', function (bout) {
			socket.emit('blackout', bout);
			blackout = bout;
		})

		dmx.on('update', function(universe, update) {
		    socket.emit('update', universe, update)
		})
	})

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
				animations[universe][channel] = new A();
				animations[universe][channel]
					.add(singleUpdate, fading*100, fadingease) //TODO two different scales for fader? -> also special curve calculation?
					.run(dmx.universes[universe], function (finalvals) {
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
					fadingDelayer[universe][channel] = new Fader(dmx.universes[universe], channel);
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
