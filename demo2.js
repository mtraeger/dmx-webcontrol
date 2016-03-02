"use strict"

var DMX = require('./dmx')
var A = DMX.Animation

var dmx = new DMX()

var universe = dmx.addUniverse('demo', 'art-net')

//universe.update({0: 1, 1: 0})
//universe.update({1: 255, 2:90, 3: 120, 4: 230})

universe.update({0:255}) //TODO setting chanel 1 (dimmer of flat-par) to 255 in beginning
//TODO attention: chanels starting at 0 !!!

function done() {console.log('DONE')}

function green_water(universe, channels, duration) {
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
		new A().add(u, duration).run(universe)
	}
	setTimeout(function() {green_water(universe, channels, duration);}, duration * 2)
}

function warp(universe, channel, min, max, duration) {
	var a = {}, b = {}
	a[channel] = min;
	b[channel] = max;
	new A().add(a, duration).add(b, duration).run(universe, function() {
		warp(universe, channel, min, max, duration)
	})
}

//simple animation
var anim = new A()
	.add({1: 255}, 2000)
	.add({1: 0}, 2000)
	.delay(3000)
	.add({1: 255, 2: 110, 3: 10}, 1200)
	.delay(1000)
	.add({1: 0}, 2000)
	.delay(1000)
	.add({1: 255, 3: 200}, 2200)

//anim.run(universe, done)
//warp(universe, 2, 10, 220, 360)
//green_water(universe, [2], 4000)



var x = new A()
	.add({1: 255, 2: 110, 3: 255}, 1200)
	.delay(1000)
	.add({1: 0}, 600)
	.add({1: 255}, 600)
	.add({2: 0, 3: 128}, 1000)
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
	.delay(2000)
	.add({2: 0}, 1000)

var y = new A()
	.add({1: 255}, 10000)

x.run(universe, done)
//y.run(universe, done)

return