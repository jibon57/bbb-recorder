# bbb-recorder

Bigbluebutton recordings export to `webm` or `mp4` & live broadcasting. This is an example how I have implemented BBB recordings to distibutable file. 

1. Videos will be copy to `/var/www/bigbluebutton-default/record`. You can change value of `copyToPath` from `config.json`.
3. Can be converted to `mp4`. Default `webm`
2. Specify bitrate to control quality of the exported video by adjusting `videoBitsPerSecond` property in `background.js`


### Dependencies

1. xvfb (`apt install xvfb`)
2. Google Chrome stable
3. npm modules listed in package.json
4. Everything inside `dependencies_check.sh` (run `./dependencies_check.sh` to install all)

The latest Google Chrome stable build should be use.

```sh
curl -sS -o - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list
apt-get -y update
apt-get -y install google-chrome-stable
```

FFmpeg (if not installed already & have plan for mp4 or RTMP)
```sh
sudo add-apt-repository ppa:jonathonf/ffmpeg-4
sudo apt-get update
sudo apt-get install ffmpeg
```

### Usage

Clone the project first:

```javascript
git clone https://github.com/jibon57/bbb-recorder
cd bbb-recorder
npm install --ignore-scripts
```

### Recording export

```sh
node export.js "https://BBB_HOST/playback/presentation/2.0/playback.html?meetingId=MEETING_ID" meeting.webm 10 true s3
```

**Options**

You can pass 4 args

1) BBB recording link (mandatory)
2) (Optional) Export file name (should be `.webm` at end). You can use "MEETING_ID" (without `.webm`) to set the meeting ID as export name. Default: MEETING_ID 
3) (Optional) Duration of recording (in seconds). You can set it to 0 use the real duration of recording. Default: real duration of recording
4) (Optional) Convert to mp4 or not (true for convert to mp4). Default: false
5) (Optional) Possible Values: local - to store in local file system; s3 - To store in S3 complient service like AWS-S3/Digital Ocean Space. To upload in s3 config.json needs to updated with aws config details. Default: local

### Live recording

You can also use `liveJoin.js` to live join meeting as a recorder & perform recording like this:

```sh
node liveJoin.js "https://BBB_HOST/bigbluebutton/api/join?meetingId=MEETING_ID...." liveRecord.webm 0 true
```
Here `0` mean no limit. Recording will auto stop after meeting end or kickout of recorder user. You can also set time limit like this:

```sh
node liveJoin.js "https://BBB_HOST/bigbluebutton/api/join?meetingId=MEETING_ID...." liveRecord.webm 60 true
```

### Live RTMP broadcasting

Sometime you may want to broadcast meeting via RTMP. To test you can use `ffmpegServer.js` to run websocket server & `liveRTMP.js` to join the meeting. You'll have to edit `rtmpUrl` & `ffmpegServer` info inside `config.json` file (if need). 


1) First run websocket server by `node ffmpegServer.js`
2) Then in another terminal tab

```sh
node liveRTMP.js "https://BBB_HOST/bigbluebutton/api/join?meetingId=MEETING_ID...."
```
You can also set duration otherwise it will close after meeting end or kickout:

```sh
node liveRTMP.js "https://BBB_HOST/bigbluebutton/api/join?meetingId=MEETING_ID...." 20
```

Check the process of websocket server, `ffmpeg` should start sending data to RTMP server.

### How it will work?
When you will run the command that time `Chrome` browser will be open in background & visit the link to perform screen recording. So, if you have set 10 seconds then it will record 10 seconds only. Later it will give you file as webm or mp4.

**Note: It will use extra CPU to process chrome & ffmpeg.** 


## Looking for Bigbluebutton shared hosting?

We are offering cheaper [Bigbluebutton Premium hosting](https://www.mynaparrot.com/classroom/bigbluebuttonservice) or Bigbluebutton installation/configuration/loadbalance service. You can send me email jibon[@]mynaparrot.com


### Thanks to

[puppetcam](https://github.com/muralikg/puppetcam). Most of the parts were copied from there. 

[Canvas-Streaming-Example](https://github.com/fbsamples/Canvas-Streaming-Example)
