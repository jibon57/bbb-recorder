const needle = require('needle');
const jsSHA = require("jssha");

const BBBUrl = "http://test-install.blindsidenetworks.com/bigbluebutton/", 
BBBSalt = "8cd8ef52e8e101574e400365b55e11a6", 
joinName = "recorder";

function buildQuery(params){
	var esc = encodeURIComponent;
	var query = Object.keys(params)
		.map(k => (k) + '=' + esc(params[k]).replace(/%20/g, '+').replace(/[!'()]/g, escape).replace(/\*/g, "%2A"))
		.join('&');
	return query;
}

function prepareUrl(method, query){
				
	var shaObj = new jsSHA("SHA-1", "TEXT");
	shaObj.update(method + query + BBBSalt);

	var sign = shaObj.getHash("HEX");

	return BBBUrl + "api/" + method + "?" + query + "&checksum=" + sign;
}

function main() {

	var meetingId = process.argv[2]
	if(!meetingId){
		console.log("require meetingId");
		process.exit(1);
	}

	var params = {
		meetingID: meetingId
	}

	var query = buildQuery(params);
	var url = prepareUrl('getMeetingInfo', query);

	needle.get(url, function(error, response) {
		if (!error && response.statusCode == 200){
			let data = response.body;
			//console.log(data.children.length);
			var attendeePW, moderatorPW, isOkToJoin = false;

			for (var i = 0; i < data.children.length; i++) {
				var item = data.children[i];

				if(item.name == "returncode"){
					if(item.value == "SUCCESS"){
						isOkToJoin = true;

					}else{
						console.log(item.value);
					}
				}

				if(isOkToJoin){
					if(item.name == "attendeePW"){
						attendeePW = item.value;
					}
					if(item.name == "moderatorPW"){
						moderatorPW = item.value;
					}
				}

				if(!isOkToJoin){
					if(item.name == "messageKey"){
						console.log(item.value)
					}
					if(item.name == "message"){
						console.log(item.value)
					}
				}
			}

			if(isOkToJoin){
				var params = {
					meetingID: meetingId,
					fullName: joinName,
					password: attendeePW,
					redirect: true
				}

				var query = buildQuery(params);
				var url = prepareUrl('join', query);

				console.log(url);
			}
			
		}else{
			console.log("Got error")
		}
	})
}

main();