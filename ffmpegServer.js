const child_process = require('child_process');
const WebSocketServer = require('ws').Server;
const http = require('http');
const fs = require('fs');

const { ffmpegServerPort, rtmpUrl, auth: authConfig } = require('./env');

const server = http.createServer().listen(ffmpegServerPort, () => {
  console.log('Listening...');
});

const wss = new WebSocketServer({
	server: server
});

wss.on('connection', function connection(ws, req) {
	console.log('connection');

	let auth;

	if ( !(auth = req.url.match(/^\/auth\/(.*)$/)) ) {
		ws.terminate();
		return;
	}

	if(auth[1] !== authConfig){
		ws.terminate();
		return;
	}

	const ffmpeg = child_process.spawn('ffmpeg', [

		// FFmpeg will read input video from STDIN
    	'-i', '-',

    	// If we're encoding H.264 in-browser, we can set the video codec to 'copy'
    	// so that we don't waste any CPU and quality with unnecessary transcoding.
	    '-vcodec', 'copy',

	    // use if you need for smooth youtube publishing. Note: will use more CPU
	    //'-vcodec', 'libx264',
	    //'-x264-params', 'keyint=120:scenecut=0',

	    //No browser currently supports encoding AAC, so we must transcode the audio to AAC here on the server.
	    '-acodec', 'aac',

	    // remove background noise. You can adjust this values according to your need
	    '-af', 'highpass=f=200, lowpass=f=3000',

	    // This option sets the size of this buffer, in packets, for the matching output stream
	    '-max_muxing_queue_size', '99999',

	    // better to use veryfast or fast
	    '-preset', 'veryfast',

	    //'-vf', 'mpdecimate', '-vsync', 'vfr',
	    //'-vf', 'mpdecimate,setpts=N/FRAME_RATE/TB',

	    // FLV is the container format used in conjunction with RTMP
	    '-f', 'flv',

	    // The output RTMP URL.
	    // For debugging, you could set this to a filename like 'test.flv', and play
	    // the resulting file with VLC.
	    rtmpUrl
	])

	// If FFmpeg stops for any reason, close the WebSocket connection.
	ffmpeg.on('close', (code, signal) => {
		console.log('FFmpeg child process closed, code ' + code + ', signal ' + signal);
		//console.log("reconnecting...")
		ws.send("ffmpegClosed")
		ws.terminate();
	});

	ffmpeg.stdin.on('error', (e) => {
		console.log('FFmpeg STDIN Error', e);
	});

	ffmpeg.stderr.on('data', (data) => {
    	console.log('FFmpeg STDERR:', data.toString());
    });

    // When data comes in from the WebSocket, write it to FFmpeg's STDIN.
	ws.on('message', (msg) => {
	    console.log('DATA', msg);
	    ffmpeg.stdin.write(msg);
	});

	// If the client disconnects, stop FFmpeg.
	ws.on('close', (e) => {
    	ffmpeg.kill('SIGINT');
    	ws.terminate();
	});

});
