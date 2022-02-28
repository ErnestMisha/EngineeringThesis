'use strict';
const faker = require('faker');
const bcrypt = require('bcrypt');

async function getUsers() {
  const users = [];
  const password = await bcrypt.hash('longPassword', 0);
  for(let i = 0; i < 23318; i++) {
    users.push({
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      dateOfBirth: faker.date.past(),
      gender: i % 2 ? 'male' : 'female',
      country: faker.address.country(),
      city: faker.address.cityName(),
      street: i % 5 ? faker.address.streetName() : null,
      houseNumber: faker.datatype.number(80),
      phone: faker.datatype.number(999999999),
      email: faker.internet.email() + i,
      club: i % 3 ? faker.lorem.slug() : null,
      password,
      active: i % 5 ? true : false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  return users;
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
   await queryInterface.bulkInsert('Users',await getUsers(), {});
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete('Users', null, {});
  }
};
