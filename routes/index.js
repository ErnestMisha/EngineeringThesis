const express = require('express');
const router = express.Router();
const { passport, ensureAdmin, ensureLoggedOut } = require('../auth');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/admin', ensureLoggedOut, function(req, res, next) {
  res.render('admin');
});

router.post('/admin', ensureLoggedOut, passport.authenticate('admin', {
  failureRedirect: '/admin',
  successRedirect: '/zawody'
}));

router.get('/logout', ensureAdmin, function(req, res, next) {
  req.logout();
  res.redirect('/');
});

module.exports = router;
