#!/usr/bin/env node

/**
 * Export Top 50 Turn 3 Teams as a static PNG image
 * Requires: canvas package (already in dependencies)
 * 
 * Usage: node visualize-top50-turn3.js [input.json] [output.png]
 * 
 * Example:
 *   node visualize-top50-turn3.js top50Turn3.json top50-turn3-visualization.png
 *   node visualize-top50-turn3.js - (reads from stdin)
 */

const fs = require('fs');
const path = require('path');
const Canvas = require('canvas');

// Config
const CARD_WIDTH = 280;
const CARD_HEIGHT = 320;
const GAP = 20;
const PADDING = 40;
const HEADER_HEIGHT = 120;
const PET_SIZE = 50;
const CARDS_PER_ROW = 5;

// Colors
const BG_COLOR = '#f5f5f5';
const CARD_BG = '#ffffff';
const HEADER_GRADIENT_START = '#667eea';
const HEADER_GRADIENT_END = '#764ba2';
const TEXT_COLOR = '#333333';
const STAT_ATTACK = '#4caf50';
const STAT_HEALTH = '#f44336';

// Paths
const SPRITE_BASE = path.join(__dirname, 'Sprite');
const DATA_DIR = path.join(__dirname, 'sap-data');

// Load data maps
let PERKS_MAP = {};
let FOOD_MAP = {};
let TOYS_MAP = {};

function loadDataMaps() {
  try {
    const perksPath = path.join(DATA_DIR, 'perks.json');
    const foodPath = path.join(DATA_DIR, 'food.json');
    const toysPath = path.join(DATA_DIR, 'toys.json');

    if (fs.existsSync(perksPath)) {
      const perks = JSON.parse(fs.readFileSync(perksPath, 'utf8'));
      perks.forEach(p => {
        PERKS_MAP[p.NameId] = p;
      });
    }

    if (fs.existsSync(foodPath)) {
      const food = JSON.parse(fs.readFileSync(foodPath, 'utf8'));
      food.forEach(f => {
        FOOD_MAP[f.NameId] = f;
      });
    }

    if (fs.existsSync(toysPath)) {
      const toys = JSON.parse(fs.readFileSync(toysPath, 'utf8'));
      toys.forEach(t => {
        TOYS_MAP[t.NameId] = t;
      });
    }

    console.log(`✓ Loaded ${Object.keys(PERKS_MAP).length} perks, ${Object.keys(FOOD_MAP).length} foods, ${Object.keys(TOYS_MAP).length} toys`);
  } catch (e) {
    console.warn('Warning: Could not load data maps:', e.message);
  }
}

function getPetSpritePath(petName) {
  return path.join(SPRITE_BASE, 'Pets', `${petName}.png`);
}

function getEquipmentSpritePath(equipmentName) {
  // Check toy first
  if (Object.values(TOYS_MAP).find(t => t.NameId === equipmentName)) {
    return path.join(SPRITE_BASE, 'Toys', `Relic${equipmentName}.png`);
  }
  // Otherwise assume food/perk
  return path.join(SPRITE_BASE, 'Food', `${equipmentName}.png`);
}

async function loadImage(imagePath) {
  try {
    if (!fs.existsSync(imagePath)) {
      return null;
    }
    return await Canvas.loadImage(imagePath);
  } catch (e) {
    console.warn(`Warning: Could not load image: ${imagePath}`);
    return null;
  }
}

async function drawPetCard(ctx, pet, x, y) {
  // Guard against null or invalid pet
  if (!pet || !pet.name) {
    return;
  }

  const cardX = x;
  const cardY = y;
  const innerPadding = 8;

  // Card background
  ctx.fillStyle = CARD_BG;
  ctx.fillRect(cardX, cardY, CARD_WIDTH, 150);
  ctx.strokeStyle = '#eeeeee';
  ctx.lineWidth = 1;
  ctx.strokeRect(cardX, cardY, CARD_WIDTH, 150);

  // Pet image
  const petImage = await loadImage(getPetSpritePath(pet.name));
  if (petImage) {
    ctx.drawImage(petImage, cardX + (CARD_WIDTH - PET_SIZE) / 2, cardY + innerPadding, PET_SIZE, PET_SIZE);
  }

  // Stats
  const statsY = cardY + innerPadding + PET_SIZE + 5;
  
  // Attack stat
  ctx.fillStyle = STAT_ATTACK;
  ctx.fillRect(cardX + innerPadding, statsY, (CARD_WIDTH - innerPadding * 2) / 2 - 2, 24);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(pet.attack, cardX + (CARD_WIDTH / 2 - innerPadding), statsY + 18);

  // Health stat
  ctx.fillStyle = STAT_HEALTH;
  ctx.fillRect(cardX + CARD_WIDTH / 2 + 2, statsY, (CARD_WIDTH - innerPadding * 2) / 2 - 2, 24);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(pet.health, cardX + (CARD_WIDTH / 2 + CARD_WIDTH / 4 + innerPadding), statsY + 18);

  // Level badge
  if (pet.exp > 0) {
    ctx.fillStyle = '#ff9800';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Lv${pet.exp}`, cardX + innerPadding, cardY + 15);
  }

  // Equipment icon (small)
  if (pet.equipment && pet.equipment.name) {
    const equipImage = await loadImage(getEquipmentSpritePath(pet.equipment.name));
    if (equipImage) {
      const iconSize = 20;
      ctx.drawImage(equipImage, cardX + CARD_WIDTH - iconSize - innerPadding, cardY + innerPadding, iconSize, iconSize);
    }
  }
}

async function drawTeamCard(ctx, teamData, teamIndex, x, y) {
  const cardX = x;
  const cardY = y;
  const innerPadding = 10;

  // Card background
  ctx.fillStyle = CARD_BG;
  ctx.fillRect(cardX, cardY, CARD_WIDTH, CARD_HEIGHT);
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 2;
  ctx.strokeRect(cardX, cardY, CARD_WIDTH, CARD_HEIGHT);

  // Header with gradient
  const gradient = ctx.createLinearGradient(cardX, cardY, cardX, cardY + 50);
  gradient.addColorStop(0, HEADER_GRADIENT_START);
  gradient.addColorStop(1, HEADER_GRADIENT_END);
  ctx.fillStyle = gradient;
  ctx.fillRect(cardX, cardY, CARD_WIDTH, 50);

  // Rank and stats
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`#${teamIndex + 1}`, cardX + innerPadding, cardY + 30);

  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'right';
  const wins = teamData.turn3.wins;
  const total = teamData.turn3.total || 1;
  const wr = ((wins / total) * 100).toFixed(1);
  ctx.fillText(`${wins}W (${wr}%)`, cardX + CARD_WIDTH - innerPadding, cardY + 30);

  // Pets grid (3 columns, up to 2 rows visible)
  const petsPerRow = 3;
  const petCardWidth = (CARD_WIDTH - innerPadding * 4) / 3;
  const petCardHeight = 150;
  const pets = teamData.turn3.calculatorConfig.playerPets || [];

  for (let i = 0; i < Math.min(pets.length, 6); i++) {
    const row = Math.floor(i / petsPerRow);
    const col = i % petsPerRow;
    const petX = cardX + innerPadding + col * (petCardWidth + innerPadding);
    const petY = cardY + 60 + row * (petCardHeight + innerPadding);

    if (petY + petCardHeight <= cardY + CARD_HEIGHT - 40) {
      await drawPetCard(ctx, pets[i], petX, petY);
    }
  }

  // Pack name footer
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(cardX, cardY + CARD_HEIGHT - 30, CARD_WIDTH, 30);
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(teamData.turn3.calculatorConfig.playerPack || 'Unknown', cardX + CARD_WIDTH / 2, cardY + CARD_HEIGHT - 8);
}

async function generateVisualization(topTeams, outputPath) {
  console.log(`Generating visualization for ${topTeams.length} teams...`);

  const numRows = Math.ceil(topTeams.length / CARDS_PER_ROW);
  const canvasWidth = CARDS_PER_ROW * CARD_WIDTH + (CARDS_PER_ROW + 1) * GAP + PADDING * 2;
  const canvasHeight = HEADER_HEIGHT + numRows * (CARD_HEIGHT + GAP) + GAP + PADDING * 2;

  console.log(`Canvas size: ${canvasWidth}x${canvasHeight}`);

  const canvas = new Canvas.Canvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Header
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🐾 Top 50 Strongest Turn 3 Teams', canvasWidth / 2, PADDING + 40);

  ctx.font = 'italic 16px Arial';
  ctx.fillStyle = '#999999';
  ctx.fillText('Super Auto Pets Board Rankings', canvasWidth / 2, PADDING + 65);

  // Draw teams
  for (let i = 0; i < topTeams.length; i++) {
    const row = Math.floor(i / CARDS_PER_ROW);
    const col = i % CARDS_PER_ROW;
    const x = PADDING + col * (CARD_WIDTH + GAP);
    const y = HEADER_HEIGHT + PADDING + row * (CARD_HEIGHT + GAP);

    console.log(`Drawing team ${i + 1}/${topTeams.length}...`);
    await drawTeamCard(ctx, topTeams[i], i, x, y);
  }

  // Save
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✓ Saved visualization to ${outputPath}`);
}

async function main() {
  const inputFile = process.argv[2] || 'top50Turn3.json';
  const outputFile = process.argv[3] || 'top50-turn3-visualization.png';

  console.log('Top 50 Turn 3 Teams Visualizer (PNG Export)');
  console.log('='.repeat(50));

  loadDataMaps();

  // Load input data
  let jsonData;
  try {
    if (inputFile === '-') {
      // Read from stdin
      console.log('Reading from stdin...');
      const chunks = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      jsonData = JSON.parse(Buffer.concat(chunks).toString());
    } else {
      console.log(`Loading: ${inputFile}`);
      const fileContent = fs.readFileSync(inputFile, 'utf8');
      jsonData = JSON.parse(fileContent);
    }
  } catch (e) {
    console.error(`✗ Error reading file: ${e.message}`);
    process.exit(1);
  }

  // Validate and process data
  if (!Array.isArray(jsonData)) {
    console.error('✗ Input must be a JSON array');
    process.exit(1);
  }

  const topTeams = jsonData.slice(0, 50);
  console.log(`Processing ${topTeams.length} teams...`);

  // Generate visualization
  try {
    await generateVisualization(topTeams, outputFile);
    console.log('Done!');
  } catch (e) {
    console.error(`✗ Error generating visualization: ${e.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
