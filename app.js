const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const hbs = require('hbs');
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash');
const { sessionKey } = require('./appKeys');
const { Server } = require('socket.io');
const io = new Server();

const indexRouter = require('./routes/index');
const competitionsRouter = require('./routes/competitions');
const usersRouter = require('./routes/users');
const resultsRouter = require('./routes/results');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
hbs.registerPartials(path.join(__dirname, 'views/partials'));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false, type: ['application/x-www-form-urlencoded', 'text/plain'] }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: sessionKey,
  resave: true,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  if(req.user?.type === 'user') {
    res.locals.logged = true;
  }
  else if(req.user?.type === 'admin') {
    res.locals.admin = true;
  }
  next();
});
app.use(flash());
app.use('/', indexRouter);
app.use('/', usersRouter);
app.use('/zawody', competitionsRouter);
app.use('/wyniki', function(req, res, next) {
  res.io = io;
  next();
});
app.use('/wyniki', resultsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = { app, io };
