// src/lib/levelData.ts
// Level data types, serialization, and deserialization for the Level Editor.
// Requirements: 5.1, 5.8, 8.1

// --- Types ---

export type ObjectCategory =
  | 'terrain'
  | 'pipes'
  | 'enemies'
  | 'items'
  | 'platforms'
  | 'decorations'
  | 'required';

export type PlaceableObjectType =
  | 'ground_block'
  | 'purple_block'
  | 'castle_wall'
  | 'stair_block'
  | 'green_pipe_2'
  | 'green_pipe_3'
  | 'green_pipe_4'
  | 'purple_pipe_2'
  | 'purple_pipe_3'
  | 'purple_pipe_4'
  | 'goomba'
  | 'koopa'
  | 'hammer_brother'
  | 'piranha_plant'
  | 'koopa_shell'
  | 'bullet_bill_cannon'
  | 'fire_bar'
  | 'lakitu'
  | 'chain_chomp'
  | 'coin'
  | 'question_block'
  | 'mushroom_block'
  | 'power_mushroom'
  | 'poison_mushroom'
  | 'invincibility_star'
  | 'fire_flower'
  | 'moving_platform'
  | 'ice_block'
  | 'bounce_block'
  | 'breakable_block'
  | 'flag_pole'
  | 'castle'
  | 'bush'
  | 'cloud'
  | 'hill';

export interface ObjectProperties {
  // Moving platform
  speed?: number;          // 1-10 grid cells/sec (default 2)
  movementRange?: number;  // 1-20 grid cells (default 4)
  direction?: 'horizontal' | 'vertical';

  // Pipe
  hasPiranha?: boolean;    // default false
  pipeHeight?: 2 | 3 | 4; // default 2

  // Multi-cell objects store their anchor at top-left
  width?: number;          // in grid cells
  height?: number;         // in grid cells
}

export interface PlacedObject {
  type: PlaceableObjectType;
  col: number;        // grid column (x / 32)
  row: number;        // grid row (y / 32)
  properties?: ObjectProperties;
}

export interface LevelData {
  name: string;
  createdAt: string;       // ISO 8601 timestamp
  objects: PlacedObject[];
  slotNumber?: number;     // if assigned as a main game level (6+)
  version: 1;              // schema version for future migration
}

export interface SavedLevelEntry {
  id: string;              // unique identifier (crypto.randomUUID())
  name: string;
  createdAt: string;
  slotNumber?: number;
  data: LevelData;
}

export type EditorAction =
  | { type: 'place'; object: PlacedObject; replaced?: PlacedObject[] }
  | { type: 'delete'; object: PlacedObject }
  | { type: 'replace'; prev: PlacedObject; next: PlacedObject }
  | { type: 'propertyChange'; objectKey: string; prevProps: ObjectProperties; nextProps: ObjectProperties };

// --- Object Categories Mapping ---

export const OBJECT_CATEGORIES: Record<PlaceableObjectType, ObjectCategory> = {
  // Terrain
  ground_block: 'terrain',
  purple_block: 'terrain',
  castle_wall: 'terrain',
  stair_block: 'terrain',
  ice_block: 'terrain',
  bounce_block: 'terrain',
  breakable_block: 'terrain',

  // Pipes
  green_pipe_2: 'pipes',
  green_pipe_3: 'pipes',
  green_pipe_4: 'pipes',
  purple_pipe_2: 'pipes',
  purple_pipe_3: 'pipes',
  purple_pipe_4: 'pipes',

  // Enemies
  goomba: 'enemies',
  koopa: 'enemies',
  hammer_brother: 'enemies',
  piranha_plant: 'enemies',
  koopa_shell: 'enemies',
  bullet_bill_cannon: 'enemies',
  fire_bar: 'enemies',
  lakitu: 'enemies',
  chain_chomp: 'enemies',

  // Items
  coin: 'items',
  question_block: 'items',
  mushroom_block: 'items',
  power_mushroom: 'items',
  poison_mushroom: 'items',
  invincibility_star: 'items',
  fire_flower: 'items',

  // Platforms
  moving_platform: 'platforms',

  // Required (level end markers)
  flag_pole: 'required',
  castle: 'required',

  // Decorations
  bush: 'decorations',
  cloud: 'decorations',
  hill: 'decorations',
};

// --- Serialization ---

export interface LevelMetadata {
  name: string;
  createdAt?: string;
  slotNumber?: number;
}

/**
 * Serialize a map of placed objects and metadata into LevelData format.
 * The map is keyed by "col,row" grid position strings.
 */
export function serialize(
  objects: Map<string, PlacedObject>,
  metadata: LevelMetadata
): LevelData {
  const objectsArray: PlacedObject[] = [];

  for (const obj of objects.values()) {
    const serialized: PlacedObject = {
      type: obj.type,
      col: obj.col,
      row: obj.row,
    };

    if (obj.properties && Object.keys(obj.properties).length > 0) {
      serialized.properties = { ...obj.properties };
    }

    objectsArray.push(serialized);
  }

  const levelData: LevelData = {
    name: metadata.name,
    createdAt: metadata.createdAt || new Date().toISOString(),
    objects: objectsArray,
    version: 1,
  };

  if (metadata.slotNumber !== undefined) {
    levelData.slotNumber = metadata.slotNumber;
  }

  return levelData;
}

// --- Deserialization ---

/**
 * Deserialize LevelData back into a Map<string, PlacedObject> keyed by "col,row".
 */
export function deserialize(data: LevelData): Map<string, PlacedObject> {
  const objects = new Map<string, PlacedObject>();

  for (const obj of data.objects) {
    const key = `${obj.col},${obj.row}`;
    const placedObject: PlacedObject = {
      type: obj.type,
      col: obj.col,
      row: obj.row,
    };

    if (obj.properties && Object.keys(obj.properties).length > 0) {
      placedObject.properties = { ...obj.properties };
    }

    objects.set(key, placedObject);
  }

  return objects;
}
