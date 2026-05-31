const { PETS, PERKS, TOYS } = require('./sap-data-bridge');

const PACK_MAP = { 0: "Turtle", 1: "Puppy", 2: "Star", 5: "Golden", 6: "Unicorn", 7: "Danger" };

const PETS_META_BY_ID = new Map();
Object.values(PETS).forEach((pet) => {
  const tierValue = Number(pet?.Tier);
  if (!pet?.Id) {
    return;
  }
  if (Number.isFinite(tierValue)) {
    PETS_META_BY_ID.set(String(pet.Id), { name: pet.Name, tier: tierValue });
  }
});

function buildCustomPacksFromGenesis(buildModel, battleJson) {
  const decks = [
    buildModel?.Bor?.Deck,
    battleJson?.UserBoard?.Deck,
    battleJson?.OpponentBoard?.Deck
  ].filter((deck) => deck && Array.isArray(deck.Minions));

  const packs = [];
  const seenDeckIds = new Set();
  const usedNames = new Set();

  for (const deck of decks) {
    const deckId = deck?.Id ? String(deck.Id) : null;
    if (deckId && seenDeckIds.has(deckId)) {
      continue;
    }
    if (deckId) {
      seenDeckIds.add(deckId);
    }

    const pack = buildCustomPackFromDeck(deck, usedNames);
    if (pack) {
      packs.push({ ...pack, deckId });
    }
  }

  return packs;
}

function buildCustomPackFromDeck(deck, usedNames) {
  if (!deck || !Array.isArray(deck.Minions)) {
    return null;
  }

  const minions = deck.Minions.map((id) => String(id));
  const tierPets = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: []
  };

  for (const minionId of minions) {
    const petMeta = PETS_META_BY_ID.get(minionId);
    if (!petMeta) {
      continue;
    }
    if (tierPets[petMeta.tier]) {
      tierPets[petMeta.tier].push(petMeta.name);
    }
  }

  const normalizeTierPets = (pets) => {
    const normalized = pets.slice(0, 10);
    while (normalized.length < 10) {
      normalized.push(null);
    }
    return normalized;
  };

  let deckName = deck.Title || "Custom Pack";
  if (usedNames.has(deckName)) {
    let suffix = 2;
    while (usedNames.has(`${deckName} (${suffix})`)) {
      suffix += 1;
    }
    deckName = `${deckName} (${suffix})`;
  }
  usedNames.add(deckName);

  return {
    name: deckName,
    tier1Pets: normalizeTierPets(tierPets[1]),
    tier2Pets: normalizeTierPets(tierPets[2]),
    tier3Pets: normalizeTierPets(tierPets[3]),
    tier4Pets: normalizeTierPets(tierPets[4]),
    tier5Pets: normalizeTierPets(tierPets[5]),
    tier6Pets: normalizeTierPets(tierPets[6])
  };
}

function findCustomPackFromDeck(customPacks, deck) {
  if (!deck) {
    return null;
  }
  const deckId = deck?.Id ? String(deck.Id) : null;
  if (deckId) {
    const byId = customPacks.find((pack) => pack.deckId === deckId);
    if (byId) {
      return byId;
    }
  }
  const deckName = deck?.Title;
  if (deckName) {
    return customPacks.find((pack) => pack.name === deckName) || null;
  }
  return null;
}

function parseBattleForCalculator(battleJson, buildModel) {
  const userBoard = battleJson.UserBoard;
  const opponentBoard = battleJson.OpponentBoard;

  const getTimesHurt = (petJson) => {
    const value = petJson?.Pow?.SabertoothTigerAbility;
    return Number.isFinite(value) ? value : null;
  };

  const getTriggersConsumed = (petJson) => {
    const findValueIn = (obj) => {
      if (!obj || typeof obj !== "object") {
        return null;
      }
      for (const [key, value] of Object.entries(obj)) {
        if (!Number.isFinite(value)) {
          continue;
        }
        const normalized = String(key).toLowerCase();
        const hasTrigger = normalized.includes("trigger") || normalized.includes("trig");
        const hasConsumed = normalized.includes("consum");
        const isAbbrev = ["trgc", "trgcn", "trc", "trcn", "trco"].includes(normalized);
        if ((hasTrigger && hasConsumed) || isAbbrev) {
          return value;
        }
      }
      return null;
    };

    const abilityValues = (petJson?.Abil || [])
      .map((ability) => findValueIn(ability))
      .filter((value) => Number.isFinite(value));
    const abilityValue = abilityValues.length > 0 ? Math.max(...abilityValues) : null;

    return (
      findValueIn(petJson) ??
      findValueIn(petJson?.Pow) ??
      abilityValue
    );
  };

  const parsePet = (petJson) => {
    if (!petJson) return null;
    const petId = String(petJson.Enu ?? 0);
    const petInfo = PETS[petId];
    if (!petInfo) {
      console.error(`[!!!] UNKNOWN PET ID FOUND: ${petId}. Please update pets.json.`);
    }
    const petTempAtk = petJson["At"]["Temp"] ?? 0;
    const petTempHp = petJson["Hp"]["Temp"] ?? 0;
    let belugaSwallowedPet = null;
    if (petId == 182) {
      const swallowedPets = petJson?.MiMs?.Lsts?.WhiteWhaleAbility || [];
      if (swallowedPets && swallowedPets.length > 0) {
        const swallowedPetId = swallowedPets[0].Enu;
        const swallowedPetName = PETS[String(swallowedPetId)]?.Name || `Pet #${swallowedPetId}`;
        belugaSwallowedPet = swallowedPetName;
      }
    }
    let abomSwallowedPets = [];
    // Abomination swallow processing
    if(petId === 373){
      
    }
    const timesHurt = getTimesHurt(petJson);
    const triggersConsumed = getTriggersConsumed(petJson);
    const parsedPet = {
      name: PETS[petId] ? PETS[petId].Name : null,
      attack: petJson.At?.Perm + petTempAtk || 0,
      health: petJson.Hp?.Perm + petTempHp || 0,
      exp: petJson.Exp || 0,
      equipment: petJson.Perk ? { name: PERKS[petJson.Perk]?.Name || "Unknown Perk" } : null,
      mana: petJson.Mana || 0,
      belugaSwallowedPet: belugaSwallowedPet,
      abominationSwallowedPet1: null,
      abominationSwallowedPet2: null,
      abominationSwallowedPet3: null,
      battlesFought: 0
    };
    if (timesHurt !== null) {
      parsedPet.timesHurt = timesHurt;
    }
    if (triggersConsumed !== null) {
      parsedPet.triggersConsumed = triggersConsumed;
    }
    return parsedPet;
  };

  const parseBoardPets = (boardJson) => {
    const pets = (boardJson?.Mins?.Items || []).filter(Boolean);
    const petArray = Array(5).fill(null);

    pets.forEach((pet, index) => {
      // Use optional chaining to safely get the position.
      let pos = pet.Poi?.x;

      // If 'Poi' or 'Poi.x' is missing, assume the position based on its
      // order in the 'Items' array. The first pet is at position 0.
      if (pos === undefined) {
        pos = index;
      }

      if (pos >= 0 && pos < 5) {
        petArray[pos] = parsePet(pet);
      }
    });

    return petArray.reverse();
  };

  const getToy = (boardJson) => {
    const toyItem = (boardJson?.Rel?.Items || []).find(item => item && item.Enu);
    if (toyItem) {
      const toyId = String(toyItem.Enu);
      return {
        name: TOYS[toyId] ? TOYS[toyId].Name : null,
        level: toyItem.Lvl || 1
      };
    }
    return { name: null, level: 1 };
  };

  const playerToy = getToy(userBoard);
  const opponentToy = getToy(opponentBoard);

  const customPacks = buildCustomPacksFromGenesis(buildModel, battleJson);
  const playerCustomPack = findCustomPackFromDeck(customPacks, userBoard?.Deck);
  const opponentCustomPack = findCustomPackFromDeck(customPacks, opponentBoard?.Deck);
  const playerPackName = PACK_MAP[userBoard.Pack] || playerCustomPack?.name || "Turtle";
  const opponentPackName = PACK_MAP[opponentBoard.Pack] || opponentCustomPack?.name || "Turtle";

  return {
    playerPack: playerPackName,
    opponentPack: opponentPackName,
    playerToy: playerToy.name,
    playerToyLevel: String(playerToy.level),
    opponentToy: opponentToy.name,
    opponentToyLevel: String(opponentToy.level),
    turn: userBoard.Tur || 1,
    playerGoldSpent: userBoard.GoSp || 0,
    opponentGoldSpent: opponentBoard.GoSp || 0,
    playerRollAmount: userBoard.Rold || 0,
    opponentRollAmount: opponentBoard.Rold || 0,
    playerSummonedAmount: userBoard.MiSu || 0,
    opponentSummonedAmount: opponentBoard.MiSu || 0,
    playerLevel3Sold: userBoard.MSFL || 0,
    opponentLevel3Sold: opponentBoard.MSFL || 0,
    playerTransformationAmount: userBoard.TrTT || 0,
    opponentTransformationAmount: opponentBoard.TrTT || 0,
    playerPets: parseBoardPets(userBoard),
    opponentPets: parseBoardPets(opponentBoard),
    // Default UI settings for a clean calculator state
    angler: false, allPets: false, logFilter: null, fontSize: 13, customPacks: customPacks,
    oldStork: false, tokenPets: false, komodoShuffle: false, mana: true,
    showAdvanced: true, ailmentEquipment: false
  };
}

function parseReplayForCalculator(replay){
  const battles = replay.Actions.filter(action => action.Type === 0).map(action => JSON.parse(action.Battle));
  return battles.map(
    battle => parseBattleForCalculator(battle, replay.GenesisModeModel ? JSON.parse(replay.GenesisModeModel) : null)
  )
}

module.exports = { parseBattleForCalculator, parseReplayForCalculator };