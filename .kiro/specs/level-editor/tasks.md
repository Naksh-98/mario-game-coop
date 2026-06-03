# Implementation Plan: Level Editor

## Overview

Implement a Phaser-scene-based level editor within the existing Mario co-op game. The editor runs as `LevelEditorScene` in the same Phaser game instance, using all-Phaser UI elements (Text, Graphics, Container, Zone). Shared modules (TextureFactory, LevelData, LevelValidator, LevelStorage) are extracted as pure TypeScript for testability. The React main menu gains a "Level Editor" button that sets `role = 'editor'`, and `PhaserGame.tsx` starts the appropriate scene based on role.

## Tasks

- [ ] 1. Set up shared library modules and interfaces
  - [ ] 1.1 Create LevelData types and serialization module (`src/lib/levelData.ts`)
    - Define `PlaceableObjectType`, `ObjectCategory`, `PlacedObject`, `ObjectProperties`, `LevelData`, `SavedLevelEntry`, and `EditorAction` types
    - Implement `serialize(objects: Map<string, PlacedObject>, metadata): LevelData` function
    - Implement `deserialize(data: LevelData): Map<string, PlacedObject>` function
    - Export `OBJECT_CATEGORIES` mapping each `PlaceableObjectType` to its `ObjectCategory`
    - _Requirements: 5.1, 5.8, 8.1_

  - [ ] 1.2 Create grid utility functions (`src/lib/gridUtils.ts`)
    - Implement `snapToGrid(x: number, y: number): { col: number, row: number }` — snaps pixel coords to nearest 32px grid boundary
    - Implement `gridToPixel(col: number, row: number): { x: number, y: number }` — converts grid coords to pixel position
    - Implement `clampProperty(value: number, min: number, max: number): number` — clamps numeric values to valid ranges
    - Export constants: `GRID_SIZE = 32`, `CANVAS_COLS = 266`, `CANVAS_ROWS = 15`, `VIEWPORT_WIDTH = 640`, `VIEWPORT_HEIGHT = 440`, `TOOLBAR_HEIGHT = 40`, `PALETTE_WIDTH = 160`
    - _Requirements: 3.2, 9.5_

  - [ ] 1.3 Create LevelValidator module (`src/lib/levelValidator.ts`)
    - Implement `validateFlagPole(objects: PlacedObject[]): ValidationResult` — exactly one flag pole
    - Implement `validateSpawnGround(objects: PlacedObject[]): ValidationResult` — at least 3 contiguous ground blocks in first 5 columns at spawn row
    - Implement `validateCastlePosition(objects: PlacedObject[]): ValidationResult` — castle column > flag pole column
    - Implement `validateLevelName(name: string): boolean` — length 1–50 inclusive
    - Implement `validateAll(objects: PlacedObject[], name: string): ValidationError[]` — runs all checks, returns all errors
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 5.3_

  - [ ] 1.4 Create LevelStorage module (`src/lib/levelStorage.ts`)
    - Implement `saveLevel(entry: SavedLevelEntry): void` — writes to localStorage under `mario_custom_levels`
    - Implement `loadAll(): SavedLevelEntry[]` — loads all levels, skipping corrupted entries with try-catch per entry
    - Implement `deleteLevel(id: string): void` — removes level by id
    - Implement `getLevelBySlot(slot: number): SavedLevelEntry | null` — finds level assigned to a game slot
    - Implement `isStorageAvailable(): boolean` — checks localStorage accessibility
    - Handle QuotaExceededError with fallback file download helper
    - _Requirements: 5.2, 5.4, 5.6, 7.1, 7.3, 7.5_

  - [ ] 1.5 Create EditorState pure functions module (`src/lib/editorState.ts`)
    - Implement `placeObject(objects: Map<string, PlacedObject>, obj: PlacedObject): { newObjects: Map, action: EditorAction }` — places object, replaces occupants
    - Implement `deleteObject(objects: Map<string, PlacedObject>, key: string): { newObjects: Map, action: EditorAction }` — removes object, frees cells
    - Implement `undo(objects: Map, undoStack: EditorAction[], redoStack: EditorAction[]): { newObjects: Map, newUndo: EditorAction[], newRedo: EditorAction[] }`
    - Implement `redo(objects: Map, undoStack: EditorAction[], redoStack: EditorAction[]): { newObjects: Map, newUndo: EditorAction[], newRedo: EditorAction[] }`
    - Implement `pushAction(undoStack: EditorAction[], action: EditorAction): EditorAction[]` — caps at 50, clears redo
    - _Requirements: 3.3, 3.4, 3.5, 11.1, 11.2, 11.3, 11.4_

- [ ] 2. Extract TextureFactory and set up testing
  - [ ] 2.1 Extract TextureFactory from MainScene (`src/lib/textureFactory.ts`)
    - Extract the `createTextures()` logic from `MainScene` in `PhaserGame.tsx` into a standalone `TextureFactory.createTextures(scene: Phaser.Scene)` function
    - Refactor `MainScene` to call `TextureFactory.createTextures(this)` instead of inline texture generation
    - Verify existing game still works with extracted textures
    - _Requirements: 2.9 (palette thumbnails use same textures as gameplay)_

  - [ ] 2.2 Set up Vitest and fast-check testing infrastructure
    - Install `vitest` and `fast-check` as dev dependencies
    - Create `vitest.config.ts` with TypeScript support and path aliases matching `tsconfig.json`
    - Create a sample test to verify the test runner works
    - _Requirements: (testing infrastructure for all properties)_

- [ ] 3. Checkpoint - Verify shared modules
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Property-based tests for shared modules
  - [ ]* 4.1 Write property test for grid snapping (Property 1)
    - **Property 1: Grid snapping produces valid grid coordinates**
    - Test `snapToGrid` with random pixel coordinates within canvas bounds
    - Assert result is exact multiple of 32 and nearest grid boundary
    - **Validates: Requirements 3.2**

  - [ ]* 4.2 Write property test for placement replaces cells (Property 2)
    - **Property 2: Placement replaces all occupied cells**
    - Test `placeObject` with random canvas states and random PlaceableObjects
    - Assert all covered cells contain only the new object; previous occupants removed
    - **Validates: Requirements 3.3, 3.4**

  - [ ]* 4.3 Write property test for deletion frees cells (Property 3)
    - **Property 3: Deletion frees all occupied cells**
    - Test `deleteObject` with random states containing at least one object
    - Assert all cells previously occupied are now empty
    - **Validates: Requirements 3.5**

  - [ ]* 4.4 Write property test for serialization round-trip (Property 4)
    - **Property 4: Level_Data serialization round-trip**
    - Test `serialize` then `deserialize` with random valid `PlacedObject[]` sets
    - Assert output equals input (type, position, properties)
    - **Validates: Requirements 5.1, 5.8, 8.1**

  - [ ]* 4.5 Write property test for level name validation (Property 5)
    - **Property 5: Level name length validation**
    - Test `validateLevelName` with random strings of varying lengths
    - Assert accepts length 1–50, rejects empty or >50
    - **Validates: Requirements 5.3**

  - [ ]* 4.6 Write property test for flag pole count (Property 6)
    - **Property 6: Flag pole count validation**
    - Test `validateFlagPole` with random object lists
    - Assert passes iff exactly one flag_pole present
    - **Validates: Requirements 6.1**

  - [ ]* 4.7 Write property test for spawn ground validation (Property 7)
    - **Property 7: Contiguous ground blocks at spawn validation**
    - Test `validateSpawnGround` with random block arrangements
    - Assert passes iff ≥3 contiguous ground_blocks at spawn row in cols 0–4
    - **Validates: Requirements 6.2**

  - [ ]* 4.8 Write property test for castle position (Property 8)
    - **Property 8: Castle position validation**
    - Test `validateCastlePosition` with random flag/castle positions
    - Assert passes iff castle col > flag_pole col
    - **Validates: Requirements 6.3**

  - [ ]* 4.9 Write property test for validation immutability (Property 9)
    - **Property 9: Validation never mutates canvas state**
    - Test `validateAll` with random states, deep-clone before, compare after
    - Assert state is byte-for-byte identical post-validation
    - **Validates: Requirements 6.5**

  - [ ]* 4.10 Write property test for library sort order (Property 10)
    - **Property 10: Level library sorted by creation date descending**
    - Test sort logic with random level sets with distinct timestamps
    - Assert output is ordered most-recent-first
    - **Validates: Requirements 7.1**

  - [ ]* 4.11 Write property test for corrupted data rejection (Property 11)
    - **Property 11: Corrupted or invalid data rejection**
    - Test schema validation with random malformed inputs
    - Assert invalid data is identified and excluded
    - **Validates: Requirements 7.5, 8.7**

  - [ ]* 4.12 Write property test for property clamping (Property 12)
    - **Property 12: Property value clamping**
    - Test `clampProperty` with random numbers for speed [1,10] and range [1,20]
    - Assert result is within bounds and is nearest boundary when outside
    - **Validates: Requirements 9.5**

  - [ ]* 4.13 Write property test for undo-redo round trip (Property 13)
    - **Property 13: Undo-redo round trip**
    - Test action → undo → redo sequence with random actions
    - Assert final state equals state after original action
    - **Validates: Requirements 11.1, 11.2**

  - [ ]* 4.14 Write property test for undo stack cap (Property 14)
    - **Property 14: Undo stack bounded at 50**
    - Test pushing >50 random actions
    - Assert stack length is exactly 50 containing most recent actions
    - **Validates: Requirements 11.3**

  - [ ]* 4.15 Write property test for redo clear on new action (Property 15)
    - **Property 15: New action after undo clears redo history**
    - Test undo then new action with random sequences
    - Assert redo stack is empty after new action
    - **Validates: Requirements 11.4**

- [ ] 5. Integrate editor into React and Phaser routing
  - [ ] 5.1 Update `page.tsx` with Level Editor menu button and `role = 'editor'` state
    - Extend the `role` type to include `'editor'`
    - Add a "Level Editor" menu button (matching existing menu button style) at index position in the menu list
    - Update keyboard navigation to include the new menu item
    - Pass `onExit` callback to PhaserGame when role is 'editor'
    - _Requirements: 1.1, 1.2, 1.4_

  - [ ] 5.2 Update `PhaserGame.tsx` to route `role = 'editor'` to `LevelEditorScene`
    - Accept `role: 'p1' | 'p2' | 'editor'` and `onExit?: () => void` props
    - When `role = 'editor'`, configure Phaser game with `LevelEditorScene` as the active scene
    - Pass `{ onExit }` as scene init data
    - On exit, destroy Phaser game instance and invoke `onExit()` callback to reset role to null
    - _Requirements: 1.2, 1.4, 1.5_

- [ ] 6. Implement LevelEditorScene core structure
  - [ ] 6.1 Create `LevelEditorScene` class with scene lifecycle (`src/scenes/LevelEditorScene.ts`)
    - Create the scene class extending `Phaser.Scene` with key `'LevelEditorScene'`
    - Implement `init(data)` to receive `onExit` callback
    - Implement `create()` calling `TextureFactory.createTextures(this)`, then building toolbar, palette, and canvas containers
    - Set up scene-level state: `objects` Map, `undoStack`, `redoStack`, `selectedTool`, `isDirty`, `scrollX`
    - _Requirements: 1.2, 2.1_

  - [ ] 6.2 Implement EditorToolbar (top 800×40 strip)
    - Create a Phaser `Container` at y=0 with background Graphics (800×40, dark color)
    - Add Text buttons: "Save", "Load", "Undo", "Redo", "Save as Game Level", "Exit"
    - Wire button clicks to corresponding handler methods
    - Wire Ctrl+Z → undo, Ctrl+Y → redo keyboard shortcuts
    - _Requirements: 5.1, 7.1, 10.1, 11.1, 11.2, 1.3, 1.4_

  - [ ] 6.3 Implement ObjectPalette (right panel 160×440)
    - Create a Phaser `Container` at x=640, y=40 with background Graphics
    - Render category headers (Terrain, Pipes, Enemies, Items, Platforms, Decorations, Required)
    - Render sprite thumbnails for each PlaceableObjectType using textures from TextureFactory
    - Implement click-to-select highlighting (set `selectedTool`)
    - Implement 500ms hover tooltip using Phaser `Text`
    - _Requirements: 2.1–2.11_

  - [ ] 6.4 Implement EditorCanvas with grid overlay and scrolling (640×440 main area)
    - Create a Phaser `Container` at x=0, y=40 with a mask/clip to 640×440
    - Draw grid overlay using `Graphics` with lines every 32px
    - Implement horizontal scrolling via arrow keys and mouse wheel (32px per tick)
    - Clamp scroll to [0, 8512 - 640] range
    - Display scroll position indicator text
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 7. Checkpoint - Verify scene structure renders
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement editor interactions
  - [ ] 8.1 Implement drag-and-drop placement with grid snapping
    - On palette item click, set active tool; on canvas click, place object at snapped grid position
    - Show 50% opacity preview following cursor during drag
    - Highlight target cells green (empty) or red (occupied) while dragging
    - Call `editorState.placeObject()` on drop, push action to undo stack
    - Cancel placement if dropped outside canvas bounds
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7_

  - [ ] 8.2 Implement right-click deletion
    - On right-click of a placed object on canvas, call `editorState.deleteObject()`
    - Push delete action to undo stack
    - Free all grid cells occupied by the deleted object
    - _Requirements: 3.5_

  - [ ] 8.3 Implement undo/redo wiring in the scene
    - Wire Ctrl+Z to call `editorState.undo()` and re-render canvas
    - Wire Ctrl+Y to call `editorState.redo()` and re-render canvas
    - Wire toolbar Undo/Redo buttons to same logic
    - Update `isDirty` flag on each action
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ] 8.4 Implement PropertiesPanel modal (double-click configuration)
    - On double-click of a moving platform: show modal with speed (1–10) and range (1–20) fields, direction toggle
    - On double-click of a pipe: show modal with piranha toggle and height selector (2/3/4)
    - Implement Apply button that updates object properties and pushes `propertyChange` action
    - Implement Cancel/Escape to close without changes
    - Clamp invalid inputs to nearest boundary on Apply
    - Show visual indicator on objects with non-default properties
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 9. Implement save, load, and level library
  - [ ] 9.1 Implement Save Level flow
    - On "Save" click, run `validateAll()` — if errors, show ValidationErrors overlay listing all failures
    - If valid, prompt for level name (Phaser Text input or overlay)
    - Check for duplicate name, prompt overwrite confirmation
    - Call `LevelStorage.saveLevel()`, show success confirmation for 2 seconds
    - Handle QuotaExceededError with file download fallback
    - Set `isDirty = false` on successful save
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1–6.6_

  - [ ] 9.2 Implement Level Library modal
    - On "Load" click, show library modal listing all saved levels (name, date, slot assignment)
    - Sort levels by creation date descending
    - Provide "Edit", "Play", and "Delete" buttons per level
    - "Edit" loads level into canvas; "Delete" shows confirmation then removes
    - Handle corrupted levels: show error indicator, allow delete but block load/play
    - Show empty state message when no levels exist
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 9.3 Implement "Save as Game Level" flow
    - On toolbar button click, prompt for slot number (starting from 6)
    - Assign `slotNumber` to the level's `SavedLevelEntry`
    - Allow multiple consecutive slots
    - Show slot assignment in library UI, allow unassigning
    - _Requirements: 10.1, 10.6, 10.7, 10.8_

  - [ ] 9.4 Implement Exit with unsaved changes prompt
    - On "Exit" click, check `isDirty` flag
    - If dirty, show confirmation modal warning of unsaved changes
    - If confirmed or not dirty, call `onExit()` to destroy scene and return to React menu
    - _Requirements: 1.3, 1.4_

- [ ] 10. Implement custom level playback in MainScene
  - [ ] 10.1 Add `generateCustomLevel(levelData: LevelData)` to MainScene
    - Parse `LevelData.objects` array and create corresponding Phaser game objects (blocks, enemies, pipes, coins, platforms, flag, castle)
    - Use the same object-creation logic as built-in levels but driven by `LevelData` positions/properties
    - Skip unrecognized object types with `console.warn`
    - Spawn players at (150, 360) and (80, 360)
    - _Requirements: 8.1, 8.2, 8.3, 8.6, 8.7_

  - [ ] 10.2 Add custom level routing via Socket.io and level progression
    - Add `loadCustomLevel` event to `server.mjs` that broadcasts level ID to room
    - On client receiving `loadCustomLevel`, read level from localStorage and call `generateCustomLevel`
    - Extend level progression: after level 5, check `LevelStorage.getLevelBySlot(6)` etc.
    - On flag touch in library-played level: show victory, return to library
    - On flag touch in progression level: standard countdown, advance to next
    - _Requirements: 8.4, 8.5, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 10.3 Write unit tests for custom level playback integration
    - Test `generateCustomLevel` produces correct game objects for sample LevelData
    - Test unknown object type is skipped with warning
    - Test player spawn positions
    - _Requirements: 8.1, 8.2, 8.6_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All editor UI is Phaser-based (no React components inside the editor)
- The TextureFactory extraction (task 2.1) is critical — it enables both scenes to share textures without duplication
- The pure functions in `editorState.ts`, `gridUtils.ts`, `levelValidator.ts`, and `levelData.ts` are the primary testable surface
- Implementation uses TypeScript throughout, matching the existing project setup

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5", "2.1"] },
    { "id": 2, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9", "4.10", "4.11", "4.12", "4.13", "4.14", "4.15", "5.1", "5.2"] },
    { "id": 3, "tasks": ["6.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "6.4"] },
    { "id": 5, "tasks": ["8.1", "8.2", "8.3", "8.4"] },
    { "id": 6, "tasks": ["9.1", "9.2", "9.3", "9.4"] },
    { "id": 7, "tasks": ["10.1"] },
    { "id": 8, "tasks": ["10.2", "10.3"] }
  ]
}
```
