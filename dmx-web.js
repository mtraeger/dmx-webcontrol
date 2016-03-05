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
				socket.emit('fade', fading/100, fadingease);
				socket.emit('blackout', blackout);
			}
		})

		socket.on('update', function(universe, update, realtime) {
			if (fading == 0) {
				//noFading: normal update
				dmx.update(universe, update);
			} else if(realtime) {
				//ignore realtime events

				for (var channel in update) { //single animation for each channel

					var fadingGoal = update[channel];

					if(fadingDelayer[universe][channel] instanceof Fader && !fadingDelayer[universe][channel].finished) { //TODO set undefined afterwards
						fadingDelayer[universe][channel].updateValue(fadingGoal); //TODO also update speed? separate method call? -> static

					}else{
						fadingDelayer[universe][channel] = new Fader(dmx.universes[universe], channel);
						fadingDelayer[universe][channel].run(fadingGoal, fading/100);

						//	setInterval(singleStep(universe, channel, update[channel], function(universe, channel) {
						//	clearInterval(fadingInterval[universe][channel]);
						//	fadingInterval[universe][channel] = null;
						//}), fading / 100);
					}

				//	var singleStep = function(universe, channel, fadingGoal, finishFading) {
				//		var currentValue = dmx.universes[universe].get(channel);
				//		if(currentValue == fadingGoal){
				//			//finished
				//			finishFading(universe,channel);
                //
				//			//if(onFinish) onFinish(...singleUpdate-format..); //TODO ?
				//		}else{
				//			var newvalue = currentValue;
				//			if(currentValue < fadingGoal){
				//				newvalue++;
				//			}else{ //current bigger
				//				newvalue--;
				//			}
				//			var singleUpdate = {}; //creating new object with one single channel target value
				//			singleUpdate[channel] = newvalue;
				//			dmx.update(universe, singleUpdate);
				//		}
                //
				//	}
                //
				//	if(fadingInterval[universe][channel] instanceof Number) { //TODO set undefined afterwards
				//		fadingInterval[universe][channel] = setInterval(singleStep(universe, channel, update[channel], function(universe, channel) {
				//			clearInterval(fadingInterval[universe][channel]);
				//			fadingInterval[universe][channel] = null;
				//		}), fading / 100);
				//	}else{
				//		clearInterval(fadingInterval[universe][channel]);
				//		fadingInterval[universe][channel] = setInterval(singleStep(universe, channel, update[channel], function(universe, channel) {
				//			clearInterval(fadingInterval[universe][channel]);
				//			fadingInterval[universe][channel] = null;
				//		}), fading / 100);
				//	}
                //
                //
				//	//setTimeout(function() {
				//	//	dmx.update(universe, update);
				//	//}, fading/100); //Delay //TODO rm /100
                 //   //
				//	//if(animations[universe][channel] instanceof A){
				//	//	animations[universe][channel].abort(); //abort old still running animation on same channel
				//	//}
				//	//animations[universe][channel] = new A();
				//	//animations[universe][channel]
				//	//	.add(singleUpdate, fading, fadingease)
				//	//	.run(dmx.universes[universe], function (finalvals) {
				//	//		//onFinish
				//	//		io.sockets.emit('update', universe, finalvals); //TODO dirty?
				//	//	}, function (newvals) {
				//	//		//onUpdate
				//	//		io.sockets.emit('displayslider', universe, newvals)
				//	//	});
                //
				}


			}else if(false){
				for (var channel in update) { //single animation for each channel

					var singleUpdate = {}; //creating new object with one single channel target value
					singleUpdate[channel] = update[channel];

					if(animations[universe][channel] instanceof A){
						animations[universe][channel].abort(); //abort old still running animation on same channel
					}
					animations[universe][channel] = new A();
					animations[universe][channel]
						.add(singleUpdate, fading, fadingease)
						.run(dmx.universes[universe], function (finalvals) {
							//onFinish
							io.sockets.emit('update', universe, finalvals); //TODO dirty?
						}, function (newvals) {
							//onUpdate
							io.sockets.emit('displayslider', universe, newvals)
						});
					//TODO update fading time on change of fading tame for animations (only if anim.fadingtime = oldfadingtime)
					//relative fade time: max 1sec per step /10 -> ~25 sek max -> max 1/10 sec per step
					//TODO -> relative value updates?

					//TODO lightshow: list of presets and slider for switching-speed (select presets from list?)
				}
			}
		});

		socket.on('fading', function(duration, ease) {
			fading = duration*100 || 0;
			fadingease = ease || 'linear';
			//console.log(fading);
			io.sockets.emit('fade', duration, fadingease); //TODO dirty?
		});

		socket.on('blackout', function(universe) {
			//A.abortAnimations();
			dmx.toggleBlackout(universe);
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
