const child_process = require('child_process');
const WebSocketServer = require('ws').Server;
const http = require('http');

const server = http.createServer().listen(4000, () => {
  console.log('Listening...');
});

const wss = new WebSocketServer({
	server: server
});


const rtmpUrl = "rtmp://a.rtmp.youtube.com/live2/MyKey";

wss.on('connection', function connection(ws, req) {
	console.log('connection');

	let auth;

	if ( !(auth = req.url.match(/^\/auth\/(.*)$/)) ) {
		ws.terminate();
		return;
	}

	if(auth[1] !== "mZFZN4yc"){
		ws.terminate();
		return;
	}

	const ffmpeg = child_process.spawn('ffmpeg', [

		// FFmpeg will read input video from STDIN
    	'-i', '-',

    	// Chromium doesn't support H.264, set the video codec to 'libx264'
	    // or similar to transcode it to H.264 here on the server.
	    '-vcodec', 'libx264',

	    //No browser currently supports encoding AAC, so we must transcode the audio to AAC here on the server.
	    '-acodec', 'aac',
	    
	    // FLV is the container format used in conjunction with RTMP
	    '-f', 'flv',

	    '-max_muxing_queue_size', '99999',
	    '-preset', 'veryfast',

	    //'-vf', 'mpdecimate', '-vsync', 'vfr',
	    //'-vf', 'mpdecimate,setpts=N/FRAME_RATE/TB',
	    
	    // The output RTMP URL.
	    // For debugging, you could set this to a filename like 'test.flv', and play
	    // the resulting file with VLC.
	    rtmpUrl 
	])

	// If FFmpeg stops for any reason, close the WebSocket connection.
	ffmpeg.on('close', (code, signal) => {
		console.log('FFmpeg child process closed, code ' + code + ', signal ' + signal);
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
