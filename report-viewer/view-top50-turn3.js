// Data loader for perk/food/toy mappings
let PERKS_MAP = {};
let FOOD_MAP = {};
let TOYS_MAP = {};

// Load data files - this will need to be fetched dynamically
async function loadDataMaps() {
  try {
    // Try to load data files from relative paths
    const [perksResponse, foodResponse, toysResponse] = await Promise.all([
      fetch('../sap-data/perks.json'),
      fetch('../sap-data/food.json'),
      fetch('../sap-data/toys.json')
    ]);

    if (perksResponse.ok) {
      const perks = await perksResponse.json();
      perks.forEach(p => {
        PERKS_MAP[p.NameId] = p;
      });
    }

    if (foodResponse.ok) {
      const food = await foodResponse.json();
      food.forEach(f => {
        FOOD_MAP[f.NameId] = f;
      });
    }

    if (toysResponse.ok) {
      const toys = await toysResponse.json();
      toys.forEach(t => {
        TOYS_MAP[t.NameId] = t;
      });
    }
  } catch (e) {
    console.warn('Could not load data maps:', e);
  }
}

// Get sprite path for a pet name
function getPetSpritePath(petName) {
  return `../Sprite/Pets/${petName}.png`;
}

// Get sprite path for equipment (perk or toy)
function getEquipmentSpritePath(equipmentName) {
  // Check if it's a toy (usually has "Relic" prefix in sprite)
  const toyData = Object.values(TOYS_MAP).find(t => t.NameId === equipmentName);
  if (toyData) {
    return `../Sprite/Toys/Relic${equipmentName}.png`;
  }

  // Check if it's a perk or food
  const perkData = PERKS_MAP[equipmentName] || FOOD_MAP[equipmentName];
  if (perkData) {
    return `../Sprite/Food/${equipmentName}.png`;
  }

  // Fallback: assume it's in food folder
  return `../Sprite/Food/${equipmentName}.png`;
}

function renderEmptyPet(){
  const petDiv = document.createElement('div');
  petDiv.className = 'pet-card';

  const petImage = document.createElement('img');
  petDiv.appendChild(petImage);

  // Pet stats
  const statsDiv = document.createElement('div');
  statsDiv.className = 'pet-stats';

  const attackSpan = document.createElement('span');
  attackSpan.className = 'stat attack';
  attackSpan.textContent = "-";

  const healthSpan = document.createElement('span');
  healthSpan.className = 'stat health';
  healthSpan.textContent = "-";

  statsDiv.appendChild(attackSpan);
  statsDiv.appendChild(healthSpan);
  petDiv.appendChild(statsDiv);
  return petDiv;
}

// Render a single pet card
function renderPet(pet) {
  const petDiv = document.createElement('div');
  petDiv.className = 'pet-card';

  const petImage = document.createElement('img');
  petImage.src = getPetSpritePath(pet.name);
  petImage.alt = pet.name;
  petImage.onerror = () => {
    petImage.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22%3E%3Crect fill=%22%23ccc%22 width=%2250%22 height=%2250%22/%3E%3Ctext x=%2225%22 y=%2235%22 text-anchor=%22middle%22 font-size=%2212%22%3E?%3C/text%3E%3C/svg%3E';
  };
  petDiv.appendChild(petImage);

  // Pet stats
  const statsDiv = document.createElement('div');
  statsDiv.className = 'pet-stats';

  const attackSpan = document.createElement('span');
  attackSpan.className = 'stat attack';
  attackSpan.textContent = pet.attack;

  const healthSpan = document.createElement('span');
  healthSpan.className = 'stat health';
  healthSpan.textContent = pet.health;

  statsDiv.appendChild(attackSpan);
  statsDiv.appendChild(healthSpan);
  petDiv.appendChild(statsDiv);

  // Equipment/perk overlay
  if (pet && pet.equipment && pet.equipment.name) {
    const equipDiv = document.createElement('div');
    equipDiv.className = 'equipment';

    const equipImg = document.createElement('img');
    equipImg.src = getEquipmentSpritePath(pet.equipment.name);
    equipImg.alt = pet.equipment.name;
    equipImg.title = pet.equipment.name;
    equipImg.onerror = () => {
      equipDiv.style.display = 'none';
    };
    equipDiv.appendChild(equipImg);
    petDiv.appendChild(equipDiv);
  }

  // Level badge
  if (pet.exp > 0) {
    const levelDiv = document.createElement('div');
    levelDiv.className = 'level-badge';
    levelDiv.textContent = `Lv${pet.exp}`;
    petDiv.appendChild(levelDiv);
  }

  return petDiv;
}

// Render a team board
function renderTeam(teamIndex, teamData) {
  const teamDiv = document.createElement('div');
  teamDiv.className = 'team-card';

  // Header with rank and stats
  const headerDiv = document.createElement('div');
  headerDiv.className = 'team-header';

  const rankSpan = document.createElement('span');
  rankSpan.className = 'rank';
  rankSpan.textContent = `#${teamIndex + 1}`;

  const winsSpan = document.createElement('span');
  winsSpan.className = 'wins';
  winsSpan.textContent = `${teamData.turn3.wins}W`;

  const winRateSpan = document.createElement('span');
  winRateSpan.className = 'winrate';
  const total = teamData.turn3.total || 1;
  const wr = ((teamData.turn3.wins / total) * 100).toFixed(1);
  winRateSpan.textContent = `${wr}%`;

  headerDiv.appendChild(rankSpan);
  headerDiv.appendChild(winsSpan);
  headerDiv.appendChild(winRateSpan);
  teamDiv.appendChild(headerDiv);

  // Pets container
  const petsContainer = document.createElement('div');
  petsContainer.className = 'pets-container';

  const pets = teamData.turn3.calculatorConfig.playerPets || [];
  pets.forEach(pet => {
    if(pet) {
      petsContainer.appendChild(renderPet(pet));
    }else{
      petsContainer.appendChild(renderEmptyPet());
    }
  });

  teamDiv.appendChild(petsContainer);

  // Pack info
  const packDiv = document.createElement('div');
  packDiv.className = 'pack-info';
  packDiv.textContent = teamData.turn3.calculatorConfig.playerPack;
  teamDiv.appendChild(packDiv);

  return teamDiv;
}

// Load and display top 50 teams
async function loadAndDisplayTeams(jsonData) {
  // Ensure data maps are loaded
  await loadDataMaps();

  const boardsContainer = document.getElementById('boards');
  boardsContainer.innerHTML = '';

  // Process up to 50 teams
  const teams = jsonData;
  console.log(jsonData.length);

  teams.forEach((teamData, index) => {
    boardsContainer.appendChild(renderTeam(index, teamData));
  });

  document.getElementById('teamCount').textContent = `Teams: ${teams.length}`;
}

// File input handler
document.getElementById('loadBtn').addEventListener('click', () => {
  document.getElementById('jsonInput').click();
});

document.getElementById('jsonInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const jsonData = JSON.parse(event.target.result);
      loadAndDisplayTeams(jsonData);
    } catch (error) {
      alert('Error parsing JSON: ' + error.message);
    }
  };
  reader.readAsText(file);
});

// Try to auto-load top50Turn3.json if available
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('../top50Turn3.json');
    if (response.ok) {
      const jsonData = await response.json();
      loadAndDisplayTeams(jsonData);
    }
  } catch (e) {
    console.log('Could not auto-load top50Turn3.json, waiting for manual load');
  }
});
