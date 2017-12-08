require('@risingstack/trace');
const express = require('express');
const https = require('https');
const http = require("http");
const request = require("request");
const bodyParser = require('body-parser');
const fs = require('fs');
const Config = require('./config'),
      config = new Config();
const mongoDb = require('./mongohandler').listen();
const logger = require('./logger.js')
const morgan = require('morgan');



//process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

process.on('error', err => {
  console.log('#338: process error', err)
})

process.on('uncaughtException', function (err) {
  console.log('#338: process uncaught exception', err)
})

process.on('unhandledRejection', (reason, p) => {
  console.log('#338: process unhandled rejection', p, 'reason', reason)
})

const app = express();
const portnr = process.env.NODE_PORT || 8050;

app.set('superSecret', config.secret); // secret variable

app.use(bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("ServiceName", config.serviceName);
  next();
});

var routes = require('./routes.js');
var userandaccountRoutes = require('./userandaccountroutes.js');
app.use('/backoffice', routes);
app.use('/backoffice', userandaccountRoutes);

logger.stream = {
    write: function(message, encoding){
        logger.info(message);
    }
};

app.use(morgan("combined", { "stream": logger.stream }));
module.exports = app; //for test
module.exports.start = function(){


      var credentials = {
          key: fs.readFileSync('/certs/chain.key'),
          cert: fs.readFileSync('/certs/chain.crt'),
          requestCert: true,
          rejectUnauthorized: true
      };


  var httpsServer = https.createServer(credentials, app); // change to https when we get certificates
  httpsServer.listen(portnr);
  logger.info(config.serviceName + " server started. -- " + process.env.NODE_ENV);

}
