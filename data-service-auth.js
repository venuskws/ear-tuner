const bcrypt = require("bcryptjs");
var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var userSchema = new Schema({
    "userName": {
        "type": String,
        "unique": true
    },
    "password": String,
    "email": String,
    "percentage": {
        "type": Number,
        "default": 0
      },
    "loginHistory": {
        "type": [{dateTime: Date, userAgent: String}]
    }
});

let User;// to be defined on new connection (see initialize)
var connectionString = 'mongodb://ear-tuner-venus:canada20130828@ds219432.mlab.com:19432/ear-tuner';


module.exports.initialize = function() {
    return new Promise(function(resolve, reject) {
        let db = mongoose.createConnection(connectionString, {useNewUrlParser: true});

        db.on('error', (err) => {
            reject(err);
        });
        db.once('open', () => {
            User = db.model("users", userSchema);
            resolve();
        });
    });
};

module.exports.registerUser = function(userData) {
    return new Promise(function(resolve, reject){
        if (userData.password != userData.password2) {
            reject("Passwords do not match");
        } 
        let newUser = new User(userData);
        
        new Promise(function(resolve, reject) {
            bcrypt.genSalt(10, function(err, salt) { // Generate a "salt" using 10 rounds
                bcrypt.hash(newUser.password, salt, function(err, hash) { // encrypt the password: "myPassword123"
                    if (err) {
                        reject(err);
                    } else {
                        newUser.password = hash; // TODO: Store the resulting "hash" value in the DB
                        resolve();
                    }
                });
            })
        })
        .then(() => {
            return new Promise(function(resolve, reject) {
                newUser.save()
                .then(() => {
                    resolve();
                })
                .catch((err) => {
                    if (err.code === 11000) {
                        reject("Username already taken");
                    } else {
                        reject("There was an error creating the user:"  + err);
                    }
                });
            })
        })
        .then(() => {
            resolve();
        })
        .catch((err) => {
            reject(err);
        })
    });
};

var passwordValid = function(candidatePassword, hashedPassword, cb) {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(candidatePassword, hashedPassword, function(err, isMatched){
            if (err) {
                throw err;
                reject(err);
            }
            console.log(isMatched);
            resolve(isMatched);
        });
    })
}

module.exports.checkUser = function(userData){
    return new Promise(function(resolve, reject) {
        User.find(
            {userName: userData.userName}
        )
        .exec()
        .then((users) => {
            var correct;
            passwordValid(userData.password, users[0].password)
            .then((res) => {
                correct = res;
            })
            .catch((err) => {
                console.log(err);
            })
            .then((result) => {
                if (users.length == 0) {
                    reject("Unable to find user: " + userData.userName);
                } else if (!correct) {
                    reject("Incorrect Password for user: " + userData.userName);
                } else {
                    users[0].loginHistory.push(
                        {dateTime: (new Date()).toString(),
                        userAgent: userData.userAgent}
                    );
                    User.update(
                        {userName: users[0].userName},
                        {$set: {loginHistory: users[0].loginHistory}},
                    ).exec()
                    .then(()=>{
                        resolve(users[0]);
                    })
                    .catch((err)=>{
                        reject("There was an error verifying the user: " + err);
                    });
                }
            })
            
         })
         .catch((err) => {
             reject("Unable to find user: " + userData.user + err);
         })
    });
}

module.exports.updatePercentage = function(username, pctg) {
    User.update(
        {userName: username},
        {$set: {percentage: pctg}}
    )
    .exec()
}