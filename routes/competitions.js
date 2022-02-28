const express = require('express');
const router = express.Router();
const createError = require('http-errors');
const { Competition, User, Competitor } = require('../models');
const path = require('path');
const { ensureUser, ensureAdmin } = require('../auth');
const { parseAsync } = require('json2csv');
const formidable = require('formidable');
const { rename, rm, mkdir } = require('fs/promises');
const validator = require('validator');

async function getEvent(req, res, next) {
    if(isNaN(req.params.id)) {
        return next(createError(404));
    }
    let event;
    try {
        event = await Competition.findByPk(req.params.id, {
            include: User
        });
    }
    catch(err) {
        return next(createError(500));
    }
    if(!event || ((!event.active || event.openDate > new Date() || event.dateOfEvent < new Date()) && req.user?.type !== 'admin')) {
        return next(createError(404));
    }
    res.event = event;
    next();
}

async function getEventOnly(req, res, next) {
    if(isNaN(req.params.id)) {
        return next(createError(404));
    }
    try {
        const event = await Competition.findByPk(req.params.id);
        if(!event) {
            return next(createError(404));
        }
        res.event = event;
    }
    catch(err) {
        return next(createError(500));
    }
    next();
}

function partialValidate(err, fields, files) {
    if(err) {
        return { action: 'error' };
    }

    if(!fields.name || !validator.isLength(fields.name, { min: 2, max: 50 })) {
        return {
            action: 'failure',
            message: 'Nazwa zawodów musi zawierać od 2 do 50 znaków'
        };
    }
    fields.name = validator.escape(fields.name);

    if(!fields.ogranizer || !validator.isLength(fields.organizer, { min: 2 , max: 50 })) {
        return {
            action: 'failure',
            message: 'NNazwa organizatora musi zawierać od 2 do 50 znaków'
        };
    }
    fields.organizer = validator.escape(fields.organizer);

    if(!fields.location || !validator.isLength(fields.location, { min: 2 , max: 50 })) {
        return {
            action: 'failure',
            message: 'Nazwa miejscowości musi zawierać od 2 do 50 znaków"'
        };
    }
    fields.location = validator.escape(fields.location);

    if(!fields.participantsLimit || !validator.isInt(fields.participantsLimit) || fields.participantsLimit < 1) {
        return {
            action: 'failure',
            message: 'Limit zawodników musi wynosić minimalnie 1 i być liczbą całkowitą'
        };
    }

    if(!fields.dateOfEvent || !validator.isDate(fields.dateOfEvent) || new Date() > new Date(fields.dateOfEvent)) {
        return {
            action: 'failure',
            message: 'Zawody muszą odbywać się w przyszłości'
        };
    }

    if(!fields.description || !validator.isLength(fields.description, { min: 3, max: 1000 })) {
        return {
            action: 'failure',
            message: 'Opis zawodów musi wynosić od 3 do 1000 znaków'
        };
    }
    fields.description = validator.escape(fields.description);

    if(!fields.openDate || !validator.toDate(fields.openDate) || new Date(fields.openDate) > new Date(fields.dateOfEvent)) {
        return {
            action: 'failure',
            message: 'Data otwarcia zapisów musi nastąpić przed datą wydarzenia'
        };
    }

    if(!fields.fee || !validator.isFloat(fields.fee) || fields.fee < 0) {
        return {
            action: 'failure',
            message: 'płata startowa nie może być ujemna'
        };
    }

    const logoMIMEType = files.logo?.mimetype?.split('/');
    if(files.logo?.size > 0 && logoMIMEType[0] !== 'image') {
        return {
            action: 'failure',
            message: 'Typ pliku logo jest nieprawidłowy'
        };
    }
}

async function cleanTmp() {
    try {
        await rm(path.join(__dirname, '../tmp'), { recursive: true });
        await mkdir(path.join(__dirname, '../tmp'));
        return true;
    }
    catch(err) {
        return false;
    }
}

router.get('/',async function(req, res, next) {
    let events
    try {
        events = await Competition.findAll();
    }
    catch(err) {
        return next(createError(500));
    }
    if(req?.user?.type !== 'admin') {
        events = events.filter(event => {
            if(event.visible && event.active && new Date(event.openDate) <= new Date() && new Date(event.dateOfEvent) >= new Date())
                return true;
            else
                return false;
        });
    }
    res.render('competitions', {
        title: '- Zawody',
        navbar: true,
        competitions: true,
        events,
        message: req.flash('createSuccess')
    });
});

router.get('/dodaj', ensureAdmin, function(req, res, next) {
    res.render('createCompetition', {
        title: '- Utwórz wydarzenie',
        navbar: true,
        target: '/zawody/dodaj',
        message: req.flash('eventValidation')
    });
});

router.post('/dodaj', ensureAdmin, function(req, res, next) {
    const form = formidable({
        keepExtensions: true,
        maxFileSize: 4 * 1024 * 1024,
        uploadDir: path.join(__dirname, '../tmp')
    });
    form.parse(req, async (err, fields, files) => {
        const status = partialValidate(err, fields, files);
        if(status?.action === 'error') {
            return next(createError(500));
        }
        else if(status?.action === 'failure') {
            if(!await cleanTmp()) {
                console.error(`Clean directory error occured at ${new Date()}`);
            }
            req.flash('eventValidation', status.message);
            return res.redirect('/zawody/dodaj');
        }
        if(files.regulation?.size < 1 || files.regulation?.mimetype !== 'application/pdf') {
            req.flash("eventValidation", "Nie wybrano pliku z regulaminem lub jego typ jest nieprawidłowy");
            if(!await cleanTmp()) {
                console.error(`Clean directory error occured at ${new Date()}`);
            }
            return res.redirect('/zawody/dodaj');
        }
        try {
            if(files.logo.size) {
                await rename(files.logo.filepath, path.join(__dirname, '../public/images', files.logo.newFilename));
            }
            else {
                await rm(files.logo.filepath)
            }
        }
        catch(err) {
            console.error(`Logo file upload error occured at ${new Date()}`);
        }
        try {
            await rename(files.regulation.filepath, path.join(__dirname, '../public/regulations', files.regulation.newFilename));
            await Competition.create({
                name: fields.name,
                organizer: fields.organizer,
                logoPath: files.logo.size ? files.logo.newFilename : undefined,
                location: fields.location,
                participantsLimit: fields.participantsLimit,
                dateOfEvent: fields.dateOfEvent,
                description: fields.description,
                regulationPath: files.regulation.newFilename,
                openDate: fields.openDate,
                active: true,
                visible: true,
                fee: fields.fee,
            });
        }
        catch(err) {
            return next(createError(500));
        }
        req.flash('createSuccess', 'Zawody zostały dodane do listy');
        res.redirect('/zawody');
    });
});

router.get('/:id/edytuj', ensureAdmin, getEventOnly, function(req, res, next) {
    const date = new Date(res.event.openDate).toISOString().slice(0, -8);
    res.render('createCompetition', {
        title: '- Edytuj wydarzenie',
        navbar: true,
        target: `/zawody/${res.event.id}/edytuj`,
        message: req.flash('eventValidation'),
        edit: true,
        event: res.event,
        openDate: date
    });
});

router.post('/:id/edytuj', ensureAdmin, getEventOnly, function(req, res, next) {
    const form = formidable({
        keepExtensions: true,
        maxFileSize: 4 * 1024 * 1024,
        uploadDir: path.join(__dirname, '../tmp')
    });
    form.parse(req, async (err, fields, files) => {
        const status = partialValidate(err, fields, files);
        if(status?.action === 'error') {
            return next(createError(500));
        }
        else if(status?.action === 'failure') {
            if(!await cleanTmp()) {
                console.error(`Clean directory error occured at ${new Date()}`);
            }
            req.flash('eventValidation', status.message);
            return res.redirect(`/zawody/${res.event.id}/edytuj`);
        }
        if(files.regulation?.size > 0 && files.regulation?.mimetype !== 'application/pdf') {
            req.flash("eventValidation", "Typ pliku z regulaminem jest nieprawidłowy");
            if(!await cleanTmp()) {
                console.error(`Clean directory error occured at ${new Date()}`);
            }
            return res.redirect(`/zawody/${res.event.id}/edytuj`);
        }
        try {
            if(files.logo.size) {
                await rename(files.logo.filepath, path.join(__dirname, '../public/images', files.logo.newFilename));
            }
            else {
                await rm(files.logo.filepath);
            }
            if(files.regulation.size) {
                await rename(files.regulation.filepath, path.join(__dirname, '../public/regulations', files.regulation.newFilename));
            }
            else {
                await rm(files.regulation.filepath);
            }
        }
        catch(err) {
            console.error(`Files update error occured at ${new Date()}`);
        }
        try {
            await res.event.update({
                name: fields.name,
                organizer: fields.organizer,
                logoPath: files.logo.size ? files.logo.newFilename : res.event.logoPath,
                location: fields.location,
                participantsLimit: fields.participantsLimit,
                dateOfEvent: fields.dateOfEvent,
                description: fields.description,
                regulationPath: files.regulation.size ? files.regulation.newFilename : res.event.regulationPath,
                openDate: fields.openDate,
                active: true,
                visible: true,
                fee: fields.fee,
            });
        }
        catch(err) {
            return next(createError(500));
        }
        req.flash('createSuccess', 'Zawody zostały zmienione');
        res.redirect('/zawody');
    });
});

router.get('/:id', getEvent, function(req, res, next) {
    let signout;
    if(req?.user?.type === 'user') {
        signout = res.event.Users.find(user => user.id === req.user.id);
    }
    const admin = req?.user?.type === 'admin' || false;
    const user = req?.user?.type === 'user' || false;
    const limitExhausted = res.event.Users.length >= res.event.participantsLimit || false;
    res.render('competition-details', {
        title: '- ' + res.event.name,
        navbar: true,
        event: res.event,
        signout,
        admin,
        limitExhausted,
        user,
        id: req.params.id,
        message: req.flash('competitionMessage')
    });
});

router.get('/:id/zapisz', ensureUser, getEvent, async function(req, res, next) {
    if(res.event?.Users.find(user => user.id === req.user.id) || res.event.Users.length >= res.event.participantsLimit) {
        res.status(403);
        res.redirect('/zawody/' + req.params.id);
    }
    else {
        try {
            await Competitor.create({
                UserId: req.user.id,
                CompetitionId: res.event.id,
                paid: false
            });
        }
        catch(err) {
            return next(createError(500));
        }
        req.flash('competitionMessage', 'Zostałeś zapisany do zawodów');
        res.redirect('/zawody/' + req.params.id);
    }
});

router.get('/:id/wypisz', ensureUser, getEvent, async function(req, res, next) {
    const competitor = (res.event.Users.find(user => user.id == req.user.id))?.Competitor;
    if(!competitor) {
        res.status(403);
        res.redirect('/zawody/' + req.params.id);
    }
    else {
        try {
            await Competitor.destroy({
                where: {
                    CompetitionId: competitor.CompetitionId,
                    UserId: competitor.UserId
                }
            });
        }
        catch(err) {
            return next(createError(500));
        }
        req.flash('competitionMessage', 'Zrezygnowałeś z udziału w zawodach');
        res.redirect('/zawody/' + req.params.id);
    }
});

router.get('/:id/pobierz-liste', ensureAdmin, getEvent, async function(req, res, next) {
    const participants = [];
    res.event.Users.forEach(user => {
        participants.push({
            firstName: user.firstName,
            lastName: user.lastName,
            dateOfBirth: user.dateOfBirth,
            gender: user.gender,
            country: user.country,
            city: user.city,
            street: user.street,
            houseNumber: user.houseNumber,
            phone: user.phone,
            email: user.email,
            club: user.club,
            paid: user.Competitor.paid
        });
    });
    const fields = [ 'firstName', 'lastName', 'dateOfBirth', 'gender',
    'country', 'city', 'street', 'houseNumber', 'phone', 'email', 'club', 'paid' ];
    let csv;
    try {
        csv = await parseAsync(participants, { fields, delimiter: ";" });
    }
    catch(err) {
        return next(createError(500));
    }
    res.attachment(`${res.event.name} lista zawodników.csv`);
    res.send(csv);
});

router.get('/regulamin/:regulationPath', function(req, res, next) {
    res.sendFile(path.join(__dirname, '../public/regulations/' + req.params.regulationPath));
});

router.patch('/:id/zmien-platnosc', ensureAdmin, async function(req, res, next) {
    if(isNaN(req.params.id)) {
        return res.status(404).end();
    }
    try {
        const competitor = await Competitor.findOne({
            where: {
                UserId: req.body.id,
                CompetitionId: req.params.id
            }
        });
        competitor.paid = !competitor.paid;
        await competitor.save();
    }
    catch(err) {
        res.status(500);
    }
    res.end();
});

router.patch('/:id/zmien-status', ensureAdmin, getEventOnly, async function(req, res, next) {
    res.event.active = !res.event.active;
    try {
        await res.event.save();
    }
    catch(err) {
        res.status(500);
    }
    res.end();
});

router.patch('/:id/zmien-widocznosc', ensureAdmin, getEventOnly, async function(req, res, next) {
    res.event.visible = !res.event.visible;
    try {
        await res.event.save();
    }
    catch(err) {
        res.status(500);
    }
    res.end();
});

module.exports = router;