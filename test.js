/* global describe, it */

// eslint-disable-next-line
process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('./server.js');

// eslint-disable-next-line
const should = chai.should();

chai.use(chaiHttp);

describe('/start_session', () => {
	it('should return a valid session id from the cr server', (done) => {
		chai.request(server)
			.get('/start_session')
			.end((err, res) => {
				if (err) {
					done(`Server returned an error: ${err}`);
				}

				res.should.have.status(200);
				res.body.should.be.a('object');
				res.body.should.have.property('data');
				res.body.should.have.property('error').eql(false);
				res.body.should.have.property('code').eql('ok');
				done();
			});
	});
	it('should return an error due to an invalid version', (done) => {
		chai.request(server)
			.get('/start_session?version=555')
			// eslint-disable-next-line
			.end((err, res) => {
				res.should.have.status(500);
				res.body.should.have.property('error').eql(true);
				res.body.should.have.property('code').eql('error');
				done();
			});
	});
	it('should return an error because auth in v1.0 is not supported', (done) => {
		chai.request(server)
			.get('/start_session?version=1.0&auth=123')
			// eslint-disable-next-line
			.end((err, res) => {
				res.should.have.status(500);
				res.body.should.have.property('error').eql(true);
				res.body.should.have.property('code').eql('error');
				done();
			});
	});
	it('should return a valid session id with auth provided', (done) => {
		chai.request(server)
			.get('/start_session?version=1.1&auth=123&user_id=123')
			.end((err, res) => {
				if (err) {
					done(`Server returned an error: ${err}`);
				}
				res.should.have.status(200);
				res.body.should.have.property('data');
				res.body.should.have.property('error').eql(false);
				res.body.should.have.property('code').eql('ok');
				done();
			});
	});
	it('should return a valid session id with device_id provided', (done) => {
		chai.request(server)
			.get('/start_session?version=1.1&device_id=abc123test')
			.end((err, res) => {
				if (err) {
					done(`Server returned an error: ${err}`);
				}
				res.should.have.status(200);
				res.body.should.have.property('data');
				res.body.should.have.nested.property('data.device_id').eql('abc123test');
				res.body.should.have.property('error').eql(false);
				res.body.should.have.property('code').eql('ok');
				done();
			});
	});
});
