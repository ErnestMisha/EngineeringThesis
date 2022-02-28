'use strict';
const faker = require('faker');
const id = require('./uuidv4');

function getCompetitions() {
  const competition = [];
  for(let i = 0; i < 500 ; i++) {
    competition.push({
      uuid: id.uuidv4[i],
      name: faker.lorem.sentence(),
      organizer: faker.company.catchPhrase(),
      logoPath: i % 5 ? null : 'agh.jpg',
      location: faker.address.city(),
      participantsLimit: 270 + faker.datatype.number(40),
      dateOfEvent: faker.date.future(),
      description: faker.lorem.paragraph(),
      regulationPath: 'regulation.pdf',
      openDate: faker.date.future(),
      active: i % 2 ? false : true,
      visible: i % 4 ? false : true,
      fee: faker.datatype.number(500),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  return competition;
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */
   await queryInterface.bulkInsert('Competitions', getCompetitions(), {});
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete('Competitions', null, {});
  }
};
