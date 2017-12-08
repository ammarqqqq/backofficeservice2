const express = require('express');
const router = express.Router();
const userhandler = require('./userhandler.js');
const jwt = require('jwt-simple');
const Config = require('./config'),
      config = new Config();
const logger = require('./logger.js')
const request = require('request');
const User = require('./models/user');


const redisClient = require('redis').createClient;
const serviceLookupHandler = require("./consulLookup.js");


router.get('/', function (req, res) {
  res.send("Welcome to the backoffice service");
});

router.post('/createemployee', function (req,res){
  console.log("Create employee: "+ JSON.stringify(req.body));
  // userhandler.getToken(req.headers).then(token => {
  //   userhandler.hasAccess("admin", token).then(response => {
      userhandler.createUser(req.body.userName, req.body.email, req.body.password, req.body.role).then(savedUser => {
        return res.json({success: true, userid: savedUser._id});
      }).catch(function(error) {
        logger.error(error);
        return res.status(500).json({success: false, msg: 'Could not create employee. Contact support'});
      });
  //   }).catch(function(error) {
  //     logger.error(error);
  //     return res.json({success: false, msg: "Could not get token"});
  //   });
  // }).catch(function(error) {
  //   logger.error(error);
  //   return res.json({success: false, msg: "User has wrong permissions"});
  // });
});

router.post('/deleteemployee/:employeeid', function (req, res) {
  console.log("Delete User ", req.params);
  User.findOneAndRemove({ _id : req.params.employeeid }, function(err, result){
    if (err){
      logger.error(err);
      return res.json({ success:false, msg:err });
    } else if (!result) {
      logger.warn("No employee found");
      return res.json({ success: true, msg:"No employee found" });
    } else {
      return res.json({ success: true, msg:"User deleted" });
    }
  })
});

router.post('/login', function (req, res) {
  console.log("req object: ",req.body)
  try {

    if(!req.body.userName) throw "No username given";
    if(!req.body.password) throw "No password given";

    userhandler.login(req.body.userName, req.body.password).then(response => {
      // console.log("response: " , response)
      if(response){
      return res.json({success: response.success , token: response.token , _id: response.userid , msg:"User authenticated"});
      }
    }).catch(error => {
      console.log("catch: ",error)
      return res.json({success:false, msg: "Authentication failed"})
    })

  } catch(error) {
    console.log("Error occured " + error)
    logger.error("Error occured " + error)
    return res.status(401).json({success: false, msg: 'Authentication failed.'});
  }
});

router.get('/loggedin', function(req,res) {
  console.log("loggedin headers" , req.headers);
  userhandler.getToken(req.headers).then(token => {
    var decoded = jwt.decode(token, config.secret);
    console.log("dat token: ",decoded)
    //serviceLookupHandler.serviceLookup("backofficetokenredis", '').then(serverAddress => {
      //var backofficetokenredis = redisClient(serverAddress.port, serverAddress.address);
      var backofficetokenredis = redisClient(6377, 'backofficetokenredis');
      backofficetokenredis.get(decoded._id.toString(), function(err, reply) {
        if (err || !reply) {
          console.log(err);
          console.log(reply);
          return res.status(401).json({success: false, msg: 'Authentication failed.'});
        }

        /**
        * Check if token is expired
        */
        var now = new Date();
        var utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
        console.log("reply: ",reply)
        var expiryDate = new Date();
        expiryDate.setTime(reply);
        console.log("expires: " + expiryDate);
        console.log("utc    : " + utc);
        console.log("expired: " + (expiryDate < utc));

        if (expiryDate < utc) {
          return res.status(401).json({success: false, msg: 'Authentication expired.'});
        } else {
          var now = new Date();
          var utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
          utc.setMinutes(utc.getMinutes() + 1);
        }

        userhandler.getUserById(decoded._id).then(user => {
          console.log("user: ",user)
          return res.json({success: true, msg: 'Authenticated.'});
        }).catch(error => {
          logger.error(error)
          return res.json({success: false, msg: error});
        })
      });

/*    }).catch(error => {
      logger.error(error)
      return res.json({success: false, msg: error});
    })*/
  }).catch(function(err) {
    logger.error(err);
    return res.json({success: false, msg: "Could not get token"});
  });
})

module.exports = router;
