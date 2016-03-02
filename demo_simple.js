"use strict"

var DMX = require('./dmx');
var A = DMX.Animation;

var dmx = new DMX();
// var universe = dmx.addUniverse('demo', 'enttec-open-usb-dmx', 0)
var universe = dmx.addUniverse('demo', 'art-net')

var on = false;
setInterval(function(){
  if(on){
    on = false;
    universe.updateAll(0);
    console.log("off");
  }else{
    on = true;
    universe.updateAll(250);
    console.log("on");
  }
}, 1000);
