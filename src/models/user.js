var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');
mongoose.Promise = global.Promise;
const serviceLookupHandler = require("../consulLookup.js");

var changes = []

var userSchema = new Schema({
  userName: { type: String, required: true, unique: true },
  email: { type: String },
  password: { type: String },
  created_at: Date,
  updated_at: Date
});


// Setting of roles for Users
userSchema.plugin(require('mongoose-role'), {
  roles: ['admin','accounting','marketing','customersupport'],
  accessLevels: {
    'admin': ['admin'],
    'accounting': ['accounting','admin'],
    'marketing': ['marketing','admin'],
    'customersupport': ['customersupport','admin']
  }
});

userSchema.pre('update', function (next) {
  this.updated_at =  new Date();
  next();
});

userSchema.pre('create', function (next) {
  this.created_at =  new Date();
  next();
});

userSchema.post('init', function() {
  this._original = this.toObject();
});

userSchema.pre('save', function (next) {
    var user = this;

    // track history
    changes = [];
    var document = this;
    if (!document.isNew) {
      document.modifiedPaths().forEach(function(path) {
        if (path === 'password') return; // do it for password after hash
        var oldValue = document._original[path];
        var newValue = document[path];
        changes.push({
            path: path,
            oldValue: oldValue,
            newValue: newValue,
            when: new Date()
          });
      });
    }

    if (this.isModified('password') || this.isNew) {
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                return next(err);
            }
            bcrypt.hash(user.password, salt, function (err, hash) {
                if (err) {
                    return next(err);
                }
                var oldValue = user.password;
                user.password = hash;
                this.updated_at =  new Date();
                if (!this.isNew) {
                  changes.push({
                      path: 'password',
                      oldValue: oldValue,
                      newValue: hash,
                      when: new Date()
                    });
                }

                next();
            });
        });
    } else {
        return next();
    }
});

userSchema.methods.comparePassword = function (passw, cb) {
    bcrypt.compare(passw, this.password, function (err, isMatch) {
        if (err) {
            return cb(err);
        }
        cb(null, isMatch);
    });
};

var User = mongoose.model('User', userSchema);


module.exports = User;
