const fs = require('fs');

const rawPets = JSON.parse(fs.readFileSync('sap-data/pets.json'));
const PETS = {};
for (const pet of rawPets) {
  PETS[pet.Id] = pet;
}

const rawPerks = JSON.parse(fs.readFileSync('sap-data/perks.json'));
const PERKS = {};
for (const perk of rawPerks) {
  PERKS[perk.Id] = perk;
}

const rawToys = JSON.parse(fs.readFileSync('sap-data/toys.json'));
const TOYS = {};
for (const toy of rawToys) {
  TOYS[toy.Id] = toy;
}

const rawFood = JSON.parse(fs.readFileSync('sap-data/food.json'));
const FOOD = {};
for (const food of rawFood) {
  FOOD[food.Id] = food;
}

module.exports = {
  PETS,
  PERKS,
  TOYS,
  FOOD
};
