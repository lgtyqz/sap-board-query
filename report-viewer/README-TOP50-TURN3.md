# Top 50 Turn 3 Teams Visualizer

A beautiful, interactive HTML visualization for the strongest 50 Super Auto Pets teams at Turn 3.

## Features

- **Responsive Grid Layout**: Teams are displayed in a responsive grid that adapts to different screen sizes
- **Comprehensive Team Info**: 
  - Rank (#1, #2, etc.)
  - Win count and win rate percentage
  - Pack name (e.g., Turtle, Dragon, etc.)
- **Pet Display**:
  - Pet sprite images
  - Attack stat (green) and Health stat (red)
  - Experience level badges for leveled-up pets
  - Equipment/perk overlay icons (when present)
- **Auto-Loading**: Automatically loads `top50Turn3.json` from the parent directory on page load
- **Manual Loading**: Use the "Load JSON" button to load a different JSON file

## How to Use

### Option 1: Auto-Load (Easiest)
Simply open `view-top50-turn3.html` in a web browser. The page will automatically load and display the `top50Turn3.json` file from the parent directory.

### Option 2: Manual Load
1. Open `view-top50-turn3.html` in a web browser
2. Click the "Load JSON" button
3. Select your `top50Turn3.json` file (or any compatible JSON file with the same format)
4. The visualization will update to show the teams

## Files Included

- **view-top50-turn3.html** - Main HTML file with header and layout
- **view-top50-turn3.js** - JavaScript logic for loading data, resolving sprite paths, and rendering teams
- **view-top50-turn3.css** - Responsive styling with gradient backgrounds and hover effects

## Data Mapping

The visualizer automatically maps:
- **Pet names** → `../Sprite/Pets/{PetName}.png` (e.g., Spider → `Sprite/Pets/Spider.png`)
- **Equipment/Perks** → Data from `../sap-data/perks.json` and `../sap-data/food.json`
- **Toys** → `../Sprite/Toys/Relic{NameId}.png`
- **Food/Perks** → `../Sprite/Food/{NameId}.png`

## JSON Format Expected

The input JSON should be an array of team objects with this structure:

```json
[
  {
    "replayId": "...",
    "turn3": {
      "wins": 1437,
      "draws": 45,
      "losses": 48,
      "total": 1530,
      "calculatorConfig": {
        "playerPack": "Turtle",
        "playerToy": null,
        "playerPets": [
          {
            "name": "Spider",
            "attack": 4,
            "health": 4,
            "exp": 0,
            "equipment": null
          },
          ...
        ]
      }
    }
  },
  ...
]
```

## Browser Compatibility

Works in all modern browsers (Chrome, Firefox, Safari, Edge) that support ES6 JavaScript and CSS Grid.

## Responsive Design

- **Desktop** (> 1200px): 5 teams per row  
- **Tablet** (768px - 1200px): 3-4 teams per row
- **Mobile** (< 768px): 1-2 teams per row

## Customization

### Colors
Edit the CSS gradient colors in `view-top50-turn3.css`:
- Main gradient: `#667eea` to `#764ba2`
- Attack stat: `#4caf50` (green)
- Health stat: `#f44336` (red)
- Level badge: `#ff9800` (orange)

### Grid Layout
Modify the `grid-template-columns` value in the `.boards-grid` class to change the number of cards per row.

### Card Size
Change the `minmax(280px, 1fr)` value in `.boards-grid` to adjust card dimensions.

## Troubleshooting

**Sprites not loading?**
- Ensure the `../Sprite/` folder path is correct relative to `report-viewer/`
- Check that sprite filenames match pet/equipment names exactly
- Some missing sprites will show a placeholder "?" image

**Teams not loading?**
- Check that `top50Turn3.json` is in the parent directory, or use "Load JSON" to select a file manually
- Verify the JSON format matches the expected structure above
- Open browser console (F12) for error messages

**Equipment icons not showing?**
- This is expected for most turn-3 teams as equipment is typically added in later turns
- If equipment is present, it will display as a circular icon overlay in the top-right of the pet card

## Performance

The visualizer can comfortably display up to 50+ teams without performance issues. Rendering is done entirely in the browser with no backend required.
