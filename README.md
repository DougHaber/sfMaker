# SFMaker

SFMaker is a tool used for generating sound effects reminiscent of those found in old video games. It was originally written during the [HTML5 Tools Jam](http://bostongamejams.com/2011/01/15/html5-tools-jam-awesomeness/) from [BostonGameJams.com](http://bostongamejams.com/). The program was inspired by [SFXR](http://www.drpetter.se/project_sfxr.html), but it is an original work and uses no code or algorithms from SFXR.

# Usage

* [Use SFMaker Online](http://www.leshylabs.com/apps/sfMaker/)

## Song Mode

When using song mode, instead of the parameters defining a single sound they define how to produce a note.  The "Song" parameter is then used to provide a list of notes.  The "Start Frequency" parameter is ignored, and each note's start frequency is the actual frequency of the note.  The "Length" parameter in song mode refers to the length of a note, rather than the generated sound as a whole.

In song mode the letters 'A' through 'G' are used to define notes. When lower case the sharp of that note is played, except for 'b' and 'e' which do not have sharps.

Notes can be played in any octave from 0 to 9.  Octaves can be specified by placing numbers after a note.  For example 'A3' or 'c2'. The default octave is 4.  This default value can be changed by using 'O' followed by a number.  After that, all notes that do not specify an octave will be played in whatever the default octave is set to.

Octaves change on C, and so to play all notes from A to G in order you would need to do something like "ABO5CDEFG".  This plays A and B in the default octave of 4, switches the default octave to 5, and then plays the rest of the notes.


## API

### Basic Usage

Web applications using the library require WaveFile.js and
sfMaker.js.  SFDesigner.js is only used for the designer GUI, and so
should not be included.

```html
  <script type="text/javascript" src="WaveFile.js"></script>
  <script type="text/javascript" src="sfMaker.js"></script>
```

To create an `<audio>` element from sound text:

```javascript
var sound = sfMaker.generateAudioTag('w=Square,v=16.753,s=45');
```

Afterwards, "sound" is an audio element, so you can sound.load() and sound.play().

Many engines need to store the sound multiple times. Generating the audio can be CPU intensive, so instead of generating the audio repeatedly, you can generate just the base64 data URI and then set the source to multiple audio tags without having to regenerate the sound for each one. For example:

```javascript
var base64 = sfmaker.generateBase64('w=Square,v=16.753,s=45');
var sounds = [];
var x;

for (x = 0; x < 5; x++) {
  sounds[x] = document.createElement('audio');
  sounds[x].src = base64;
}
```

### Advanced Usage

The above examples show the recommended usage.  For the more daring, it is also possible to request audio be generated by passing in an object of parameters and their values.  Any unspecified parameter will have its default value.  This is uncharted territory, but here is an example:

```javascript
// SFMaker internally generates the sound into sfMaker.waveFile
sfMaker.generateSound({ waveType: 'Square', vibratoFrequency: 16.753, steps: 45 });

// Request an audio tag be generated from the WaveFile
var audio = sfMaker.waveFile.generateAudioTag();

// To do the same as above, but play the tag before returning it
var audio = sfMaker.waveFile.play();

// As an alternate path, request the base64 from the waveFile
var audio = document.createElement('audio');
audio.src = sfMaker.waveFile.generateBase64();
```


The designer interface of SFMaker can be used on the web to create sound effects and save WAVE files of the audio.  The live version is available here:

* [Live Demo](http://www.leshylabs.com/apps/sfMaker/)


## Parameters

* **Song**: The "Song" parameter allows notes to guide the pitch of the sound.    This can be used to create simple songs or to make sounds using the notes to define the pitch changes or repetitions.  This    parameter is extremely useful creating little jingles, melodic    sound effects, sirens, gunfire, and many other types of    things.
    
    Songs are written using the letters A to G.  Lowercase letters indicate sharps.  Octaves from 0 to 9 can be specified by placing them after a note.  For example, A3 or c6.  Spaces can be used as rests.
    
    When in song mode the "Length" parameter defines the length of a    note rather than the length of the entire sound.  The "Start Frequency" parameter is ignored.  The other parameters that would normally be used to determine how to generate a sound are now used to determine how generate each note.

* **Wave Type**: The type of waveform to generate.  Sine, Square, and Sawtooth are the standard wave types.  When noise is used a number of settings become enabled that make it possible to generate many types of    random noise.  Noise is created by altering the frequency in specified ranges and intervals while using one of the wave types. The "Foo" wave is a custom type that is often useful in reproducing retro sounds.

* **Sample Rate**: The generated wave file's sample rate. The default is 11025, but various sounds will be better at different rates.
    
    Lower sample rates have a lower maximum pitch that can be represented in them.  Exceeding this can cause the pitch to wrap.  In lower sample rates regular frequency changes may not sound clean and may have clicks.  If this is not desired, the sample rate must either be raised, or the amount of changes in frequency should be limited.
    
    Sounds often will be quite different in different sample rates.  Higher sample rates will sound cleaner and lower sample rates will better reproduce retro sounds in some cases.
    
    The higher the sample rate, the larger the file and the longer it takes to generate.  If procedural generation is used it may be  best to keep this in mind so that initializing sounds performs fast enough.

* **Start Frequency**: This is the frequency that the sound begins using.  If the "Song" parameter is provided, it is ignored.  The start frequency is not limited to the range of possible pitches from the sample rate.

* **Vibrato Frequency**: The rate at which vibrato should be applied in hertz.  Vibrato causes the pitch to be modified by the depth amount at the given frequency.

* **Vibrato Depth**: How much the vibrato should alter the pitch in hertz.

* **Tremelo Frequency**: The rate at which tremelo should be applied in hertz.  Tremelo causes the volume to be modified by the depth amount at the given frequency.

* **Tremelo Depth**: How much the tremelo should alter the pitch.  This amount is added to the volume.  If the start volume is 0.7 and the tremelo depth is 0.2, then the volume will vary between 0.5 and 0.9.  The value 1.0 would indicate full volume, and so high tremelo depths can cause gain which can result in clipping.

* **Square/Saw Duty**: The cut off point for when a "Square" or "Sawtooth" wave is considered on or off.  This parameter has a similar effect on the "Foo" wave.  With the "Sawtooth" wave, both negative and positive values of the Duty will have the same effect.

* **Duty Sweep Frequency**: The frequency at which the square/saw duty should be modified in hertz.

* **Duty Sweep Depth**: How much to modify the duty by.  This amount is added to the duty.

* **Peak**: How high the attack phase should rise to and the decay should fall from.  1 means 100%, so if the number is 1.1, that means volume will rise to 110% of the normal volume in the attack, and fall from 110% in the decay.

* **ADSR**: This defines the volume envelope.  The ADSR numbers values don't have meaning in themselves.  The percent of the total ADSR value is how long each phase will last.  For example, if S is 1.0 and R is 1.0, for the first half of the sound it will sustain, and the second half will release.  Any period with a 0 value against it will not occur.
    * A - Attack: Starting from 0 the volume rises to the "Peak" level.
    * D - Decay: From the "Peak" level the volume falls to the normal 100% level.
    * S - Sustain: The volume stays at the 100% level for this period.
    * R - Release: The volume falls from the normal 100% back down to 0.


* **Frequency Change**: This is used to define a single point in the sound where the frequency changes.  This argument defines how much the frequency should change in hertz.

* **Frequency Change Time**: This defines how far into the sound (as a percentage) the frequency change event should occur.  For example, a value of 50 in a 2 second long sound will cause the change at 1 second, or a value of 25 in a 2 second sound will cause the change at 1/2 second.

* **Steps**: The "Steps" parameter allows a regular linear frequency change to be defined.  This is the number of times the frequency should be modified by the "Step Delta" parameter.  This is done separately from the "Frequency Change" parameters.  Every step is perfectly divided in time over the length of the sound.  So, a 2 second sound with 4 steps will change frequency every half second.

* **Step Delta**: How many hertz to change the frequency by each step.

* **Step Direction**: Whether the "Step Delta" amount should be added or subtracted from the current frequency for each step.

* **Low Pass Alpha**: The alpha value to be used for a low pass filter.  Setting this to 0 disables the filter, and higher numbers increase the filtering.

* **Length**: How long the sound should be in seconds.  When there is a song argument this is how long a note should be in seconds.

* **Volume**: The total volume.  1 is 100%.   The default is 0.6 to give room for other things to modify the volume without resulting in clipping.

* **Noise Wave Type**: If the "Noise" wave type is used, this specifies the type of waveform to generate noise with.

* **Noise Change Time**: If the "Noise" wave type is used, this indicates how often the pitch should be modified.  The meaning is determined by the "Noise Change Style" setting.  When set to "Fixed" this defines the number of steps until the next change.  If set to "Random" the "Noise Change Time" provides the range of steps to randomly wait between changes.

* **Noise Change Style**: If the "Noise" wave type is used, this indicates if the pitch is changed in fixed intervals or at random times.

* **Noise Change Range**: If the "Noise" wave type is used, this determines the range in hertz to randomly alter the pitch.  For example, if this setting is 10, then the pitch will vary within 10 hertz of its current frequency.

* **Random Seed**: This provides a seed value for the pseudo-random number generator used with the "Noise" wave type.  The seed value ensures the sequence of random numbers generated will be identical each time the sound is generated.

* **Reset Seed for Notes**: When using the "Noise" wave type this determines whether or not the seed is reset for each note.  Resetting the random seed ensures that each note will be generated with the same noise pattern.  When disabled, the random sequence will continue and each note will have different random noise.


# Links

* [Use SFMaker Online](http://www.leshylabs.com/apps/sfMaker/)
* [Original Introduction Blog Post](https://www.leshylabs.com/blog/posts/2013-01-01-Introduction_to_SFMaker.html) (with code and sound examples)
* [Documentation](https://www.leshylabs.com/apps/sfMaker/help.html)


# Contributing

Contributions to SFMaker are generally welcome, so long as they conform to the [contributor guidelines](CONTRIBUTIONS.md).   Be sure to read through the guidelines to maximize the chance of any pull request being accepted.
