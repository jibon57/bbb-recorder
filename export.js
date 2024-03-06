const puppeteer = require('puppeteer');
const Xvfb = require('xvfb');
const fs = require('fs');
const os = require('os');
const homedir = os.homedir();
const platform = os.platform();
const { copyToPath, playbackFile } = require('./env');
const spawn = require('child_process').spawn;

var xvfb = new Xvfb({
    silent: true,
    xvfb_args: ["-screen", "0", "1280x800x24", "-ac", "-nolisten", "tcp", "-dpi", "96", "+extension", "RANDR"]
});
var width = 1280;
var height = 720;
var options = {
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

if (platform == "linux") {
    options.executablePath = "/usr/bin/google-chrome"
} else if (platform == "darwin") {
    options.executablePath = "/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome"
}

async function main() {
    let browser, page;

    try {
        if (platform == "linux") {
            xvfb.startSync()
        }

        var url = process.argv[2];
        if (!url) {
            console.warn('URL undefined!');
            process.exit(1);
        }
        // Verify if recording URL has the correct format
        var urlRegexV22 = new RegExp('^https?:\\/\\/.*\\/playback\\/presentation\\/2\\.0\\/' + playbackFile + '\\?meetingId=[a-z0-9]{40}-[0-9]{13}');
        var urlRegexV23 = new RegExp('^https?:\\/\\/.*\\/playback\\/presentation\\/2\\.3\\/[a-z0-9]{40}-[0-9]{13}');

        var bbbVersionIs23 = false;

        if (urlRegexV22.test(url)) {
            bbbVersionIs23 = false;
        } else if (urlRegexV23.test(url)) {
            bbbVersionIs23 = true;
        } else {
            console.warn('Invalid recording URL!');
            process.exit(1);
        }

        var exportname = process.argv[3];
        // Use meeting ID as export name if it isn't defined or if its value is "MEETING_ID"
        if (!exportname || exportname == "MEETING_ID") {
            exportname = bbbVersionIs23 ? url.split('2.3/')[1] + '.webm' : url.split("=")[1] + '.webm';
        }

        var duration = process.argv[4];
        // If duration isn't defined, set it in 0
        if (!duration) {
            duration = 0;
            // Check if duration is a natural number
        } else if (!Number.isInteger(Number(duration)) || duration < 0) {
            console.warn('Duration must be a natural number!');
            process.exit(1);
        }

        var convert = process.argv[5]
        if (!convert) {
            convert = false
        } else if (convert !== "true" && convert !== "false") {
            console.warn("Invalid convert value!");
            process.exit(1);
        }

        browser = await puppeteer.launch(options)
        const pages = await browser.pages()

        page = pages[0]

        page.on('console', msg => {
            var m = msg.text();
            //console.log('PAGE LOG:', m) // uncomment if you need
        });

        await page._client.send('Emulation.clearDeviceMetricsOverride')
        // Catch URL unreachable error
        await page.goto(url, { waitUntil: 'networkidle2' }).catch(e => {
            console.error('Recording URL unreachable!');
            process.exit(2);
        })
        await page.setBypassCSP(true)

        let pageMessage = '';

        // Check if recording exists
        if (bbbVersionIs23) {
            pageMessage = await page.evaluate(() => {
                if (document.getElementsByClassName("error-code")[0]) {
                    return document.getElementsByClassName("error-code")[0].textContent;
                }
            });
        } else  {
            pageMessage = await page.evaluate(() => {
                if (document.getElementById("load-msg")) {
                    return document.getElementById("load-msg").textContent;
                }
            });
        }

        if (pageMessage === "Recording not found" || pageMessage === "404") {
            console.warn("Recording not found!");
            process.exit(1);
        }

        var recDuration;

        // Get recording duration
        if (bbbVersionIs23) {
            // for some reason, in the latest versions of BBB, document.getElementById is evaluated BEFORE
            // the DOM is fully loaded, which results in error
            // Cannot read properties of null (reading 'duration')
            // see https://github.com/jibon57/bbb-recorder/issues/100
            // Quick fix : wait for 10 seconds before reading the duration
            await page.waitFor(10000);
            recDuration = await page.evaluate(() => {
                return document.getElementById("vjs_video_3_html5_api").duration
            });
        } else {
            recDuration = await page.evaluate(() => {
                return document.getElementById("video").duration
            });
        }

        // If duration was set to 0 or is greater than recDuration, use recDuration value
        if (duration == 0 || duration > recDuration) {
            duration = recDuration;
        }
        console.log(duration);

        if (!bbbVersionIs23) {
            await page.waitForSelector('button[class=acorn-play-button]');
            await page.$eval('#navbar', element => element.style.display = "none");
            await page.$eval('#copyright', element => element.style.display = "none");
            await page.$eval('.acorn-controls', element => element.style.opacity = "0");
            await page.click('button[class=acorn-play-button]', { waitUntil: 'domcontentloaded' });
        } else {
            await page.waitForSelector('button[class~="vjs-play-control"]');
            await page.$eval('.top-bar', element => element.style.display = "none");
            await page.$eval('.bottom-content', element => element.style.display = "none");
            await page.$eval('.vjs-control-bar', element => element.style.opacity = "0");
            await page.click('button[class~="vjs-play-control"]', { waitUntil: 'domcontentloaded' });
        }

        await page.evaluate((x) => {
            console.log("REC_START");
            window.postMessage({ type: 'REC_START' }, '*')
        })

        // Perform any actions that have to be captured in the exported video
        await page.waitFor((duration * 1000))

        await page.evaluate(filename => {
            window.postMessage({ type: 'SET_EXPORT_PATH', filename: filename }, '*')
            window.postMessage({ type: 'REC_STOP' }, '*')
        }, exportname)

        // Wait for download of webm to complete
        await page.waitForSelector('html.downloadComplete', { timeout: 0 })

        if (convert == "true") {
            convertAndCopy(exportname)
        } else {
            copyOnly(exportname)
        }

    } catch (err) {
        console.log(err)
    } finally {
        page.close && await page.close()
        browser.close && await browser.close()

        if (platform == "linux") {
            xvfb.stopSync()
        }
    }
}

main()

function convertAndCopy(filename) {
    console.log("Convert And Copy");

    var copyFromPath = homedir + "/Downloads";
    var onlyfileName = filename.split(".webm")
    var mp4File = onlyfileName[0] + ".mp4"
    var copyFrom = copyFromPath + "/" + filename + ""
    var copyTo = copyToPath + "/" + mp4File;

    if (!fs.existsSync(copyToPath)) {
        fs.mkdirSync(copyToPath);
    }

    console.log(copyTo);
    console.log(copyFrom);

    const ls = spawn('ffmpeg', ['-y',
            '-i "' + copyFrom + '"',
            '-c:v libx264',
            '-preset veryfast',
            '-movflags faststart',
            '-profile:v high',
            '-level 4.2',
            '-max_muxing_queue_size 9999',
            '-vf mpdecimate',
            '-vsync vfr "' + copyTo + '"'
        ], {
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
        if (code == 0) {
            console.log("Convertion done to here: " + copyTo)
            fs.unlinkSync(copyFrom);
            console.log('successfully deleted ' + copyFrom);
        }

    });

}

function copyOnly(filename) {
    console.log("Copy Only");

    var copyFrom = homedir + "/Downloads/" + filename;
    var copyTo = copyToPath + "/" + filename;

    if (!fs.existsSync(copyToPath)) {
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
