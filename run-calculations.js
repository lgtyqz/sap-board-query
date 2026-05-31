const { runSimulation } = require('sap-calculator');

require("dotenv").config();

const { readFileSync, writeFileSync } = require("fs");

const { neon } = require("@neondatabase/serverless");
const { parseReplayForCalculator } = require("./parse-replays");
const { PriorityQueue } = require("@datastructures-js/priority-queue");

const sql = neon(process.env.DATABASE_URL);

// Battle simulations!
// Function:
// Given a board JSON (via calculator output, legacy JSON format)
// (NOTE: need a sub-function to take raw calculator JSON and extract only the relevant player fields)
// Query it against existing database VS boards from that turn (10 times for calc's sake)
// Return all boards that you lose to, RANKED by lossrate% (out of 10)
async function checkBoardAgainstDatabase(calculatorBoardJSON){
  // Paginate boards request
  const pageSize = 100;
  let totalBoardCount = await sql`SELECT COUNT(*) FROM boards WHERE turn = ${calculatorBoardJSON.turn}`;
  totalBoardCount = totalBoardCount[0].count;

  // Priority Queue to compare calculation results
  let boardRankings = new PriorityQueue((a, b) => {
    if(a.playerWins > b.playerWins) return 1;
    else if(a.playerWins < b.playerWins) return -1;
    else if(a.opponentWins > b.opponentWins) return -1;
    else if(a.opponentWins < b.opponentWins) return 1;
    else return 0;
  });
  for(let offset = 0; offset < Math.min(totalBoardCount, 5000); offset += pageSize){
    console.log(`Evaluating boards ${offset + 1} to ${Math.min(offset + pageSize, totalBoardCount)} out of ${totalBoardCount}...`);
    const pageBoards = await sql`SELECT board FROM boards WHERE turn = ${calculatorBoardJSON.turn} ORDER BY RANDOM() LIMIT ${pageSize}`;
    // Run simulations against each board, store results in array
    for(let board of pageBoards){
      // Extract useful fields and replace with your own calculator board JSON
      // Need to run two simulations per board - one for player, one for opponent
      let originalBoard = board.board;
      // Player simulation: Replace opponent fields in calculator JSON with board
      let playerCalculatorConfig = {
        ...calculatorBoardJSON,
        opponentPack: originalBoard.opponentPack,
        opponentToy: originalBoard.opponentToy,
        opponentToyLevel: originalBoard.opponentToyLevel,
        opponentGoldSpent: originalBoard.opponentGoldSpent,
        opponentRollAmount: originalBoard.opponentRollAmount,
        opponentSummonedAmount: originalBoard.opponentSummonedAmount,
        opponentLevel3Sold: originalBoard.opponentLevel3Sold,
        opponentTransformationAmount: originalBoard.opponentTransformationAmount,
        opponentPets: originalBoard.opponentPets,
        playerToyLevel: Number(calculatorBoardJSON.playerToyLevel) || 1,
        opponentToyLevel: Number(originalBoard.opponentToyLevel) || 1,
        simulationCount: 10
      };
      let opponentCalculatorConfig = {
        ...calculatorBoardJSON,
        opponentPack: calculatorBoardJSON.playerPack,
        opponentToy: calculatorBoardJSON.playerToy,
        opponentToyLevel: calculatorBoardJSON.playerToyLevel,
        opponentGoldSpent: calculatorBoardJSON.playerGoldSpent,
        opponentRollAmount: calculatorBoardJSON.playerRollAmount,
        opponentSummonedAmount: calculatorBoardJSON.playerSummonedAmount,
        opponentLevel3Sold: calculatorBoardJSON.playerLevel3Sold,
        opponentTransformationAmount: calculatorBoardJSON.playerTransformationAmount,
        opponentPets: calculatorBoardJSON.playerPets,
        playerToyLevel: Number(calculatorBoardJSON.playerToyLevel) || 1,
        opponentToyLevel: Number(originalBoard.playerToyLevel) || 1,
        simulationCount: 10
      };
      const playerSimulationResult = runSimulation(playerCalculatorConfig);
      const opponentSimulationResult = runSimulation(opponentCalculatorConfig);
      boardRankings.enqueue({
        opponentPets: originalBoard.opponentPets,
        opponentPack: originalBoard.opponentPack,
        opponentToy: originalBoard.opponentToy,
        opponentToyLevel: originalBoard.opponentToyLevel,
        playerWins: playerSimulationResult.playerWins,
        opponentWins: playerSimulationResult.opponentWins,
        draws: playerSimulationResult.draws
      });
      boardRankings.enqueue({
        opponentPets: originalBoard.opponentPets,
        opponentPack: originalBoard.opponentPack,
        opponentToy: originalBoard.opponentToy,
        opponentToyLevel: originalBoard.opponentToyLevel,
        playerWins: opponentSimulationResult.playerWins,
        opponentWins: opponentSimulationResult.opponentWins,
        draws: opponentSimulationResult.draws
      });
    }
  }

  // Reports handle board rankings
  return boardRankings;
}

// TODO: Can use canvas API to draw infographic
async function generateBoardReport(calculatorBoardJSON){
  // Dequeue into array for easier manipulation
  const boardRankings = [...await checkBoardAgainstDatabase(calculatorBoardJSON)];

  // Cache board rankings somewhere
  writeFileSync("boardRankings.json", JSON.stringify(boardRankings));
  
  // Overall statistics
  let totalWins = boardRankings.reduce((sum, board) => sum + board.playerWins, 0);
  let totalLosses = boardRankings.reduce((sum, board) => sum + board.opponentWins, 0);
  let totalDraws = boardRankings.reduce((sum, board) => sum + board.draws, 0);
  let totalSimulations = totalWins + totalLosses + totalDraws;
  let overallWinRate = (totalWins / totalSimulations) * 100;

  console.log(`Overall Win Rate: ${overallWinRate.toFixed(2)}% (${totalWins} Wins, ${totalLosses} Losses, ${totalDraws} Draws)`);

  // Top 50 most lost to boards
  console.log(`Top 50 Most Lost To Boards:`);
  boardRankings.slice(0, 50).forEach((board, index) => {
    let boardWinRate = (board.playerWins / (board.playerWins + board.opponentWins + board.draws)) * 100;
    console.log(`${index + 1}. Opponent Pack: ${board.opponentPack}, Opponent Toy: ${board.opponentToy} (Level ${board.opponentToyLevel}), Opponent Pets: ${JSON.stringify(board.opponentPets)} - Win Rate: ${boardWinRate.toFixed(2)}% (${board.playerWins} Wins, ${board.opponentWins} Losses, ${board.draws} Draws)`);
  });
}

let boardJSONExample = readFileSync("turn11BoardConfig.json");
generateBoardReport(JSON.parse(boardJSONExample));