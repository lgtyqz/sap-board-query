const { runSimulation } = require('sap-calculator');

const { argv } = require("process");

require("dotenv").config();

const { readFileSync, writeFileSync } = require("fs");

const { neon } = require("@neondatabase/serverless");
const { PriorityQueue } = require("@datastructures-js/priority-queue");
const { generateCalculatorLink } = require('./generate-calculator-link');
const { parseReplayForCalculator } = require("./parse-replays");

const SAMPLE_SIZE = 300;
const CHECK_SIZE = 75;

const TOP_X = 50;

const sql = neon(process.env.DATABASE_URL);

// Utility shuffle from StackOverflow, shuffles in-place
function shuffle(array) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}

// Replay object type
// replayId: Replay ID (string)
// turn3: Object
// - wins
// - draws
// - losses
// - total
// - partialCalculatorConfig (only player fields)
// turn11: Object
// - wins
// - draws
// - losses
// - total
// - partialCalculatorConfig (only player fields)

// Array of replay objects
let crossCheckResults = [];

// Grab 1000 random games from database
// Grab turn 3 boards (both player and opponent)
// Grab turn 11 boards (both player and opponent)
// (When grabbing boards, filter by turtle pack only)
async function fetchTurn3And11Boards(){
  const totalReplayCount = 1000;
  const pageSize = 100;
  for(let offset = 0; offset < totalReplayCount; offset += pageSize){
    const rawReplays = await sql`SELECT * FROM replays ORDER BY RANDOM() LIMIT ${pageSize} OFFSET ${offset}`;
    const replays = rawReplays.filter(replay => replay.mode === 0);
    console.log(`Fetched ${offset + replays.length}/${totalReplayCount} replays...`);
    for (const replay of replays) {
      const replayData = replay.raw_json;
      const battles = parseReplayForCalculator(replayData);
      if(battles.length >= 11){
        const turn3 = battles[2];
        const turn11 = battles[10];
        if(turn3.playerPack === "Turtle"){
          crossCheckResults.push({
            replayId: replay.id,
            turn3: {
              wins: 0,
              draws: 0,
              losses: 0,
              total: 0,
              calculatorConfig: {
                playerPack: turn3.playerPack,
                playerToy: turn3.playerToy,
                playerToyLevel: turn3.playerToyLevel,
                turn: 3,
                playerGoldSpent: turn3.playerGoldSpent,
                playerRollAmount: turn3.playerRollAmount,
                playerSummonedAmount: turn3.playerSummonedAmount,
                playerLevel3Sold: turn3.playerLevel3Sold,
                playerTransformationAmount: turn3.playerTransformationAmount,
                playerPets: turn3.playerPets,
              }
            },
            turn11: {
              wins: 0,
              draws: 0,
              losses: 0,
              total: 0,
              calculatorConfig: {
                playerPack: turn11.playerPack,
                playerToy: turn11.playerToy,
                playerToyLevel: turn11.playerToyLevel,
                turn: 11,
                playerGoldSpent: turn11.playerGoldSpent,
                playerRollAmount: turn11.playerRollAmount,
                playerSummonedAmount: turn11.playerSummonedAmount,
                playerLevel3Sold: turn11.playerLevel3Sold,
                playerTransformationAmount: turn11.playerTransformationAmount,
                playerPets: turn11.playerPets,
              }
            }
          });
        }
        if(turn3.opponentPack === "Turtle"){
          crossCheckResults.push({
            replayId: replay.id,
            turn3: {
              wins: 0,
              draws: 0,
              losses: 0,
              total: 0,
              calculatorConfig: {
                playerPack: turn3.opponentPack,
                playerToy: turn3.opponentToy,
                playerToyLevel: turn3.opponentToyLevel,
                turn: 3,
                playerGoldSpent: turn3.opponentGoldSpent,
                playerRollAmount: turn3.opponentRollAmount,
                playerSummonedAmount: turn3.opponentSummonedAmount,
                playerLevel3Sold: turn3.opponentLevel3Sold,
                playerTransformationAmount: turn3.opponentTransformationAmount,
                playerPets: turn3.opponentPets
              }
            },
            turn11: {
              wins: 0,
              draws: 0,
              losses: 0,
              total: 0,
              calculatorConfig: {
                playerPack: turn11.opponentPack,
                playerToy: turn11.opponentToy,
                playerToyLevel: turn11.opponentToyLevel,
                turn: 11,
                playerGoldSpent: turn11.opponentGoldSpent,
                playerRollAmount: turn11.opponentRollAmount,
                playerSummonedAmount: turn11.opponentSummonedAmount,
                playerLevel3Sold: turn11.opponentLevel3Sold,
                playerTransformationAmount: turn11.opponentTransformationAmount,
                playerPets: turn11.opponentPets
              }
            }
          });
        }
      }
    }
  }
  // Artificially limit to sample size
  crossCheckResults = crossCheckResults.slice(0, SAMPLE_SIZE);
}

function createCalculatorConfigFromPartials(player, opponent){
  return {
    playerPack: player.playerPack,
    playerToy: player.playerToy,
    playerToyLevel: player.playerToyLevel,
    opponentPack: opponent.playerPack,
    opponentToy: opponent.playerToy,
    opponentToyLevel: opponent.playerToyLevel,
    turn: player.turn,
    playerGoldSpent: player.playerGoldSpent,
    playerRollAmount: player.playerRollAmount,
    playerSummonedAmount: player.playerSummonedAmount,
    playerLevel3Sold: player.playerLevel3Sold,
    playerTransformationAmount: player.playerTransformationAmount,
    playerPets: player.playerPets,
    opponentGoldSpent: opponent.playerGoldSpent,
    opponentRollAmount: opponent.playerRollAmount,
    opponentSummonedAmount: opponent.playerSummonedAmount,
    opponentLevel3Sold: opponent.playerLevel3Sold,
    opponentTransformationAmount: opponent.playerTransformationAmount,
    opponentPets: opponent.playerPets,
    angler: false, allPets: false, logFilter: null, fontSize: 13, customPacks: [],
    oldStork: false, tokenPets: false, komodoShuffle: false, mana: true,
    showAdvanced: true, ailmentEquipment: false,
    simulationCount: 10
  }
}

function evaluateBoards(){
  // Simulate all turn 3 boards against each other using runSimulation
  // Simulate all turn 11 boards against each other using runSimulation
  // For each board, calculate win/draw/loss% against all other boards
  for(let i = 0; i < crossCheckResults.length; i++){
    let turn3 = {
      wins: 0,
      losses: 0,
      draws: 0
    };
    let turn11 = {
      wins: 0,
      losses: 0,
      draws: 0
    }

    // One consideration is to instead choose X amount of random boards to test it on instead
    // And cache results to avoid repeats
    console.log("Evaluating board " + (i + 1) + "/" + crossCheckResults.length);

    // Choose random 150 boards to evaluate against
    let randomIndices = [...Array(crossCheckResults.length).keys()];
    shuffle(randomIndices);
    randomIndices = randomIndices.slice(0, CHECK_SIZE);
    for(let j of randomIndices){
      // console.log(j);
      const turn3CalcConfig = createCalculatorConfigFromPartials(
        crossCheckResults[i].turn3.calculatorConfig,
        crossCheckResults[j].turn3.calculatorConfig
      );
      let turn3Result = runSimulation(turn3CalcConfig);
      turn3.wins += turn3Result.playerWins;
      turn3.losses += turn3Result.opponentWins;
      turn3.draws += turn3Result.draws;

      const turn11CalcConfig = createCalculatorConfigFromPartials(
        crossCheckResults[i].turn11.calculatorConfig,
        crossCheckResults[j].turn11.calculatorConfig
      );
      let turn11Result = runSimulation(turn11CalcConfig);
      turn11.wins += turn11Result.playerWins;
      turn11.losses += turn11Result.opponentWins;
      turn11.draws += turn11Result.draws;

      crossCheckResults[j].turn3.wins += turn3Result.opponentWins;
      crossCheckResults[j].turn3.losses += turn3Result.playerWins;
      crossCheckResults[j].turn3.draws += turn3Result.draws;
      crossCheckResults[j].turn3.total += turn3Result.opponentWins + turn3Result.playerWins + turn3Result.draws;
      if(Number.isNaN(crossCheckResults[j].turn3.total)){
        console.log("ERROR");
        console.log(turn3Result.opponentWins + turn3Result.playerWins + turn3Result.draws);
      }
      crossCheckResults[j].turn11.wins += turn11Result.opponentWins;
      crossCheckResults[j].turn11.losses += turn11Result.playerWins;
      crossCheckResults[j].turn11.draws += turn11Result.draws;
      crossCheckResults[j].turn11.total += turn11Result.opponentWins + turn11Result.playerWins + turn11Result.draws;
      if(Number.isNaN(crossCheckResults[j].turn11.total)){
        console.log("ERROR");
        console.log(turn11Result.opponentWins + turn11Result.playerWins + turn11Result.draws);
      }
    }
    crossCheckResults[i].turn3.wins += turn3.wins;
    crossCheckResults[i].turn3.losses += turn3.losses;
    crossCheckResults[i].turn3.draws += turn3.draws;
    crossCheckResults[i].turn3.total += turn3.wins + turn3.losses + turn3.draws;
    crossCheckResults[i].turn11.wins += turn11.wins;
    crossCheckResults[i].turn11.losses += turn11.losses;
    crossCheckResults[i].turn11.draws += turn11.draws;
    crossCheckResults[i].turn11.total += turn11.wins + turn11.losses + turn11.draws;
    if(Number.isNaN(crossCheckResults[i].turn3.total)){
      console.log("ERROR");
      console.log(turn3);
    }

    if(Number.isNaN(crossCheckResults[i].turn11.total)){
      console.log("ERROR");
      console.log(turn11);
    }
  }
}

function generateReport(){
  let top10Turn3 = crossCheckResults.sort((a, b) => {
    if(a.turn3.wins/a.turn3.total > b.turn3.wins/b.turn3.total) return -1;
    else if(a.turn3.wins/a.turn3.total < b.turn3.wins/b.turn3.total) return 1;

    else if(a.turn3.losses/a.turn3.total > b.turn3.losses/b.turn3.total) return 1;
    else if(a.turn3.losses/a.turn3.total < b.turn3.losses/b.turn3.total) return -1;

    else return 0;
  }).slice(0, TOP_X);

  let top10Turn11 = crossCheckResults.sort((a, b) => {
    if(a.turn11.wins/a.turn11.total > b.turn11.wins/b.turn11.total) return -1;
    else if(a.turn11.wins/a.turn11.total < b.turn11.wins/b.turn11.total) return 1;

    else if(a.turn11.losses/a.turn11.total > b.turn11.losses/b.turn11.total) return 1;
    else if(a.turn11.losses/a.turn11.total < b.turn11.losses/b.turn11.total) return -1;

    else return 0;
  }).slice(0, TOP_X);

  // Save top 10 boards
  writeFileSync("top" + TOP_X + "Turn3.json", JSON.stringify(top10Turn3, null, 2));
  writeFileSync("top" + TOP_X + "Turn11.json", JSON.stringify(top10Turn11, null, 2));

  console.log("Top " + TOP_X + " Turn 3 Boards:");
  console.log(top10Turn3.map(result => ({
    replayId: result.replayId,
    wins: result.turn3.wins,
    losses: result.turn3.losses,
    draws: result.turn3.draws,
    total: result.turn3.total,
    calculatorLink: generateCalculatorLink(createCalculatorConfigFromPartials(
      result.turn3.calculatorConfig,
      result.turn3.calculatorConfig
    ))
  })));

  console.log("================================");

  console.log("Top " + TOP_X + " Turn 3 Boards Pet Stats:");
  const petStats = {};
  top10Turn3.forEach(result => {
    for(let pet of result.turn3.calculatorConfig.playerPets){
      if(pet && pet.name){
        if(petStats[pet.name]){
          petStats[pet.name] += 1;
        }else{
          petStats[pet.name] = 1;
        }
      }
    }
  });
  console.log(petStats);

  console.log("================================");

  console.log("Top " + TOP_X + " Turn 11 Boards:");
  console.log(top10Turn11.map(result => ({
    replayId: result.replayId,
    wins: result.turn11.wins,
    losses: result.turn11.losses,
    draws: result.turn11.draws,
    total: result.turn11.total,
    calculatorLink: generateCalculatorLink(createCalculatorConfigFromPartials(
      result.turn11.calculatorConfig,
      result.turn11.calculatorConfig
    )),
    turn3: {
      wins: result.turn3.wins,
      losses: result.turn3.losses,
      draws: result.turn3.draws,
      total: result.turn3.total,
      calculatorLink: generateCalculatorLink(createCalculatorConfigFromPartials(
        result.turn3.calculatorConfig,
        result.turn3.calculatorConfig
      ))
    }
  })));

  console.log("================================");

  console.log("Top " + TOP_X + " Turn 11 Boards Pet Stats:");
  const turn11PetStats = {};
  const turn3PetStats = {};
  top10Turn11.forEach(result => {
    for(let pet of result.turn11.calculatorConfig.playerPets){
      if(pet && pet.name){
        if(turn11PetStats[pet.name]){
          turn11PetStats[pet.name] += 1;
        }else{
          turn11PetStats[pet.name] = 1;
        }
      }
    }
    for(let pet of result.turn3.calculatorConfig.playerPets){
      if(pet && pet.name){
        if(turn3PetStats[pet.name]){
          turn3PetStats[pet.name] += 1;
        }else{
          turn3PetStats[pet.name] = 1;
        }
      }
    }
  });
  console.log(turn11PetStats);
  console.log(turn3PetStats);


  // Generate brief CSV
  let csvOutput = "turn3Win%,turn11Win%";
  crossCheckResults.forEach(result => {
    csvOutput += `\n${result.turn3.wins/result.turn3.total},${result.turn11.wins/result.turn11.total}`;
  });
  writeFileSync("crossCheckResults.csv", csvOutput);
}


async function main(){
  await fetchTurn3And11Boards();
  evaluateBoards();
  generateReport();
}

main();