var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var Form = require('./models/form')
var passport = require('passport');
var LocalStrategy = require('passport-local');
var User = require('./models/user');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var flash = require('connect-flash');



/* Redirect http to https */
app.get('*', function(req,res,next) {
  if(req.headers['x-forwarded-proto'] != 'https' && process.env.NODE_ENV === 'production')
    res.redirect('https://'+req.hostname+req.url)
  else
    next() /* Continue to other routes if we're not redirecting */
});

var indexRoutes = require('./routes/index');
var formRoutes = require('./routes/form');

// Express Sessions Setup
app.use(require('express-session')({
  secret: process.env.sessionSec,
  resave: false,
  saveUninitialized: false
}));
//Passport Init
app.enable("trust proxy");
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());


passport.use(new GoogleStrategy({
  callbackURL: "/auth/google/redirect",
  clientID: process.env.gClientID,
  clientSecret: process.env.gClientSecret
}, (accessToken, refreshToken, profile, done) => {
  User.findOne({googleId: profile.id}).then((currentUser) => {
    if(currentUser){
      console.log(currentUser);
      done(null,currentUser);
    } else {
      new User({
        username: profile.displayName,
        googleId: profile.id
      }).save().then((newUser) => {
        console.log("New User created!" + newUser);
        done(null, newUser);
    });
    }
  })
})
)
passport.use(new FacebookStrategy({
  callbackURL: "/auth/facebook/callback",
  clientID: process.env.faceClientId,
  clientSecret: process.env.faceClientSecret
}, (accessToken, refreshToken, profile, done) => {
  User.findOne({facebookId: profile.id}).then((currentUser) => {
    console.log("Entered FindONe");
    if(currentUser){
      done(null,currentUser);
    } else {
      new User({
        username: profile.displayName,
        facebookId: profile.id
      }).save().then((newUser) => {
        console.log("GOT HERE! before done()");
        done(null, newUser);
    });
    }
  })
})
)

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//Mongoose Connect
mongoose.connect(process.env.MONGODB_URI);

//View Engine and Static Folder
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));


app.use(function(req,res,next){
  res.locals.currentUser = req.user;
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
  next();
})


app.use(formRoutes);
app.use(indexRoutes);

// SINKHOLE ROUTE
app.get('*', function(req,res){
  res.render('notfound');
});
var port = process.env.PORT || 5000;




app.listen(port,function(){
    console.log('Our app is running on ' + port);
})
