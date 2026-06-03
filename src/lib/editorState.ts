/**
 * EditorState — Pure functions for editor state management.
 * All functions are pure: they never mutate inputs and always return new collections.
 * Requirements: 3.3, 3.4, 3.5, 11.1, 11.2, 11.3, 11.4
 */

import type { PlacedObject, EditorAction } from '@/lib/levelData';

const MAX_UNDO_STACK = 50;

/**
 * Returns the width and height (in grid cells) of an object.
 * Defaults to 1×1 if no width/height properties are specified.
 */
function getObjectSize(obj: PlacedObject): { width: number; height: number } {
  const width = obj.properties?.width ?? 1;
  const height = obj.properties?.height ?? 1;
  return { width, height };
}

/**
 * Returns all grid cell keys ("col,row") occupied by an object,
 * based on its anchor (top-left) position and its width/height.
 */
function getOccupiedKeys(obj: PlacedObject): string[] {
  const { width, height } = getObjectSize(obj);
  const keys: string[] = [];
  for (let dc = 0; dc < width; dc++) {
    for (let dr = 0; dr < height; dr++) {
      keys.push(`${obj.col + dc},${obj.row + dr}`);
    }
  }
  return keys;
}

/**
 * Places an object on the canvas. Any existing objects occupying the target cells
 * are removed (replaced). Returns the new objects map and an EditorAction for undo.
 *
 * The object is keyed by its anchor position "col,row".
 * Multi-cell objects also occupy additional keys pointing to the same anchor.
 */
export function placeObject(
  objects: Map<string, PlacedObject>,
  obj: PlacedObject
): { newObjects: Map<string, PlacedObject>; action: EditorAction } {
  const newObjects = new Map(objects);
  const targetKeys = getOccupiedKeys(obj);

  // Find all existing objects that occupy any of the target cells
  const replacedSet = new Map<string, PlacedObject>();
  for (const key of targetKeys) {
    const existing = newObjects.get(key);
    if (existing) {
      // Use the existing object's anchor key as the dedup key
      const anchorKey = `${existing.col},${existing.row}`;
      if (!replacedSet.has(anchorKey)) {
        replacedSet.set(anchorKey, existing);
      }
    }
  }

  // Remove all cells of the replaced objects
  for (const replaced of replacedSet.values()) {
    const replacedKeys = getOccupiedKeys(replaced);
    for (const rk of replacedKeys) {
      newObjects.delete(rk);
    }
  }

  // Place the new object in all its cells
  for (const key of targetKeys) {
    newObjects.set(key, obj);
  }

  const replaced = Array.from(replacedSet.values());
  const action: EditorAction = {
    type: 'place',
    object: obj,
    replaced: replaced.length > 0 ? replaced : undefined,
  };

  return { newObjects, action };
}

/**
 * Deletes an object from the canvas by its key ("col,row").
 * Frees all grid cells occupied by the object (including multi-cell).
 * Returns the new objects map and an EditorAction for undo.
 */
export function deleteObject(
  objects: Map<string, PlacedObject>,
  key: string
): { newObjects: Map<string, PlacedObject>; action: EditorAction } {
  const obj = objects.get(key);
  if (!obj) {
    // Nothing to delete — return unchanged map and a no-op-like action
    // We still need to return a valid action structure
    const emptyObj: PlacedObject = { type: 'ground_block', col: 0, row: 0 };
    return {
      newObjects: new Map(objects),
      action: { type: 'delete', object: emptyObj },
    };
  }

  const newObjects = new Map(objects);
  const occupiedKeys = getOccupiedKeys(obj);

  for (const k of occupiedKeys) {
    newObjects.delete(k);
  }

  const action: EditorAction = { type: 'delete', object: obj };
  return { newObjects, action };
}

/**
 * Reverts the most recent action from the undo stack.
 * Returns the updated objects map, new undo stack, and new redo stack.
 * If the undo stack is empty, returns inputs unchanged (as new references).
 */
export function undo(
  objects: Map<string, PlacedObject>,
  undoStack: EditorAction[],
  redoStack: EditorAction[]
): {
  newObjects: Map<string, PlacedObject>;
  newUndo: EditorAction[];
  newRedo: EditorAction[];
} {
  if (undoStack.length === 0) {
    return {
      newObjects: new Map(objects),
      newUndo: [...undoStack],
      newRedo: [...redoStack],
    };
  }

  const newUndo = undoStack.slice(0, -1);
  const action = undoStack[undoStack.length - 1];
  let newObjects = new Map(objects);

  switch (action.type) {
    case 'place': {
      // Undo a placement: remove the placed object's cells
      const placedKeys = getOccupiedKeys(action.object);
      for (const key of placedKeys) {
        newObjects.delete(key);
      }
      // Restore any replaced objects
      if (action.replaced) {
        for (const replaced of action.replaced) {
          const replacedKeys = getOccupiedKeys(replaced);
          for (const key of replacedKeys) {
            newObjects.set(key, replaced);
          }
        }
      }
      break;
    }
    case 'delete': {
      // Undo a deletion: restore the deleted object
      const restoredKeys = getOccupiedKeys(action.object);
      for (const key of restoredKeys) {
        newObjects.set(key, action.object);
      }
      break;
    }
    case 'replace': {
      // Undo a replace: remove 'next', restore 'prev'
      const nextKeys = getOccupiedKeys(action.next);
      for (const key of nextKeys) {
        newObjects.delete(key);
      }
      const prevKeys = getOccupiedKeys(action.prev);
      for (const key of prevKeys) {
        newObjects.set(key, action.prev);
      }
      break;
    }
    case 'propertyChange': {
      // Undo a property change: restore previous properties
      const obj = newObjects.get(action.objectKey);
      if (obj) {
        const restored: PlacedObject = {
          ...obj,
          properties: { ...action.prevProps },
        };
        const keys = getOccupiedKeys(restored);
        for (const key of keys) {
          newObjects.set(key, restored);
        }
      }
      break;
    }
  }

  const newRedo = [...redoStack, action];
  return { newObjects, newUndo, newRedo };
}

/**
 * Re-applies the most recently undone action from the redo stack.
 * Returns the updated objects map, new undo stack, and new redo stack.
 * If the redo stack is empty, returns inputs unchanged (as new references).
 */
export function redo(
  objects: Map<string, PlacedObject>,
  undoStack: EditorAction[],
  redoStack: EditorAction[]
): {
  newObjects: Map<string, PlacedObject>;
  newUndo: EditorAction[];
  newRedo: EditorAction[];
} {
  if (redoStack.length === 0) {
    return {
      newObjects: new Map(objects),
      newUndo: [...undoStack],
      newRedo: [...redoStack],
    };
  }

  const newRedo = redoStack.slice(0, -1);
  const action = redoStack[redoStack.length - 1];
  let newObjects = new Map(objects);

  switch (action.type) {
    case 'place': {
      // Redo a placement: remove any replaced objects, then place the object
      if (action.replaced) {
        for (const replaced of action.replaced) {
          const replacedKeys = getOccupiedKeys(replaced);
          for (const key of replacedKeys) {
            newObjects.delete(key);
          }
        }
      }
      const placedKeys = getOccupiedKeys(action.object);
      for (const key of placedKeys) {
        newObjects.set(key, action.object);
      }
      break;
    }
    case 'delete': {
      // Redo a deletion: remove the object
      const deletedKeys = getOccupiedKeys(action.object);
      for (const key of deletedKeys) {
        newObjects.delete(key);
      }
      break;
    }
    case 'replace': {
      // Redo a replace: remove 'prev', place 'next'
      const prevKeys = getOccupiedKeys(action.prev);
      for (const key of prevKeys) {
        newObjects.delete(key);
      }
      const nextKeys = getOccupiedKeys(action.next);
      for (const key of nextKeys) {
        newObjects.set(key, action.next);
      }
      break;
    }
    case 'propertyChange': {
      // Redo a property change: apply next properties
      const obj = newObjects.get(action.objectKey);
      if (obj) {
        const updated: PlacedObject = {
          ...obj,
          properties: { ...action.nextProps },
        };
        const keys = getOccupiedKeys(updated);
        for (const key of keys) {
          newObjects.set(key, updated);
        }
      }
      break;
    }
  }

  const newUndo = [...undoStack, action];
  return { newObjects, newUndo, newRedo };
}

/**
 * Pushes an action onto the undo stack, capping at MAX_UNDO_STACK (50).
 * If the stack exceeds 50 entries, the oldest entries are discarded from the bottom.
 * Returns a new stack array (does not mutate the input).
 */
export function pushAction(
  undoStack: EditorAction[],
  action: EditorAction
): EditorAction[] {
  const newStack = [...undoStack, action];
  if (newStack.length > MAX_UNDO_STACK) {
    return newStack.slice(newStack.length - MAX_UNDO_STACK);
  }
  return newStack;
}
