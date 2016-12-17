"use strict"

var DMX = require('./dmx')
var A = DMX.Animation

var dmx = new DMX()

var universe = dmx.addUniverse('demo', 'art-net')

//universe.update({0: 1, 1: 0})
//universe.update({1: 255, 2:90, 3: 120, 4: 230})

universe.update({0:255}) //TODO setting chanel 1 (dimmer of flat-par) to 255 in beginning
universe.update({8:255})

//attention: chanels starting at 0 !!!

// ###################################################################################
// ## All examples for a single LED par on chanel 1 with dim,r,g,b (4 channel mode) ##
// ###################################################################################


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
	.delay(3000) //following: easing examples
	.add({1: 0, 2:0, 3:0}, 2000, {easing: 'outBounce'})
	.add({1: 255, 2:255, 3:255}, 3000, {easing: 'inOutCubic'} )
	.delay(1000)
	.add({2:0, 3:150}, 3000, {easing: 'inOutQuint'})
	.delay(5000)
	.add({1: 0, 2:0, 3:0}, 2000, {easing: 'outCirc'})
	.delay(500)
	.add({1:180}, 3000, {easing: 'outElastic'}) //ease elastic not to full value! it overfills the goal! e.g. max 180
	.delay(1000)
	.add({1:70}, 3000, {easing: 'inOutBack'})
	.delay(1000)
	.add({1:255}, 3000, {easing: 'inElastic'})
	.add({1:0}, 5000, {easing: 'outQuart'})

//animation with two devices
var doubleAnim = new A().add({0: 255, 8:255}) //initialize dimmer channel
	.addMultipleDevs({1: 255, 2:200}, 2000, [1,9]) //use devices on chanel 1 and 9 (here IDs 0 and 8) (see init line above)
	.add({1: 0}, 2000)
	.delay(3000)
	.addMultipleDevs({1: 255, 2: 110, 3: 10}, 1200, [1,9])
	.delay(1000)
	.addMultipleDevs({1: 0}, 2000, [9])
	.delay(1000)
	.addMultipleDevs({1: 255, 3: 200}, 2200, [1])
	.delay(3000) //following: easing examples
	.addMultipleDevs({1: 0, 2:0, 3:0}, 2000, [1,9], {easing: 'outBounce'})
	.addMultipleDevs({1: 255, 2:255, 3:255}, 3000, [1,9], {easing: 'inOutCubic'})
	.delay(1000)
	.addMultipleDevs({2:0, 3:150}, 3000, [1,9], {easing: 'inOutQuint'})
	.delay(5000)
	.addMultipleDevs({1: 0, 2:0, 3:0}, 2000, [1,9], {easing: 'outCirc'})
	.delay(500)
	.addMultipleDevs({1:180}, 3000, [1,9], {easing: 'outElastic'}) //ease elastic not to full value! it overfills the goal! e.g. max 180
	.delay(1000)
	.addMultipleDevs({1:70}, 3000, [1], {easing: 'inOutBack'})
	.delay(1000)
	.addMultipleDevs({1:255}, 3000, [9], {easing: 'inElastic'})
	.delay(2000)
	.addMultipleDevs({1:0}, 5000, [1,9], {easing: 'outQuart'})

//uncomment a (single) line for an example
anim.run(universe, done)
//doubleAnim.run(universe, done)
//warp(universe, 1, 10, 220, 360)
//green_water(universe, [1], 4000)
//green_water(universe, [1,9], 4000)


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

//uncomment for more example runs
//x.run(universe, done)
//y.run(universe, done)

return