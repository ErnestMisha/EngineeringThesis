const express = require('express');
const router = express.Router();
const { Result, sequelize } = require('../models');
const createError = require('http-errors');
const { QueryTypes } = require('sequelize');
const validator = require('validator');
const { resultsKey } = require('../appKeys');

router.get('/', async function(req, res, next) {
    let results;
    try {
        results = await sequelize.query("SELECT Competitions.name, Competitions.uuid FROM Competitions, Results WHERE Competitions.uuid = Results.CompetitionId GROUP BY Competitions.uuid", { type: QueryTypes.SELECT });
    }
    catch(err) {
        return next(createError(500));
    }
    res.render('results', {
        title: '- Wyniki',
        navbar: true,
        results
    });
});

router.get('/:uuid', async function(req, res, next) {
    if(!validator.isUUID(req.params.uuid)) {
        return next(createError(404));
    }
    let queryResults, compName;
    try {
        queryResults = await Result.findAll({
            where: {
                CompetitionId: req.params.uuid
            }
        });
        if(!queryResults) {
            return next(createError(404));
        }
        compName = await sequelize.query(`SELECT name FROM Competitions WHERE uuid = '${req.params.uuid}' LIMIT 1`, { type: QueryTypes.SELECT });
    }
    catch(err) {
        return next(createError(500));
    }
    if(!compName[0]) {
        return next(createError(404));
    }
    res.io.of(`/${req.params.uuid}`);
    res.render('competition-results', {
        title: compName[0].name + ' - Wyniki',
        navbar: true,
        queryResults
    });
});

router.post('/', async function(req, res, next) {
    if(!req.body.resultsKey || !req.body.CompetitionId || !req.body.position
    || !req.body.name || !req.body.result || !validator.isInt(req.body.position)
    || !validator.isUUID(req.body.CompetitionId)) {
        return res.status(400).end();
    }
    req.body.name = validator.escape(req.body.name);
    req.body.city = validator.escape(req.body.city);
    req.body.club = validator.escape(req.body.club);
    req.body.result = validator.escape(req.body.result);
    if(req.body.resultsKey !== resultsKey) {
        return res.status(403).end();
    }
    if(req.body.result.length === 5) {
        req.body.result = '00:' + req.body.result;
    }
    let compName;
    try {
        compName = await sequelize.query(`SELECT name FROM Competitions WHERE uuid = '${req.body.CompetitionId}' LIMIT 1`, { type: QueryTypes.SELECT });
    }
    catch(err) {
        return res.status(500).end();
    }
    if(!compName[0]) {
        return res.status(404).end();
    }
    let result;
    try {
        result = await Result.findOne({
            where: {
                CompetitionId: req.body.CompetitionId,
                position: req.body.position
            }
        });
        if(!result) {
            await Result.create({
                CompetitionId: req.body.CompetitionId,
                position: req.body.position,
                name: req.body.name,
                city: req.body.city,
                club: req.body.club,
                result: req.body.result
            });
        }
        else {
            await result.update({
                name: req.body.name,
                city: req.body.city,
                club: req.body.club,
                result: req.body.result
            });
        }
    }
    catch(err) {
        return res.status(500).end();
    }
    res.io.of(`/${req.body.CompetitionId}`).emit('result', {
        position: req.body.position,
        name: req.body.name,
        city: req.body.city,
        club: req.body.club,
        result: req.body.result
    });
    res.end();
});

module.exports = router;
