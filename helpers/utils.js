var fs = require('fs');
var path = require('path');

var utils = {
	songsInDir: function(dir) {
	    return fs.readdirSync(dir).filter(function(file) {
	        var stat = fs.statSync(dir + '/' + file);
	        return stat.isFile() && path.extname(file) === ".mp3";
	    });
	},

	isMusicFile: function(stat, file) {
	    var ext = path.extname(file).toLowerCase();
	    return stat.isFile() && (ext === ".mp3" || ext === ".flac" || ext === ".wma" || ext === ".ogg");
	},

	getRootMusicDir: function() {
		if (process.argv.length < 3) return "";
		var args = process.argv[2].split('=');
		if (args.length == 1) return args[0];
		if (args[0] == 'root') return args[1];
		return "";
	}
}

module.exports = utils;