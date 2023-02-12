const express = require('express');
const session = require('express-session');
const passport = require('passport');
const helmet = require('helmet');
const nocache = require('nocache');
const morgan = require('morgan');
const favicon = require('serve-favicon');
const routes = require('./routes');
const MongoStore = require('connect-mongo');
const path = require('path');
require('dotenv').config();

var app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));


const sessionStore = MongoStore.create({mongoUrl: process.env.DB_STRING});

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // Equals 1 day 
    },
    store: sessionStore
}));

app.set('trust proxy', 1)
app.use(helmet());
app.use(nocache())
require('ejs');
app.set('view engine', 'ejs');
require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
app.use(morgan('[:remote-addr] [:date[web]] ":method :url HTTP/:http-version" :status ":user-agent"'))
app.use(routes);
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).send('File size exceeded. Maximum allowed size is 20MB');
    }
    next(err);
});

app.all('*', (req, res) => {
    res.status(404).send("<h1>Page Not Found</h1>");
})

app.listen(3000, '0.0.0.0', () => {
    console.log("Server is up and running at ::3000")
});