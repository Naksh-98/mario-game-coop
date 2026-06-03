# Requirements Document

## Introduction

A Mario Maker-style level editor that allows players to visually design custom game levels by dragging and dropping objects from a palette onto a grid-based canvas. Created levels are stored locally and playable in the existing co-op game mode, enabling both Player 1 (Mario) and Player 2 (Princess) to play through user-created content together.

## Glossary

- **Level_Editor**: The full-screen UI mode where players design levels using a visual drag-and-drop interface
- **Object_Palette**: The side panel displaying all available placeable game objects organized by category
- **Canvas**: The scrollable grid-based area where objects are placed to form a level layout
- **Level_Data**: A JSON structure representing all placed objects, their positions, types, and properties for a custom level
- **Grid_Cell**: A 32x32 pixel unit on the Canvas corresponding to the game's block size (B = 32)
- **Placeable_Object**: Any game element that can be dragged from the Object_Palette onto the Canvas, including blocks, pipes, enemies, coins, question blocks, moving platforms, flags, and decorations
- **Custom_Level_Library**: The local storage collection of all user-created levels available for play
- **Game_Engine**: The existing Phaser-based game runtime that renders and runs levels

## Requirements

### Requirement 1: Level Editor Access

**User Story:** As a player, I want to access a level editor from the main menu, so that I can create custom levels without interrupting ongoing gameplay.

#### Acceptance Criteria

1. THE main menu SHALL display a "Level Editor" button visible at all times regardless of whether a multiplayer session is active
2. WHEN the player selects "Level Editor" from the main menu, THE Level_Editor SHALL open in a full-screen editing mode within 2 seconds
3. WHEN the player selects "Exit" in the Level_Editor and unsaved changes exist on the Canvas, THE Level_Editor SHALL display a confirmation prompt warning of unsaved changes before returning to the main menu
4. WHEN the player selects "Exit" in the Level_Editor and no unsaved changes exist, THE Level_Editor SHALL return the player to the main menu without a confirmation prompt
5. THE Level_Editor SHALL function independently of any active multiplayer game session, meaning that opening or closing the Level_Editor SHALL NOT disconnect other players or alter the state of an in-progress game

### Requirement 2: Object Palette Display

**User Story:** As a level designer, I want to see all available game objects organized in a palette, so that I can quickly find and select objects to place.

#### Acceptance Criteria

1. THE Object_Palette SHALL display Placeable_Objects grouped into visually separated categories with category headers: Terrain, Pipes, Enemies, Items, Platforms, and Decorations
2. THE Object_Palette SHALL include the following Terrain objects: ground blocks, purple blocks, castle wall blocks, and stair blocks
3. THE Object_Palette SHALL include the following Pipe objects: green pipes (2-4 segments) and purple pipes (2-4 segments), each with an optional piranha plant toggle
4. THE Object_Palette SHALL include the following Enemy objects: Goombas, Koopas, Hammer Brothers, and Piranha Plants
5. THE Object_Palette SHALL include the following Item objects: coins, question blocks, and mushroom blocks
6. THE Object_Palette SHALL include the following Platform objects: moving platforms with configurable direction limited to horizontal (left-right) or vertical (up-down)
7. THE Object_Palette SHALL include the following required objects: flag pole and castle (level end markers)
8. THE Object_Palette SHALL include the following Decoration objects: bushes, clouds, and hills
9. THE Object_Palette SHALL represent each Placeable_Object as a sprite thumbnail sized to fit within a single Grid_Cell (32x32 pixels)
10. WHEN the player clicks a Placeable_Object in the Object_Palette, THE Object_Palette SHALL highlight the selected object and set it as the active object for placement
11. WHEN the player hovers over a Placeable_Object in the Object_Palette for at least 500 milliseconds, THE Object_Palette SHALL display the object name as a tooltip

### Requirement 3: Drag and Drop Placement

**User Story:** As a level designer, I want to drag objects from the palette and drop them onto the canvas, so that I can intuitively build level layouts.

#### Acceptance Criteria

1. WHEN the player clicks and drags a Placeable_Object from the Object_Palette, THE Level_Editor SHALL display a preview of the object at 50% opacity, positioned with its top-left corner aligned to the cursor
2. WHEN the player drops a Placeable_Object onto the Canvas, THE Level_Editor SHALL snap the object's top-left corner to the nearest Grid_Cell boundary
3. WHEN the player drops a multi-cell Placeable_Object onto the Canvas, THE Level_Editor SHALL replace any existing objects in all Grid_Cells that the new object occupies
4. WHEN the player drops a Placeable_Object onto a single occupied Grid_Cell, THE Level_Editor SHALL replace the existing object with the new one
5. WHEN the player right-clicks a placed object on the Canvas, THE Level_Editor SHALL remove that object from the Canvas and free all Grid_Cells it occupied
6. WHEN the player drops a Placeable_Object outside the Canvas bounds, THE Level_Editor SHALL cancel the placement and return the Canvas to its state before the drag began
7. WHILE the player is dragging a Placeable_Object over the Canvas, THE Level_Editor SHALL highlight the target Grid_Cell(s) in green if unoccupied or in red if any target cell is occupied

### Requirement 4: Canvas Navigation

**User Story:** As a level designer, I want to scroll and navigate a large canvas, so that I can build levels wider than a single screen.

#### Acceptance Criteria

1. THE Canvas SHALL support a minimum width of 8500 pixels (matching existing level dimensions)
2. THE Canvas SHALL display a visual grid overlay aligned to Grid_Cell boundaries
3. WHEN the player scrolls horizontally using the mouse wheel or presses keyboard arrow keys, THE Canvas SHALL pan the viewport by 32 pixels (one Grid_Cell) per input tick in the corresponding direction
4. IF the viewport reaches the left edge (x=0) or the right edge of the Canvas, THEN THE Canvas SHALL stop panning and not scroll beyond the Canvas bounds
5. THE Canvas SHALL display the current viewport left-edge x-coordinate in pixels as a numeric position indicator
6. THE Level_Editor SHALL render the Canvas with a fixed height of 480 pixels and a viewport width of 800 pixels matching the game viewport

### Requirement 5: Level Saving

**User Story:** As a level designer, I want to save my created levels locally, so that I can play them later or continue editing.

#### Acceptance Criteria

1. WHEN the player clicks "Save Level", THE Level_Editor SHALL serialize all placed objects into Level_Data format
2. WHEN serialization completes successfully, THE Level_Editor SHALL store Level_Data in the browser's localStorage under a unique level identifier
3. WHEN saving, THE Level_Editor SHALL prompt the player to enter a level name between 1 and 50 characters
4. IF the player enters a level name that already exists in localStorage, THEN THE Level_Editor SHALL ask the player to confirm overwriting the existing level before proceeding
5. IF the player cancels the level name prompt, THEN THE Level_Editor SHALL abort the save operation without modifying localStorage
6. IF localStorage is full or unavailable, THEN THE Level_Editor SHALL display an error message and offer a file download as an alternative
7. WHEN the level is saved successfully, THE Level_Editor SHALL display a confirmation message for at least 2 seconds
8. THE Level_Data SHALL include: level name, creation timestamp, object type, Grid_Cell position, and object-specific properties for each placed Placeable_Object

### Requirement 6: Level Validation

**User Story:** As a level designer, I want the editor to validate my level before saving, so that I can ensure the level is completable.

#### Acceptance Criteria

1. WHEN the player attempts to save a level, THE Level_Editor SHALL verify that exactly one flag pole exists in the level
2. WHEN the player attempts to save a level, THE Level_Editor SHALL verify that a contiguous row of at least 3 ground blocks exists within the first 5 Grid_Cells from the left edge of the Canvas, at the standard spawn height (y-position corresponding to game ground level)
3. WHEN the player attempts to save a level, THE Level_Editor SHALL verify that a castle exists positioned to the right of the flag pole (at a higher x-coordinate)
4. IF validation fails, THEN THE Level_Editor SHALL display all applicable error messages simultaneously, with one distinct message per failed validation check, identifying which required element is missing or incorrectly placed
5. IF validation fails, THEN THE Level_Editor SHALL preserve all placed objects on the Canvas and not discard any level state
6. THE Level_Editor SHALL allow saving only after all validation checks pass

### Requirement 7: Level Loading and Management

**User Story:** As a player, I want to browse, load, and delete my custom levels, so that I can manage my creations.

#### Acceptance Criteria

1. THE Custom_Level_Library SHALL display all saved levels with their names and creation dates, sorted by creation date descending (most recent first), and SHALL display a message indicating no levels exist when the list is empty
2. WHEN the player selects a level from the Custom_Level_Library for editing, THE Level_Editor SHALL load the Level_Data and populate the Canvas with all stored objects within 2 seconds
3. WHEN the player selects "Delete" on a saved level, THE Custom_Level_Library SHALL display a confirmation dialog stating the level name before removal, and SHALL remove the Level_Data from localStorage only if the player confirms
4. WHEN the player selects a level from the Custom_Level_Library for playing, THE Game_Engine SHALL load and run the custom level
5. IF the Custom_Level_Library encounters Level_Data that cannot be parsed or is corrupted, THEN THE Custom_Level_Library SHALL display an error message identifying the affected level and SHALL exclude it from loading or playing actions while still allowing deletion

### Requirement 8: Custom Level Playback

**User Story:** As a player, I want to play through custom levels with a friend in co-op mode, so that we can enjoy the levels I created together.

#### Acceptance Criteria

1. WHEN a custom level is selected for play, THE Game_Engine SHALL parse the Level_Data and generate all game objects at their specified Grid_Cell positions
2. WHEN a custom level starts, THE Game_Engine SHALL spawn Player 1 (Mario) at position (x: 150, y: 360) and Player 2 (Princess) at position (x: 80, y: 360)
3. THE Game_Engine SHALL apply identical physics, collision, and enemy behavior rules to custom levels as to built-in levels
4. WHEN both players touch the flag pole in a custom level played from the Custom_Level_Library, THE Game_Engine SHALL display a victory screen and return both players to the Custom_Level_Library within 5 seconds
5. WHEN both players touch the flag pole in a custom level played as part of the main game progression, THE Game_Engine SHALL trigger the standard level-complete countdown and advance to the next level
5. THE Game_Engine SHALL synchronize player position, animation state, and flag-touch events between players using the existing Socket.io connection
6. IF a custom level references an object type not recognized by the Game_Engine, THEN THE Game_Engine SHALL skip that object and log a warning to the console
7. IF a player loses all hearts during custom level playback, THEN THE Game_Engine SHALL display the game over screen and return both players to the Custom_Level_Library
8. IF the Level_Data cannot be parsed or is missing required fields, THEN THE Game_Engine SHALL display an error message indicating the level is corrupted and return the player to the Custom_Level_Library

### Requirement 9: Editor Object Configuration

**User Story:** As a level designer, I want to configure properties of placed objects, so that I can fine-tune enemy behavior and platform movement.

#### Acceptance Criteria

1. WHEN the player double-clicks a placed moving platform, THE Level_Editor SHALL display a properties panel with a speed field accepting values from 1 to 10 Grid_Cells per second and a movement range field accepting values from 1 to 20 Grid_Cells
2. WHEN the player double-clicks a placed pipe, THE Level_Editor SHALL display a properties panel with a piranha plant toggle and a pipe height selector offering values of 2, 3, or 4 segments
3. WHEN the player modifies object properties and clicks "Apply", THE Level_Editor SHALL update the object's stored configuration in Level_Data and close the properties panel
4. THE Level_Editor SHALL display a visual indicator on objects that have non-default property values, where defaults are: moving platform speed 2 Grid_Cells per second, movement range 4 Grid_Cells, piranha plant disabled, and pipe height 2 segments
5. IF the player enters a property value outside the allowed range, THEN THE Level_Editor SHALL revert the field to the nearest valid boundary value and prevent the Apply action until all fields contain valid values
6. WHEN the player clicks "Cancel" or presses Escape while the properties panel is open, THE Level_Editor SHALL close the panel without modifying the object's configuration

### Requirement 10: Custom Level as Main Game Level

**User Story:** As a player, I want to save my custom level as a main game level (e.g., Level 6), so that when I play through the campaign it appears in the normal level progression after the built-in levels.

#### Acceptance Criteria

1. WHEN the player clicks "Save as Game Level" in the Level_Editor, THE Level_Editor SHALL prompt the player to select a level slot number starting from 6 (the first slot after built-in levels)
2. WHEN a custom level is assigned to a level slot, THE Game_Engine SHALL load that custom Level_Data when the player progresses to that level number during normal gameplay
3. WHEN both players complete a built-in level that precedes a custom game level, THE Game_Engine SHALL transition to the custom level using the standard level countdown sequence
4. THE Game_Engine SHALL treat custom game levels identically to built-in levels for progression purposes, including hearts, score, coins, and timer carrying over
5. WHEN both players complete a custom game level, THE Game_Engine SHALL advance to the next level in sequence (either the next custom level or display the "Coming Soon" screen if none exists)
6. THE Level_Editor SHALL allow multiple custom levels to be saved in consecutive slots (e.g., Level 6, Level 7, Level 8)
7. THE Custom_Level_Library SHALL display which levels are assigned to main game slots and allow unassigning them
8. WHEN a custom game level is unassigned from a slot, THE Game_Engine SHALL skip that slot and show "Coming Soon" at the original Level 6 boundary

### Requirement 11: Undo and Redo

**User Story:** As a level designer, I want to undo and redo my actions, so that I can correct mistakes without rebuilding sections.

#### Acceptance Criteria

1. WHEN the player presses Ctrl+Z, THE Level_Editor SHALL revert the most recent undoable action, where undoable actions include object placement, object deletion, object replacement, and object property changes
2. WHEN the player presses Ctrl+Y, THE Level_Editor SHALL re-apply the most recently undone action, restoring the Canvas to the state before that undo was performed
3. THE Level_Editor SHALL maintain an action history of at least 50 actions
4. WHEN the player performs a new action after undoing, THE Level_Editor SHALL discard the redo history beyond that point
5. IF the player presses Ctrl+Z when no actions remain in the undo history, THEN THE Level_Editor SHALL take no action and leave the Canvas unchanged
6. IF the player presses Ctrl+Y when no actions remain in the redo history, THEN THE Level_Editor SHALL take no action and leave the Canvas unchanged
