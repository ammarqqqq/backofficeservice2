//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

let mongoose = require("mongoose");

//Require the dev-dependencies
let chai = require('chai');
let expect = require('chai').expect;
let should = require('chai').should;
let assert = require('chai').assert;
let sinon = require('sinon');





sinon.stub(require('../src/consulLookup.js'), 'serviceLookup').returns(
  new Promise(
   function(resolve , reject) {
     var reply = {
       address: 'localhost',
       port: 27017,
       routePath: 'backoffice_integration_test'
     }
     resolve(reply)
   }
 )
);

let User = require('../src/models/user');
let server = require('../src/server');

chai.use(require('chai-http'));


//Our parent block
describe('Integration-test: Server, User', () => {

  // before(() => {
  //   sinon.spy(redis, 'set');
  // });
  //
  // after(() => {
  //   redis.set.restore();
  // });

  beforeEach((done) => { //Before each test we empty the database
    User.remove({}, (err) => {
      done();
    });
  });


  /*
  * Test the /GET info route
  */

  describe('/GET /', () => {
      it('it should send an info message', (done) => {
        chai.request(server)
        .get('/backoffice/')
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          done();
        });
      });
  });

  /*
  * Test the /POST createUser route
  */
  describe('/Post createemployee', () => {
      it('it should POST create new user if id data is supplied', (done) => {
        chai.request(server)
            .post('/backoffice/createemployee')
            .set('content-type', 'application/x-www-form-urlencoded')
            .send(
              {
                'userName': 'TestEmployee',
                'email' : 'Test@email.com',
                'password': 'dummypassword',
                'role': 'accounting'
              }
            )
            .end(function(err, res) {
              expect(err).to.be.null;
              expect(res).to.have.status(200);
              expect(res).to.be.json;
              done();
            });
      });
  });

  describe('/Post createemployee', () => {
      it('it should get 500 when missing password', (done) => {
        chai.request(server)
            .post('/backoffice/createemployee')
            .set('content-type', 'application/x-www-form-urlencoded')
            .send({
                    'userName': 'TestEmployee',
                    'email' : 'Test@email.com',
                    'role': 'admin'
                  })
            .end(function(err, res) {
              expect(err).to.not.be.null;
              expect(res).to.have.status(500);
              expect(res).to.be.json;
              done();
            });
      });
  });

  /*
  * Test POST login route
  */
  describe('/Post login', () => {
    it('it should fail, no mobile/password', (done) => {
        chai.request(server)
            .post('/backoffice/login')
            .end(function(err, res) {
              expect(err).to.be.not.null;
              expect(res).to.have.status(401);
              expect(res).to.be.json;
              done();
            });
      });
  });

  /*
  * Test POST create and login route
  */
  describe('/Post createemployee', () => {
      it('it should POST create new user and log in and return a token', (done) => {
        var token = ''
        chai.request(server)
            .post('/backoffice/createemployee')
            .set('content-type', 'application/x-www-form-urlencoded')
            .send(
              {
                'userName': 'admin',
                'email' : 'Test@email.com',
                'password': 'password',
                'role': 'admin'
              }
            )
            .end(function(err, res) {
              expect(err).to.be.null;
              expect(res).to.have.status(200);
              expect(res).to.be.json;

              chai.request(server)
                .post('/backoffice/login')
                .send({'userName': 'admin', 'password': 'password'})
                .end(function(err, res) {
                  expect(err).to.be.null;
                  expect(res.body.token).to.not.be.null;
                  expect(res).to.have.status(200);
                  expect(res).to.be.json;
                  done();
                });
            });
      });
  });

});//End parent block
