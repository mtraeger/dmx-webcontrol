"use strict"

var DMX = require('./dmx')
var A = DMX.Animation

var dmx = new DMX()

var universeName = 'demo'
// var universe = dmx.addUniverse(universeName, 'enttec-usb-dmx-pro', '/dev/cu.usbserial-6AVNHXS8')
// var universe = dmx.addUniverse(universeName, 'enttec-open-usb-dmx', '/dev/cu.usbserial-6AVNHXS8')
var universe = dmx.addUniverse(universeName, 'null')

universe.update({0: 1, 1: 0})
universe.update({15: 1, 16: 255})
universe.update({1: 255, 3: 120, 4: 230, 5: 30, 6: 110, 7: 255, 8: 10, 9: 255, 10: 255, 11: 0})

function done() {console.log('DONE')}

function green_water(universeName, channels, duration) {
	var colors = [
		[160, 230,  20],
		[255, 255,   0],
		[110, 255,  10]
		]

	for(var c in channels) {
		var r = Math.floor((Math.random()*colors.length))
		var u = {}

		for(var i = 0; i < 3; i++) {
			u[channels[c] + i] = colors[r][i]
		}
		new A(dmx).add(u, duration).run(universeName)
	}
	setTimeout(function() {green_water(universeName, channels, duration);}, duration * 2)
}

function warp(universeName, channel, min, max, duration) {
	var a = {}, b = {}
	a[channel] = min;
	b[channel] = max;
	new A(dmx).add(a, duration).add(b, duration).run(universeName, function() {
		warp(universeName, channel, min, max, duration)
	})
}

warp(universeName, 1, 200, 220, 360)
warp(universeName, 1+15, 200, 255, 240)
green_water(universeName, [3, 6, 9], 4000)
green_water(universeName, [3+15, 6+15, 9+15], 4000)

return

var x = new A(dmx)
	.add({1: 255, 6: 110, 7: 255, 8: 10}, 1200)
	.delay(1000)
	.add({1: 0}, 600)
	.add({1: 255}, 600)
	.add({5: 255, 6: 128}, 1000)
	.add({1: 0}, 100)
	.add({1: 255}, 100)
	.add({1: 0}, 200)
	.add({1: 255}, 200)
	.add({1: 0}, 100)
	.add({1: 255}, 100)
	.add({1: 0})
	.delay(50)
	.add({1: 255})
	.delay(50)
	.add({1: 0})
	.delay(50)
	.add({1: 255})
	.delay(50)
	.add({1: 0})
	.delay(50)
	.add({1: 255})
	.delay(50)
	.add({2: 255}, 6000)
	.delay(200)
	.add({2: 0})

var y = new A(dmx)
	.add({9: 255}, 10000)

x.run(universeName, done)
y.run(universeName, done)
