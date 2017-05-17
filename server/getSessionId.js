const request = require('request');
var args = process.argv.slice(2);
var options = { uri: `http://www.crunchyroll.com/` };
if (args.length == 2) {
	options.headers = {
		Cookie: `c_userid=${args[0]}; c_userkey=${args[1]}`
	}
}
console.log(options)
request(options, (err, res, body) => {
	if (err) return process.stderr.write(err);
	let pattern = /^sess_id=([^;]+)/;
	res.headers['set-cookie'].forEach((cookie) => {
		var match = pattern.exec(cookie);
		if (match != null)
		{
			process.stdout.write(match[1]);
			return;
		}
	});
});
