var express = require('express');
var request = require('request');
var fs = require('fs');
var path = require('path');
var utils = require('../helpers/utils.js');

var player = require('../app/mplayer');
player.initialize();

var router = express.Router();

var musicRootDir = utils.getRootMusicDir();
var type = ''; //music, radio
var playlist = [];
var currPlayIndex = -1;

console.log('Initializing controller');

function initMusic(song) {
    type = 'music';
    playSong(song);
}

function initRadio(streamUrl) {
    console.log('stream url is "' + streamUrl + '"');
    type = 'radio';
    playlist = [{fileName: streamUrl}];
    player.play(streamUrl);
}

function renderCurrentStatus(req, res) {
    if (req.headers && req.headers.accept && req.headers.accept.split(',')[0].toLowerCase() === "text/html") {
        res.render('music_player', {
            title: 'Music Player ' + player.getStatus(), 
            currPlayIndex: currPlayIndex,
            currSong: playlist[currPlayIndex],
            playlist: playlist
        });    
    } else {
        console.log("json");
        res.json({
            status: player.getStatus(),
            currSong: currPlayIndex === -1 || currPlayIndex >= playlist.length ? null : playlist[currPlayIndex],
            currPlayIndex: currPlayIndex,
        });
    }
    //console.log('Request headers');
    //console.log(req.headers);
    
}

function renderError(req, res, error) {
    res.render('music_player', {
        title: 'Music Player ' + player.getStatus(),
        error: error,
        currPlayIndex: currPlayIndex,
        currSong: playlist[currPlayIndex],
        playlist: playlist
    });
}


router.get('/', function(req, res, next) {
    player.initialize();
    renderCurrentStatus(req, res);
});

//playing and enqueuing should go through here
//song can be either an array or a string.
function playSong(song, enqueueAll) {
    var filesToPlay = [];
    var toPlay = song;
    if (!toPlay) {
        return;
    }
    var ls = null;
    try {
        ls = fs.lstatSync(toPlay);
    } catch (e) {}

    if (ls && ls.isDirectory()) {
        filesToPlay = utils.songsInDir(toPlay).map(function(song) {
            return path.join(toPlay, song);
        });
        if (!enqueueAll) {
            if (filesToPlay.length >= 1) {
                player.play(filesToPlay[0]);
            }
            if (filesToPlay.length >= 2) {
                player.enqueue(filesToPlay.slice(1));
            }
            currPlayIndex = 0;
        } else {
            player.enqueue(filesToPlay);
        }


    } else {
        if (toPlay) {
            filesToPlay = [toPlay];
            if (!enqueueAll) {
                currPlayIndex = 0;
                player.play(toPlay);
            } else {
                player.enqueue(toPlay);
            }
        }
    }

    var pl = filesToPlay.map(function(fileToPlay) {
        return { fileName: fileToPlay };
    });
    if (!enqueueAll) {
        playlist = pl;
        currPlayIndex = 0;
    } else {
        playlist = playlist.concat(pl);
    }
    //get song info for existing files (not urls)
    if (ls) {
        player.getSongInfo(filesToPlay, function(result) {
            result.forEach(function(item) {
                item.fileName = path.basename(item.fileName);
            });
            if (!enqueueAll) {
                playlist = result;
            } else {
                playlist = playlist.concat(result);
            }

        });
    }
}

router.post('/enqueue', function(req, res, next) {
    var toEnqueue = req.body.toEnqueue;
    if (toEnqueue) {
        playSong(toEnqueue, true);  //add those all to the end of the list
    }
    
});

router.get('/play', function(req, res, next) {
    if (type !== 'music') {
        initMusic(req.param.song || musicRootDir);
    } else {
        if (req.param.song) {
            playSong(musicRootDir + req.param.song);
            //player.play(req.param.song);
        } else {
            //playSong(musicRootDir);
            player.play();
        }
    }
    renderCurrentStatus(req, res);
});

router.get('/pause', function(req, res, next) {
    player.pause();
    renderCurrentStatus(req, res);
});

router.get('/stop', function(req, res, next) {
    //type = '';
    player.stop();
    renderCurrentStatus(req, res);
});

router.get('/next', function(req, res, next) {
    player.next();
    currPlayIndex = (currPlayIndex + 1) % playlist.length;
    renderCurrentStatus(req, res);
});

router.get('/prev', function(req, res, next) {
    player.prev();
    currPlayIndex = currPlayIndex > 0 ? currPlayIndex - 1 : playlist.length - 1;
    renderCurrentStatus(req, res);
});

router.get('/volume', function(req, res, next) {
    if (req.query.value && req.query.value >= 0) {
        var volume = Math.max(Math.min(req.query.value, 100), 0); //clamp to 0..100    
        player.volume(volume);    
    }
    res.json({"volume": player.volume()});  //return correct volume
    //renderCurrentStatus(req, res);
});

router.get('/playlist', function(req, res, next) {
    res.json({'playlist': playlist});
});

function parseM3U(body) {
    var found = null;
    body.split('\r\n').some(function(line) {
        if (line.indexOf('http') === 0) {
            found = line;
            return true;
        }
    });
    return found;
}

// Initialize the whole radio playlist here
router.get('/radio', function(req, res, next) {
    // var file = fs.createWriteStream("temp/stream");
    // request.get('http://www.zipfm.lt/in/listen.php').pipe(file).on('close', function () {
    //     terminal.stdin.write('audacious temp/stream\n');   
    // });

    if (type !== 'radio') {

        var otherRadioCallback = function(err, response, body) {
            if (!err && body) {
                var url = parseM3U(body);
                if (url) playSong(url, true);
            }
        }
        var zipfmCallback = function(err, response, body) {
            if (!err && body) {
                initRadio(body.split('\r\n')[0]);
                //hot fm
               request.get('http://www.hotfm.lt/modules/mod_ngs_shoutcast/singleplaylist.php?ip=193.46.83.8&port=8000&format=M3U', otherRadioCallback);
               //request.get('http://82.135.234.195:8000/pukas2.aac.m3u', otherRadioCallback);
            } else {
                renderError(req, res, err);
            }
            
        };
        request.get('http://www.zipfm.lt/in/listen.php', zipfmCallback);
    }
    renderCurrentStatus(req, res);
});

module.exports = router;
