const passport = require('passport');
const mongoose = require('mongoose');
const crypto = require('crypto');
const LocalStrategy = require('passport-local').Strategy;
require('dotenv').config();


const conn = process.env.DB_STRING;

const connection = mongoose.createConnection(conn, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const UserSchema = new mongoose.Schema({
    username: String,
    hash: String,
    salt: String,
    folder: String,
});

const User = connection.model('User', UserSchema);

const customFields = {
    usernameField: 'uname',
    passwordField: 'pw'
};

function validPassword(password, hash, salt) {
    var hashVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === hashVerify;
}

const verifyCallback = (username, password, done) => {
    User.findOne({ username: username })
        .then((user) => {
            if (!user) { 
                return done(null, false) 
            }            
            const isValid = validPassword(password, user.hash, user.salt);            
            if (isValid) {
                return done(null, user);
            } else {
                return done(null, false);
            }
        })
        .catch((err) => {   
            done(err);
        });
}

passport.use(new LocalStrategy(customFields, verifyCallback));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((userId, done) => {
    User.findById(userId)
        .then((user) => {
            done(null, user);
        })
        .catch(err => done(err))
});
