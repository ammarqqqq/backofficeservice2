const express = require('express');
const userandaccountservicerouter = express.Router();
const userhandler = require('./userhandler.js');
const jwt = require('jwt-simple');
const Config = require('./config'),
      config = new Config();
const logger = require('./logger.js')
const request = require('request');
const fs = require('fs')
const rabbitMQHandler = require('./rabbitmqhandler.js')
const serviceLookupHandler = require("./consulLookup.js");


userandaccountservicerouter.get('/listallusers', function (req, res, next) {
logger.info("List all users");
logger.debug("listallusers", req.body);
  var server = process.env.DNSDOMAIN;
  userhandler.getToken(req.headers).then(token => {
    userhandler.hasAccess("admin", token).then(response => {
      //serviceLookupHandler.serviceLookup("userandaccountservice-8080", 'backofficeroutes/listallusers').then(serverAddress => {
        request({
          url: 'https://' + server + '/userandaccountservice-8040', //URL to hit
          //url: "https://" + serverAddress.address + ":" + serverAddress.port + "/" + serverAddress.routePath,
          qs: {time: +new Date()},
          method: "GET",
          headers: {
            'host': req.headers.host,
            'servicename': config.serviceName
          },
          key: fs.readFileSync('/certs/chain.key'),
          cert: fs.readFileSync('/certs/chain.crt')
        }, function(error, response, body){
            if(error) {
              console.log("error: ",error)
              logger.error(error);
              return next();
            } else {
              var jsonObject = JSON.parse(body);
              if (jsonObject) {
                return res.json({success: true, users: jsonObject})
              } else {
                return res.status(401).json({success: false, msg: 'Could not get users'});
              }
            }
          });
        //}).catch(err => {
          //console.log("error: ",err)
          // return res.status(401).json({success: false, msg: 'Connection to userandaccountservice failed', err: err});
          //return err;
        //})
      }).catch(function(err) {
        logger.error(err);
        return res.json({success: false, msg: "User has wrong permissions",err: err});
      });
    }).catch(function(err) {
      logger.error(err);
      return res.json({success: false, msg: "Could not get token", err: err});
    });

});


userandaccountservicerouter.post('/deleteuser/:userid', function (req, res, next) {
logger.info("deleteuser");
logger.debug("deleteuser", req.body);
  var server = process.env.DNSDOMAIN;
userhandler.getToken(req.headers).then(token => {
  userhandler.hasAccess("admin", token).then(response => {
    //serviceLookupHandler.serviceLookup("userandaccountservice-8080", 'backofficeroutes/deleteuser/'+req.params.userid).then(serverAddress => {
      request({
        url: 'https://' + server + '/userandaccountservice', //URL to hit
        //url: "https://" + serverAddress.address + ":" + serverAddress.port + "/" + serverAddress.routePath,
        qs: {time: +new Date()},
        method: "POST",
        headers: {
          'host': req.headers.host,
          'servicename': config.serviceName
        },
        key: fs.readFileSync('/certs/chain.key'),
        cert: fs.readFileSync('/certs/chain.crt')
      }, function(error, response, body){
          if(error) {
            console.log("error: ",error)
            logger.error(error);
            return next();
          } else {
            console.log("jsonobject ",jsonObject)
            var jsonObject = JSON.parse(body);
            if (jsonObject) {
              console.log("JSON object from userandaccountservice: ", jsonObject)
              return res.json({success: true, users: jsonObject})
            } else {
              return res.status(401).json({success: false, msg: 'Delete user failed'});
            }
          }
        });
      //}).catch(function(err) {
        //console.log("error: ",err)
        //return res.status(401).json({success: false, msg: 'Could not get users'});
      //})
    }).catch(function(err) {
      logger.error(err);
      return res.json({success: false, msg: "User has wrong permissions"});
    });
  }).catch(function(err) {
    logger.error(err);
    return res.json({success: false, msg: "Could not get token"});
  });

});

function deleteallusers(bus) {
  return new Promise(
    function(resolve , reject) {
      bus.send("user.deleteall", {
        data: 'user.deleteall'
      }, {ack : true})

      bus.listen('user.deleteall.reply', { ack: true }, function(msg) {
        msg.handle.ack();
        console.log("got reply message " + JSON.stringify(msg))
        resolve(msg.data);
      })

      bus.listen('user.deleteall.error', { ack: true }, function(err) {
        console.log("got error message " + JSON.stringify(err))
        err.handle.ack();
        reject(err.data);
      })
    }
  )
}



userandaccountservicerouter.get('/deleteall', function (req, res, next) {
logger.info("deleteall");
logger.debug("deleteall", req.body);
console.log("deleteall");
var orgRes = res;
userhandler.getToken(req.headers).then(token => {
  userhandler.hasAccess("admin", token).then(response => {
    console.log("CORRECT RIGHTS? ",response)
    rabbitMQHandler.getConnection(process.env.RABBITMQ_URL).then(bus => {
      console.log(bus);
      Promise.all([deleteallusers(bus)])
        .then(function(results) {
            var first = JSON.stringify(results[0]);  // contents of the first csv file
            var second =  JSON.stringify(results[1]); // contents of the second csv file
            console.log(first);
            console.log(second);
            var msgstring = first + ", " + second;
            bus.unlisten('user.deleteall');
            bus.unlisten('user.deleteall.reply');
            bus.unlisten('user.deleteall.error');
            return res.status(200).json({success: true, msg: msgstring})
      }).catch(function(err) {
        console.log(err); // some coding error in handling happened
        return res.status(500).json({success: false, msg: err});
      });


    });

  //   serviceLookupHandler.serviceLookup("userandaccountservice-8080", 'backofficeroutes/deleteall').then(serverAddress => {
  //     request({
  //       url: "https://" + serverAddress.address + ":" + serverAddress.port + "/" + serverAddress.routePath,
  //       qs: {time: +new Date()},
  //       method: "GET",
  //       headers: {
  //         'host': req.headers.host,
  //         'servicename': config.serviceName
  //       },
  //       key: fs.readFileSync('/certs/test.soci80bank.key'),
  //       cert: fs.readFileSync('/certs/chain.crt')
  //     }, function(error, response, body){
  //         if(error) {
  //           console.log("error: ",error)
  //           logger.error(error);
  //           return next();
  //         } else {
  //           var jsonObject = JSON.parse(body);
  //           console.log("user service json object", jsonObject)
  //           if (!jsonObject) {
  //             return res.status(401).json({success: false, msg: 'Delete all users failed'});
  //           }
  //         }
  //       });
  //     }).catch(function(err) {
  //       console.log("error: ",err)
  //       return res.status(401).json({success: false, msg: 'Could not delete users'});
  //     }).then(userandaccountServiceResponse => {
  //       console.log("Test: ",userandaccountServiceResponse)
  //
  //       serviceLookupHandler.serviceLookup("accountservice-8080", 'backofficeroutes/removeallaccounts').then(serverAddress => {
  //         request({
  //           url: "https://" + serverAddress.address + ":" + serverAddress.port + "/" + serverAddress.routePath,
  //           qs: {time: +new Date()},
  //           method: "GET",
  //           headers: {
  //             'host': req.headers.host,
  //             'servicename': config.serviceName
  //           },
  //           key: fs.readFileSync('/certs/test.soci80bank.key'),
  //           cert: fs.readFileSync('/certs/chain.crt')
  //         }, function(error, response, body){
  //           console.log("Deleteallaccounts method run")
  //             if(error) {
  //               console.log("error: ",error)
  //               logger.error(error);
  //               return next();
  //             } else {
  //               var jsonObject = JSON.parse(body);
  //               console.log("account service json object", jsonObject)
  //               if (jsonObject) {
  //                 return res.json({success: true, msg:"Accounts and Users Deleted"})
  //               } else {
  //                 return res.status(401).json({success: false, msg: 'Delete all accounts failed'});
  //               }
  //             }
  //           });
  //         }).catch(function(err) {
  //           console.log("error: ",err)
  //           return res.status(401).json({success: false, msg: 'Could not delete accounts'});
  //         })
  //
  //     })
  //
  //
  //   }).catch(function(err) {
  //     logger.error(err);
  //     return res.json({success: false, msg: "User has wrong permissions"});
  //   });
  // }).catch(function(err) {
  //   logger.error(err);
  //   return res.json({success: false, msg: "Could not get token"});
   });
 });

// userandaccountservicerouter.get('/deleteall', function (req, res, next) {
// logger.info("deleteall");
// logger.debug("deleteall", req.body);
// userhandler.getToken(req.headers).then(token => {
//   userhandler.hasAccess("admin", token).then(response => {
//     serviceLookupHandler.serviceLookup("userandaccountservice-8080", 'backofficeroutes/deleteall').then(serverAddress => {
//       request({
//         url: "https://" + serverAddress.address + ":" + serverAddress.port + "/" + serverAddress.routePath,
//         qs: {time: +new Date()},
//         method: "GET",
//         headers: {
//           'host': req.headers.host,
//           'servicename': config.serviceName
//         },
//         key: fs.readFileSync('/certs/test.soci80bank.key'),
//         cert: fs.readFileSync('/certs/chain.crt')
//       }, function(error, response, body){
//         console.log("deleteall users method run")
//           if(error) {
//             console.log("error: ",error)
//             logger.error(error);
//             return next();
//           } else {
//             var jsonObject = JSON.parse(body);
//             console.log("user service json object", jsonObject)
//             if (jsonObject) {
//               console.log("JSON object from userandaccountservice: ", jsonObject)
//               // return res.json({success: true, msg:"Users Deleted"})
//             } else {
//               // return res.status(401).json({success: false, msg: 'Delete all users failed'});
//             }
//           }
//         });
        // serviceLookupHandler.serviceLookup("accountservice-8080", 'backofficeroutes/removeallaccounts').then(serverAddress => {
        //   request({
        //     url: "https://" + serverAddress.address + ":" + serverAddress.port + "/" + serverAddress.routePath,
        //     qs: {time: +new Date()},
        //     method: "GET",
        //     headers: {
        //       'host': req.headers.host,
        //       'servicename': config.serviceName
        //     },
        //     key: fs.readFileSync('/certs/test.soci80bank.key'),
        //     cert: fs.readFileSync('/certs/chain.crt')
        //   }, function(error, response, body){
        //     console.log("Deleteallaccounts method run")
        //       if(error) {
        //         console.log("error: ",error)
        //         logger.error(error);
        //         return next();
        //       } else {
        //         var jsonObject = JSON.parse(body);
        //         console.log("account service json object", jsonObject)
        //         if (jsonObject) {
        //           return res.json({success: true, msg:"Accounts Deleted"})
        //         } else {
        //           return res.status(401).json({success: false, msg: 'Delete all accounts failed'});
        //         }
        //       }
        //     });
        //   }).catch(function(err) {
        //     console.log("error: ",err)
        //     return res.status(401).json({success: false, msg: 'Could not delete accounts'});
        //   })
//       }).catch(function(err) {
//         console.log("error: ",err)
//         return res.status(401).json({success: false, msg: 'Could not delete users'});
//       })
//     }).catch(function(err) {
//       logger.error(err);
//       return res.json({success: false, msg: "User has wrong permissions"});
//     });
//   }).catch(function(err) {
//     logger.error(err);
//     return res.json({success: false, msg: "Could not get token"});
//   });

});

module.exports = userandaccountservicerouter;
