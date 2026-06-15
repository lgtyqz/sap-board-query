let generatePetElement = function(petInfo){
  let container = document.createElement("figure");
  container.classList.add("pet");

  let petXP = document.createElement("div");
  petXP.classList.add("pet-xp");
  petXP.innerText = `Lv ${petInfo.exp}`;
  container.appendChild(petXP);

  let petImage = document.createElement("img");
  petImage = 
  container.appendChild(petImage);

  let petStats = document.createElement("div");
  let attackStat = document.createElement("span");
  attackStat.classList.add("attack");
  let healthStat = document.createElement("span");
  healthStat.classList.add("health");

  attackStat.innerText = petInfo.attack;
  healthStat.innerText = petInfo.health;
  petStats.appendChild(attackStat);
  petStats.appendChild(healthStat);
  container.appendChild(petStats);
}

let generateTurn3ReportRow = function(result){
  let container = document.createElement("div");
  container.classList.add("report-row");

  let petsContainer = document.createElement("div");
  petsContainer.classList.add("pets-container");

  return container;
}

let generateTurn11ReportRow = function(result){
  let container = document.createElement("div");
  container.classList.add("report-row");

  let petsContainer = document.createElement("div");
  petsContainer.classList.add("pets-container");

  return container;
}

let generateTurn3Report = function(results){
  let reportContainer = document.createElement("div");
  reportContainer.classList.add("report-container");

  for(let result of results){
    let row = generateTurn3ReportRow(result);
    reportContainer.appendChild(row);
  }

  return reportContainer;
}

let generateTurn11Report = function(results){
  let reportContainer = document.createElement("div");
  reportContainer.classList.add("report-container");

  for(let result of results){
    let row = generateTurn11ReportRow(result);
    reportContainer.appendChild(row);
  }

  return reportContainer;
}

document.onload() = function() {
  const turn3ReportContainer = document.getElementById("turn3");
  const turn11ReportContainer = document.getElementById("turn11");
  const turn3FileInput = document.getElementById("turn3-input");
  const turn11FileInput = document.getElementById("turn11-input");
  turn3FileInput.addEventListener("change", function(event){
    let file = event.target.files[0];
    let reader = new FileReader();
    reader.onload = function(e){
      let reportData = JSON.parse(reader.result);
      turn3ReportContainer.innerHTML = "";
      turn3ReportContainer.appendChild(generateTurn3Report(reportData));
    }
    reader.readAsText(file);
  });

  turn11FileInput.addEventListener("change", function(event){
    let file = event.target.files[0];
    let reader = new FileReader();
    reader.onload = function(e){
      let reportData = JSON.parse(reader.result);
      turn11ReportContainer.innerHTML = "";
      turn11ReportContainer.appendChild(generateTurn11Report(reportData));
    }
    reader.readAsText(file);
  });
}