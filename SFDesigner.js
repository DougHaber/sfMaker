// **************************************************************
//  Copyright (c) 2013-2018, Leshy Labs LLC
//  All rights reserved.
//      www.leshylabs.com
// **************************************************************

// SFDesigner - A user interface for generating sounds in SFMaker
//
// This was originally written at the HTML5 Tools Jam hackathon in
// 2011 under tight deadlines.  Forgive the code quality!


"use strict";


function SFDesigner(parentNode, attrib) {
    var self = this;
    var x;

    this.parentNode = parentNode || document.body;
    this.enableKeys = true;

    this.inputFocused = false; // True when focused in a text input
                               // so that spacebar can work properly there
    if (attrib) {
        for (x in attrib) {
            this[x] = attrib[x];
        }
    }

    this.ui = {};
    this.lockButtons = {};
    this.history = []; // History stack
    this.historyLength = 100; // Maximum history size
    this.autoPlay = true;
    this.deferPlayTime = null;
    this._initImages();

    this.sfmaker = new SFMaker();

    this.audio = document.createElement('audio');

    this.currentMode = 'Sine'; // Mode state change tracker
    this.modeElements = {}; // Mode element hash.  Name of mode to array of elements

    this.table = document.createElement('table');
    this.table.className = 'SFDesigner';
    this._createHeadingRow();

    this.soundLink = document.createElement('a'); // Link to the current sound
    this.soundLink.id = 'soundLink';
    this.soundLink.innerHTML = 'Link to Sound';

    this.tableTR = this.table.insertRow(2);
    this._createLeftPresetSection();
    this._createParameterSection();
    this._createSaveSection();

    this._initKeys();
    this._initModeUI();

    this.readPageParameters();
    this.updateSoundLink();

    this.parentNode.appendChild(this.table);
};


SFDesigner.prototype.readPageParameters = function() {
    var args = this.getParameters();

    if (args['sound'] !== undefined && args['sound']) {
        this.loadSoundText(true, decodeURIComponent(args['sound']), true);
    }
};


// **************************************************************
// * Keyboard
// **************************************************************

SFDesigner.prototype.stopEvent = function(event) {
    var e = event || window.event;

    e.cancelBubble = true

    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (e.preventDefault) {
        e.preventDefault();
    }

    return (false);
};


SFDesigner.prototype._onKeyHandler = function(e) {
    // Provide keyboard shortcuts for various functionality
    var key = (e.keyCode || e.which || e.charCode);

    if (key == 32 && ! this.inputFocused) { this.play(); }    // Space bar
    else if (key == 83 && e.ctrlKey) { this.saveWave(); }     // CTRL+S
    else if (key == 90 && e.ctrlKey) { this.loadDefaults(); } // CTRL+Z
    else if (key == 80 && e.ctrlKey) { this._popHistory(); }  // CTRL+P
    else if (e.ctrlKey)  { return } // No ctrl modifiers for the rest
    else if (e.altKey) { // All the rest use alt
        if (key == 66)      { this._createBlipSound(); }      // B
        if (key == 67)      { this._createChirpSound(); }     // C
        else if (key == 74) { this._createJumpSound(); }      // J
        else if (key == 76) { this._createLossSound(); }      // L
        else if (key == 80) { this._createPickupSound(); }    // P
        else if (key == 85) { this._createPowerUpSound(); }   // U
        else if (key == 72) { this._createHitSound(); }       // H
        else if (key == 90) { this._createZapSound(); }       // Z
        else if (key == 69) { this._createExplosionSound(); } // E
        else if (key == 78) { this._createNoiseSound(); }     // N
        else if (key == 82) { this.randomizeParameters(); }   // R
        else if (key == 77) { this.mutateParameters(); }      // M
        else { return } // Unrecognized
    }
    else { return; } // Unrecognized

    return (this.stopEvent(e));
};


SFDesigner.prototype._initKeys = function() {
    var self = this;

    if (this.enableKeys) {
        document.addEventListener('keydown', function(e) { return (self._onKeyHandler(e)); }, false);
    }
};


// **************************************************************
// * UI Section Creation
// **************************************************************

SFDesigner.prototype._initImages = function() {
    // Provide base64 encoded lock/unlocked images
    this.images = {};

    this.imgLockedSrc =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAQCAYAAAAiYZ4HAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A' +
        '/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGCAAXB3g7uo4AAAAZdEVYdENv' +
        'bW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAAXklEQVQoz2NkQAIXL178z4AF6OvrM8LYjIQU' +
        'o2tiJEYxsiYMDcjWYzOMEZ9ibJqYGEgEJGtg7O3t/U+xDf39/Qz9/f3EaUBWiE0T5Z4uLCzEyqae' +
        'DYT8wILPSVSJOAA4YyuuOhKc5AAAAABJRU5ErkJggg==';

    this.imgUnlockedSrc =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAQCAYAAAAiYZ4HAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A' +
        '/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGCAAcJDmoEjcAAAAZdEVYdENv' +
        'bW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAAf0lEQVQoz62QQQqAMAwE01LwAT4kz/Lch5Qc' +
        'evJZ+58KXlSCxjaCewplJ9ltICUACxli5vWcw8h8h4LHrKFUa53fzt+XAVh0pMTMzdqsoajeN0+s' +
        'BGAionb0aSMglFJcha1Il0SERMQHaKMFRfqoB5BzNuf/Low6pF4k97f2tAOqCTEns9V6JAAAAABJ' +
        'RU5ErkJggg==';
};


SFDesigner.prototype._createHeadingRow = function() {
    var cell;
    var row2; // The second row

    // Title row
    this.tableTR = this.table.insertRow(0);
    this.tableTR.className = 'titleRow';

    cell = this.tableTR.insertCell(-1);
    cell.innerHTML = 'SFMaker';
    cell.colSpan = 3;

    // Column titles row
    row2 = this.table.insertRow(1);
    row2.className = 'titleRow2';

    cell = row2.insertCell(-1);
    cell.innerHTML = 'Presets';

    cell = row2.insertCell(-1);
    cell.innerHTML = 'Settings';

    cell = row2.insertCell(-1);
    cell.innerHTML = 'Controls';
};


SFDesigner.prototype._createLeftPresetSection = function() {
    var self = this;

    this.presetSection = this.tableTR.insertCell(-1);
    this.presetSection.className = 'presetsSection';

    this._createButton(this.presetSection, 'Blip',
                       function() { self._createBlipSound(); },
                       { newLine: true, width: '100px', title: 'shortcut: ALT+B' });
    this._createButton(this.presetSection, 'Chirp',
                       function() { self._createChirpSound(); },
                       { newLine: true, width: '100px', title: 'shortcut: ALT+C' });
    this._createButton(this.presetSection, 'Jump',
                       function() { self._createJumpSound(); },
                       { newLine: true, width: '100px', title: 'shortcut: ALT+J' });
    this._createButton(this.presetSection, 'Loss',
                       function() { self._createLossSound(); },
                       { newLine: true, width: '100px', title: 'shortcut: ALT+L' });
    this._createButton(this.presetSection, 'Pickup',
                       function() { self._createPickupSound(); },
                       { newLine: true, width: '100px', title: 'shortcut: ALT+P' });
    this._createButton(this.presetSection, 'Power Up',
                       function() { self._createPowerUpSound(); },
                       { newLine: true, width: '100px', title: 'shortcut: ALT+U' });
    this._createButton(this.presetSection, 'Hit',
                       function() { self._createHitSound(); },
                       { newLine: true, width: '100px', title: 'shortcut: ALT+H' });
    this._createButton(this.presetSection, 'Zap',
                       function() { self._createZapSound(); },
                       { newLine: true, width: '100px', title: 'shortcut: ALT+Z' });
    this._createButton(this.presetSection, 'Explosion',
                       function() { self._createExplosionSound() },
                       { newLine: true, width: '100px', title: 'shortcut: ALT+E' });
    this._createButton(this.presetSection, 'Noise',
                       function() { self._createNoiseSound() },
                       { newLine: true, width: '100px', title: 'shortcut: ALT+N' });

    this.presetSection.appendChild(document.createElement('hr'));

    this._createButton(this.presetSection, 'Random',
                       function() { self.randomizeParameters(); },
                       { newLine: true, width: '100px', title: 'shortcut: ALT+R' });
    this._createButton(this.presetSection, 'Mutate',
                       function() { self.mutateParameters(); },
                       { newLine: true, width: '100px', title: 'shortcut: ALT+M' });
};


SFDesigner.prototype._createParameterSection = function() {
    var self = this;

    this.parameterSection = this.tableTR.insertCell(-1);
    this.parameterSection.className = 'parametersSection';

    this._createElement(this.parameterSection, { type: 'inputBox', name: 'song', label: 'Song', size: 56});
    this._createElement(this.parameterSection, { type: 'radio', name: 'waveType', label: 'Wave Type',
                                                 options: [ 'Sine', 'Square', 'Sawtooth', 'Noise', 'Foo' ],
                                                 onValueChange: function() { self._onModeChange(); }});
    this._createElement(this.parameterSection, { type: 'radio', name: 'sampleRate', label: 'Sample Rate',
                                                 options: [ '8000', '11025', '22050', '44100', '48000' ] });

    this._createElement(this.parameterSection, { type: 'range', name: 'frequency', label: 'Start Frequency',
                                                 range: [50.0, 10000.0]  });
    this._createElement(this.parameterSection, { type: 'range', name: 'vibratoFrequency', label: 'Vibrato Frequency',
                                                 range: [0, 250.0] });
    this._createElement(this.parameterSection, { type: 'range', name: 'vibratoDepth', label: 'Vibrato Depth',
                                                 range: [0, 1000.0] });
    this._createElement(this.parameterSection, { type: 'range', name: 'tremeloFrequency', label: 'Tremelo Frequency',
                                                 range: [0, 250.0] });
    this._createElement(this.parameterSection, { type: 'range', name: 'tremeloDepth', label: 'Tremelo Depth',
                                                 range: [0, 1.0] });
    this._createElement(this.parameterSection, { type: 'range', name: 'duty', label: 'Square/Saw Duty',
                                                 range: [-0.9, 0.9] });
    this._createElement(this.parameterSection, { type: 'range', name: 'dutySweepFrequency',
                                                 label: 'Duty Sweep Frequency', range: [0, 300] });
    this._createElement(this.parameterSection, { type: 'range', name: 'dutySweepDepth',
                                                 label: 'Duty Sweep Depth', range: [0.1, 0.9] });

    this.parameterSection.appendChild(document.createElement('hr'));

    this._createADSRSection(this.parameterSection, '');

    this.parameterSection.appendChild(document.createElement('hr'));
    this._createElement(this.parameterSection, { type: 'range', name: 'frequencyChange', label: 'Frequency Change',
                                                 range: [-5000.0, 5000.0], step: 1 });
    this._createElement(this.parameterSection, { type: 'range', name: 'frequencyChangeTime', label: 'Frequency Change Time',
                                                 range: [0.0, 100.0] });

    this.parameterSection.appendChild(document.createElement('hr'));
    this._createElement(this.parameterSection, { type: 'range', name: 'steps', label: 'Steps',
                                                 range: [1.0, 1000.0], step: 1 });
    this._createElement(this.parameterSection, { type: 'range', name: 'stepDelta', label: 'Step Delta',
                                                 range: [1.0, 500.0] });
    this._createElement(this.parameterSection, { type: 'radio', name: 'stepDirection', label: 'Step Direction',
                                                 options: ['Up', 'Down'] });

    this.parameterSection.appendChild(document.createElement('hr'));
    this._createElement(this.parameterSection, { type: 'range', name: 'lowPassAlpha', label: 'Low Pass Alpha',
                                                 range: [0.0, 0.999] });

    this.parameterSection.appendChild(document.createElement('hr'));
    this._createElement(this.parameterSection, { type: 'range', name: 'length', label: 'Length',
                                                 range: [0.01, 5.0] });
    this._createElement(this.parameterSection, { type: 'range', name: 'volume', label: 'Volume',
                                                 range: [0.01, 2.0] });


    this.parameterSection.appendChild(document.createElement('hr')); // Start mode parameters

    // Noise parameters:
    this._createElement(this.parameterSection, { type: 'radio', name: 'noiseWaveType', label: 'Noise Wave Type',
                                                 options: [ 'Sine', 'Square', 'Sawtooth', 'Foo'], mode: 'Noise' });
    this._createElement(this.parameterSection, { type: 'range', name: 'noiseChangeTime', label: 'Noise Change Time',
                                                range: [1, 2000], step: 1, mode: 'Noise' });
    this._createElement(this.parameterSection, { type: 'range', name: 'noiseChangeRange', label: 'Noise Change Range',
                                                range: [2, 5000], mode: 'Noise' });
    this._createElement(this.parameterSection, { type: 'radio', name: 'noiseChangeStyle', label: 'Noise Change Style',
                                                options: ['Fixed', 'Random'], mode: 'Noise' });

    // NOTE: Technically the seed can be 2^32 / 2, but larger numbers add more bytes to the soundText and 65k is a lot options.
    this._createElement(this.parameterSection, { type: 'range', name: 'randomSeed', label: 'Random Seed',
                                                range: [0, 65536], step: 1, mode: 'Noise' });
    this._createElement(this.parameterSection, { type: 'radio', name: 'noiseNoteReset', label: 'Reset Seed for Notes',
                                                 options: [ 'Off', 'On' ], mode: 'Noise' });
};


SFDesigner.prototype._createADSRSection = function(s, name) {
    this._createElement(s, { type: 'range', name: name + 'peak', label: 'Peak',
                             range: [1.0, 2.0] });
    this._createElement(s, { type: 'range', name: name + 'attack', label: 'A',
                             range: [0.0, 3.0], step: 0.1, smallMode: true });
    this._createElement(s, { type: 'range', name: name +'decay', label: 'D',
                             range: [0.0, 3.0], step: 0.1, smallMode: true });

    this.parameterSection.appendChild(document.createElement('br'));
    this._createElement(s, { type: 'range', name: name + 'sustain', label: 'S',
                             range: [0.0, 3.0], step: 0.1, smallMode: true });
    this._createElement(s, { type: 'range', name: name + 'release', label: 'R',
                             range: [0.0, 3.0], step: 0.1, smallMode: true });
};


SFDesigner.prototype._createAutoPlay = function(parentNode) {
    // Create the autoplay checkbox
    var input = document.createElement('input');
    var self = this;

    input.type = 'checkbox';
    input.checked = true;

    input.onchange = function() {
        self.autoPlay = input.checked;
    }

    parentNode.appendChild(document.createTextNode('Auto Play: '));
    parentNode.appendChild(input);
};


SFDesigner.prototype._createSaveSection = function() {
    var self = this;

    this.saveSection = this.tableTR.insertCell(-1);
    this.saveSection.className = 'saveSection';

    this._createButton(this.saveSection, 'Play', function() { self.play(); },
                       { title: 'shortcut: SPACE BAR' });
    this._createButton(this.saveSection, 'Stop', function() { self.audio.pause(); });
    this._createClipSpan(this.saveSection);
    this.saveSection.appendChild(document.createElement('br'));
    this._createAutoPlay(this.saveSection);

    this.saveSection.appendChild(document.createElement('hr'));

    this.saveSection.appendChild(document.createTextNode('Sound Text'));
    this.byteCount = document.createElement('span');
    this.saveSection.appendChild(this.byteCount);
    this.saveSection.appendChild(document.createElement('br'));

    this.soundText = this._createTextArea(this.saveSection, 'soundText');

    this._createButton(this.saveSection, 'Load Text', function() { self.loadSoundText() });
    this.saveSection.appendChild(document.createElement('br'));

    this.previousSoundButton = this._createButton(this.saveSection, 'Previous Sound',
                                                  function() { self._popHistory() },
                                                  { title: 'shortcut: CTRL+P', disabled: true });

    this.saveSection.appendChild(document.createElement('hr'));

    this._createButton(this.saveSection, 'Reset All Parameters', function() { self.loadDefaults() },
                       { title: 'shortcut: CTRL+Z' });
    this.saveSection.appendChild(document.createElement('hr'));

    this.fileName = document.createElement("input");
    this.fileName.type = 'text';
    this.fileName.value = "sound.wav";
    this.saveSection.appendChild(document.createTextNode("File Name"));
    this.saveSection.appendChild(document.createElement('br'));
    this.saveSection.appendChild(this.fileName);
    this._createButton(this.saveSection, 'Save Wave', function() { self.saveWave() },
                       { title: 'shortcut: CTRL+S' });

    this.saveSection.appendChild(document.createElement('hr'));
    this.saveSection.appendChild(this.soundLink);
};


// **************************************************************
// * UI Mode Support
//   This allows sections to be disabled
// **************************************************************

SFDesigner.prototype._enableModeElement = function(e) {
    if (e.tagName == 'SPAN') {
        e.style.color = 'black';
    }
    else {
        e.disabled = false;
    }
};


SFDesigner.prototype._disableModeElement = function(e) {
    if (e.tagName == 'SPAN') {
        e.style.color = 'gray';
    }
    else {
        e.disabled = true;
    }
};


SFDesigner.prototype._initModeUI = function() {
    // Set up the disabling of elements not applicable to the current mode
    var mode, list;
    var x;

    for (mode in this.modeElements) {
        if (mode == this.currentMode) {
            continue;
        }

        list = this.modeElements[mode];

        for (x = 0; x < list.length; x++) {
            this._disableModeElement(list[x]);
        }
    }
};


// **************************************************************
// * Control Handlers
// **************************************************************

SFDesigner.prototype._onModeChange = function() {
    var x;
    var list;

    // Disable the elements from the previous mode
    list = this.modeElements[ this.currentMode ];

    if (list) {
        for (x = 0; x < list.length; x++) {
            this._disableModeElement(list[x]);
        }
    }

    // Enable the elements in the current mode
    this.currentMode = this._getRadioValue(this.ui['waveType']);
    list = this.modeElements[ this.currentMode ];

    if (list) {
        for (x = 0; x < list.length; x++) {
            this._enableModeElement(list[x]);
        }
    }
};


SFDesigner.prototype.loadDefaults = function() {
    var x;
    var e;

    for (x in this.ui) {
        if (this.ui[x].constructor == Array) {
            var y;
            for (y = 0; y < this.ui[x].length; y++) {
                e = this.ui[x][y];

                if (e.value == this.sfmaker.params[x].defaultValue) {
                    e.checked = true;
                }
                else {
                    e.checked = false;
                }

                if (e.getAttribute('locked') == 'true') {
                    this.toggleLock(e);
                }
            }
        }
        else {
            e = this.ui[x];

            e.value = this.sfmaker.params[x].defaultValue;

            if (e.getAttribute('locked') == 'true') {
                this.toggleLock(e);
            }

            if (e.onchange) {
                e.onchange();
            }
        }
    }
};


SFDesigner.prototype.updateSoundLink = function() {
    var p = this.readParams();
    var soundText = this.sfmaker.generateSoundText(p);
    var link = document.location.href.replace(/[\?\#].*$/, '');

    if (soundText) {
        link += "?sound=" + encodeURIComponent(soundText);
    }

    this.soundLink.href = link;
};


SFDesigner.prototype.saveWave = function() {
    // Base64 encode the wave file and then trigger a download of the file
    var href = this.sfmaker.waveFile.generateBase64();
    var event, a;

    if (document.createEvent) {
        event = document.createEvent("MouseEvents");
        a = document.createElement('a');

        a['download'] = this.fileName.value || 'wave.wav'; // Use [''] notation to keep the minifier from changing it
        a.href = href;

        event.initMouseEvent("click", true, true, window,
                             0, 0, 0, 0, 0, false, false,
                             false, false, 0, null);

        if (! a.dispatchEvent(event)) {
            /* If the event processing failed, fallback */
            location.href = href;
        }
    }
    else {
        location.href = href;
    }
};


SFDesigner.prototype._deferPlayHandler = function() {
    this.play();
};


SFDesigner.prototype.deferPlay = function() {
    // Schedule a play shortly in the future
    // This is used so that if multiple settings are changed quickly
    // while autoPlay is enabled, we only get one play.
    var self = this;

    if (! this.autoPlay) {
        return;
    }

    if (this.deferTimeoutId) {
        clearTimeout(this.deferTimeoutId);
    }

    this.deferPlayTime = Date.now() + 100;
    this.deferTimeoutId = setTimeout(function() { self.play(); }, 100);
};


SFDesigner.prototype.play = function(noHistory) {
    var p = this.readParams();

    if (this.deferTimeoutId) {
        this.deferPlayTime = null;
        clearTimeout(this.deferTimeoutId);
    }

    this._updateSoundText(p, noHistory);

    this.sfmaker.generateSound(p);

    if (this.sfmaker.clip) { this.clipSpan.style.display = '';  }
    else { this.clipSpan.style.display = 'none'; }

    this.audio.pause();

    this.audio.src = this.sfmaker.waveFile.generateBase64();
    this.audio.load();

    this.audio.play();
};


SFDesigner.prototype._randomizeRadio = function(e, opts) {
    if (e[e.length - 1].getAttribute('locked') == 'true') { return; }

    if (opts) {
        e[opts[Math.floor(Math.random() * opts.length)]].checked = true;
    }
    else {
        e[Math.floor(Math.random() * e.length)].checked = true;
    }

    if (e[0] && e[0].onchange) {
        e[0].onchange();
    }
};


SFDesigner.prototype._randomize = function(e, pmin, pmax) {
    var min = typeof(pmin) == 'number' ? pmin : e.min;
    var max = typeof(pmax) == 'number' ? pmax : e.max;

    if (e.getAttribute('locked') == 'true') { return; }

    e.value = (Math.random() * (max - min)) + min;
    e.onchange();
};


SFDesigner.prototype._mutate = function(e) {
    var range = (e.max - e.min) * .02;
    var val = (Math.random() * range) - range / 2;

    if (e.getAttribute('locked') == 'true') { return; }

    e.value = parseFloat(e.value) + val;;
    e.onchange();
};


SFDesigner.prototype.mutateParameters = function() {
    this._mutate(this.ui['frequency']);
    this._mutate(this.ui['vibratoFrequency']);
    this._mutate(this.ui['vibratoDepth']);
    this._mutate(this.ui['tremeloFrequency']);
    this._mutate(this.ui['tremeloDepth']);
    this._mutate(this.ui['peak']);
    this._mutate(this.ui['attack']);
    this._mutate(this.ui['decay']);
    this._mutate(this.ui['sustain']);
    this._mutate(this.ui['release']);
    this._mutate(this.ui['steps']);
    this._mutate(this.ui['stepDelta']);
    this._mutate(this.ui['lowPassAlpha']);
    this._mutate(this.ui['duty']);
    this._mutate(this.ui['dutySweepFrequency']);
    this._mutate(this.ui['dutySweepDepth']);
    this._mutate(this.ui['frequencyChange']);
    this._mutate(this.ui['frequencyChangeTime']);

//    this._mutate(this.ui['noiseWaveType']);
    this._mutate(this.ui['noiseChangeTime']);
    this._mutate(this.ui['noiseChangeRange']);
//    this._mutate(this.ui['noiseChangeStyle']);
    this._mutate(this.ui['randomSeed']);

    this.play();
};


SFDesigner.prototype.randomizeParameters = function() {
    this._randomizeRadio(this.ui['waveType']);
    this._randomizeRadio(this.ui['sampleRate'], [0, 1, 2, 3]);
    this._randomize(this.ui['frequency'], 100, 4000);
    this._randomize(this.ui['vibratoFrequency'], 0, 250);
    this._randomize(this.ui['vibratoDepth'], 0, 1000);
    this._randomize(this.ui['tremeloFrequency']);
    this._randomize(this.ui['tremeloDepth'], 0, 0.42);
    this._randomize(this.ui['peak'], 1, 1.8);
    this._randomize(this.ui['attack']);
    this._randomize(this.ui['decay']);
    this._randomize(this.ui['sustain']);
    this._randomize(this.ui['release']);
    this._randomize(this.ui['steps'], 1, 100);
    this._randomize(this.ui['stepDelta']);
    this._randomizeRadio(this.ui['stepDirection']);
    this._randomize(this.ui['lowPassAlpha'], 0, 0.9);
    this._randomize(this.ui['duty'], -0.25, 0.25);
    this._randomize(this.ui['dutySweepFrequency']);
    this._randomize(this.ui['dutySweepDepth'], 0.1, 0.3);
    this._randomize(this.ui['frequencyChange']);
    this._randomize(this.ui['frequencyChangeTime']);

    this._randomizeRadio(this.ui['noiseWaveType']);
    this._randomize(this.ui['noiseChangeTime']);
    this._mutate(this.ui['noiseChangeRange']);
    this._randomizeRadio(this.ui['noiseChangeStyle']);
    this._randomize(this.ui['randomSeed']);
    this._randomizeRadio(this.ui['noiseNoteReset']);

    if (this.ui['song'].value) {
        this._randomize(this.ui['length'], 0.3, 0.4);
        this._randomize(this.ui['vibratoFrequency'], 0, 250);
        this._randomize(this.ui['vibratoDepth'], 0, 20);
        this._randomize(this.ui['tremeloFrequency'], 0, 10);
        this._randomize(this.ui['tremeloDepth'], 0, 0.6);
    }
    else { this._randomize(this.ui['length'], 0.5, null); }

    this.play();
};


SFDesigner.prototype._createBlipSound = function() {
    this._randomizeRadio(this.ui['waveType'], [0, 1, 2]);
    this._randomizeRadio(this.ui['sampleRate'], [0, 1, 2, 3]);
    this._randomize(this.ui['frequency'], 600, 4000);
    this._randomize(this.ui['vibratoFrequency'], null, 250);
    this._randomize(this.ui['vibratoDepth'], 0, 3);
    this._randomize(this.ui['tremeloFrequency'], null, 3);
    this._randomize(this.ui['tremeloDepth'], null, 0.25);
    this._randomize(this.ui['peak'], 1, 1.8);
    this._randomize(this.ui['attack']);
    this._randomize(this.ui['decay']);
    this._randomize(this.ui['sustain'], 2, 4);
    this._randomize(this.ui['release']);
    this._randomize(this.ui['steps'], 1, 1);
    this._randomize(this.ui['lowPassAlpha'], 0, 0.8);
    this._randomize(this.ui['duty'], -0.25, 0.25);
    this._randomize(this.ui['dutySweepFrequency']);
    this._randomize(this.ui['dutySweepDepth'], 0.1, 0.3);
    //  this._randomize(this.ui['stepDelta']);
    //  this._randomizeRadio(this.ui['stepDirection']);
    this._randomize(this.ui['frequencyChange']);
    this._randomize(this.ui['frequencyChangeTime']);

    if (this.ui['song'].value) { this._randomize(this.ui['length'], 0.3, 0.4); }
    else { this._randomize(this.ui['length'], 0.2, 0.4); }

    this.play();
};


SFDesigner.prototype._createChirpSound = function() {
    // Create a noise sound with a low length to make
    // interesting chirp noises
    this._randomizeRadio(this.ui['waveType'], [3]);
    this._randomizeRadio(this.ui['sampleRate'], [0, 1, 2, 3]);
    this._randomize(this.ui['frequency'], 50, 3000);
    this._randomize(this.ui['vibratoFrequency'], 0, 250);
    this._randomize(this.ui['vibratoDepth'], 0, 1000);
    this._randomize(this.ui['tremeloFrequency']);
    this._randomize(this.ui['tremeloDepth'], 0, 0.42);
    this._randomize(this.ui['peak'], 1, 1.8);
    this._randomize(this.ui['attack']);
    this._randomize(this.ui['decay']);
    this._randomize(this.ui['sustain']);
    this._randomize(this.ui['release']);
    this._randomize(this.ui['steps'], 1, 50);
    this._randomize(this.ui['stepDelta'], 1, 5);
    this._randomizeRadio(this.ui['stepDirection']);
    this._randomize(this.ui['lowPassAlpha'], 0, 0.8);
    this._randomize(this.ui['duty'], -0.25, 0.25);
    this._randomize(this.ui['dutySweepFrequency']);
    this._randomize(this.ui['dutySweepDepth'], 0.1, 0.3);
    this._randomize(this.ui['frequencyChange']);
    this._randomize(this.ui['frequencyChangeTime']);

    this._randomizeRadio(this.ui['noiseWaveType']);
    this._randomize(this.ui['noiseChangeTime']);
    this._mutate(this.ui['noiseChangeRange']);
    this._randomizeRadio(this.ui['noiseChangeStyle']);
    this._randomize(this.ui['randomSeed']);
    this._randomizeRadio(this.ui['noiseNoteReset']);

    if (this.ui['song'].value) {
        this._randomize(this.ui['length'], 0.1, 0.3);
        this._randomize(this.ui['vibratoFrequency'], 0, 250);
        this._randomize(this.ui['vibratoDepth'], 0, 1000);
        this._randomize(this.ui['tremeloFrequency'], 0, 10);
        this._randomize(this.ui['tremeloDepth'], 0, 0.6);
    }
    else { this._randomize(this.ui['length'], 0.1, 0.3); }

    this.play();
};


SFDesigner.prototype._createJumpSound = function() {
    this._randomizeRadio(this.ui['waveType'], [0, 1]);
    this._randomizeRadio(this.ui['sampleRate'], [0, 1, 2, 3]);
    this._randomize(this.ui['frequency'], 100, 2000);
    this._randomize(this.ui['vibratoFrequency'], 0, 250);
    this._randomize(this.ui['vibratoDepth'], 0, 20);
    this._randomize(this.ui['tremeloFrequency'], null, 2);
    this._randomize(this.ui['tremeloDepth'], null, 0.15);
    this._randomize(this.ui['peak'], 1, 1.8);
    this._randomize(this.ui['attack'], 0, 0);
    this._randomize(this.ui['decay'], 0, 0);
    this._randomize(this.ui['sustain'], 3, 0.2);
    this._randomize(this.ui['release'], 0.3, 0.8);
    this._randomize(this.ui['steps'], 30, 150);
    this._randomize(this.ui['stepDelta'], 1, 40);
    this._randomizeRadio(this.ui['stepDirection'], [0]);
    this._randomize(this.ui['lowPassAlpha'], 0, 0.8);
    this._randomize(this.ui['duty'], -0.2, 0.2);
    this._randomize(this.ui['dutySweepFrequency']);
    this._randomize(this.ui['dutySweepDepth'], 0.1, 0.35);
    this._randomize(this.ui['frequencyChange'], 0, 0);
    //  this._randomize(this.ui['frequencyChangeTime']);

    if (this.ui['song'].value) { this._randomize(this.ui['length'], 0.3, 0.4); }
    else { this._randomize(this.ui['length'], 0.3, 0.5); }

    this.play();
};


SFDesigner.prototype._createLossSound = function() {
    this._randomizeRadio(this.ui['waveType'], [0, 1]);
    this._randomizeRadio(this.ui['sampleRate'], [0, 1, 2, 3]);
    this._randomize(this.ui['frequency'], 100, 2000);
    this._randomize(this.ui['vibratoFrequency'], 0, 250);
    this._randomize(this.ui['vibratoDepth'], 0, 20);
    this._randomize(this.ui['tremeloFrequency'], null, 2);
    this._randomize(this.ui['tremeloDepth'], null, 0.15);
    this._randomize(this.ui['peak'], 1, 1.8);
    this._randomize(this.ui['attack'], 0, 0);
    this._randomize(this.ui['decay'], 0, 0);
    this._randomize(this.ui['sustain'], 3, 0.2);
    this._randomize(this.ui['release'], 0.3, 0.8);
    this._randomize(this.ui['steps'], 30, 150);
    this._randomize(this.ui['stepDelta'], 1, this.ui['frequency'].value / this.ui['steps'].value);
    this._randomizeRadio(this.ui['stepDirection'], [1]);
    this._randomize(this.ui['lowPassAlpha'], 0, 0.8);
    this._randomize(this.ui['duty'], -0.2, 0.2);
    this._randomize(this.ui['dutySweepFrequency']);
    this._randomize(this.ui['dutySweepDepth'], 0.1, 0.35);
    this._randomize(this.ui['frequencyChange'], 0, 0);
    //  this._randomize(this.ui['frequencyChangeTime']);

    if (this.ui['song'].value) { this._randomize(this.ui['length'], 0.3, 0.4); }
    else { this._randomize(this.ui['length'], 0.3, 0.5); }

    this.play();
};


SFDesigner.prototype._createPowerUpSound = function() {
    this._randomizeRadio(this.ui['waveType'], [0, 1, 2, 4, 5]);
    this._randomizeRadio(this.ui['sampleRate'], [0, 1, 2, 3]);
    this._randomize(this.ui['frequency'], 100, 4000);
    this._randomize(this.ui['vibratoFrequency'], 0, 250);
    this._randomize(this.ui['vibratoDepth'], 0, 20);
    this._randomize(this.ui['tremeloFrequency'], null, 50);
    this._randomize(this.ui['tremeloDepth'], null, 0.3);
    this._randomize(this.ui['peak'], 1, 1.8);
    this._randomize(this.ui['attack']);
    this._randomize(this.ui['decay']);
    this._randomize(this.ui['sustain']);
    this._randomize(this.ui['release']);
    this._randomize(this.ui['steps'], 5, 100);
    this._randomize(this.ui['stepDelta'], 0, 250);
    this._randomizeRadio(this.ui['stepDirection'], [0]);
    this._randomize(this.ui['lowPassAlpha'], 0, 0.8);
    this._randomize(this.ui['duty'], -0.25, 0.25);
    this._randomize(this.ui['dutySweepFrequency']);
    this._randomize(this.ui['dutySweepDepth'], 0.1, 0.3);
    this._randomize(this.ui['frequencyChange']);
    this._randomize(this.ui['frequencyChangeTime']);

    if (this.ui['song'].value) { this._randomize(this.ui['length'], 0.1, 0.4); }
    else { this._randomize(this.ui['length'], 0.2, 0.9); }

    this.play();
};


SFDesigner.prototype._createPickupSound = function() {
    this._randomizeRadio(this.ui['waveType'], [0, 1, 2, 4, 5]);
    this._randomizeRadio(this.ui['sampleRate'], [0, 1, 2, 3]);
    this._randomize(this.ui['frequency'], 900, 4000);
    this._randomize(this.ui['vibratoFrequency'], 0, 250);
    this._randomize(this.ui['vibratoDepth'], 0, 50);
    this._randomize(this.ui['tremeloFrequency']);
    this._randomize(this.ui['tremeloDepth'], null, 0.5);
    this._randomize(this.ui['peak'], 1, 1.8);
    this._randomize(this.ui['attack'], 0.0, 0.2);
    this._randomize(this.ui['decay'], 0.0, 0.2);
    this._randomize(this.ui['sustain'], 0.2, 0.4);
    this._randomize(this.ui['release'], 0.3, 0.5);
    this._randomize(this.ui['steps'], 1, 1);
    //  this._randomize(this.ui['stepDelta']);
    //this._randomizeRadio(this.ui['stepDirection']);
    this._randomize(this.ui['lowPassAlpha'], 0, 0.8);
    this._randomize(this.ui['duty'], -0.15, 0.15);
    this._randomize(this.ui['dutySweepFrequency'], null, 150.0);
    this._randomize(this.ui['dutySweepDepth'], 0.1, 0.3);
    this._randomize(this.ui['frequencyChange'], -300, -500);
    this._randomize(this.ui['frequencyChangeTime'], 10, 60);

    if (this.ui['song'].value) { this._randomize(this.ui['length'], 0.3, 0.4); }
    else { this._randomize(this.ui['length'], 0.3, 0.7); }

    this.play();
};


SFDesigner.prototype._createHitSound = function() {
    this._randomizeRadio(this.ui['waveType'], [3]);
    this._randomizeRadio(this.ui['sampleRate'], [0, 1, 2, 3]);
    this._randomize(this.ui['frequency'], 50, 150);
    this._randomize(this.ui['vibratoFrequency'], 0, 250);
    this._randomize(this.ui['vibratoDepth'], 0, 30);
    this._randomize(this.ui['tremeloFrequency']);
    this._randomize(this.ui['tremeloDepth'], null, 0.6);
    this._randomize(this.ui['peak'], 1, 2.0);
    this._randomize(this.ui['attack'], 0, 0);
    this._randomize(this.ui['decay'], 0, 0.3);
    this._randomize(this.ui['sustain'], 0, 0.2);
    this._randomize(this.ui['release'], 0.1, 0.6);
    this._randomize(this.ui['steps'], 1, 20);
    this._randomize(this.ui['stepDelta'], 1, 10);
    this._randomizeRadio(this.ui['stepDirection']);
    this._randomize(this.ui['lowPassAlpha'], 0, 0.9);
    this._randomize(this.ui['duty'], -0.25, 0.25);
    this._randomize(this.ui['dutySweepFrequency']);
    this._randomize(this.ui['dutySweepDepth'], 0.1, 0.3);
    this._randomize(this.ui['frequencyChange']);
    this._randomize(this.ui['frequencyChangeTime']);

    this._randomizeRadio(this.ui['noiseWaveType']);
    this._randomize(this.ui['noiseChangeTime'], 1, 35);
    this._mutate(this.ui['noiseChangeRange']);
    this._randomizeRadio(this.ui['noiseChangeStyle']);
    this._randomize(this.ui['randomSeed']);
    this._randomizeRadio(this.ui['noiseNoteReset']);

    if (this.ui['song'].value) { this._randomize(this.ui['length'], 0.3, 0.4); }
    else { this._randomize(this.ui['length'], 0.38, 0.5); }

    this.play();
};


SFDesigner.prototype._createZapSound = function() {
    this._randomizeRadio(this.ui['waveType'], [1]);
    this._randomizeRadio(this.ui['sampleRate'], [0, 1, 2, 3]);
    this._randomize(this.ui['frequency'], 100, 4000);
    this._randomize(this.ui['vibratoFrequency'], 0, 0);
    this._randomize(this.ui['vibratoDepth'], 0, 30);
    this._randomize(this.ui['tremeloFrequency']);
    this._randomize(this.ui['tremeloDepth'], null, 0.6);
    this._randomize(this.ui['peak'], 1, 1.8);
    this._randomize(this.ui['attack'], 0, 0);
    this._randomize(this.ui['decay'], 0, 0);
    this._randomize(this.ui['sustain'], 0, 0);
    this._randomize(this.ui['release'], 0.1, null);
    this._randomize(this.ui['steps'], 1, 200);
    this._randomize(this.ui['stepDelta']);
    this._randomizeRadio(this.ui['stepDirection']);
    this._randomize(this.ui['lowPassAlpha'], 0, 0.8);
    this._randomize(this.ui['duty'], -0.25, 0.25);
    this._randomize(this.ui['dutySweepFrequency']);
    this._randomize(this.ui['dutySweepDepth'], 0.1, 0.3);
    this._randomize(this.ui['frequencyChange']);
    this._randomize(this.ui['frequencyChangeTime']);

    if (this.ui['song'].value) { this._randomize(this.ui['length'], 0.3, 0.4); }
    else { this._randomize(this.ui['length'], 0.38, 0.5); }

    this.play();
};


SFDesigner.prototype._createExplosionSound = function() {
    this._randomizeRadio(this.ui['waveType'], [3]);
    this._randomizeRadio(this.ui['sampleRate'], [0, 1, 2, 3]);
    this._randomize(this.ui['frequency'], 50, 150);
    this._randomize(this.ui['vibratoFrequency'], 0, 250);
    this._randomize(this.ui['vibratoDepth'], 0, 30);
    this._randomize(this.ui['tremeloFrequency']);
    this._randomize(this.ui['tremeloDepth'], null, 0.6);
    this._randomize(this.ui['peak'], 1, 2.0);
    this._randomize(this.ui['attack'], 0, 0.2);
    this._randomize(this.ui['decay'], 0, 0.3);
    this._randomize(this.ui['sustain'], 0, 0.2);
    this._randomize(this.ui['release'], 0.1, 0.6);
    this._randomize(this.ui['steps'], 1, 20);
    this._randomize(this.ui['stepDelta'], 1, 10);
    this._randomizeRadio(this.ui['stepDirection']);
    this._randomize(this.ui['lowPassAlpha'], 0, 0.9);
    this._randomize(this.ui['duty'], -0.25, 0.25);
    this._randomize(this.ui['dutySweepFrequency']);
    this._randomize(this.ui['dutySweepDepth'], 0.1, 0.3);
    this._randomize(this.ui['frequencyChange']);
    this._randomize(this.ui['frequencyChangeTime']);

    this._randomizeRadio(this.ui['noiseWaveType']);
    this._randomize(this.ui['noiseChangeTime'], 1, 66);
    this._mutate(this.ui['noiseChangeRange']);
    this._randomizeRadio(this.ui['noiseChangeStyle']);
    this._randomize(this.ui['randomSeed']);
    this._randomizeRadio(this.ui['noiseNoteReset']);

    if (this.ui['song'].value) { this._randomize(this.ui['length'], 0.3, 0.4); }
    else { this._randomize(this.ui['length'], 0.5, 1.4); }

    this.play();
};


SFDesigner.prototype._createNoiseSound = function() {
    // Create a randomized sound using the full noise generator options
    this._randomizeRadio(this.ui['waveType'], [3]);
    this._randomizeRadio(this.ui['sampleRate'], [0, 1, 2, 3]);
    this._randomize(this.ui['frequency'], 50, 3000);
    this._randomize(this.ui['vibratoFrequency'], 0, 250);
    this._randomize(this.ui['vibratoDepth'], 0, 1000);
    this._randomize(this.ui['tremeloFrequency']);
    this._randomize(this.ui['tremeloDepth'], 0, 0.42);
    this._randomize(this.ui['peak'], 1, 1.8);
    this._randomize(this.ui['attack']);
    this._randomize(this.ui['decay']);
    this._randomize(this.ui['sustain']);
    this._randomize(this.ui['release']);
    this._randomize(this.ui['steps'], 1, 50);
    this._randomize(this.ui['stepDelta'], 1, 5);
    this._randomizeRadio(this.ui['stepDirection']);
    this._randomize(this.ui['lowPassAlpha'], 0, 0.8);
    this._randomize(this.ui['duty'], -0.25, 0.25);
    this._randomize(this.ui['dutySweepFrequency']);
    this._randomize(this.ui['dutySweepDepth'], 0.1, 0.3);
    this._randomize(this.ui['frequencyChange']);
    this._randomize(this.ui['frequencyChangeTime']);

    this._randomizeRadio(this.ui['noiseWaveType']);
    this._randomize(this.ui['noiseChangeTime']);
    this._mutate(this.ui['noiseChangeRange']);
    this._randomizeRadio(this.ui['noiseChangeStyle']);
    this._randomize(this.ui['randomSeed']);
    this._randomizeRadio(this.ui['noiseNoteReset']);

    if (this.ui['song'].value) {
        this._randomize(this.ui['length'], 0.3, 0.4);
        this._randomize(this.ui['vibratoFrequency'], 0, 250);
        this._randomize(this.ui['vibratoDepth'], 0, 1000);
        this._randomize(this.ui['tremeloFrequency'], 0, 10);
        this._randomize(this.ui['tremeloDepth'], 0, 0.6);
    }
    else { this._randomize(this.ui['length'], 0.5, null); }

    this.play();
};


// **************************************************************
// * UI Element Creation
// **************************************************************

SFDesigner.prototype._createTextArea = function(section, id) {
    var ta = document.createElement('textarea');
    var self = this;

    ta.rows = 15;
    ta.id = id;
    ta.style.width = '99%';

    ta.onfocus = function () { self.inputFocused = true; }
    ta.onblur = function() { self.inputFocused = false; }

    section.appendChild(ta);

    return (ta);
};


SFDesigner.prototype._createButton = function(section, value, onclick, attrib) {
    var b = document.createElement('input');

    b.type = 'button';
    b.value = value;
    b.onclick = onclick;

    if (attrib) {
        if (attrib.newLine)  { section.appendChild(document.createElement('br')); }
        if (attrib.width)    { b.style.width = attrib.width; }
        if (attrib.title)    { b.title = attrib.title; }
        if (attrib.disabled) { b.disabled = true; }
    }

    section.appendChild(b);

    return (b);
};


SFDesigner.prototype._createClipSpan = function(section) {
    this.clipSpan = document.createElement('span');

    this.clipSpan.className= 'clipSpan';
    this.clipSpan.innerHTML = 'CLIP';
    this.clipSpan.style.display = 'none';

    section.appendChild(this.clipSpan);
};


SFDesigner.prototype._addModeElement = function(mode, e) {
    if (mode) {
        if (! this.modeElements[mode]) {
            this.modeElements[mode] = [ e ];
        }
        else {
            this.modeElements[mode].push(e);
        }
    }
};


SFDesigner.prototype._createInputBox = function(attrib, input) {
    var e = document.createElement('input');
    var self = this;

    e.type = 'text';
    e.size = attrib.size || 16;
    e.value = this.sfmaker.params[attrib.name].defaultValue || '';
    e.isText = true; // Note so that the values are treated as strings
    this.ui[attrib.name] = e;
    input.appendChild(e);

    e.onfocus = function () { self.inputFocused = true; }
    e.onblur = function() { self.inputFocused = false; }

    this._addModeElement(attrib.mode, e);

    return (e);
};


SFDesigner.prototype.toggleLock = function(e) {
    var button = this.lockButtons[e.name];

    if (e.getAttribute('locked') == 'true') {
        e.setAttribute('locked', 'false');
        button.src = this.imgUnlockedSrc;
    }
    else {
        e.setAttribute('locked', 'true');
        button.src = this.imgLockedSrc;
    }
};


SFDesigner.prototype._addLock = function(e) {
    // Return a lock button that alters the "locked" attribute of 'e'
    var button = document.createElement('img');
    var self = this;

    button.style.cursor = 'pointer';
    button.src = this.imgUnlockedSrc;
    e.setAttribute('locked', 'false'); // Default to false

    this.lockButtons[e.name] = button;

    button.onclick = function() { self.toggleLock(e); };

    return (button);
};


SFDesigner.prototype._createRadio = function(attrib, input) {
    // A "null" in the options list indicates the start of a new line
    var e, label;
    var self = this;
    var pos = 0; // A counter of true elements (not including new lines)
    var x;

    this.ui[attrib.name] = [];

    for (x = 0; x < attrib.options.length; x++) {
        if (attrib.options[x] === null) { // Start a new line
            input.appendChild( document.createElement('br') );
            // Create a "label" to right shift what follows
            label = document.createElement('span');
            label.className = 'radioLabel';
            input.appendChild(label);
            continue;
        }

        e = document.createElement('input');
        e.type = 'radio';
        e.name = 'radio_' + attrib.name;
        e.value = attrib.options[x];
        e.onchange = function() {
            self.deferPlay();

            if (attrib.onValueChange) {
                attrib.onValueChange();
            }
        };

        this.ui[attrib.name][pos] = e;
        pos++;

        if (this.sfmaker.params[attrib.name].defaultValue == attrib.options[x]) {
            e.checked = true;
        }

        input.appendChild(e);
        input.appendChild(document.createTextNode(attrib.options[x] + ' '));

        this._addModeElement(attrib.mode, e);
    }

    this.ui[attrib.name].defaultValue = attrib.value;
    return (e);
};


SFDesigner.prototype._createRange = function(attrib, input) {
    var e = document.createElement('input');
    var text = document.createElement('input');
    var self = this;

    e.type = 'range';
    e.min = attrib.range[0];
    e.max = attrib.range[1];
    e.step = attrib.step || 0.001;
    e.value = this.sfmaker.params[attrib.name].defaultValue;
    e.name = attrib.name;
    e.defaultValue = attrib.value;
    e.onchange = function() {
        text.value = parseInt(e.value * 1000) / 1000;
        self.deferPlay();
    }

    text.size = 3.5;

    if (attrib.smallMode) {
        e.className = 'rangeSmall';
        text.className = 'rangeTextSmall';
    }
    else {
        e.className = 'range';
        text.className = 'rangeText';
    }

    text.value = e.value;
    text.onchange = function() {
        e.value = parseFloat(text.value);
        text.value = e.value;
        self.deferPlay();
    };

    this.ui[attrib.name] = e;
    input.appendChild(text);
    input.appendChild(e);

    this._addModeElement(attrib.mode, text);
    this._addModeElement(attrib.mode, e);

    return (e);
};


SFDesigner.prototype._createElement = function(section, attrib) {
    var label = document.createElement('span');
    var input = document.createElement('span');
    var br = document.createElement('br');
    var e;

    if (attrib.smallMode) {
        label.className = 'labelSmall';
    }
    else {
        label.className = 'label';
    }

    label.appendChild(document.createTextNode(attrib.label));

    switch(attrib.type) {
    case 'inputBox':
        e = this._createInputBox(attrib, input);
        break;
    case 'radio':
        e = this._createRadio(attrib, input);
        break;
    case 'range':
        e = this._createRange(attrib, input);
        break;
    }

    section.appendChild(label);

    if (attrib.type != 'inputBox') {
        section.appendChild(this._addLock(e));
    }

    if (attrib.mode) {
        this._addModeElement(attrib.mode, label);
    }

    section.appendChild(input);

    if (! attrib.smallMode) {
        section.appendChild(br);
    }
};


// **************************************************************
// * Parameters
// **************************************************************

SFDesigner.prototype._getRadioValue = function(radio) {
    var x;

    for (x = 0; x < radio.length; x++) {
        if (radio[x].checked) {
            return (radio[x].value);
        }
    }
};


SFDesigner.prototype.cleanParams = function(p) {
    // Remove unneeded parameters in cases where the value
    // of one paramter leads to another having no effect
    if (p['mode'] == 's') {
        delete (p['frequency']);
    }
    else {
        delete (p['noiseNoteReset']);
    }

    if (p['waveType'] != 'Noise') {
        delete (p['noiseWaveType']);
        delete (p['noiseChangeStyle']);
    }

    if (! p['vibratoFrequency'])   { delete (p['vibratoDepth']); }
    if (! p['vibratoDepth'])       { delete (p['vibratoFrequency']); }
    if (! p['tremeloFrequency'])   { delete (p['tremeloDepth']); }
    if (! p['tremeloDepth'])       { delete (p['tremeloFrequency']); }
    if (! p['dutySweepFrequency']) { delete (p['dutySweepDepth']); }
    if (! p['frequencyChange'])    { delete (p['frequencyChangeTime']); }

    if (p['steps'] == 1) {
        delete (p['stepDelta']);
        delete (p['stepDirection']);
    }
};


SFDesigner.prototype.readParams = function() {
    var x;
    var p = {};

    for (x in this.ui) {
        if (this.ui[x].disabled) { // Ignore disabled options
            continue;
        }

        if (this.ui[x].constructor == Array) { // Radio
            p[x] = this._getRadioValue(this.ui[x]);
        }
        else if (this.ui[x].type == 'range' || (this.ui[x].type == 'text' && ! this.ui[x].isText)) {
            p[x] = parseFloat(this.ui[x].value);
        }
        else {
            p[x] = this.ui[x].value;
        }
    }

    if (! p['song'].match(/^\s*$/)) {
        p['mode'] = 's';
    }
    else {
        p['mode'] = 'w';
    }

    this.cleanParams(p);

    return (p);
};


SFDesigner.prototype.loadSoundText = function(noHistory, soundText, doNotPlay) {
    // Set the parameters based on the text in the textArea
    var p = this.sfmaker.getParametersFromSoundText(soundText || this.soundText.value);
    var autoPlayBackup = this.autoPlay;
    var x;

    if (doNotPlay && this.autoPlay) {
        this.autoPlay = false;
    }

    // First load all the defaults, since not all parameters will be listed.
    // Eventually we should do it all in one loop to improve performance.

    for (x in p) {
        var field = x;
        var value = p[x];

        if (! this.ui[field]) {
            continue;
        }

        if (this.ui[field].constructor == Array) {
            var x;
            for (x = 0; x < this.ui[field].length; x++) {
                if (this.ui[field][x].value == value) {
                    this.ui[field][x].checked = true;
                }
                else {
                    this.ui[field][x].checked = false;
                }
            }
        }
        else {
            this.ui[field].value = value;

            if (this.ui[field].onchange) {
                this.ui[field].onchange();
            }
        }
    }

    this._onModeChange();

    this.autoPlay = autoPlayBackup;

    if (doNotPlay) {
        this._updateSoundText(p);
    }
    else {
        this.play(noHistory);
    }
};


SFDesigner.prototype._popHistory = function() {
    if (this.history.length) {
        this.soundText.value = this.history.pop();
        this.loadSoundText(true);

        if (this.history.length == 0) {
            this.previousSoundButton.disabled = true;
        }
    }
};


SFDesigner.prototype._updateSoundText = function(p, noHistory) {
    this.soundText.value = this.sfmaker.generateSoundText(p);
    this.byteCount.innerHTML = ' (' + this.soundText.value.length + ' bytes)';

    if (! noHistory && (this.history.length == 0 ||
                        this.history[this.history.length - 1] != this.soundText.value)) {
        this.history.push(this.soundText.value);

        if (this.history.length > this.historyLength) {
            this.history.splice(0, 1);
        }

        this.previousSoundButton.disabled = false;
    }

    this.updateSoundLink();
};


// **************************************************************
// * Helper Functions
// **************************************************************

SFDesigner.prototype.getParameters = function() {
    // Return a hash of parameters to the page
    // Taken from Leshy eju.getParameters()
    var href = window.location.href;
    var parameters = {};
    var valSearch, val;
    var key;
    var x;
    var p;

    href = href.match(/^[^\?]*\?([^#]*)$/);

    if (! href) {
        return (parameters);
    }

    p = decodeURI(href[1]).split('&');

    for (x = 0; x < p.length; x++) {
        key = p[x].match(/^([^=]*)/)[1];
        valSearch = p[x].match(/^[^=]*=(.*$)/); // Needed in case of ? with no parameters
        val = valSearch && valSearch[1];

        if (parseFloat(val) == val) {
            parameters[key] = parseFloat(val);
        }
        else {
            parameters[key] = val;
        }
    }

    return (parameters);
};

