var express = require('express');
var request = require('request');
var fs = require('fs');
var multer  = require('multer')
var upload = multer({ dest: 'uploads/' })

var player = require('../app/audaciousPlayer');


var router = express.Router();



var musicRootDir = '/media/disk/Music/'
var type = ''; //music, radio

console.log('Initializing controller');

function initMusic() {
    type = 'music';
    player.play(musicRootDir + 'Kygo Discography (2013-15) torrent.ai/');
}

function initRadio(streamUrl) {
    console.log('stream url is ' + streamUrl + '   []');
    type = 'radio';
    player.play(streamUrl);
}


router.get('/', function(req, res, next) {
    player.initialize();
    res.render('music_player', {title: 'Music Player ' + player.getStatus()});
});

router.get('/play', function(req, res, next) {
    if (type !== 'music') {
        initMusic();
    } else {
        player.play();
    }
    res.render('music_player', {title: 'Music Player ' + player.getStatus()});
});

router.get('/stop', function(req, res, next) {
    player.stop();
    res.render('music_player', {title: 'Music Player ' + player.getStatus()});
});

router.get('/next', function(req, res, next) {
    player.next();
    res.render('music_player', {title: 'Music Player ' + player.getStatus()});
});

router.get('/prev', function(req, res, next) {
    player.prev();
    res.render('music_player', {title: 'Music Player ' + player.getStatus()});
});

router.get('/radio', function(req, res, next) {
    // var file = fs.createWriteStream("temp/stream");

    // request.get('http://www.zipfm.lt/in/listen.php').pipe(file).on('close', function () {
    //     terminal.stdin.write('audacious temp/stream\n');   
    // });

    if (type !== 'radio') {
        request.get('http://www.zipfm.lt/in/listen.php', function(err, response, body) {
            initRadio(body.split('\r\n')[0]);
        });
    }
    res.render('music_player', {title: 'Music Player ' + player.getStatus()});
});

router.get('/folders', function(req, res, next) {
    var dir = musicRootDir;
    if (req.query && req.query.dir) {
        dir += req.query.dir;
    }
    var dirsArray = fs.readdirSync(dir).filter(function(file) {
        var stat = fs.statSync(dir + '/' + file);
        return stat.isDirectory();
    });
    res.json(dirsArray);
});

router.get('/songs', function(req, res, next) {
    var dir = musicRootDir;
    if (req.query && req.query.dir) {
        dir += req.query.dir;
    }
    var dirsArray = fs.readdirSync(dir).filter(function(file) {
        var stat = fs.statSync(dir + '/' + file);
        return stat.isFile(); 
    });
    res.json(dirsArray);
});

router.post('/upload', upload.single('displayImage'), function(req, res, next){
    console.log(req.file);
    fs.readFile(req.file.path, function (err, data) {
        var newPath = __dirname + "/uploads/" + req.file.originalname;
        fs.writeFile(newPath, data, function (err) {
            res.redirect("/");
        });
    });

});

//router.post('/upload', upload.single('displayImage'), function (req, res, next) {
  // console.log(req.file);
  // req.file is the `avatar` file
  // req.body will hold the text fields, if there were any
//});

module.exports = router;
