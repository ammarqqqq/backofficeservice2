const mongoose = require('mongoose');
const Config = require('./config'),
      config = new Config();
var server = process.env.DNSDOMAIN;
//const serviceLookupHandler = require("./consulLookup.js");
//We need to work with "MongoClient" interface in order to connect to a mongodb server.
module.exports.listen = function(url){

  //serviceLookupHandler.serviceLookup("backofficemongo", '').then(serverAddress => {
    //var url = config.database;
    //console.log(serverAddress)
    var url = "http://" +  server  +  ":27018/backofficeuser";
    //var url = "mongodb://" + serverAddress.address + ":" + serverAddress.port + "/user";
    try {
      mongoose.connect(url);
      console.log("Connected to " + url)
    } catch(error) {
      console.log("Could not connect to " + url + ". " + error);
    }

    return mongoose;
  //});
}
