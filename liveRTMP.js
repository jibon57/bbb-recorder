const puppeteer = require('puppeteer');
const Xvfb      = require('xvfb');
var exec = require('child_process').exec;
const fs = require('fs');
var config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const os = require('os');
const homedir = os.homedir();
const platform = os.platform();

const ffmpegServer = config.ffmpegServer + ":" + config.ffmpegServerPort + "/auth/" + config.auth;

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
            duration = process.argv[3], 
            exportname = 'liveMeeting.webm'

        if(!url){ url = 'https://www.mynaparrot.com/' }
        //if(!duration){ duration = 10 }
        
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

        await page.evaluate((serverAddress) => {
            console.log("FFMPEG_SERVER");
            window.postMessage({type: 'FFMPEG_SERVER', ffmpegServer: serverAddress}, '*')
        }, ffmpegServer)

        await page.waitForSelector('[aria-label="Listen only"]');
        await page.click('[aria-label="Listen only"]', {waitUntil: 'domcontentloaded'});

        await page.waitForSelector('[id="chat-toggle-button"]');
        await page.click('[id="chat-toggle-button"]', {waitUntil: 'domcontentloaded'});
        await page.click('button[aria-label="Users and messages toggle"]', {waitUntil: 'domcontentloaded'});
        await page.$eval('[class^=navbar]', element => element.style.display = "none");

        await page.$eval('.Toastify', element => element.style.display = "none");
        await page.waitForSelector('button[aria-label="Leave audio"]');
        await page.$eval('[class^=actionsbar] > [class^=center]', element => element.style.display = "none");
        
        await page.evaluate((x) => {
            console.log("REC_START");
            window.postMessage({type: 'REC_START'}, '*')
        })

        if(duration > 0){
            await page.waitFor((duration * 1000))
        }else{
            await page.waitForSelector('[class^=modal] > [class^=content] > button[description="Logs you out of the meeting"]', {
                timeout: 0
            });
        }

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
        
        fs.unlinkSync(homedir + "/Downloads/liveMeeting.webm");
        
    }catch(err) {
        console.log(err)
    }
}

main()
