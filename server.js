// ==== DECLARATIONS ==== //
const express = require('express');
const request = require('request');
const helmet = require('helmet');
const RateLimit = require('express-rate-limit');
const limiter = new RateLimit({
	windowMs: 30 * 60 * 1000,
	max: 20,
	delayMs: 0
});
const app = express();

const knownVersions = ['1.0', '1.1'];


// ==== FUNCTIONS ==== //
/**
 * Set the options for querying CR
 * @param  {Response} query Query from the url
 * @return {Object}     Options for the query to CR
 */
function setOptions(query) {
	let options = {
		url: 'https://api.crunchyroll.com/start_session.0.json',
		qs: {
			version: '1.0', // eslint-disable-line
			access_token: 'Scwg9PRRZ19iVwD', // eslint-disable-line
			device_type: 'com.crunchyroll.crunchyroid', // eslint-disable-line
			device_id: generateId() // eslint-disable-line
		}
	};
	if (query.auth) {
		options.qs.auth = query.auth;
	}
	return options;
}

/**
 * Generate a random 32 character long device ID
 * @return {String} Generated device ID
 */
function generateId() {
	let id = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (var i = 0; i < 32; i++) {
		id += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return id;
}

/**
 * Emit a negative reply containing an error message
 * @param  {Object} res  Reply object
 * @param  {String} err Error message
 */
function replyError(res, err) {
	res.status(500).send({
		message: err,
		code: 'error',
		error: true
	});
}

/**
 * Emit a positive reply containing data
 * @param  {Object} res  Reply object
 * @param  {Object} data Object containing the requested payload
 */
function replySuccess(res, data) {
	res.status(200).send(data);
}

// ==== ROUTING ==== //
// support for reverse proxy
app.enable('trust proxy');
app.disable('view cache');
// use the middleware
app.use(helmet());
app.use(helmet.noCache());
app.use(limiter);
app.get('/start_session', (req, res) => {
	// default version if none specified: 1.0
	let version = req.query.version;
	if (version === undefined) {
		version = '1.0';
	}
	// validate version against whitelist
	if (knownVersions.indexOf(version) === -1) {
		replyError(res, 'Invalid API version specified.');
		return;
	}
	// parse version into object containing minor and major version
	let split = version.split('.');
	version = { major: parseInt(split[0]) || 0, minor: parseInt(split[1]) || 0 };

	if (version.major === 1) {
		if (version.minor <= 0 && req.query.auth) {
			// version <= 1.0: only start_session without logging in is supported
			replyError(res, 'Logging in with an auth token is disabled in this version.');
			return;
		} else if (version.minor >= 1 && req.query.auth && !req.query.user_id) {
			// version >= 1.1: logging in with auth token requires user_id to match
			replyError(res, 'Logging in with an auth token requires the user_id parameter.');
			return;
		}
		let options = setOptions(req.query);
		request(options, (error, response, body) => {
			let data = JSON.parse(body);
			if (data.error) {
				replySuccess(res, data);
			} else if (req.query.auth && data.data.user !== null && data.data.user.user_id !== req.query.user_id) {
				// if auth is specified, require that user_id matches
				replyError(res, 'Invalid user_id specified.');
			} else {
				replySuccess(res, data);
			}
		}).on('error', error => {
			console.log(`Error fetching ${options.url}: ${error}`);
			replyError(res, error);
		});
	}
});
app.get('*', (req, res) => {
	replyError(res, 'Invalid API endpoint.');
});

// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 3001; // eslint-disable-line
app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});
