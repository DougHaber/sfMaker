// **************************************************************
// SFMaker
// Copyright (c) 2013-2018 Leshy Labs LLC
// All rights reserved.
// **************************************************************
// For more information about this program and its usage, or to
// find the most recent version, please go to:
//    https://github.com/leshylabs/sfMaker
//
// For licensing information, please see the LICENSE file in the
// distribution.
// **************************************************************

// SFDesigner - A user interface for generating sounds in SFMaker
//
// This was originally written at the HTML5 Tools Jam hackathon in
// 2011 under tight deadlines.  Forgive the code quality!


"use strict";


function SFMaker() {
    var x;

    this.waveFile = new WaveFile();

    this.clip = 0; // Clip counter
    this.bitsPerSample = 8;

    this.params = {
        'song': { code: 'n', defaultValue: '' },
        'waveType': { code: 'w', defaultValue: 'Sine' },
        'sampleRate': { code: 'W', defaultValue: 11025 },
        'frequency': { code: 'f', defaultValue: 440 },
        'vibratoFrequency': { code: 'v', defaultValue: 0 },
        'vibratoDepth': { code: 'V', defaultValue: 0.3},
        'tremeloFrequency': { code: 't', defaultValue: 0},
        'tremeloDepth': { code: 'T', defaultValue: 0.3 },
        'duty': { code: '_', defaultValue: 0 },
        'dutySweepFrequency': { code: 'd', defaultValue: 0},
        'dutySweepDepth': { code: 'D', defaultValue: 0.31 },
        'frequencyChange': { code: 'c', defaultValue: 0 },
        'frequencyChangeTime': { code: 'C', defaultValue: 50 },
        'steps': { code: 's', defaultValue: 1 },
        'stepDelta': { code: 'S', defaultValue: 10 },
        'stepDirection': { code: 'z', defaultValue: 'Up' },
        'length': { code: 'l', defaultValue: 1 },
        'volume': { code: 'L', defaultValue: 0.8  },
        'peak': { code: 'p', defaultValue: 1.0 },
        'attack': { code: 'a', defaultValue: 0.0 },
        'decay': { code: 'A', defaultValue: 0.0 },
        'sustain': { code: 'b', defaultValue: 0.2 },
        'release': { code: 'r', defaultValue: 0.0 },
        'mode': { code: 'M', defaultValue: 'w' },
	'randomSeed': { code: 'E', defaultValue: 123 },
	'noiseWaveType': { code: 'e', defaultValue: 'Square' },
	'noiseChangeTime': { code: 'N', defaultValue: 50 },
	'noiseChangeRange': { code: 'F', defaultValue: 256 },
	'noiseChangeStyle': { code: 'B', defaultValue: 'Random' },
	'noiseNoteReset': { code: 'R', defaultValue: 'Off' },
	'lowPassAlpha': { code: 'g', defaultValue: 0 }
    };

    this.paramCodes = {};

    for (x in this.params) {
        this.paramCodes[this.params[x].code] = x;
    }
}


SFMaker.prototype._getSample = function (a, state, volAdj) {
    var base = Math.sin(state.inc * state.wavePosition); // Base frequency before update
    var currentPhase = (base > 0) ? 1 : ((base < 0) ? -1 : 0);
    var sampleRange = this.waveFile.sampleRange;
    var s;
    var x;

    if (currentPhase != state.lastPhase && currentPhase == 1) {
    	state.newPeriod = true;
    	state.periodCounter++;
    }
    else {
    	state.newPeriod = false;
    }

    base = this._updateState(a, state);

    state.base = base;
    state.lastPhase = currentPhase;

    if (a['frequency'] == 0) { // For silence, repeat last sample to avoid clicking
        s = state.lastSample;
    }
    else {
        switch(a['waveType']) {
        case 'Square':
            s = (base > a['duty'] + state.dutySweep) ? sampleRange : (0 - sampleRange);
            break;
        case 'Sawtooth':
	    var duty = (1 - Math.abs(a['duty'] + state.dutySweep));

	    if (base > duty) {
		state.phase = -1;
	    }
	    else {
		state.phase += (1 / state.periodLength) * (1 + (1 - duty)) * 2;

		if (state.phase > 1) {
		    state.phase = -1;
		}
	    }

            s = state.phase * sampleRange;
	    break;
         case 'Foo':
            (base > a['duty'] + state.dutySweep) ? state.phase += state.inc + state.dutySweep :
                state.phase -= state.inc + state.dutySweep;
            if (state.phase * sampleRange < 0 - sampleRange) { state.phase = -1; }
            if (state.phase * sampleRange > sampleRange) { state.phase = 1; }

            s = state.phase * sampleRange;
            break;
        default: // Sine wave
            s = base * sampleRange;
            break;
        }

        if (s > sampleRange) { s = sampleRange; this.clip++; }
        else if (s < 0 - sampleRange) { s = 0 - sampleRange; this.clip++; }

	s = Math.round(s * volAdj * a['volume']);

	// Volumes greater than 1 can require clipping again
        if (s > sampleRange) { s = sampleRange; this.clip++; }
        else if (s < 0 - sampleRange) { s = 0 - sampleRange; this.clip++; }

	if (this.waveFile.bitsPerSample == 8) {
	    // 8 bit samples are unsigned
	    s += sampleRange;
	}

	// Filters
	if (state.lastSample) {
	    if (a['lowPassAlpha']) { s += a['lowPassAlpha'] * (state.lastSample - s); }
	}

	state.lastSample = s;
	state.lastVolume = volAdj;
    }

    for (x = 0; x < this.waveFile.bitsPerSample / 8; x++) {
        this.waveFile.data[state.pos + x] = (s & (0xff << (x * 8))) >> (x * 8);
    }

    state.pos += this.waveFile.bitsPerSample / 8;
    state.wavePosition++;
};


SFMaker.prototype.addSilence = function(a, state) {
    // When a wave is complete, decay to silence to avoid clicks
    var samples = Math.round(this.waveFile.sampleRate / 20);
    var startPosition;
    var lastVolume = state.lastVolume;
    var x = 3;

    for (startPosition = state.x; state.x <= samples + startPosition; state.x++) {
        this._getSample(a, state, ((samples - (state.x - startPosition)) / samples) * lastVolume / Math.log(x));
	x += 0.5;
    }
};


SFMaker.prototype.getFrequency = function(note, octave) {
    var order = ['A', 'a', 'B', 'C', 'c', 'D', 'd', 'E', 'F', 'f', 'G', 'g'];
    var halfSteps;

    if (! note.match(/^[A-Gacdfg]$/)) {
	return (0);
    }

    for (halfSteps = 0; halfSteps < order.length; halfSteps++) {
	if (order[halfSteps] == note) {
	    break;
	}
    }

    if (halfSteps < 3) {
	halfSteps += (octave - 4) * 12;
    }
    else {
	halfSteps += (octave - 5) * 12;
    }

    return (440 * Math.pow(2, halfSteps / 12));
};


SFMaker.prototype.generateSong = function(a) {
    var state;
    var length = a['song'].length;
    var note, octave;
    var x;

    this.defaultOctave = 4;

    for (x = 0; x < length; x++) {
	if (a['noiseNoteReset'] == 'On') {
	    this.randomSetSeed(a['randomSeed']);
	}

	note = a['song'][x];
	octave = (x + 1 < length) ? a['song'][x + 1] : '';

	if (! octave.match(/^\d$/)) { octave = this.defaultOctave; }
	else { x++; }

	if (note == 'O') { // Support 'O' for default octave changes
	    this.defaultOctave = octave;
	    continue;
	}

	a['frequency'] = this.getFrequency(note, octave);

        if (state) {
	    state.startFrequency = a['frequency'];
	    state.baseFrequency = a['frequency'];
	    state.frequencyModifier = 0;
            state.step = 1;
	    state.wavePosition = 0;
	    state.inc = (2 * Math.PI * a['frequency'] / this.waveFile.sampleRate),
	    state.newPeriod = true; // Starting a new period
	    state.periodCounter = 0;
	}

        state = this.generateWave(a, state);
        state.frequencyChangePoint += this.waveFile.sampleRate * a['length'];
    }

    return (state);
};


SFMaker.prototype._updateState = function(a, state) {
    a['volume'] = state.startVolume;

    if (a['noise']) {
	if (a['noiseChangeStyle'] == 'Random') {
	    if (Math.round(this.random() * a['noiseChangeTime']) == 0) {
		state.frequencyModifier = 0 - state.baseFrequency + state.startFrequency + this.random() * a['noiseChangeRange'];
	    }
	}
	else if (state.x % a['noiseChangeTime'] == 0) { // Fixed change time
	    state.frequencyModifier = 0 - state.baseFrequency + state.startFrequency + this.random() * a['noiseChangeRange'];
	}
    }

    if (a['vibratoFrequency']) {
	state.frequencyModifier += (Math.sin(state.vibratoInc * (state.x + 1))) * (a['vibratoDepth'] * state.vibratoInc);
    }

    if (a['tremeloFrequency']) {
        a['volume'] += Math.sin(state.tremeloInc * state.x) * a['tremeloDepth'] * state.startVolume;
    }

    if (a['dutySweepFrequency']) {
        state.dutySweep = Math.sin(state.dutySweepInc * state.x) * a['dutySweepDepth'];
    }

    if (a['frequencyChange'] && state.x == state.frequencyChangePoint) {
        state.frequencyModifier += a['frequencyChange'];
    }

    if (a['steps'] > 1) {
        if (state.x && state.x % state.stepSamples == 0) {
            state.step++;
            state.frequencyModifier += a['stepDelta'];
        }
    }

    if (state.newPeriod) {
	var previousInc = state.inc;

	a['frequency'] = state.baseFrequency + state.frequencyModifier;
	state.inc = 2 * Math.PI * a['frequency'] / this.waveFile.sampleRate;
	state.periodLength = this.waveFile.sampleRate / a['frequency'];

	if (previousInc != state.inc) {
	    state.wavePosition = 1;
	}
    }

    return (Math.sin(state.inc * state.wavePosition)); // Base frequency
};


SFMaker.prototype.generateWave = function(a, state) {
    var n;
    var samples;
    var startPosition;
    var sampleRate = this.waveFile.sampleRate;

    if (! state) {
        state = {
            x: 0, // Sample counter
	    wavePosition: 0, // Position within a waveform
            phase: 0, // Phase state.  Usage depends on waveform type
	    inc: (2 * Math.PI * a['frequency'] / sampleRate),
	    periodLength: sampleRate / a['frequency'],
            pos: 0, // file position
            lastSample: 0,
	    lastVolume: 0,
            totalADSR: a['attack'] + a['decay'] + a['sustain'] + a['release'],
            startFrequency: a['frequency'], // The initial frequency
            baseFrequency: a['frequency'],  // Our core "center" frequency
	    frequencyModifier: 0, // The change from the "base"
            startVolume: a['volume'],
            vibratoInc: (2 * Math.PI * a['vibratoFrequency'] / sampleRate) || 0,
            tremeloInc: (2 * Math.PI * a['tremeloFrequency'] / sampleRate) || 0,
	    dutySweepInc: (2 * Math.PI * a['dutySweepFrequency'] / sampleRate) || 0,
            dutySweep: 0, // Sweep adjustment to the duty
            step: 1,
            stepSamples: Math.round(sampleRate * a['length'] / a['steps']),  // Number of samples per step
            frequencyChangePoint: Math.round((a['frequencyChangeTime'] * sampleRate * a['length'] / 100)),
	    newPeriod: true, // Starting a new period
	    periodCounter: 0,
	    lastPhase: 1, // Used for determining when a new period begins
	    base: 0 // Our position within a sine wave.  Used for various effects
        };
    }

    samples = Math.round(sampleRate * a['attack'] / state.totalADSR * a['length']);

    // Attack - From 0 to the peak
    for (startPosition = state.x; state.x < samples + startPosition; state.x++) {
        this._getSample(a, state, (state.x - startPosition) * (a['peak'] / samples));
    }

    // Decay - From the peak to 1
    samples = Math.round(sampleRate * a['decay'] / state.totalADSR * a['length']);
    for (startPosition = state.x; state.x < samples + startPosition; state.x++) {
        if (a['peak'] > 1.0) {
            this._getSample(a, state, (samples - (state.x - startPosition)) * (a['peak'] - 1.0) / samples + 1);
        }
        else {
            this._getSample(a, state, 1.0);
        }
    }

    // Sustain
    samples = Math.round(sampleRate * a['sustain'] / state.totalADSR * a['length']);
    for (startPosition = state.x; state.x < samples + startPosition; state.x++) {
        this._getSample(a, state, 1.0);
    }

    // Release - From 1 to 0
    samples = Math.round(sampleRate * a['release'] / state.totalADSR * a['length']);
    for (startPosition = state.x; state.x < samples + startPosition; state.x++) {
        this._getSample(a, state, (samples - (state.x - startPosition)) / samples);
    }

    return (state);
};


SFMaker.prototype.generateSound = function(a) {
    var state;

    this.waveFile.data = [];

    this.clip = 0;
    this.waveFile.setFormat(a['sampleRate'], this.bitsPerSample, 1);

    if (a['waveType'] == 'Noise') {
	a['noise'] = true;
	a['waveType'] = a['noiseWaveType'];
    }

    if (a['stepDirection'] == 'Down') {
	a['stepDelta'] = 0 - a['stepDelta'];
    }

    this.randomSetSeed(a['randomSeed']);

    if (a['mode'] == 's') {
	state = this.generateSong(a);
    }
    else {
	state = this.generateWave(a);
    }

    this.addSilence(a, state);
};


SFMaker.prototype.generateAudioTag = function(text) {
    // Return an audio tag from sound text
    var p = this.getParametersFromSoundText(text);

    this.generateSound(p);

    return (this.waveFile.generateAudioTag());
};


SFMaker.prototype.generateBase64 = function(text) {
    // Return base64 from sound text
    var p = this.getParametersFromSoundText(text);

    this.generateSound(p);

    return (this.waveFile.generateBase64());
};


SFMaker.prototype.generateSoundText = function(p) {
    // Generate the abbreviated sound text from a parameter list
    var x;
    var t = [];

    for (x in p) {
        if (this.params[x] && p[x] != this.params[x].defaultValue) {
            var paramCode = this.params[x].code;

            if (typeof(p[x]) == 'number') {
                t.push(paramCode + '=' + Math.round(p[x] * 1000) / 1000);
            }
            else {
                t.push(paramCode + '=' + p[x]);
            }
        }
    }

    return (t.join(','));
};


SFMaker.prototype.defaultParameters = function() {
    var x;
    var h = {};

    for (x in this.params) {
        h[x] = this.params[x].defaultValue;
    }

    return (h);
};


SFMaker.prototype.getParametersFromSoundText = function(text) {
    // Take in a soundText string and return a hash of parameterName/values
    var p = text.split(/,/);
    var h = this.defaultParameters();
    var x;

    for (x = 0; x < p.length; x++) {
        var r = p[x].match(/^([\w<>])=(-?[\w\.\ ]*)\n?$/);

        if (r) {
            var field = this.paramCodes[r[1]];
            var value = r[2];

            if (! field) {
                alert("ERROR: Unrecognized field in soundText '" + field + "'");
            }
            else {
                if (parseFloat(value) == value) {
                    value = parseFloat(value);
                }

                h[field] = value;
            }
        }
    }

    return (h);
};


SFMaker.prototype.setBitsPerSample = function(value) {
    // Legal values are 8 and 16, and 8 is the default
    this.bitsPerSample = (value == 16) ? 16 : 8;
};

// ********************************************************************************
// * Random Number Generation
// ********************************************************************************

SFMaker.prototype.randomNumberGenerator = new (function() {
    // This is adapted from the Leshy EJU library
    // It provides the "Leshy-shift" pseudo-random number generator
    var x, y, z, w;

    this.random = function() {
        var t = x ^ (x << 11);

        x = y;
        y = z;
        z = w;

        w = (w ^ (w >> 19)) ^ (t ^ (t >> 8));

        return ((w / 2147483648))
    };

    this.setSeed = function(seed) {
        x = seed;
        y = 456;
        z = 789;
        w = 101112;
    };

    this.setSeed(123);
})();


SFMaker.prototype.random = function() {
    return (this.randomNumberGenerator.random());
};


SFMaker.prototype.randomSetSeed = function() {
    this.randomNumberGenerator.setSeed();
};
