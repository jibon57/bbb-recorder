const puppeteer = require('puppeteer');
const Xvfb      = require('xvfb');
const fs = require('fs');
const os = require('os');
const homedir = os.homedir();
const platform = os.platform();
const { copyToPath } = require('./env');
const spawn = require('child_process').spawn;

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
    '--start-fullscreen',
    '--app=https://www.google.com/',
    `--window-size=${width},${height}`,
  ],
}

if(platform == "linux"){
    options.executablePath = "/usr/bin/google-chrome"
}else if(platform == "darwin"){
    options.executablePath = "/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome"
}

async function main() {
    let browser, page;

    try{
        if(platform == "linux"){
            xvfb.startSync()
        }
        var url = process.argv[2],
            exportname = process.argv[3],
            duration = process.argv[4],
            convert = process.argv[5]

        if(!url){ url = 'https://www.mynaparrot.com/' }
        if(!exportname){ exportname = 'live.webm' }
        //if(!duration){ duration = 10 }
        if(!convert){ convert = false }

        browser = await puppeteer.launch(options)
        const pages = await browser.pages()

        page = pages[0]

        page.on('console', msg => {
            var m = msg.text();
            //console.log('PAGE LOG:', m) // uncomment if you need
        });

        await page._client.send('Emulation.clearDeviceMetricsOverride')
        await page.goto(url, {waitUntil: 'networkidle2'})
        await page.setBypassCSP(true)

        await page.waitForSelector('[aria-label="Listen only"]');
        await page.click('[aria-label="Listen only"]', {waitUntil: 'domcontentloaded'});

        await page.waitForSelector('[id="chat-toggle-button"]');
        await page.click('[id="chat-toggle-button"]', {waitUntil: 'domcontentloaded'});
        await page.click('button[aria-label="Users and messages toggle"]', {waitUntil: 'domcontentloaded'});
        await page.$eval('[class^=navbar]', element => element.style.display = "none");

        await page.$eval('.Toastify', element => element.style.display = "none");
        await page.waitForSelector('button[aria-label="Leave audio"]');
        await page.$eval('[class^=actionsbar] > [class^=center]', element => element.style.display = "none");
        await page.mouse.move(0, 700);
        await page.addStyleTag({content: '@keyframes refresh {0%{ opacity: 1 } 100% { opacity: 0.99 }} body { animation: refresh .01s infinite }'});

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

        if(convert){
            convertAndCopy(exportname)
        }else{
            copyOnly(exportname)
        }

    }catch(err) {
        console.log(err)
    } finally {
        page.close && await page.close()
        browser.close && await browser.close()

        if(platform == "linux"){
            xvfb.stopSync()
        }
    }
}

main()

function convertAndCopy(filename){

    var copyFromPath = homedir + "/Downloads";
    var onlyfileName = filename.split(".webm")
    var mp4File = onlyfileName[0] + ".mp4"
    var copyFrom = copyFromPath + "/" + filename + ""
    var copyTo = copyToPath + "/" + mp4File;

    if(!fs.existsSync(copyToPath)){
        fs.mkdirSync(copyToPath);
    }

    console.log(copyTo);
    console.log(copyFrom);

    const ls = spawn('ffmpeg',
        [   '-y',
            '-i "' + copyFrom + '"',
            '-c:v libx264',
            '-preset veryfast',
            '-movflags faststart',
            '-profile:v high',
            '-level 4.2',
            '-max_muxing_queue_size 9999',
            '-vf mpdecimate',
            '-vsync vfr "' + copyTo + '"'
        ],
        {
            shell: true
        }

    );

    ls.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    ls.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    ls.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        if(code == 0)
        {
            console.log("Convertion done to here: " + copyTo)
            fs.unlinkSync(copyFrom);
            console.log('successfully deleted ' + copyFrom);
        }

    });
}

function copyOnly(filename){

    var copyFrom = homedir + "/Downloads/" + filename;
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

