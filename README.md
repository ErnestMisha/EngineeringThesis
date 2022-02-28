# engineering-thesis

Web application for sports events integrated with timing system, written in JavaScript using Express.js framework, Sequelize ORM library and Handlebars template engine.

## Project setup

For running app execute the following commands

### Install dependencies
```
npm install
```
### Create database schema and fake data
```
npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all
```
### Run app
```
npm start
```

## Runing app with live results

For testing app with live results configure your timing system to send requests to POST /wyniki endpoint see also: [/routes/results.js](routes/results.js) file.