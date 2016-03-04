#!/usr/bin/env node
"use strict"

var http     = require('http')
var connect  = require('connect')
var express  = require('express')
var socketio = require('socket.io')
var program  = require('commander')
var DMX      = require('./dmx')
var A        = DMX.Animation

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

	for(var universe in config.universes) {
		dmx.addUniverse(
			universe,
			config.universes[universe].output.driver,
			config.universes[universe].output.device
		)
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

	io.sockets.on('connection', function(socket) {
		socket.emit('init', {'devices': DMX.devices, 'setup': config})

		socket.on('request_refresh', function() {
			for(var universe in config.universes) {
				var u = {}
				for(var i = 0; i < 256; i++) {
					u[i] = dmx.universes[universe].get(i)
				}
				socket.emit('update', universe, u)
			}
		})

		socket.on('update', function(universe, update) {
			if (fading == 0) {
				//noFading: normal update
				dmx.update(universe, update);
				//TODO live values -> on input? send absolute value on move? -> direct feedback -> addinional variable moving=true/False -> when true update drirect? problem: long time animation
			} else {
				var fade = new A();
				fade.add(update,fading, fadingease);
				fade.run(dmx.universes[universe], function() {
					//onFinish
				}, function(newvals) {
					//onUpdate
					socket.emit('update', universe, newvals)
					//TODO live values?
				});
				//TODO update fading time on change of fading tame for animations (only if anim.fadingtime = oldfadingtime)
				//TODO datastructure for animations for every chanel with A
				//TODO -> abort old animation on slider update and start new one (with relative values?)

				//TODO lightshow: list of presets and slider for switching-speed (select presets from list?)
			}
		});

		var fading = 0;
		var fadingease = 'linear';

		socket.on('fading', function(duration, ease) {
			fading = duration*100 || 0;
			fadingease = ease || 'linear';
			//console.log(fading);
			socket.emit('fade', duration, fadingease);
		});

		socket.on('blackout', function(universe) {
			A.abortAnimations();
			var u = {};
			for (var i = 0; i < 255; i++) {
				u[i] = 0;
			}
			dmx.update(universe, u);
		});

		dmx.on('update', function(universe, update) {
		    socket.emit('update', universe, update)
		})
	})
}

DMXWeb()
