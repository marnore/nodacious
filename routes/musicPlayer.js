var express = require('express');
var request = require('request');
var fs = require('fs');
var multer = require('multer');
var path = require('path');


// var storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, '/uploads');
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.originalname);
//   }
// });
// var upload = multer({ storage: storage });

var upload = multer({ dest: 'uploads/' });

var player = require('../app/mplayer');
player.initialize();

var router = express.Router();

var musicRootDir = '/media/disk/Music/'
var type = ''; //music, radio
var playlist = [];
var currPlayIndex = -1;

console.log('Initializing controller');

function songsInDir(dir) {
    return fs.readdirSync(dir).filter(function(file) {
        var stat = fs.statSync(dir + '/' + file);
        return stat.isFile() && path.extname(file) === ".mp3";
    });
}

function isMusicFile(stat, file) {
    var ext = path.extname(file).toLowerCase();
    return stat.isFile() && (ext === ".mp3" || ext === ".flac" || ext === ".wma" || ext === ".ogg");
}

function initMusic(song) {
    type = 'music';
    playlist = [];
    var toPlay = song;
    if (!toPlay) {
        toPlay = musicRootDir + 'Kygo Discography/';
    }
    if (fs.lstatSync(toPlay).isDirectory()) {
        playlist = songsInDir(toPlay).map(function(song) {
            return path.join(toPlay, song);
        });
        //console.log('Playlist');
        //console.log(playlist);
        if (playlist.length >= 1) {
            player.play(playlist[0]);
        }
        if (playlist.length >= 2) {
            player.enqueue(playlist.slice(1, 2));
        }
        currPlayIndex = 0;
    } else {
        if (toPlay) {
            playlist = [toPlay];
            currPlayIndex = 0;
            player.play(toPlay);
        }
    }

}

function initRadio(streamUrl) {
    console.log('stream url is ' + streamUrl + '   []');
    type = 'radio';
    playlist = [streamUrl];
    player.play(streamUrl);
}

function renderCurrentStatus(req, res) {
    res.render('music_player', {
        title: 'Music Player ' + player.getStatus(), 
        currPlayIndex: currPlayIndex,
        currSong: playlist[currPlayIndex]
    });
}

function renderError(req, res, error) {
    res.render('music_player', {title: 'Music Player ' + player.getStatus(), error: error});
}


router.get('/', function(req, res, next) {
    player.initialize();
    renderCurrentStatus(req, res);
});

router.get('/play', function(req, res, next) {
    if (type !== 'music') {
        initMusic(req.param.song);
    } else {
        if (req.param.song) {
            player.play(req.param.song);
        } else {
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
    console.log(req.query);
    if (req.query.value) {
        player.volume(Math.max(Math.min(req.query.value, 100), 0));    //clamp to 0..100    
    }
    renderCurrentStatus(req, res);
});

router.get('/playlist', function(req, res, next) {
    res.json({'playlist': playlist});
});

router.get('/radio', function(req, res, next) {
    // var file = fs.createWriteStream("temp/stream");

    // request.get('http://www.zipfm.lt/in/listen.php').pipe(file).on('close', function () {
    //     terminal.stdin.write('audacious temp/stream\n');   
    // });

    if (type !== 'radio') {
        request.get('http://www.zipfm.lt/in/listen.php', function(err, response, body) {
            if (!err && body) {
                initRadio(body.split('\r\n')[0]);    
            } else {
                renderError(req, res, err);
            }
            
        });
    }
    renderCurrentStatus(req, res);
});

router.get('/folders', function(req, res, next) {
    var dir = musicRootDir;
    if (req.query && req.query.dir) {
        dir += decodeURI(req.query.dir);
    }
    console.log(dir);
    var dirsArray = fs.readdirSync(dir).filter(function(file) {
        var stat = fs.statSync(dir + '/' + file);
        return stat.isDirectory();
    });
    res.json({"subFolders": dirsArray});
});

router.get('/songs', function(req, res, next) {
    var dir = musicRootDir;
    if (req.query && req.query.dir) {
        dir += decodeURI(req.query.dir);
        //dir = path.join(dir, req.query.dir);
        console.log(dir);
    }
    var songsArray;
    try {
        songsArray = fs.readdirSync(dir).filter(function(file) {
            var stat = fs.statSync(dir + '/' + file);
            return isMusicFile(stat, file); //TODO add file extension filter
        });
    } catch (error) {
        res.json({error: "Not Found"});
    }
    //to get file infoes
    //mplayer -vo null -ao null -identify -frames 0 01\ Paul\ Keeley\ -\ Paper\ Jet.flac
    var songs = songsArray.map(function(file) {
        return {
            fileName: file,
            artist: 'Artist',
            title: 'Title',
            length: 500,
        }
    });
    res.json({"songs": songs});
});

router.post('/createFolder', function(req, res) {
    var dir = req.body.dir;
    var name = req.body.name;
    var path = musicRootDir;
    if (dir != null) {
        path += '/' + path;
    }
    path += '/' + name;
    try {
        fs.mkdirSync(path);
    } catch(e) {
        if ( e.code != 'EEXIST' ) throw e;
    }
    res.json({dir: path});
});

router.post('/upload', upload.single('songFile'), function(req, res, next){
    console.log(req.file);
    fs.readFile(req.file.path, function (err, data) {
        var newPath = __dirname + "/../uploads/" + req.file.originalname;
        fs.writeFile(newPath, data, function (err) {
            console.log(arguments);
            fs.unlinkSync(req.file.path);
            res.redirect("/music_player");
        });

    });
    //res.redirect('/music_player');
});

//router.post('/upload', upload.single('displayImage'), function (req, res, next) {
  // console.log(req.file);
  // req.file is the `avatar` file
  // req.body will hold the text fields, if there were any
//});

module.exports = router;
