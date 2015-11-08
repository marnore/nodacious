var child_process = require('child_process')

function audaciousPlayer() {
    
    this.initialized = false;
    this.status = 'stopped';
    this.terminal = child_process.spawn('bash');

    this.audacious = child_process.spawn('audacious');

    this.terminal.stdout.on('data', function (data) {
       console.log('stdout: ' + data);
    });

    console.log('Creating audaciousPlayer object');
}
    

audaciousPlayer.prototype.initialize = function() {
    console.log('audacious initializing');
    this.status = 'stopped';
    //this.terminal.stdin.write('killall audacious\n');
    
    this.initialized = true;
    
}

audaciousPlayer.prototype.shutdown = function() {
    this.terminal.stdin.write('killall audacious\n');
    this.initialized = false;
    this.status = 'stopped';
    console.log('audacious shut down');
}


audaciousPlayer.prototype.play = function(fileOrUrl) {
    if (!this.initialized) this.initialize();
    if (!fileOrUrl) {
        this.terminal.stdin.write('audacious -p\n');
        console.log('audacious -p');
    } else {
        console.log(fileOrUrl);
        this.terminal.stdin.write('audacious "' + fileOrUrl + '"\n');
        console.log('audacious "' + fileOrUrl + '"');
        //this.terminal.stdin.write('audacious -p\n');
    }
    this.status = 'playing';
    //terminal.stdin.write('audacious -p\n');
}

audaciousPlayer.prototype.enqueue = function(fileOrUrl) {
    this.terminal.stdin.write('audacious -e ' + fileOrUrl + '\n');
}

audaciousPlayer.prototype.playAll = function(list) {
    list.forEach(function(item, index) {
        if (index === 0) {
            this.play(item);
        } else {
            this.enqueue(item);
        }
    });
}

audaciousPlayer.prototype.pause = function() {
    this.terminal.stdin.write('audacious -u\n');
    console.log('paused');
    this.status = 'paused';
}

audaciousPlayer.prototype.stop = function() {
    this.terminal.stdin.write('audacious -s\n');
    console.log('stopped');
}

audaciousPlayer.prototype.next = function() {
    this.terminal.stdin.write('audacious -f\n');
    console.log('next');
}

audaciousPlayer.prototype.prev = function() {
    this.terminal.stdin.write('audacious -r\n');
    console.log('prev');
}

audaciousPlayer.prototype.getStatus = function() {
    return this.status;
}

audaciousPlayer.prototype.currentQueue = function() {
    return [];
}

var apInstance = new audaciousPlayer();

module.exports = apInstance;