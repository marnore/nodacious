var express = require('express');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var router = express.Router();

var terminal = require('child_process').spawn('bash');

//terminal.stdout.on('data', function (data) {
//    console.log('stdout: ' + data);
//});

var musicDir = '/media/disk/Music/ATB'

var initialized = false;
var status = 'stopped';
var type = ''; //music, radio

function shutdown() {
    terminal.stdin.write('shutdown\n');
    initialized = false;
}

function initMusic() {
    if (initialized) {
        shutdown();
    }
    terminal.stdin.write('vlc -I rc ' + musicDir + '\n');
    //configuration
    terminal.stdin.write('random on\n');
    terminal.stdin.write('repeat on\n');
    terminal.stdin.write('loop on\n');
    terminal.stdin.write('stop\n');
    initialized = true;
    type = 'music';
}

function initRadio(streamUrl) {
    if (initialized) {
        shutdown();
    }
    terminal.stdin.write('vlc -I rc ' + streamUrl + '\n');
    //configuration
    terminal.stdin.write('stop\n');
    initialized = true;
    type = 'radio';
}


/* GET users listing. */
router.get('/', function(req, res, next) {
    ////terminal.stdin.write('uptime\n');
    //
    ////res.send('Welcome to music player');
    //if (!initialized) {
    //    initMusic();
    //}
    res.render('music_player', {title: 'Music Player ' + status});
});

router.get('/play', function(req, res, next) {
    status = 'playing';
    if (type !== 'music') {
        initMusic();
    }
    terminal.stdin.write('play\n');
    res.render('music_player', {title: 'Music Player ' + status});
});

router.get('/stop', function(req, res, next) {
    status = 'stopped';
    terminal.stdin.write('stop\n');
    res.render('music_player', {title: 'Music Player ' + status});
});

router.get('/radio', function(req, res, next) {
    status = 'playing';
    if (type !== 'radio') {
        initRadio('http://www.zipfm.lt/in/listen.php');
    }
    terminal.stdin.write('play\n');
    res.render('music_player', {title: 'Music Player ' + status});
});


module.exports = router;
