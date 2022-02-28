const passport = require('passport');
const LocalStrategy = require('passport-local');
const { User, Admin } = require('../models');
const bcrypt = require('bcrypt');
const createError = require('http-errors');

passport.use('user', new LocalStrategy({
    usernameField: 'email'
}, async (email, password, done) => {
    try {
        const user = await User.findOne({ where: { email } });
        if(!user) {
            return done(null, false, { message: 'Podany adres email jest nieprawidłowy' });
        }
        if(!(await bcrypt.compare(password, user.password))) {
            return done(null, false, { message: 'Podane hasło jest nieprawidłowe' });
        }
        return done(null, { id: user.id, type: 'user' });

    }
    catch(err) {
       return done(err);
    }
}));

passport.use('admin', new LocalStrategy(async (username, password, done) => {
    try {
        const admin = await Admin.findOne({ where: { name: username } });
        if(!admin) {
            return done(null, false, { message: 'Podana nazwa jest nieprawidłowa' });
        }
        if(!(await bcrypt.compare(password, admin.password))) {
            return done(null, false, { message: 'Podane hasło jest nieprawidłowe' });
        }
        return done(null, { id: admin.id, type: 'admin' });
    }
    catch(err) {
       return done(err);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser(async (user, done) => {
    done(null, user);
});

function ensureUser(req, res, next) {
    if(req.user?.type === 'user') {
        next();
    }
    else if(req.user?.type === 'admin') {
        res.redirect('/zawody');
    }
    else
        res.redirect('/logowanie');
}

function ensureAdmin(req, res, next) {
    if(req.user?.type === 'admin') {
        next();
    }
    else {
        next(createError(404));
    }
}

function ensureLoggedOut(req, res, next) {
    if(!req.user) {
        return next();
    }
    res.redirect('/zawody');
}

module.exports.passport = passport;
module.exports.ensureUser = ensureUser;
module.exports.ensureLoggedOut = ensureLoggedOut;
module.exports.ensureAdmin = ensureAdmin;
