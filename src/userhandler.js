const User = require('./models/user');
const jwt = require('jwt-simple');
const Config = require('./config'),
      config = new Config();
const redisClient = require('redis').createClient;
const serviceLookupHandler = require("./consulLookup.js");


var userhandler = (function() {
  var deps = {};

  deps.createUser = function(userName, email, password, role) {
    return new Promise(
      function(resolve , reject) {
        var user = new User({
          userName: userName,
          email: email,
          password: password,
          role: role
        });
        user.save(function(err, savedUser) {
          if (err) {
            console.log("error is " + err);
            reject(err);
          } else {
            console.log("saved " + savedUser);
            resolve(savedUser);
          }
        });
    });
  }

  deps.login = function(userName , password){
    return new Promise(
      function(resolve, reject) {
        deps.getUserByUserName(userName).then(user => {
          if (!user) {
            reject({success: false, msg:"No user found"});
          } else {
            user.comparePassword(password, function (err, isMatch){
              if(!isMatch) {
                reject({success: false, msg: 'Password incorrect'});
              } else {
                user.password = undefined;
                user.email = undefined;
                var token = jwt.encode(user, config.secret);

                var now = new Date();
                var utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
                utc.setMinutes(utc.getMinutes() + config.tokenExpiryMinutes);

                serviceLookupHandler.serviceLookup("backofficetokenredis", '').then(serverAddress => {
                  var backofficetokenredis = redisClient(serverAddress.port, serverAddress.address);
                  backofficetokenredis.set(user._id.toString(), utc.getTime());
                  resolve({success: true, token: token, userid: user._id, msg:"User authenticated"});
                }).catch(error => {
                  throw "Could not look up service " + error;
                });
              }
            });
          }
        }).catch(error => {
          return {success: false, msg: 'Authentication failed.'};
        })
      }
    )
  }

  //grabs header and splices for token
  deps.getToken = function(headers) {
    return new Promise(
      function(resolve,reject){
        if(headers && headers.authorization) {
          var parted = headers.authorization.split(' ');
          if(parted.length === 1) {
            resolve(parted[0]);
          } else {
            reject({success:false,error:"No token"});
          }
        } else {
           reject({success:false,error:"Missing header"});
        }
      }
    )
  }

  //checks token for role
  deps.hasAccess = function(accessLevel, token){
    return new Promise(
      function(resolve,reject){
        if(!token){
          reject({success: false, error:"no token provided"});
        }
        decoded = jwt.decode(token, config.secret);
        deps.getUserById(decoded._id).then(user => {
          if(user.role === accessLevel){
            resolve({success:true, msg:"Correct permissions"});
          } else {
            reject({success: false, error: "Incorrect permissions"});
          }
        })
      }
    )
  }

  deps.getUserByUserName = function(userName) {
    return new Promise(
      function(resolve , reject) {
          User.findOne({
              userName: userName
          })
          .exec(function(err, user){
            if (err) {
              reject(err);
            } else {
              resolve(user);
            }
          });
        });
  }

  deps.getUserById = function(id) {
    return new Promise(
      function(resolve , reject) {
          User.findOne({
              _id: id
          })
          .exec(function(err, user){
            if (err) {
              reject(err);
            } else {
              resolve(user);
            }
          });
        });
  }

  /**
 * Create user.
 * @param {string} userName - users username.
 * @param {string} email - users email.
 * @param {string} password - users password.
 * @param {string} role - users role.
 */
  function createUser(userName, email, password, role) {
    return deps.createUser(userName, email, password, role);
  }

  function getUserByUserName(userName) {
    return deps.getUserByUserName(userName)
  }

  function getUserById(id) {
    return deps.getUserById(id)
  }

  function getToken(headers){
    return deps.getToken(headers)
  }

  function hasAccess(accessLevel, token){
    return deps.hasAccess(accessLevel, token)
  }

  function login(userName, password){
    return deps.login(userName,password)
  }

  return {
    "createUser": createUser,
    "getUserByUserName":getUserByUserName,
    "getUserById":getUserById,
    "getToken":getToken,
    "hasAccess":hasAccess,
    "login" : login,
    "deps": deps
  };

})();

module.exports = userhandler;
