var child_process = require('child_process')

function startsWith(hay, needle, caseInsensitive) {
	if (caseInsensitive) {
		return hay.toLowerCase().indexOf(needle.toLowerCase()) === 0;
	}
	return hay.indexOf(needle) === 0;
}

function outputParser(playingCallback) {
	var dummy = {
		onSongChanged: function(info){
			console.log('Dummy listener: ');
			console.log(info);
		},
	}

	this.title = null;
	this.artist = null;
	this.fileName = null;
	this.needsUpdate = false;
	this.playingCallback = playingCallback || dummy;

	this.parse = function(data) {
		if (!data) return;
		var self = this;
		data.split('\n').forEach(function(line) {
			var l = line.trim();
			if (startsWith(l, "Playing")) {
				self.artist = null;
				self.title = null;
				//kind of heavy but ok..
				self.fileName = l.substring("Playing ".length, l.length - 1);
				self.needsUpdate = true;
			} else if (startsWith(l, "artist")) {
				self.artist = l.substring("artist: ".length);
			} else if (startsWith(l, "title")) {
				self.title = l.substring("title: ".length);
			}
		});
		if (this.needsUpdate && self.title !== null && self.artist !== null && self.fileName !== null) {
			this.playingCallback.onSongChanged({
				title: self.title,
				artist: self.artist,
				fileName: self.fileName
			});
			this.needsUpdate = false;
		}
	}
}

function mplayer(playingCallback) {
    
    this.initialized = false;
    this.status = 'stopped';
    this.terminal = child_process.spawn('bash');
    this.currentVolume = 50;
    this.playlist = [];

    //this.audacious = child_process.spawn('audacious');
    var parser = new outputParser(playingCallback);
    this.terminal.stdout.on('data', function (data) {
       console.log('stdout: ' + data);
       parser.parse(data.toString());
    });

    console.log('Creating mplayer object');
}

mplayer.prototype.initialize = function() {
    console.log('mplayer initializing');
    this.status = 'stopped';
    this.initialized = true;
}

mplayer.prototype.shutdown = function() {
    this.terminal.stdin.write('quit\n');
    this.terminal.stdin.write('killall mplayer\n');
    this.initialized = false;
    this.playlist = [];
    this.status = 'stopped';
    console.log('mplayer shut down');
}


mplayer.prototype.play = function(fileOrUrl) {
	console.log("DEBUG: play. Curr status " + this.status + " will play " + fileOrUrl);
    
    if (fileOrUrl) {
		this.shutdown();
    	this.playlist = [fileOrUrl];
    	this.terminal.stdin.write('mplayer -slave -quiet -novideo "' + fileOrUrl + '"\n');
    	this.status = "playing";
	} else {
		if (this.status === "paused") {
	    	this.pause();
	    } else if (this.status === "playing") {
	    	//do nothing
	    } else if (this.status === "stopped") {
	    	this.status = "paused";
	    	this.pause();
	    }
	}
}

mplayer.prototype.enqueue = function(fileOrUrl) {
	var all = [].concat(fileOrUrl);
	var self = this;
	all.forEach(function(item) {
		//console.log('DEBUG: Adding playlist file ' + item);
		self.playlist.push(item);
    	self.terminal.stdin.write('loadfile "' + item + '" 1\n');
	});
    
}

mplayer.prototype.playAll = function(list) {
    
}

mplayer.prototype.pause = function() {
	if (this.status === "stopped") return;	//do nothing while paused
	this.terminal.stdin.write('pause\n');
	if (this.status === "paused") {
    	this.status = "playing";
	} else if (this.status === "playing") {
		this.status = "paused";
	}
	console.log('DEBUG: ' + "pause. Curr status " + this.status);
}

mplayer.prototype.stop = function() {
	console.log('DEBUG: ' + "stop. Curr status " + this.status);
    if (this.status !== "paused") {
    	this.pause();
	}
    //this.terminal.stdin.write('pause\n');
    this.seek(0);
    this.status = "stopped";
}

mplayer.prototype.next = function() {
	console.log('DEBUG next');
    this.terminal.stdin.write('pt_step 1\n');
}

mplayer.prototype.prev = function() {
	console.log('DEBUG prev');
    this.terminal.stdin.write('pt_step -1\n');
}

mplayer.prototype.seek = function(percentage) {
    this.terminal.stdin.write('seek ' + percentage + ' 1\n');
}

mplayer.prototype.mute = function(mute) {
	this.terminal.stdin.write('mute ' + (mute ? '1' : '0') + '\n');
}

mplayer.prototype.volume = function(percentage) {
	if (percentage === undefined || percentage < 0) {
		return this.currentVolume;
	}
	this.currentVolume = percentage;
    this.terminal.stdin.write('volume ' + percentage + ' 1\n');
    return this.currentVolume;
}

mplayer.prototype.getStatus = function() {
    return this.status;
}

mplayer.prototype.currentQueue = function() {
    return this.playlist;
}

mplayer.prototype.getSongInfo = function(fileNames, callback) {
	var files = [].concat(fileNames);
//console.log(files);
	if (!files.length) return;

	var terminal = child_process.spawn('bash');
	var artistID = -1;
	var titleID = -1;
	var songInfo = {};
	var parsed = [];
	var index = 0;
	terminal.on('close', (code) => {
		console.log(`child process exited with code ${code}`);
	});
	terminal.stdout.on('data', function(data) {
		//console.log('Got: ' + data);
		var lines = data.toString().split('\n');
		if (lines) {
			lines.forEach(function(line) {
				var segments = line.split('=');
				if (segments[1] === "artist") {
					artistID = segments[0].substring(segments[0].length - 1);
				} else if (segments[1] === "title") {
					titleID = segments[0].substring(segments[0].length - 1);
				} else if (segments[0] === "ID_CLIP_INFO_VALUE" + artistID) {
					songInfo.artist = segments[1];
				} else if (segments[0] === "ID_CLIP_INFO_VALUE" + titleID) {
					songInfo.title = segments[1];
				} else if (segments[0] === "ID_FILENAME") {
					songInfo.fileName = segments[1];
				} else if (segments[1] === "EOF") {	//end of parsing
					parsed[index] = songInfo;
					songInfo = {};
					if (index < files.length) {
						//console.log('passing song ' + files[index]);
						terminal.stdin.write('mplayer -vo null -ao null -identify -frames 0 "' + files[index++] + '"\n');
					} else {
						terminal.stdin.write('exit\n');
						callback(parsed);
					}
				}
				
			})
		}
	});

	terminal.stdin.write('mplayer -vo null -ao null -identify -frames 0 "' + files[index] + '"\n');

	
}

module.exports = new mplayer();