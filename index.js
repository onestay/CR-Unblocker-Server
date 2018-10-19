const axios = require('axios');
const qs = require('querystring');

const knownVersions = ['1.0', '1.1'];
const URL = 'https://api.crunchyroll.com/start_session.0.json';

function setOptions(query) {
	let querystring = {
		version: '1.0',
		access_token: 'Scwg9PRRZ19iVwD', // eslint-disable-line
		device_type: 'com.crunchyroll.crunchyroid', // eslint-disable-line
		device_id: generateId() // eslint-disable-line
	};

	if (query && query.auth) {
		querystring.auth = query.auth;
	}

	return querystring;
}

function replyError(e) {
	return {
		statusCode: 200,
		body: JSON.stringify({
			message: e,
			code: 'error',
			error: true
		})
	};
}

function replySuccess(m) {
	return {
		statusCode: 200,
		body: JSON.stringify(m)
	};
}

function generateId() {
	let id = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (var i = 0; i < 32; i++) {
		id += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return id;
}

exports.handler = async(event) => {
	let version;
	if (event.queryStringParameters && event.queryStringParameters.version) {
		version = event.queryStringParameters.version;
	} else {
		version = '1.0';
	}

	if (knownVersions.indexOf(version) === -1) {
		return replyError('Invalid API version specified');
	}

	let split = version.split('.');
	version = { major: parseInt(split[0]) || 0, minor: parseInt(split[1]) || 0 };

	if (version.major === 1) {
		if (version.minor <= 0 && event.queryStringParameters && event.queryStringParameters.auth) {
			return replyError('Logging in with an auth token is disabled in this version.');
		} else if (version.minor >= 1 && event.queryStringParameters.auth && !event.queryStringParameters.user_id) {
			return replyError('Logging in with an auth token requires the user_id parameter.');
		}
	}

	let options = setOptions(event.queryStringParameters);
	try {
		const result = await axios(`${URL}?${qs.stringify(options)}`);
		const body = result.data;
		if (body.error) {
			return replySuccess(body);
		} else if (body.data.user && event.queryStringParameters && event.queryStringParameters.auth && body.data.user.user_id !== event.queryStringParameters.user_id) {
			// if auth is specified, require that user_id matches
			return replyError('Invalid user ID');
		}

		return replySuccess(body);
	} catch (e) {
		if (e.response) {
			// server replied with non 200 range status code or with an error
			console.log(`Crunchyroll api returned a non 200 status code: ${e.response.data}`);
			return replyError(e.response.data);
		} else {
			console.log(`Something went wrong with the request:`);
			console.log(e);
			return replyError('Something went wrong with the request');
		}
	}
};
