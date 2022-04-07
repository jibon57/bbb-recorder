const exec = require("child_process").exec;
recordings = ['9cdfe0c61d329282ea038bb3be48d3f46271baa0-1598332811537']
recordings.forEach(function(record_id){
  console.log(
    `node export.js "https://meet5.scoutlive.in/playback/presentation/2.0/playback.html?meetingId=${record_id}" ${record_id}.webm 10 true local`
  );
  const myShellScript = exec(
    `node export.js "https://meet5.scoutlive.in/playback/presentation/2.0/playback.html?meetingId=${record_id}" ${record_id}.webm 10 true local`
  );

  myShellScript.stdout.on("data", (data) => {
    if (data.search("File uploaded successfully") > -1) {
      getRecordMeta(eventObj);
    }
  });
  myShellScript.stderr.on("data", (data) => {
    console.error(data);
  });
});
