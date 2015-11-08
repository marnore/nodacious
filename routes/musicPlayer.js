var express = require('express');
var request = require('request');
var fs = require('fs');
var multer = require('multer');

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

var player = {};//require('../app/audaciousPlayer');


var router = express.Router();



var musicRootDir = '/media/disk/Music/'
var type = ''; //music, radio

console.log('Initializing controller');

function initMusic() {
    type = 'music';
    player.play(musicRootDir + 'Kygo Discography/');
}

function initRadio(streamUrl) {
    console.log('stream url is ' + streamUrl + '   []');
    type = 'radio';
    player.play(streamUrl);
}

function renderCurrentStatus(req, res) {
    res.render('music_player', {title: 'Music Player ' + player.getStatus()});
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
        initMusic();
    } else {
        player.play();
    }
    renderCurrentStatus(req, res);
});

router.get('/stop', function(req, res, next) {
    player.stop();
    renderCurrentStatus(req, res);
});

router.get('/next', function(req, res, next) {
    player.next();
    renderCurrentStatus(req, res);
});

router.get('/prev', function(req, res, next) {
    player.prev();
    renderCurrentStatus(req, res);
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
        dir += req.query.dir;
    }
    console.log(dir);
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
    var dirsArray;
    try {
        dirsArray = fs.readdirSync(dir).filter(function(file) {
            var stat = fs.statSync(dir + '/' + file);
            return stat.isFile(); //TODO add file extension filter
        });
    } catch (error) {
        res.json({error: "Not Found"});
    }
    res.json(dirsArray);
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
