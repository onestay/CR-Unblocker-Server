// ==== DECLARATIONS ==== //
const express = require('express');
const request = require('request');
const helmet = require('helmet');
const RateLimit = require('express-rate-limit');
const limiter = new RateLimit({
	windowMs: 15 * 60 * 1000,
	max: 20,
	delayMs: 0
});
const app = express();


// ==== FUNCTIONS ==== //
/**
 * Extract the required data from the response
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
			device_id: Math.floor(Math.random() * 10000000) // eslint-disable-line
		}
	};
	if (query.auth) {
		options.qs.auth = query.auth;
	}
	return options;
}

/**
 * Emit a positive reply containing data
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
// use the middleware
app.use(helmet());
app.use(limiter);
app.get('*', (req, res) => {
	let options = setOptions(req.query);
	request(options, (error, response, body) => {
		replySuccess(res, JSON.parse(body));
	}).on('error', error => {
		console.log(`Error fetching ${options.url}: ${error}`);
		replyError(res, error);
	});
});

// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 3001; // eslint-disable-line
app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});
