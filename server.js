const express = require('express');
// const request = require('request');
const axios = require('axios');
const helmet = require('helmet');
const qs = require('querystring');
const app = express();

const URL = 'https://api.crunchyroll.com/start_session.0.json';
const knownVersions = ['1.0', '1.1'];

/**
 * Set the options for querying CR
 * @param  {Response} query Query from the url
 * @return {Object}     Options for the query to CR
 */
function setOptions(query) {
	let querystring = {
		version: '1.0',
		access_token: 'Scwg9PRRZ19iVwD', // eslint-disable-line
		device_type: 'com.crunchyroll.crunchyroid', // eslint-disable-line
		device_id: generateId() // eslint-disable-line
	};

	if (query.auth) {
		querystring.auth = query.auth;
	}

	if (query.device_id && (query.device_id !== '' || query.device_id !== undefined || query.device_id !== null)) {
		querystring.device_id = query.device_id;
	}

	return querystring;
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
app.get('/start_session', (req, res) => {
	// default version if none specified: 1.0
	let version = req.query.version || '1.0';

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

		axios(`${URL}?${qs.stringify(options)}`)
			.then((result) => {
				const body = result.data;
				if (body.error) {
					replySuccess(res, body);
					return;
				} else if (body.data.user && req.query.auth && body.data.user.user_id !== req.query.user_id) {
					// if auth is specified, require that user_id matches
					replyError(res, 'Invalid user ID');
					return;
				}

				replySuccess(res, result.data);
			})
			.catch((e) => {
				if (e.response) {
					// server replied with non 200 range status code or with an error
					replyError(res, e.response.data);
					console.log(`Crunchyroll api returned a non 200 status code: ${e.response.data}`);
					return;
				} else {
					replyError(res, 'Something went wrong with the request');
					console.log(`Something went wrong with the request:`);
					console.log(e);
					return;
				}
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

module.exports = app;
