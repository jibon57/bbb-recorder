# bbb-recorder

Bigbluebutton recordings to `webm` or `mp4`. This is an example how I have implemented BBB recordings to distibutable file. 


1. Videos will be copied to `/var/www/bigbluebutton-default/record`
3. Can converted to `mp4`. Default `webm`
2. Specify bitrate to control quality of the exported video by adjusting `videoBitsPerSecond` property in `background.js`


### Dependencies

1. xvfb (`apt install xvfb`)
2. npm modules listed in package.json (`npm install`)

### Usage

Clone the project first:

```javascript
git clone https://github.com/jibon57/bbb-recorder
cd bbb-recorder
npm install
```

Now run:

```sh
node export.js "https://BBB_HOST/playback/presentation/2.0/playback.html?meetingId=MEETING_ID" meeting.webm 10 true
```

### Options

You can pass 4 args

1) BBB recording link
2) Export file name. Should be `.webm` at end
3) Duration of recording in seconds. Default 10 seconds
4) Convert to mp4 or not (true for convert to mp4). Default false

### How it will work?
When you will run the command that time `chromium` browser will be open in background & visit the link & perform screen recording. So, if you have set 10 seconds then it will record 10 seconds only. Later it will give you file as webm or mp4.

**Note: It will use huge CPU to process chrome & ffmpeg.** 



Thanks to [@muralikg](https://github.com/muralikg/puppetcam). Everything was copied from there & I did some adjustment. 


### Looking for Bigbluebutton shared hosting?
We are offering cheaper [Bigbluebutton shared hosting](https://www.mynaparrot.com/classroom) or Bigbluebutton insallation/configuration service. You can send me email jibon[@]mynaparrot.com
