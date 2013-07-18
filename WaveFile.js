// **************************************************************
//  Copyright (c) 2013, Leshy Labs LLC
//  All rights reserved.
//      www.leshylabs.com
// **************************************************************
//    This file is part of SFMaker.
//
//    SFMaker is free software: you can redistribute it and/or
//    modify it under the terms of version 3 of the GNU Lesser
//    General Public License as published by the Free Software
//    Foundation.
//
//    SFMaker is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU Lesser General Public License for more details.
//
//    You should have received a copy of the GNU Lesser General
//    Public License along with SFMaker.  If not, see
//    <http://www.gnu.org/licenses/>.
// **************************************************************
// **************************************************************
// * Initialization
// **************************************************************

"use strict";

function WaveFile(attrib) {
    this.setFormat(8000, 8, 1);

    this.data = [];
    this.file = [];

    if (attrib) {
        var x;

        for (x in attrib) {
            this[x] = attrib[x];
        }
    }
};

WaveFile.prototype.setFormat = function (sampleRate, bitsPerSample, numChannels) {
    this.sampleRate = sampleRate;
    this.bitsPerSample = bitsPerSample;
    this.numChannels = numChannels;
    this.sampleRange = Math.pow(2, this.bitsPerSample) / 2 - 1;
};

// **************************************************************
// * Wavefile Building
// **************************************************************

WaveFile.prototype._setHeader = function (position, length, data) {
    var x;

    if (isNaN(data)) { // String
        for (x = 0; x < length; x++) {
            if (data.length < x) {
                this.file[position + x] = String.fromCharCode(0);
            }
            else {
                this.file[position + x] = data.charCodeAt(x);
            }
        }
    }
    else { // Number
        for (x = 0; x < length; x++) {
            this.file[position + x] = (data & (0xff << (x * 8))) >> (x * 8);
        }
    }
};

// **************************************************************
// * Interfaces
// **************************************************************

WaveFile.prototype.generateFile = function () {
    var data = this.data;
    var length = data.length;
    var file;
    var x;

    this.file = [];

    // Header
    this._setHeader(0, 4, 'RIFF');
    this._setHeader(4, 4, length + 36);
    this._setHeader(8, 4, 'WAVE');

    // FMT
    this._setHeader(12, 4, 'fmt ');
    this._setHeader(16, 4, 16); // subChunk1Size
    this._setHeader(20, 2, 1); // Audio format (PCM)
    this._setHeader(22, 2, this.numChannels);
    this._setHeader(24, 4, this.sampleRate);
    this._setHeader(28, 4, (this.sampleRate * this.numChannels * this.bitsPerSample / 8)); // byteRate
    this._setHeader(32, 2, (this.numChannels * this.bitsPerSample / 8)); // blockAlign
    this._setHeader(34, 2, this.bitsPerSample);

    // Data
    this._setHeader(36, 4, 'data');
    this._setHeader(40, 4, length);

    file = this.file;
    for (x = 0; x < length; x++) {
        file[44 + x] = data[x];
    }
};

WaveFile.prototype.encodeBase64 = function () {
    // Encode the file byte array into base64
    var x;
    var s = '';
    var file = this.file;
    var length = file.length;

    if (window.btoa) { // If a browser has an encoder, use that
        for (x = 0; x < length; x++) {
            s += String.fromCharCode(file[x]);
        }

        return ('data:audio/wav;base64,' + btoa(s));
    }
    else {
        var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

        for (x = 0; x < length; x+= 3) {
            s += alphabet.charAt((file[x] & 0xFC) >> 2);

            if (x + 1 < length) {
                s += alphabet.charAt(((file[x] & 0x03) << 4) | ((file[x + 1] & 0xF0) >> 4));
            }
            else {
                s += alphabet.charAt(((file[x] & 0x03) << 4)) + '==';
                break;
            }

            if (x + 2 < length) {
                s += alphabet.charAt(((file[x + 1] & 0x0F) << 2) | ((file[x + 2] & 0xC0) >> 6));
                s += alphabet.charAt(file[x + 2] & 0x3F);
            }
            else {
                s += alphabet.charAt((file[x + 1] & 0x0F) << 2) + '=';
                break;
            }
        }

        return ('data:audio/wav;base64,' + s);
    }
};

WaveFile.prototype.generateBase64 = function () {
    this.generateFile();

    return (this.encodeBase64());
};

WaveFile.prototype.generateAudioTag = function () {
    var audio = document.createElement('audio');

    audio.src = this.generateBase64();
    audio.load();

    return (audio);
};

WaveFile.prototype.play = function () {
    // Generate and play a wave file
    var audio = this.generateAudioTag();

    audio.play();
    return (audio);
};
