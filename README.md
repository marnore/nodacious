# nodacious
NodeJS service for playing music through the host

# Usage
Install `nodejs`
`sudo apt-get install nodejs`

Install `mplayer`. It will be used to playback music/radio
`sudo apt-get install mplayer2`


Make sure `var musicRootDir` points to a valid directory which contain `.mp3` songs in *routes/musicPlayer.js*

Install dependencies with `npm install`
Run node application. You should specify a root directory for music files as a first parameter

`node app.js /path/to/music/root/dir`


Go to `localhost:3000` to see the music player web interface
