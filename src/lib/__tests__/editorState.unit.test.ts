import { describe, it, expect } from 'vitest';
import { placeObject, deleteObject, undo, redo, pushAction } from '@/lib/editorState';
import type { PlacedObject, EditorAction } from '@/lib/levelData';

describe('editorState', () => {
  describe('placeObject', () => {
    it('places a 1x1 object on an empty map', () => {
      const objects = new Map<string, PlacedObject>();
      const obj: PlacedObject = { type: 'ground_block', col: 3, row: 5 };

      const { newObjects, action } = placeObject(objects, obj);

      expect(newObjects.get('3,5')).toEqual(obj);
      expect(newObjects.size).toBe(1);
      expect(action.type).toBe('place');
      if (action.type === 'place') {
        expect(action.object).toEqual(obj);
        expect(action.replaced).toBeUndefined();
      }
    });

    it('replaces an existing object at the same cell', () => {
      const existing: PlacedObject = { type: 'coin', col: 3, row: 5 };
      const objects = new Map<string, PlacedObject>([['3,5', existing]]);
      const newObj: PlacedObject = { type: 'ground_block', col: 3, row: 5 };

      const { newObjects, action } = placeObject(objects, newObj);

      expect(newObjects.get('3,5')).toEqual(newObj);
      expect(newObjects.size).toBe(1);
      if (action.type === 'place') {
        expect(action.replaced).toEqual([existing]);
      }
    });

    it('places a multi-cell object and occupies all cells', () => {
      const objects = new Map<string, PlacedObject>();
      const pipe: PlacedObject = {
        type: 'green_pipe_3',
        col: 5,
        row: 10,
        properties: { width: 2, height: 3 },
      };

      const { newObjects } = placeObject(objects, pipe);

      // Should occupy 2 cols × 3 rows = 6 cells
      expect(newObjects.size).toBe(6);
      expect(newObjects.get('5,10')).toEqual(pipe);
      expect(newObjects.get('6,10')).toEqual(pipe);
      expect(newObjects.get('5,11')).toEqual(pipe);
      expect(newObjects.get('6,11')).toEqual(pipe);
      expect(newObjects.get('5,12')).toEqual(pipe);
      expect(newObjects.get('6,12')).toEqual(pipe);
    });

    it('replaces multiple objects when placing a multi-cell object', () => {
      const obj1: PlacedObject = { type: 'coin', col: 5, row: 10 };
      const obj2: PlacedObject = { type: 'goomba', col: 6, row: 11 };
      const objects = new Map<string, PlacedObject>([
        ['5,10', obj1],
        ['6,11', obj2],
      ]);
      const pipe: PlacedObject = {
        type: 'green_pipe_3',
        col: 5,
        row: 10,
        properties: { width: 2, height: 3 },
      };

      const { newObjects, action } = placeObject(objects, pipe);

      expect(newObjects.size).toBe(6);
      if (action.type === 'place') {
        expect(action.replaced).toHaveLength(2);
        expect(action.replaced).toContainEqual(obj1);
        expect(action.replaced).toContainEqual(obj2);
      }
    });

    it('does not mutate the original objects map', () => {
      const existing: PlacedObject = { type: 'coin', col: 3, row: 5 };
      const objects = new Map<string, PlacedObject>([['3,5', existing]]);
      const newObj: PlacedObject = { type: 'ground_block', col: 3, row: 5 };

      placeObject(objects, newObj);

      expect(objects.get('3,5')).toEqual(existing);
      expect(objects.size).toBe(1);
    });
  });

  describe('deleteObject', () => {
    it('deletes a 1x1 object by key', () => {
      const obj: PlacedObject = { type: 'ground_block', col: 3, row: 5 };
      const objects = new Map<string, PlacedObject>([['3,5', obj]]);

      const { newObjects, action } = deleteObject(objects, '3,5');

      expect(newObjects.size).toBe(0);
      expect(newObjects.has('3,5')).toBe(false);
      expect(action.type).toBe('delete');
      if (action.type === 'delete') {
        expect(action.object).toEqual(obj);
      }
    });

    it('deletes a multi-cell object and frees all cells', () => {
      const pipe: PlacedObject = {
        type: 'green_pipe_2',
        col: 5,
        row: 10,
        properties: { width: 2, height: 2 },
      };
      const objects = new Map<string, PlacedObject>([
        ['5,10', pipe],
        ['6,10', pipe],
        ['5,11', pipe],
        ['6,11', pipe],
      ]);

      const { newObjects } = deleteObject(objects, '5,10');

      expect(newObjects.size).toBe(0);
    });

    it('does not mutate the original objects map', () => {
      const obj: PlacedObject = { type: 'ground_block', col: 3, row: 5 };
      const objects = new Map<string, PlacedObject>([['3,5', obj]]);

      deleteObject(objects, '3,5');

      expect(objects.size).toBe(1);
      expect(objects.get('3,5')).toEqual(obj);
    });

    it('handles deleting a non-existent key gracefully', () => {
      const objects = new Map<string, PlacedObject>();
      const { newObjects } = deleteObject(objects, '99,99');
      expect(newObjects.size).toBe(0);
    });
  });

  describe('undo', () => {
    it('returns unchanged state when undo stack is empty', () => {
      const objects = new Map<string, PlacedObject>();
      const { newObjects, newUndo, newRedo } = undo(objects, [], []);

      expect(newObjects.size).toBe(0);
      expect(newUndo).toEqual([]);
      expect(newRedo).toEqual([]);
    });

    it('undoes a place action by removing the object', () => {
      const obj: PlacedObject = { type: 'ground_block', col: 3, row: 5 };
      const objects = new Map<string, PlacedObject>([['3,5', obj]]);
      const undoStack: EditorAction[] = [{ type: 'place', object: obj }];

      const { newObjects, newUndo, newRedo } = undo(objects, undoStack, []);

      expect(newObjects.has('3,5')).toBe(false);
      expect(newUndo).toHaveLength(0);
      expect(newRedo).toHaveLength(1);
      expect(newRedo[0]).toEqual(undoStack[0]);
    });

    it('undoes a place action and restores replaced objects', () => {
      const replaced: PlacedObject = { type: 'coin', col: 3, row: 5 };
      const placed: PlacedObject = { type: 'ground_block', col: 3, row: 5 };
      const objects = new Map<string, PlacedObject>([['3,5', placed]]);
      const undoStack: EditorAction[] = [
        { type: 'place', object: placed, replaced: [replaced] },
      ];

      const { newObjects } = undo(objects, undoStack, []);

      expect(newObjects.get('3,5')).toEqual(replaced);
    });

    it('undoes a delete action by restoring the object', () => {
      const obj: PlacedObject = { type: 'ground_block', col: 3, row: 5 };
      const objects = new Map<string, PlacedObject>();
      const undoStack: EditorAction[] = [{ type: 'delete', object: obj }];

      const { newObjects } = undo(objects, undoStack, []);

      expect(newObjects.get('3,5')).toEqual(obj);
    });

    it('undoes a propertyChange action', () => {
      const obj: PlacedObject = {
        type: 'moving_platform',
        col: 5,
        row: 5,
        properties: { speed: 5, movementRange: 10 },
      };
      const objects = new Map<string, PlacedObject>([['5,5', obj]]);
      const undoStack: EditorAction[] = [
        {
          type: 'propertyChange',
          objectKey: '5,5',
          prevProps: { speed: 2, movementRange: 4 },
          nextProps: { speed: 5, movementRange: 10 },
        },
      ];

      const { newObjects } = undo(objects, undoStack, []);

      expect(newObjects.get('5,5')?.properties).toEqual({
        speed: 2,
        movementRange: 4,
      });
    });
  });

  describe('redo', () => {
    it('returns unchanged state when redo stack is empty', () => {
      const objects = new Map<string, PlacedObject>();
      const { newObjects, newUndo, newRedo } = redo(objects, [], []);

      expect(newObjects.size).toBe(0);
      expect(newUndo).toEqual([]);
      expect(newRedo).toEqual([]);
    });

    it('redoes a place action', () => {
      const obj: PlacedObject = { type: 'ground_block', col: 3, row: 5 };
      const objects = new Map<string, PlacedObject>();
      const redoStack: EditorAction[] = [{ type: 'place', object: obj }];

      const { newObjects, newUndo, newRedo } = redo(objects, [], redoStack);

      expect(newObjects.get('3,5')).toEqual(obj);
      expect(newUndo).toHaveLength(1);
      expect(newRedo).toHaveLength(0);
    });

    it('redoes a delete action', () => {
      const obj: PlacedObject = { type: 'ground_block', col: 3, row: 5 };
      const objects = new Map<string, PlacedObject>([['3,5', obj]]);
      const redoStack: EditorAction[] = [{ type: 'delete', object: obj }];

      const { newObjects } = redo(objects, [], redoStack);

      expect(newObjects.has('3,5')).toBe(false);
    });

    it('redoes a place action that had replacements', () => {
      const replaced: PlacedObject = { type: 'coin', col: 3, row: 5 };
      const placed: PlacedObject = { type: 'ground_block', col: 3, row: 5 };
      const objects = new Map<string, PlacedObject>([['3,5', replaced]]);
      const redoStack: EditorAction[] = [
        { type: 'place', object: placed, replaced: [replaced] },
      ];

      const { newObjects } = redo(objects, [], redoStack);

      expect(newObjects.get('3,5')).toEqual(placed);
    });
  });

  describe('pushAction', () => {
    it('adds an action to the stack', () => {
      const action: EditorAction = {
        type: 'place',
        object: { type: 'ground_block', col: 0, row: 0 },
      };

      const result = pushAction([], action);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(action);
    });

    it('caps the stack at 50, discarding oldest entries', () => {
      const stack: EditorAction[] = [];
      for (let i = 0; i < 50; i++) {
        stack.push({
          type: 'place',
          object: { type: 'ground_block', col: i, row: 0 },
        });
      }

      const newAction: EditorAction = {
        type: 'place',
        object: { type: 'coin', col: 99, row: 99 },
      };

      const result = pushAction(stack, newAction);

      expect(result).toHaveLength(50);
      // The oldest (col=0) should be gone, newest (col=99) at end
      expect(result[49]).toEqual(newAction);
      if (result[0].type === 'place') {
        expect(result[0].object.col).toBe(1);
      }
    });

    it('does not mutate the input stack', () => {
      const stack: EditorAction[] = [
        { type: 'place', object: { type: 'ground_block', col: 0, row: 0 } },
      ];

      pushAction(stack, {
        type: 'place',
        object: { type: 'coin', col: 1, row: 1 },
      });

      expect(stack).toHaveLength(1);
    });
  });

  describe('undo-redo round trip', () => {
    it('action → undo → redo produces same state as after action', () => {
      const objects = new Map<string, PlacedObject>();
      const obj: PlacedObject = { type: 'ground_block', col: 3, row: 5 };

      // Place object
      const { newObjects: afterPlace, action } = placeObject(objects, obj);
      const undoStack = pushAction([], action);

      // Undo
      const { newObjects: afterUndo, newUndo, newRedo } = undo(
        afterPlace,
        undoStack,
        []
      );
      expect(afterUndo.has('3,5')).toBe(false);

      // Redo
      const { newObjects: afterRedo } = redo(afterUndo, newUndo, newRedo);
      expect(afterRedo.get('3,5')).toEqual(obj);
    });
  });
});
