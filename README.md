## Requirements
- SAP Library Database access (in .env file)
- `node` and `npm` installed
  - `npm i` to install dependencies.
## Usage
```
npm run-calc [command] [path] [packname]
```
Generates reports on a specific SAP board with the following information:
- Win/Loss/Draw% into all sampled boards from SAP Library
- Top 50 teams for which the input board loses to the most out of the sample

### Arguments
- `command` (required) can be either of `generate` (queries 2k battles from SAP Library, saves file `boardRankings.json` and generates report) or `report` (regenerates report from a saved 
`boardRankings.json`)
- `path` (required) - path to SAP calculator input JSON file. Examples can be found in `./example-boards`, and you can generate your own by going to sap-calculator.com and clicking "Export", checking "Use legacy .json export format", copying the output, then pasting it into a new json file.
- `packname` (optional) - restricts reported boards to be from a single pack only. Can be one of `Turtle`, `Puppy`, `Star`, `Golden`, `Unicorn`, or `Danger`.