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
			}
		})

		socket.on('update', function (universe, update, effect) {
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

		//TODO easing drop down
		//for (var seaseing in easingF) {
		//	console.log(seaseing);
		//}

		socket.on('fading', function(duration, ease) {
			fading = duration || 0;
			fadingease = ease || 'outBounce';
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
			//TODO fill me
			//--> emit "normal" update -> effect=true
		});

		dmx.on('blackout', function (bout) {
			socket.emit('blackout', bout);
			blackout = bout;
		})

		dmx.on('update', function(universe, update) {
		    socket.emit('update', universe, update)
		})
	})
}

DMXWeb()
