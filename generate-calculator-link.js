function stripDefaultValues(state) {
  const strippedState = {};

  // --- Top-Level Properties ---
  // Only include properties if they differ from the calculator's default state.
  if (state.playerPack !== "Turtle") strippedState.playerPack = state.playerPack;
  if (state.opponentPack !== "Turtle") strippedState.opponentPack = state.opponentPack;
  if (state.playerToy) strippedState.playerToy = state.playerToy;
  if (state.playerToyLevel && state.playerToyLevel !== "1") strippedState.playerToyLevel = state.playerToyLevel;
  if (state.opponentToy) strippedState.opponentToy = state.opponentToy;
  if (state.opponentToyLevel && state.opponentToyLevel !== "1") strippedState.opponentToyLevel = state.opponentToyLevel;
  if (state.turn !== 11) strippedState.turn = state.turn;
  if (state.playerGoldSpent !== 10) strippedState.playerGoldSpent = state.playerGoldSpent;
  if (state.opponentGoldSpent !== 10) strippedState.opponentGoldSpent = state.opponentGoldSpent;
  if (state.playerRollAmount !== 4) strippedState.playerRollAmount = state.playerRollAmount;
  if (state.opponentRollAmount !== 4) strippedState.opponentRollAmount = state.opponentRollAmount;
  if (state.playerSummonedAmount !== 0) strippedState.playerSummonedAmount = state.playerSummonedAmount;
  if (state.opponentSummonedAmount !== 0) strippedState.opponentSummonedAmount = state.opponentSummonedAmount;
  if (state.playerLevel3Sold !== 0) strippedState.playerLevel3Sold = state.playerLevel3Sold;
  if (state.opponentLevel3Sold !== 0) strippedState.opponentLevel3Sold = state.opponentLevel3Sold;
  if (state.playerTransformationAmount !== 0) strippedState.playerTransformationAmount = state.playerTransformationAmount;
  if (state.opponentTransformationAmount !== 0) strippedState.opponentTransformationAmount = state.opponentTransformationAmount;

  // --- UI Flags (only include if they are `true`) ---
  if (state.angler) strippedState.angler = true;
  if (state.allPets) strippedState.allPets = true;
  if (state.oldStork) strippedState.oldStork = true;
  if (state.tokenPets) strippedState.tokenPets = true;
  if (state.komodoShuffle) strippedState.komodoShuffle = true;
  if (state.mana) strippedState.mana = true;
  if (state.showAdvanced) strippedState.showAdvanced = true;
  if (state.ailmentEquipment) strippedState.ailmentEquipment = true;

  // --- Other properties with non-boolean/null defaults ---
  if (state.logFilter) strippedState.logFilter = state.logFilter;
  if (state.fontSize !== 13) strippedState.fontSize = state.fontSize;
  if (state.customPacks && state.customPacks.length > 0) strippedState.customPacks = state.customPacks;


  // --- Nested Helper Function for Pets ---
  const stripPetDefaults = (pet) => {
    if (!pet || !pet.name) return null; // If the pet is null or has no name, it's an empty slot.

    const newPet = { name: pet.name };

    if (pet.attack !== 0) newPet.attack = pet.attack;
    if (pet.health !== 0) newPet.health = pet.health;
    if (pet.exp !== 0) newPet.exp = pet.exp;
    if (pet.mana !== 0) newPet.mana = pet.mana;
    if (pet.equipment) newPet.equipment = pet.equipment;
    if (pet.belugaSwallowedPet !== null) newPet.belugaSwallowedPet = pet.belugaSwallowedPet;
    if (pet.timesHurt) newPet.timesHurt = pet.timesHurt;
    if (Number.isFinite(pet.triggersConsumed) && pet.triggersConsumed !== 0) {
      newPet.triggersConsumed = pet.triggersConsumed;
    }

    // All other pet properties like `belugaSwallowedPet`, `battlesFought`, etc.,
    // are omitted because their default is null or 0.

    return newPet;
  };

  // --- Process Pet Arrays ---
  // We process both arrays and then check if the entire array is just nulls.
  // If so, we can omit the whole key to save space.
  const strippedPlayerPets = state.playerPets.map(stripPetDefaults);
  if (strippedPlayerPets.some(p => p !== null)) { // Check if there's at least one non-null pet
    strippedState.playerPets = strippedPlayerPets;
  }

  const strippedOpponentPets = state.opponentPets.map(stripPetDefaults);
  if (strippedOpponentPets.some(p => p !== null)) { // Check if there's at least one non-null pet
    strippedState.opponentPets = strippedOpponentPets;
  }

  return strippedState;
}

const KEY_MAP = {
  playerPack: "pP", opponentPack: "oP", playerToy: "pT", playerToyLevel: "pTL",
  opponentToy: "oT", opponentToyLevel: "oTL", turn: "t", playerGoldSpent: "pGS",
  opponentGoldSpent: "oGS", playerRollAmount: "pRA", opponentRollAmount: "oRA",
  playerSummonedAmount: "pSA", opponentSummonedAmount: "oSA", playerLevel3Sold: "pL3",
  opponentLevel3Sold: "oL3", playerPets: "p", opponentPets: "o", angler: "an",
  allPets: "ap", logFilter: "lf", fontSize: "fs", customPacks: "cp",
  oldStork: "os", tokenPets: "tp", komodoShuffle: "ks", mana: "m",
  showAdvanced: "sa", ailmentEquipment: "ae", playerTransformationAmount: "pTA", opponentTransformationAmount: "oTA",
  // Pet Object Keys
  name: "n", attack: "a", health: "h", exp: "e", equipment: "eq", belugaSwallowedPet: "bSP", timesHurt: "tH"
};

function truncateKeys(data) {
  if (Array.isArray(data)) {
    return data.map(item => truncateKeys(item));
  }
  if (data !== null && typeof data === 'object') {
    const newObj = {};
    for (const key in data) {
      const newKey = KEY_MAP[key] || key; // Use short key if it exists, otherwise keep original
      newObj[newKey] = truncateKeys(data[key]);
    }
    return newObj;
  }
  return data; // Return primitives (strings, numbers, null) as-is
}

function generateCalculatorLink(calculatorState) {
  const baseUrl = "https://sap-calculator.com/";

  const strippedState = stripDefaultValues(calculatorState);

  const truncatedState = truncateKeys(strippedState);

  const stateString = JSON.stringify(truncatedState);
  const base64Data = Buffer.from(stateString).toString('base64');

  return `${baseUrl}?c=${base64Data}`;
}

module.exports = {
  generateCalculatorLink
}