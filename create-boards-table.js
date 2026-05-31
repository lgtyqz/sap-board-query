require("dotenv").config();

const { neon } = require("@neondatabase/serverless");
const { parseReplayForCalculator } = require("./parse-replays");

const sql = neon(process.env.DATABASE_URL);

async function createBoardsTable(){
  // Create 'boards' table
  // Insert boards from all 1v1 versus boards in SAP library
  await sql`
    CREATE TABLE IF NOT EXISTS boards (
      id SERIAL PRIMARY KEY,
      replay_id STRING,
      turn INTEGER,
      board JSONB
    );
  `;

  // Fetch all replays from database, paginated
  // Don't want to store them all in memory at once though!
  let totalReplayCount = await sql`SELECT COUNT(*) FROM replays`;
  totalReplayCount = totalReplayCount[0].count;
  const pageSize = 100;
  for(let offset = 0; offset < totalReplayCount; offset += pageSize){
    const pageReplays = await sql`SELECT * FROM replays ORDER BY id LIMIT ${pageSize} OFFSET ${offset}`;
    // Populate boards table with calculator-shaped data from replays
    console.log(`Fetched ${offset + pageReplays.length}/${totalReplayCount} replays...`);
    for (const replay of pageReplays) {
      const replayId = replay.id;
      const replayData = replay.raw_json;
      if(replay.mode === 0){
        const battles = parseReplayForCalculator(replayData);
        for(let i = 0; i < battles.length; i++){
          await sql`
            INSERT INTO boards (replay_id, turn, board)
            VALUES (${replayId}, ${i + 1}, ${JSON.stringify(battles[i])});
          `;
        }
      }
    }
    console.log(`Pushed boards from ${pageReplays.length} replays`);
  }
}
createBoardsTable();