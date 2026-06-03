const { runSimulation } = require('sap-calculator');

const { argv } = require("process");

require("dotenv").config();

const { readFileSync, writeFileSync } = require("fs");

const { neon } = require("@neondatabase/serverless");
const { PriorityQueue } = require("@datastructures-js/priority-queue");
const { generateCalculatorLink } = require('./generate-calculator-link');

const SAMPLE_SIZE = 2000;

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
  for(let offset = 0; offset < Math.min(totalBoardCount, SAMPLE_SIZE); offset += pageSize){
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
        opponentPack: originalBoard.playerPack,
        opponentToy: originalBoard.playerToy,
        opponentToyLevel: originalBoard.playerToyLevel,
        opponentGoldSpent: originalBoard.playerGoldSpent,
        opponentRollAmount: originalBoard.playerRollAmount,
        opponentSummonedAmount: originalBoard.playerSummonedAmount,
        opponentLevel3Sold: originalBoard.playerLevel3Sold,
        opponentTransformationAmount: originalBoard.playerTransformationAmount,
        opponentPets: originalBoard.playerPets,
        playerToyLevel: Number(originalBoard.playerToyLevel) || 1,
        opponentToyLevel: Number(calculatorBoardJSON.playerToyLevel) || 1,
        simulationCount: 10
      };
      const playerSimulationResult = runSimulation(playerCalculatorConfig);
      const opponentSimulationResult = runSimulation(opponentCalculatorConfig);
      boardRankings.enqueue({
        ...calculatorBoardJSON,
        opponentPets: originalBoard.opponentPets,
        opponentPack: originalBoard.opponentPack,
        opponentToy: originalBoard.opponentToy,
        opponentToyLevel: originalBoard.opponentToyLevel,
        opponentGoldSpent: originalBoard.opponentGoldSpent,
        opponentRollAmount: originalBoard.opponentRollAmount,
        opponentSummonedAmount: originalBoard.opponentSummonedAmount,
        opponentLevel3Sold: originalBoard.opponentLevel3Sold,
        opponentTransformationAmount: originalBoard.opponentTransformationAmount,
        playerWins: playerSimulationResult.playerWins,
        opponentWins: playerSimulationResult.opponentWins,
        draws: playerSimulationResult.draws
      });
      boardRankings.enqueue({
        ...calculatorBoardJSON,
        opponentPets: originalBoard.playerPets,
        opponentPack: originalBoard.playerPack,
        opponentToy: originalBoard.playerToy,
        opponentToyLevel: originalBoard.playerToyLevel,
        opponentGoldSpent: originalBoard.playerGoldSpent,
        opponentRollAmount: originalBoard.playerRollAmount,
        opponentSummonedAmount: originalBoard.playerSummonedAmount,
        opponentLevel3Sold: originalBoard.playerLevel3Sold,
        opponentTransformationAmount: originalBoard.playerTransformationAmount,
        playerWins: opponentSimulationResult.playerWins,
        opponentWins: opponentSimulationResult.opponentWins,
        draws: opponentSimulationResult.draws
      });
    }
  }

  // Reports handle board rankings
  return boardRankings;
}

function printReport(boardRankings){
  // Overall statistics
  let totalWins = boardRankings.reduce((sum, board) => sum + board.playerWins, 0);
  let totalLosses = boardRankings.reduce((sum, board) => sum + board.opponentWins, 0);
  let totalDraws = boardRankings.reduce((sum, board) => sum + board.draws, 0);
  let totalSimulations = totalWins + totalLosses + totalDraws;
  let overallWinRate = (totalWins / totalSimulations) * 100;

  console.log(`Win Rate: ${overallWinRate.toFixed(2)}%`);
  console.log(`Loss Rate: ${(totalLosses/totalSimulations * 100).toFixed(2)}%`);
  console.log(`Draw Rate: ${(totalDraws/totalSimulations * 100).toFixed(2)}%`);

  // Top 50 most lost to boards
  console.log(`Top 50 Most Lost To Boards:`);
  boardRankings.slice(0, 50).forEach((board, index) => {
    // let boardWinRate = (board.playerWins / (board.playerWins + board.opponentWins + board.draws)) * 100;
    console.log(`${index + 1}. ${board.opponentPack} Pack: (${board.playerWins} Wins, ${board.opponentWins} Losses, ${board.draws} Draws)\n`);
    console.log(`${generateCalculatorLink(board)}\n`);
    // console.log(`${index + 1}. Opponent Pack: ${board.opponentPack}, Opponent Toy: ${board.opponentToy} (Level ${board.opponentToyLevel}), Opponent Pets: ${JSON.stringify(board.opponentPets)} - Win Rate: ${boardWinRate.toFixed(2)}% (${board.playerWins} Wins, ${board.opponentWins} Losses, ${board.draws} Draws)`);
  });
}

// TODO: Can use canvas API to draw infographic
async function generateBoardReport(calculatorBoardJSON){
  // Dequeue into array for easier manipulation

  let packFilter = argv[4];
  const boardRankings = [...await checkBoardAgainstDatabase(calculatorBoardJSON)]
    .filter(board => !packFilter || board.opponentPack === packFilter);

  // Cache board rankings somewhere
  writeFileSync("boardRankings.json", JSON.stringify(boardRankings));

  printReport(boardRankings);
}

function generateBoardReportFromSavedRankings(){
  let boardRankings = JSON.parse(readFileSync("boardRankings.json"));
  printReport(boardRankings);
}

switch(argv[2]){
  case "generate":
    let boardJSON = readFileSync(argv[3]);
    generateBoardReport(JSON.parse(boardJSON));
    break;
  case "report":
    generateBoardReportFromSavedRankings();
    break;
  default:
    console.log("Invalid command. Use 'generate <boardJSONFile>' to run simulations or 'report' to print report from saved rankings.");
}
// let boardJSONExample = readFileSync("turn11BoardConfig.json");
// let boardJSONExample = readFileSync("example-boards/eleblow-t11-better.json");
// generateBoardReport(JSON.parse(boardJSONExample));
// generateBoardReportFromSavedRankings();