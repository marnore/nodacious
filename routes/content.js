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

var router = express.Router();

var musicRootDir = '/media/disk/Music/'

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

router.get('/folders', function(req, res, next) {
    var dir = musicRootDir;
    if (req.query && req.query.dir) {
        dir += decodeURI(req.query.dir);
    }
    //console.log(dir);
    var dirsArray = fs.readdirSync(dir).filter(function(file) {
        var stat = fs.statSync(dir + '/' + file);
        return stat.isDirectory();
    });
    res.json({"folders": dirsArray});
});

router.get('/songs', function(req, res, next) {
    var dir = musicRootDir;
    if (req.query && req.query.dir) {
        dir += decodeURI(req.query.dir);
        //dir = path.join(dir, req.query.dir);
        //console.log(dir);
    }
    var songsArray = [];
    try {
        songsArray = fs.readdirSync(dir).filter(function(file) {
            var stat = fs.statSync(dir + '/' + file);
            return isMusicFile(stat, file); //TODO add file extension filter
        });
    } catch (error) {
        //res.json({error: "Not Found"});

    }
    //to get file infoes
    //
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

    var data = fs.readFileSync(req.file.path);
    
    var newPath = __dirname + "/../uploads/" + req.file.originalname;
    fs.writeFileSync(newPath, data);
    fs.unlinkSync(req.file.path);

    res.json({"status":"uploaded"});
});

module.exports = router;
