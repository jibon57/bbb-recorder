const puppeteer = require('puppeteer');
const Xvfb      = require('xvfb');
var exec = require('child_process').exec;
const fs = require('fs');
const homedir = require('os').homedir();

var xvfb        = new Xvfb({silent: true});
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

async function main() {
    try{
        xvfb.startSync()
        var url = process.argv[2],
            exportname = process.argv[3], 
            duration = process.argv[4],
            convert = process.argv[5]

        if(!url){ url = 'http://tobiasahlin.com/spinkit/' }
        if(!exportname){ exportname = 'spinner.webm' }
        //if(!duration){ duration = 10 }
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

        if(duration){
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
        xvfb.stopSync()

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

    var cmd = "ffmpeg -y -i '" + copyFrom + "' -preset veryfast -movflags faststart -profile:v high -level 4.2 '" + copyTo + "'";

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

