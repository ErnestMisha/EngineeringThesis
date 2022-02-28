'use strict';
const faker = require('faker');

function getCompetitors() {
  const competitors = [];
  for(let i = 0; i < 128623; i++) {
    competitors.push({
      UserId: i % 23318 + 1,
      CompetitionId: i % 500 + 1,
      paid: i % 8 ? true : false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  return competitors;
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
   await queryInterface.bulkInsert('Competitors', getCompetitors(), {});
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete('Competitors', null, {});
  }
};
