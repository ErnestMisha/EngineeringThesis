const express = require('express');
const router = express.Router();
const { User, Competition } = require('../models');
const { passport, ensureUser, ensureLoggedOut} = require('../auth');
const bcrypt = require('bcrypt');
const validator = require('validator');
const createError = require('http-errors');

function validateRegistration(req, res, next) {
    if(!validator.isLength(req.body.firstName, { min: 3, max: 26 })) {
        req.flash('registerFailure', 'Imię musi zawierać od 3 do 26 liter');
        return res.redirect('/rejestracja');
    }
    req.body.firstName = validator.escape(req.body.firstName);
    if(!(validator.isLength(req.body.lastName, { min: 2, max: 40 }))) {
        req.flash('registerFailure', 'Nazwisko musi zawierać od 2 do 40 liter');
        return res.redirect('/rejestracja');
    }
    req.body.lastName = validator.escape(req.body.lastName);
    if(!(validator.isDate(req.body.dateOfBirth) &&
    (new Date().getFullYear() - new Date(req.body.dateOfBirth).getFullYear()) > 4)) {
        req.flash('registerFailure', 'Podana data urodzenia jest nieprawidłowa');
        return res.redirect('/rejestracja');
    }
    if(!(req.body.gender === 'male' || req.body.gender === 'female')) {
        req.flash('registerFailure', 'Podana płeć jest nieprawidłowa');
        return res.redirect('/rejestracja');
    }
    if(!(validator.isLength(req.body.country, { min: 3, max: 40 }))) {
        req.flash('registerFailure', 'Nazwa kraju musi zawierać od 3 do 40 liter');
        return res.redirect('/rejestracja');
    }
    req.body.country = validator.escape(req.body.country);
    if(!(validator.isLength(req.body.city, { min: 3, max: 40 }))) {
        req.flash('registerFailure', 'Nazwa miejscowości musi zawierać od 3 do 40 znaków');
        return res.redirect('/rejestracja');
    }
    if(!(validator.isLength(req.body.street, { min: 0, max: 40 }))) {
        req.flash('registerFailure', 'Nazwa ulicy musi zawierać maksymalnie 40 znaków');
        return res.redirect('/rejestracja');
    }
    if(!validator.isLength(req.body.houseNumber, { min: 1, max: 10 })) {
        req.flash('registerFailure', 'Numer domu musi zawierać od 1 do 10 znaków');
        return res.redirect('/rejestracja');
    }
    req.body.houseNumber = validator.escape(req.body.houseNumber);
    if(!validator.isLength(req.body.club, { min: 0, max: 40 })) {
        req.flash('registerFailure', 'Nazwa klubu może mieć maksymalnie 40 znaków');
        return res.redirect('/rejestracja');
    }
    req.body.club = validator.escape(req.body.club);
    if(!(validator.isLength(req.body.phone, { min: 9, max: 9 })
    && validator.isNumeric(req.body.phone))) {
        req.flash('registerFailure', 'Numer telefonu jest nieprawidłowy');
        return res.redirect('/rejestracja');
    }
    if(!(validator.isLength(req.body.email, { min: 6, max: 30 })
    && validator.isEmail(req.body.email))) {
        req.flash('registerFailure', 'Adre email jest nieprawidłowy');
        return res.redirect('/rejestracja');
    }
    if(!(validator.isLength(req.body.password, { min: 12, max: 40 })
    && req.body.password === req.body.confirmPassword)) {
        req.flash('registerFailure', 'Hasło oraz jego potwierdzenie muszą być takie same i zawierac od 12 do 40 znaków');
        return res.redirect('/rejestracja');
    }
    next();
}

router.get('/logowanie', ensureLoggedOut, function(req, res, next) {
    const message = req.session.messages?.pop();
    res.render('login', {
        title: '- Logowanie',
        navbar: true,
        login: true,
        message
    })
});

router.post('/logowanie', ensureLoggedOut, passport.authenticate('user', {
    failureRedirect: '/logowanie',
    failureMessage: true,
    successRedirect: '/konto'
}));

router.get('/rejestracja', ensureLoggedOut, function(req, res, next) {
    res.render('register', {
        title: '- Rejestracja',
        navbar: true,
        register: true,
        message: req.flash('registerFailure')
    });
});

router.post('/rejestracja', ensureLoggedOut, validateRegistration, async function(req, res, next) {
    let user;
    try {    
        user = await User.create({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            dateOfBirth: req.body.dateOfBirth,
            gender: req.body.gender,
            country: req.body.country,
            city: req.body.city,
            street: req.body.street,
            houseNumber: req.body.houseNumber,
            club: req.body.club,
            phone: req.body.phone,
            email: req.body.email,
            active: true,
            password: await bcrypt.hash(req.body.password, 10)
        });
    }
    catch(err) {
        return next(createError(500));
    }
    req.login({ id: user.id, type: 'user' }, (err) => {
        if(err) {
            return next(err);
        }
        res.redirect('/konto');
    });
});

router.get('/konto',ensureUser, async function(req, res, next) {
    let events;
    try {
        events = await User.findByPk(req.user.id, {
            include: Competition
        }); 
    }
    catch(err) {
        return next(createError(500));
    }
    res.render('account', {
        title: '- Moje Konto',
        navbar: true,
        account: true,
        events
    });
});

router.get('/wyloguj', ensureUser, function(req, res, next) {
    req.logout();
    res.redirect('/');
});

module.exports = router;