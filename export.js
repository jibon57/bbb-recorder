const puppeteer = require('puppeteer');
const Xvfb      = require('xvfb');
var exec = require('child_process').exec;
const fs = require('fs');
const os = require('os');
const homedir = os.homedir();
const platform = os.platform();

var xvfb        = new Xvfb({
    silent: true,
    xvfb_args: ["-screen", "0", "1280x800x24", "-ac", "-nolisten", "tcp", "-dpi", "96", "+extension", "RANDR"]
});
var width       = 1280;
var height      = 720;
var options     = {
  headless: false,
  args: [
    '--enable-usermedia-screen-capturing',
    '--allow-http-screen-capture',
    '--auto-select-desktop-capture-source=bbbrecorder',
    '--load-extension=' + __dirname,
    '--disable-extensions-except=' + __dirname,
    '--disable-infobars',
    '--no-sandbox',    
    '--shm-size=1gb',
    '--disable-dev-shm-usage',
    `--window-size=${width},${height}`,
  ],
}

if(platform == "linux"){
    options.executablePath = "/usr/bin/google-chrome"
}else if(platform == "darwin"){
    options.executablePath = "/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome"
}


async function main() {
    try{
        if(platform == "linux"){
            xvfb.startSync()
        }
        var url = process.argv[2],
            exportname = process.argv[3], 
            duration = process.argv[4],
            convert = process.argv[5]

        if(!url){ url = 'https://www.mynaparrot.com/' }
        if(!exportname){ exportname = 'export.webm' }
        if(!duration){ duration = 10 }
        if(!convert){ convert = false }
        
        const browser = await puppeteer.launch(options)
        const pages = await browser.pages()
        
        const page = pages[0]

        page.on('console', msg => {
            var m = msg.text();
            console.log('PAGE LOG:', m)
        });

        await page._client.send('Emulation.clearDeviceMetricsOverride')
        await page.goto(url, {waitUntil: 'networkidle2'})
        await page.setBypassCSP(true)

        await page.waitForSelector('button[class=acorn-play-button]');
        await page.$eval('#navbar', element => element.style.display = "none");
        await page.$eval('#copyright', element => element.style.display = "none");
        await page.$eval('.acorn-controls', element => element.style.display = "none");
        await page.click('video[id=video]', {waitUntil: 'domcontentloaded'});

        await page.evaluate((x) => {
            console.log("REC_START");
            window.postMessage({type: 'REC_START'}, '*')
        })

        // Perform any actions that have to be captured in the exported video
        await page.waitFor((duration * 1000))

        await page.evaluate(filename=>{
            window.postMessage({type: 'SET_EXPORT_PATH', filename: filename}, '*')
            window.postMessage({type: 'REC_STOP'}, '*')
        }, exportname)

        // Wait for download of webm to complete
        await page.waitForSelector('html.downloadComplete', {timeout: 0})
        await page.close()
        await browser.close()

        if(platform == "linux"){
            xvfb.stopSync()
        }

        if(convert){
            convertAndCopy(exportname)
        }else{
            copyOnly(exportname)
        }
        
    }catch(err) {
        console.log(err)
    }
}

main()

function convertAndCopy(filename){
 
    var copyFromPath = homedir + "/Downloads";
    var copyToPath = "/var/www/bigbluebutton-default/record";
    var onlyfileName = filename.split(".webm")
    var mp4File = onlyfileName[0] + ".mp4"
    var copyFrom = copyFromPath + "/" + filename + ""
    var copyTo = copyToPath + "/" + mp4File;

    if(!fs.existsSync(copyToPath)){
        fs.mkdirSync(copyToPath);
    }

    console.log(copyTo);
    console.log(copyFrom);

    var cmd = "ffmpeg -y -i '" + copyFrom + "' -c:v libx264 -preset veryfast -movflags faststart -profile:v high -level 4.2 -max_muxing_queue_size 9999 -vf mpdecimate -vsync vfr '" + copyTo + "'";

    console.log("converting using: " + cmd);
    
    exec(cmd, function(err, stdout, stderr) {

        if (err) console.log('err:\n' + err);
        //if (stderr) console.log('stderr:\n' + stderr);

        if(!err){
            console.log("Now deleting " + copyFrom)
            try {
              fs.unlinkSync(copyFrom);
              console.log('successfully deleted ' + copyFrom);
            } catch (err) {
              console.log(err)
            }
        }
    });
}

function copyOnly(filename){

    var copyFrom = homedir + "/Downloads/" + filename;
    var copyToPath = "/var/www/bigbluebutton-default/record";
    var copyTo = copyToPath + "/" + filename;

    if(!fs.existsSync(copyToPath)){
        fs.mkdirSync(copyToPath);
    }

    try {

        fs.copyFileSync(copyFrom, copyTo)
        console.log('successfully copied ' + copyTo);

        fs.unlinkSync(copyFrom);
        console.log('successfully delete ' + copyFrom);
    } catch (err) {
        console.log(err)
    }
}

