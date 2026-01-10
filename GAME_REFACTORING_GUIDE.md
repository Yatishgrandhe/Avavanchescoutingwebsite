# Game Refactoring Guide

## Overview
This guide outlines the complete refactoring process to change from the current game (Coral/Algae) to a new game with different scoring mechanics.

## Current Game Structure

### Scoring Elements (Current - Coral/Algae Game)
- **Autonomous**: auto_leave, auto_coral_trough, auto_coral_l2, auto_coral_l3, auto_coral_l4, auto_algae_processor, auto_algae_net, auto_cleansing
- **Teleop**: teleop_coral_trough, teleop_coral_l2, teleop_coral_l3, teleop_coral_l4, teleop_algae_processor, teleop_algae_net, teleop_cleansing
- **Endgame**: endgame_park, endgame_shallow_cage, endgame_deep_cage

### Database Schema
- `scouting_data` table stores:
  - `autonomous_points`, `teleop_points`, `endgame_points`, `final_score` (calculated integers)
  - `notes` (JSONB) - stores detailed scoring breakdown
  - `autonomous_cleansing`, `teleop_cleansing` (separate integer columns)

---

## Files That Need Refactoring

### 1. Core Type Definitions & Scoring Logic
**Priority: HIGH - Must be done first**

- **`lib/types.ts`**
  - Update `ScoringNotes` interface with new game fields
  - Update `ScoringElement` type union
  - Update `SCORING_VALUES` constant with new point values

- **`lib/utils.ts`**
  - Update `calculateScore()` function with new scoring logic

**Estimated Time: 1-2 hours**

---

### 2. Scouting Form Components
**Priority: HIGH - User-facing forms**

- **`components/scout/AutonomousForm.tsx`**
  - Replace all coral/algae fields with new game autonomous fields
  - Update labels, icons, and descriptions
  - Update scoring calculations

- **`components/scout/TeleopForm.tsx`**
  - Replace all coral/algae fields with new game teleop fields
  - Update labels, icons, and descriptions
  - Update scoring calculations

- **`components/scout/EndgameForm.tsx`**
  - Replace endgame options (park/shallow_cage/deep_cage) with new game endgame options
  - Update labels and point values

- **`components/scout/MiscellaneousForm.tsx`**
  - Review if any game-specific fields need updating

- **`components/scout/MobileScoutForm.tsx`**
  - Verify form data structure matches new game
  - Update any hardcoded references

**Estimated Time: 4-6 hours**

---

### 3. Analysis Pages
**Priority: MEDIUM - Data display**

- **`pages/analysis/basic.tsx`**
  - Update scoring breakdown display in matches tab
  - Update any hardcoded scoring element references
  - **CRITICAL**: Must handle both old and new game data formats

- **`pages/analysis/data.tsx`**
  - Update `parseFormNotes()` function to handle new game structure
  - Update scoring breakdown display in expanded rows (lines 806-911)
  - Update any hardcoded scoring element references
  - **CRITICAL**: Must detect game version and display appropriate breakdown for old vs new data

- **`pages/analysis/data-mobile.tsx`**
  - Update scoring breakdown display (if different from desktop)
  - **CRITICAL**: Must handle both game versions

- **`pages/analysis/advanced.tsx`**
  - Review for any game-specific calculations
  - Update scoring element references if present

- **`pages/analysis/comparison.tsx`**
  - Review for any game-specific metrics
  - Update if needed

**Estimated Time: 4-5 hours** (increased due to backward compatibility requirement)

---

### 4. Team Detail Pages
**Priority: MEDIUM - Data display**

- **`pages/team/[teamNumber].tsx`**
  - Update `renderScoringBreakdown()` function
  - Replace all hardcoded scoring elements with new game elements
  - Update labels and point values
  - **CRITICAL**: Make it detect game version and display appropriate breakdown

- **`pages/team-history/[teamNumber].tsx`**
  - Update `renderScoringBreakdown()` function (lines 251-309)
  - **CRITICAL**: Must handle both old game (coral/algae) and new game data
  - Detect game version from data and display correct scoring elements
  - Old competitions should show old game breakdown, new competitions show new game breakdown

**Estimated Time: 3-4 hours** (increased due to backward compatibility requirement)

---

### 5. API Endpoints
**Priority: MEDIUM - Data processing**

- **`pages/api/scouting_data.ts`**
  - Verify it handles new scoring fields correctly
  - Update field mappings if needed
  - Ensure `calculateScore()` is called correctly

- **`pages/api/team-stats.ts`** (if exists)
  - Review for game-specific calculations

- **`pages/api/coral-stats.ts`** (if exists)
  - May need renaming/refactoring if game-specific

**Estimated Time: 1-2 hours**

---

### 7. Past Competitions & Historical Data ⚠️ CRITICAL
**Priority: CRITICAL - Must work with old data**

- **`pages/past-competitions.tsx`**
  - **CRITICAL**: Must display old game data correctly
  - Team statistics table (lines 388-510) shows scoring breakdown
  - Must detect game version and display appropriate breakdown
  - Currently shows: Auto, Teleop, Endgame columns - these are generic and should work
  - Scoring breakdown in expanded views needs game version detection

- **`pages/team-history/[teamNumber].tsx`**
  - **CRITICAL**: Must handle both old and new game data
  - `renderScoringBreakdown()` function (lines 251-309) is hardcoded to current game (coral/algae)
  - **MUST BE UPDATED** to:
    1. Detect game version from data (check `game_version` field or infer from `notes` structure)
    2. Show old game breakdown for old competitions
    3. Show new game breakdown for new competitions
    4. Handle mixed data (team with both old and new game matches)

- **`pages/api/past-competitions.ts`**
  - Review to ensure it returns all necessary data
  - No changes needed if it just returns raw data
  - Ensure `game_version` field is included in responses

**Key Implementation Strategy:**
1. Create helper function `detectGameVersion(notes, game_version?)` 
2. Create helper function `renderScoringBreakdown(notes, gameVersion)` that switches based on version
3. For old game: use existing coral/algae breakdown
4. For new game: use new game breakdown
5. Update all places that call `renderScoringBreakdown()` to pass game version

**Estimated Time: 4-5 hours** (CRITICAL for backward compatibility)

---

### 6. Database Migration
**Priority: HIGH - Data integrity**

**Option A: Keep existing structure (Recommended)**
- The `notes` JSONB column is flexible and can store any structure
- No schema changes needed if new game fits existing structure
- Old data remains accessible
- **CRITICAL**: Add `game_version` or `game_year` field to distinguish old vs new game data
  - Add to `scouting_data` table: `game_version TEXT` or `game_year INTEGER`
  - Add to `past_scouting_data` table: `game_version TEXT` or `game_year INTEGER`
  - Default old data to previous game version
  - New submissions get new game version

**Option B: Migrate schema**
- Only needed if new game requires different data types
- Create migration to:
  - Update `notes` JSONB structure
  - Add/remove columns if needed
  - Migrate existing data

**Migration Steps:**
1. Backup existing data
2. Add `game_version` field to track which game the data belongs to
3. Set existing data to old game version (e.g., 'coral_algae_2025')
4. Set new data to new game version (e.g., 'new_game_2026')
5. Create migration script
6. Test migration on development database
7. Apply to production

**Estimated Time: 3-5 hours** (increased due to game version tracking requirement)

---

## Step-by-Step Refactoring Process

### Phase 1: Planning (1 hour)
1. **Define New Game Structure**
   - List all scoring elements for new game
   - Define point values for each element
   - Map old game → new game (if migration needed)

2. **Create Game Configuration File** (Optional but Recommended)
   - Create `lib/game-config.ts` with:
     - Scoring elements
     - Point values
     - Field labels
     - Descriptions
   - Makes future game changes easier

### Phase 2: Core Updates (2-3 hours)
1. Update `lib/types.ts` with new game structure
2. Update `lib/utils.ts` with new scoring logic
3. Test scoring calculations manually

### Phase 3: Form Components (4-6 hours)
1. Update `AutonomousForm.tsx`
2. Update `TeleopForm.tsx`
3. Update `EndgameForm.tsx`
4. Test forms end-to-end

### Phase 4: Analysis Pages (3-4 hours)
1. Update `basic.tsx`
2. Update `data.tsx`
3. Update `advanced.tsx` (if needed)
4. Test data display

### Phase 5: Team Pages (2-3 hours)
1. Update team detail page
2. Test scoring breakdown display

### Phase 6: Database & API (1-2 hours)
1. Review API endpoints
2. Test data submission
3. Verify database storage

### Phase 7: Testing (2-3 hours)
1. Test complete scouting flow
2. Test all analysis pages
3. Verify data persistence
4. Test on mobile devices

---

## Total Estimated Time

**Minimum (if new game is similar structure):** 20-25 hours
**Realistic (with testing, backward compatibility, and fixes):** 25-35 hours
**Maximum (if major structural changes needed):** 35-45 hours

**Note:** Time increased due to backward compatibility requirements for past data pages.

---

## Key Considerations

### 1. Backward Compatibility ⚠️ CRITICAL
- **Old scouting data will remain in database** - must be accessible and displayable
- **Analysis pages must handle both old and new data formats**
- **Past competitions page must show old game data correctly**
- **Team history page must show correct breakdown for each game version**
- **Add `game_version` field** to track which game the data belongs to:
  - Add to `scouting_data` table
  - Add to `past_scouting_data` table
  - Set existing data to old game version (e.g., 'coral_algae_2025')
  - Set new data to new game version (e.g., 'new_game_2026')
- **Create helper function** to detect game version from data:
  ```typescript
  function detectGameVersion(notes: any, game_version?: string): 'old' | 'new' {
    if (game_version) {
      return game_version.includes('coral') || game_version.includes('algae') ? 'old' : 'new';
    }
    // Fallback: check notes structure
    if (notes?.auto_coral_trough !== undefined || notes?.auto_algae_processor !== undefined) {
      return 'old';
    }
    // Check for new game indicators
    return 'new';
  }
  ```
- **Update all scoring breakdown functions** to use game version detection

### 2. Data Migration Strategy
- **Option 1**: Keep old data as-is, only new submissions use new format
- **Option 2**: Migrate old data to new format (if possible)
- **Option 3**: Archive old data to separate table

### 3. Testing Checklist
- [ ] Scouting form submission works
- [ ] Scoring calculations are correct
- [ ] Data displays correctly in analysis pages
- [ ] Team detail pages show correct breakdown
- [ ] Mobile forms work correctly
- [ ] Database stores data correctly
- [ ] **Old data still accessible and displays correctly**
- [ ] **Past competitions page shows old game data correctly**
- [ ] **Team history page shows correct breakdown for old competitions**
- [ ] **Team history page shows correct breakdown for new competitions**
- [ ] **Mixed data (team with both old and new matches) displays correctly**
- [ ] **Game version detection works correctly**
- [ ] **Scoring breakdown functions handle both game versions**

### 4. Rollout Strategy
1. **Development**: Make all changes in dev environment
2. **Testing**: Thoroughly test all functionality
3. **Staging**: Deploy to staging, test with real data
4. **Production**: Deploy during low-usage period
5. **Monitoring**: Watch for errors after deployment

---

## Quick Reference: Files to Update

### Must Update (Core):
- `lib/types.ts`
- `lib/utils.ts`
- `components/scout/AutonomousForm.tsx`
- `components/scout/TeleopForm.tsx`
- `components/scout/EndgameForm.tsx`

### Should Update (Display):
- `pages/analysis/basic.tsx`
- `pages/analysis/data.tsx`
- `pages/team/[teamNumber].tsx`

### ⚠️ CRITICAL - Past Data Pages:
- `pages/past-competitions.tsx` - Must handle old game data
- `pages/team-history/[teamNumber].tsx` - Must handle both old and new game data
- Both must detect game version and display appropriate breakdown

### May Need Update:
- `pages/analysis/advanced.tsx`
- `pages/analysis/comparison.tsx`
- `pages/api/scouting_data.ts`

### Database:
- Migration script to add `game_version` field
- Set existing data to old game version

---

## Questions to Answer Before Starting

1. **What is the new game?** (FIRST Robotics, VEX, etc.)
2. **What are the scoring elements?** (list all)
3. **What are the point values?** (for each element)
4. **What is the game structure?** (autonomous/teleop/endgame or different?)
5. **Do we need to migrate old data?** (or keep separate?)
6. **What is the timeline?** (when does new game start?)
7. **What should we call the old game version?** (e.g., 'coral_algae_2025')
8. **What should we call the new game version?** (e.g., 'new_game_2026')

---

## Next Steps

1. **Get new game details** from user
2. **Create game configuration** file
3. **Start with core updates** (types.ts, utils.ts)
4. **Update forms** one by one
5. **Update analysis pages**
6. **Test thoroughly**
7. **Deploy**

---

## Support

If you need help with:
- Database migrations: Use Supabase MCP tools
- Type definitions: Check TypeScript errors
- Testing: Create test data in development database
- Deployment: Follow standard git workflow

