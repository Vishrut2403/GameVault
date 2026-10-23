# Time-to-Complete Predictions

## Overview

The **Time-to-Complete Predictions** feature uses simple statistics over your own data to estimate when you'll finish a game, based on:

- Your playstyle patterns (average playtime per game)
- How fast you typically complete games
- Genre-specific completion behaviors
- HLTB (HowLongToBeat) estimates
- Your recent gaming frequency
- Current game progress

## How It Works

### 1. **Playstyle Analysis**
When you open a game's details, the system analyzes your completed games to build a profile:

- **Average Completion Rate**: What % of games you start do you actually finish?
- **Average Days to Complete**: How long does it typically take you from start to finish?
- **Playtime per Game**: Average hours you spend per game
- **Genre Patterns**: Different completion behaviors for different game genres

### 2. **Prediction Calculation**
The total hours a game needs comes from the first source that applies:

| Source | Used when | Confidence |
|--------|-----------|------------|
| HLTB completionist time | HLTB has the game | 85% |
| Your genre pace (days you take on that tag × your daily average) | No HLTB, and the game has a tag | 80% |
| Your average completed game × 1.2 | Neither of the above | 50% |

If you have already played longer than that estimate, it becomes your playtime × 1.2 (confidence 60%).
A game you have started gets +15% confidence (capped at 95%) and its progress in the reasoning text.

```
Remaining Time   = Estimated Total - Hours Played
Daily Pace       = your avg playtime on days you play (last 30 days, nearest 0.5h)
Days to Complete = (Remaining Time ÷ Daily Pace) ÷ share of days you play
```

With no sessions in the last 30 days, Daily Pace falls back to 2h a day, every day.

## Example

**Game:** Baldur's Gate 3  
**HLTB Completionist:** 144 hours  
**Hours Played:** 40  
**Your habits:** 3 hours on days you play, 5 days a week  

```
Remaining      = 144 - 40 = 104 hours
Play days      = 104 ÷ 3 = 35
Estimated Days = 35 ÷ (5/7) = 49 days
Confidence     = 85% + 15% (started), capped = 95%
```

## API Endpoints

### POST `/api/predictions/:gameId`
Calculate completion time prediction for a game.

**Query Parameters:**
- `hltbCompletionistMinutes` (optional): Completionist hours from HLTB (for manual override)

**Response:**
```json
{
  "success": true,
  "data": {
    "estimatedDays": 49,
    "estimatedCompletionDate": "2026-12-11",
    "confidence": 0.95,
    "reasoning": "Based on HLTB estimates (28% progress)",
    "hltbEstimate": 8640,
    "hoursPlayed": 40,
    "hoursRemaining": 104,
    "estimatedTotalHours": 144,
    "avgHoursPerDay": 3,
    "playDaysPerWeek": 5
  }
}
```

### GET `/api/predictions/playstyle/current`
Get your detected playstyle metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "avgCompletionRate": 0.65,
    "avgPlaytimePerGame": 2800,
    "avgDaysToComplete": 28,
    "totalCompletedGames": 42,
    "totalPlayedGames": 65,
    "genrePlaystyles": {
      "RPG": {
        "completionRate": 0.8,
        "avgDaysToComplete": 35
      },
      "Indie": {
        "completionRate": 0.5,
        "avgDaysToComplete": 14
      }
    }
  }
}
```

## Frontend Display

In the **Game Modal**, you'll see:

```
┌─────────────────────────────────────┐
│ Estimated Completion                │
│ 49 days                             │
│ Est. Dec 11                         │
│                       95% confidence │
│                                     │
│ Based on HLTB estimates             │
│ (28% progress)                      │
└─────────────────────────────────────┘
```

## Data Requirements

Predictions work best when you have:

✅ **Optimal Setup:**
- 10+ completed games (builds reliable playstyle)
- Regular gaming sessions (shows daily pace)
- Games tagged by genre
- HLTB data available

⚠️ **Limited Setup:**
- 0-3 completed games (uses 50% default confidence)
- No HLTB data available (uses average playtime instead)
- New user (no historical data)

## Technical Details

### Backend Implementation
- Located in `backend/src/services/completion-prediction.service.ts`
- Uses Prisma to analyze session data
- Calculates genre-specific playstyles dynamically
- No ML library needed (uses statistical analysis)

### Database
Leverages existing tables:
- `library_games` - game status and playtime
- `game_sessions` - daily session logs (dates/durations)
- User tags for genre classification

## Limitations

- **Games with no HLTB match**: estimates are unavailable and the app falls back silently
- **New users**: Predictions start vague, improve with data
- **Genre tags**: Predictions improve if games are tagged

## Future Enhancements

Possible improvements:
1. Track prediction accuracy and adjust model weights
2. Add ML regression (TensorFlow.js) for better non-linear patterns
3. Compare against community completion statistics
4. Account for game difficulty/modifiers
5. Seasonal variation (some months you play more)
6. Multi-game completion patterns (play 3 games simultaneously)
