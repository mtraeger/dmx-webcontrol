/**
 * Created by michael on 14.06.17.
 */
//based on https://github.com/therewasaguy/p5-music-viz/tree/gh-pages/demos/01d_beat_detect_amplitude
//maybe include https://github.com/therewasaguy/p5-music-viz/blob/gh-pages/demos/01c_amplitude_threshold/sketch.js
// and or https://github.com/therewasaguy/p5-music-viz/blob/gh-pages/demos/01b_amplitude_time/sketch.js

/**
 *  This technique tracks a beatThreshold level.
 *
 *  When the current volume exceeds the beatThreshold, we have a beat, and
 *  "debounce" to ensure each beat only triggers once.
 *
 *  When a beat is detected, we do two things to "debounce":
 *   - Increase the threshold, so that we don't get another
 *     beat right away, by adding a beatCutoff to the beatThreshold.
 *     The beatCutoff decays back to beatThreshold level at beatDecayRate.
 *   - Wait a certain amount of time before detecting another beat. This is
 *     accomplished by tracking framesSinceLastBeat > beatHoldFrames.
 *
 *  Each run through the Draw loop, the detectBeat() function decides
 *  whether we have a beat or not based on these Beat Detect Variables
 *  and the current amplitude level.
 *
 *  Thank you to Felix Turner's "Simple Beat Detection"
 *  http://www.airtightinteractive.com/2013/10/making-audio-reactive-visuals/
 */

var amplitude;

// :: Beat Detect Variables
// how many draw loop frames before the beatCutoff starts to decay
// so that another beat can be triggered.
// frameRate() is usually around 60 frames per second,
// so 20 fps = 3 beats per second, meaning if the song is over 180 BPM,
// we wont respond to every beat.
var beatHoldFrames = 30;

// what amplitude level can trigger a beat?
var beatThreshold = 0.11;

// When we have a beat, beatCutoff will be reset to 1.1*beatThreshold, and then decay
// Level must be greater than beatThreshold and beatCutoff before the next beat can trigger.
var beatCutoff = 0;
var beatDecayRate = 0.98; // how fast does beat cutoff decay?
var framesSinceLastBeat = 0; // once this equals beatHoldFrames, beatCutoff starts to decay.


function setup() {
    amplitude = new p5.Amplitude();

    mic = new p5.AudioIn()
    mic.start();


    amplitude.setInput(mic);
    amplitude.smooth(0.9);
}

function draw() {

    var level = amplitude.getLevel();
    detectBeat(level);


}

function detectBeat(level) {
    if (level > beatCutoff && level > beatThreshold) {
        onBeat();
        beatCutoff = level * 1.2;
        framesSinceLastBeat = 0;
    } else {
        if (framesSinceLastBeat <= beatHoldFrames) {
            framesSinceLastBeat++;
        }
        else {
            beatCutoff *= beatDecayRate;
            beatCutoff = Math.max(beatCutoff, beatThreshold);
        }
    }
}

function onBeat() {
    loadUrl("/switchNextStep");
    // console.log("beat");
}

function loadUrl(url) {
    var req = new XMLHttpRequest();
    req.open("GET", url, true);
    req.send(null);
}


function thresholdChange(value) {
    beatThreshold = value / 100;
}

function beatHoldFramesChange(value) {
    beatHoldFrames = value;
}

function beatDecayRateChange(value) {
    beatDecayRate = value / 100;
}
