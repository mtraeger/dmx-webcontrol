"use strict"

var DMX = require('./dmx')
var A = DMX.Animation

var dmx = new DMX()

var universeName = 'demo'
var universe = dmx.addUniverse(universeName, 'artnet', '192.168.1.10')

//universe.update({0: 1, 1: 0})
//universe.update({1: 255, 2:90, 3: 120, 4: 230})

dmx.update(universeName, {1:255}) //setting chanel 1 (dimmer of flat-par) to 255 in beginning
dmx.update(universeName, {9:255})

// ###################################################################################
// ## All examples for a single LED par on chanel 1 with dim,r,g,b (4 channel mode) ##
// ###################################################################################


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



//simple animation
var anim = new A(dmx)
	.add({2: 255}, 2000)
	.add({2: 0}, 2000)
	.delay(3000)
	.add({2: 255, 3: 110, 4: 10}, 1200)
	.delay(1000)
	.add({2: 0}, 2000)
	.delay(1000)
	.add({2: 255, 4: 200}, 2200)
	.delay(3000) //following: easing examples
	.add({2: 0, 3:0, 4:0}, 2000, {easing: 'outBounce'})
	.add({2: 255, 3:255, 4:255}, 3000, {easing: 'inOutCubic'} )
	.delay(1000)
	.add({3:0, 4:150}, 3000, {easing: 'inOutQuint'})
	.delay(5000)
	.add({2: 0, 3:0, 4:0}, 2000, {easing: 'outCirc'})
	.delay(500)
	.add({2:180}, 3000, {easing: 'outElastic'}) //ease elastic not to full value! it overfills the goal! e.g. max 180
	.delay(1000)
	.add({2:70}, 3000, {easing: 'inOutBack'})
	.delay(1000)
	.add({2:255}, 3000, {easing: 'inElastic'})
	.add({2:0}, 5000, {easing: 'outQuart'})

//animation with two devices
var doubleAnim = new A(dmx).add({1: 255, 9:255}) //initialize dimmer channel
	.addMultipleDevs({2: 255, 3:200}, 2000, [1,9]) //use devices on chanel 1 and 9 (see init line above)
	.add({2: 0}, 2000)
	.delay(3000)
	.addMultipleDevs({2: 255, 3: 110, 4: 10}, 1200, [1,9])
	.delay(1000)
	.addMultipleDevs({2: 0}, 2000, [9])
	.delay(1000)
	.addMultipleDevs({2: 255, 4: 200}, 2200, [1])
	.delay(3000) //following: easing examples
	.addMultipleDevs({2: 0, 3:0, 4:0}, 2000, [1,9], {easing: 'outBounce'})
	.addMultipleDevs({2: 255, 3:255, 4:255}, 3000, [1,9], {easing: 'inOutCubic'})
	.delay(1000)
	.addMultipleDevs({3:0, 4:150}, 3000, [1,9], {easing: 'inOutQuint'})
	.delay(5000)
	.addMultipleDevs({2: 0, 3:0, 4:0}, 2000, [1,9], {easing: 'outCirc'})
	.delay(500)
	.addMultipleDevs({2:180}, 3000, [1,9], {easing: 'outElastic'}) //ease elastic not to full value! it overfills the goal! e.g. max 180
	.delay(1000)
	.addMultipleDevs({2:70}, 3000, [1], {easing: 'inOutBack'})
	.delay(1000)
	.addMultipleDevs({2:255}, 3000, [9], {easing: 'inElastic'})
	.delay(2000)
	.addMultipleDevs({2:0}, 5000, [1,9], {easing: 'outQuart'})

//uncomment a (single) line for an example
anim.run(universeName, done)
// doubleAnim.run(universeName, done)
//warp(universeName, 2, 10, 220, 360)
//green_water(universeName, [3], 4000)
//green_water(universeName, [3,11], 4000)


var x = new A(dmx)
	.add({2: 255, 3: 110, 4: 255}, 1200)
	.delay(1000)
	.add({2: 0}, 600)
	.add({2: 255}, 600)
	.add({3: 0, 4: 128}, 1000)
	.add({2: 0}, 100)
	.add({2: 255}, 100)
	.add({2: 0}, 200)
	.add({2: 255}, 200)
	.add({2: 0}, 100)
	.add({2: 255}, 100)
	.add({2: 0})
	.delay(50)
	.add({2: 255})
	.delay(50)
	.add({2: 0})
	.delay(50)
	.add({2: 255})
	.delay(50)
	.add({2: 0})
	.delay(50)
	.add({2: 255})
	.delay(50)
	.add({3: 255}, 6000)
	.delay(2000)
	.add({3: 0}, 1000)

var y = new A(dmx)
	.add({2: 255}, 10000)

//uncomment for more example runs
//x.run(universeName, done)
//y.run(universeName, done)

return