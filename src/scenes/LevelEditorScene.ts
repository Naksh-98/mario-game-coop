import { createTextures } from '@/lib/textureFactory';
import type { PlacedObject, PlaceableObjectType, ObjectCategory, EditorAction, ObjectProperties, SavedLevelEntry, LevelData } from '@/lib/levelData';
import { OBJECT_CATEGORIES, serialize, deserialize } from '@/lib/levelData';
import { GRID_SIZE, CANVAS_COLS, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, TOOLBAR_HEIGHT, PALETTE_WIDTH, clampProperty } from '@/lib/gridUtils';
import { placeObject, deleteObject, undo, redo, pushAction } from '@/lib/editorState';
import { validateAll } from '@/lib/levelValidator';
import { saveLevel, loadAll, deleteLevel, downloadAsFile } from '@/lib/levelStorage';
import Phaser from 'phaser';

/**
 * Mapping from PlaceableObjectType to the texture key used for rendering.
 */
const TEXTURE_MAP: Record<PlaceableObjectType, string> = {
  ground_block: 'block',
  purple_block: 'purple_block',
  castle_wall: 'castle_wall',
  stair_block: 'block',
  green_pipe_2: 'pipe_cap',
  green_pipe_3: 'pipe_cap',
  green_pipe_4: 'pipe_cap',
  purple_pipe_2: 'purple_pipe_cap',
  purple_pipe_3: 'purple_pipe_cap',
  purple_pipe_4: 'purple_pipe_cap',
  goomba: 'enemy',
  koopa: 'koopa',
  hammer_brother: 'hammer_bro',
  piranha_plant: 'piranha',
  koopa_shell: 'koopa_shell',
  bullet_bill_cannon: 'cannon',
  fire_bar: 'firebar_center',
  lakitu: 'lakitu',
  chain_chomp: 'chain_chomp',
  coin: 'coin',
  question_block: 'qblock',
  mushroom_block: 'block',
  power_mushroom: 'power_mushroom',
  poison_mushroom: 'poison_mushroom',
  invincibility_star: 'invincibility_star',
  fire_flower: 'fire_flower',
  moving_platform: 'movingPlat',
  ice_block: 'ice_block',
  bounce_block: 'bounce_block',
  breakable_block: 'breakable_block',
  flag_pole: 'flag',
  castle: 'castle_wall',
  bush: 'hill',
  cloud: 'cloud',
  hill: 'hill',
};

/**
 * Category display order and labels for the palette.
 */
const CATEGORY_ORDER: { key: ObjectCategory; label: string }[] = [
  { key: 'terrain', label: 'Terrain' },
  { key: 'pipes', label: 'Pipes' },
  { key: 'enemies', label: 'Enemies' },
  { key: 'items', label: 'Items' },
  { key: 'platforms', label: 'Platforms' },
  { key: 'decorations', label: 'Decorations' },
  { key: 'required', label: 'Required' },
];

/**
 * Human-readable display names for palette tooltips.
 */
const DISPLAY_NAMES: Record<PlaceableObjectType, string> = {
  ground_block: 'Ground Block',
  purple_block: 'Purple Block',
  castle_wall: 'Castle Wall',
  stair_block: 'Stair Block',
  green_pipe_2: 'Green Pipe (2)',
  green_pipe_3: 'Green Pipe (3)',
  green_pipe_4: 'Green Pipe (4)',
  purple_pipe_2: 'Purple Pipe (2)',
  purple_pipe_3: 'Purple Pipe (3)',
  purple_pipe_4: 'Purple Pipe (4)',
  goomba: 'Goomba',
  koopa: 'Koopa',
  hammer_brother: 'Hammer Bro',
  piranha_plant: 'Piranha Plant',
  koopa_shell: 'Koopa Shell',
  bullet_bill_cannon: 'Bullet Bill Cannon',
  fire_bar: 'Fire Bar',
  lakitu: 'Lakitu',
  chain_chomp: 'Chain Chomp',
  coin: 'Coin',
  question_block: 'Question Block',
  mushroom_block: 'Mushroom Block',
  power_mushroom: 'Power Mushroom',
  poison_mushroom: 'Poison Mushroom',
  invincibility_star: 'Invincibility Star',
  fire_flower: 'Fire Flower',
  moving_platform: 'Moving Platform',
  ice_block: 'Ice Block',
  bounce_block: 'Bounce Block',
  breakable_block: 'Breakable Block',
  flag_pole: 'Flag Pole',
  castle: 'Castle',
  bush: 'Bush',
  cloud: 'Cloud',
  hill: 'Hill',
};

/** Default property values for comparison */
const DEFAULT_PROPERTIES: Record<string, ObjectProperties> = {
  moving_platform: { speed: 2, movementRange: 4, direction: 'horizontal' },
  green_pipe_2: { hasPiranha: false, pipeHeight: 2 },
  green_pipe_3: { hasPiranha: false, pipeHeight: 3 },
  green_pipe_4: { hasPiranha: false, pipeHeight: 4 },
  purple_pipe_2: { hasPiranha: false, pipeHeight: 2 },
  purple_pipe_3: { hasPiranha: false, pipeHeight: 3 },
  purple_pipe_4: { hasPiranha: false, pipeHeight: 4 },
};

// Total canvas pixel width — no upper limit, scroll as far as you want
const SCROLL_STEP = GRID_SIZE; // 32px per tick

/**
 * LevelEditorScene — Phaser scene for the visual level editor.
 * Launched when PhaserGame receives role='editor'.
 *
 * Layout:
 * - Toolbar: 800×40 at top (y=0)
 * - Canvas: 640×440 at (x=0, y=40)
 * - Palette: 160×440 at (x=640, y=40)
 */
export default class LevelEditorScene extends Phaser.Scene {
  // State
  private objects: Map<string, PlacedObject> = new Map();
  private undoStack: EditorAction[] = [];
  private redoStack: EditorAction[] = [];
  private selectedTool: PlaceableObjectType | null = null;
  private isDirty: boolean = false;
  private scrollX: number = 0;

  // UI Containers
  private toolbar!: Phaser.GameObjects.Container;
  private palette!: Phaser.GameObjects.Container;
  private canvas!: Phaser.GameObjects.Container;
  private gridOverlay!: Phaser.GameObjects.Graphics;
  private objectsContainer!: Phaser.GameObjects.Container;
  private positionText!: Phaser.GameObjects.Text;

  // Modal overlay container (used for properties panel, library, confirmations)
  private modalContainer!: Phaser.GameObjects.Container;

  // Palette state
  private paletteHighlight!: Phaser.GameObjects.Graphics;
  private tooltipText!: Phaser.GameObjects.Text;
  private hoverTimer: ReturnType<typeof setTimeout> | null = null;
  private paletteScrollY: number = 0;
  private paletteContentHeight: number = 0;

  // Double-click detection
  private lastClickTime: number = 0;
  private lastClickKey: string = '';

  // Resize panel state (D-pad for width/height)
  private resizePanel!: Phaser.GameObjects.Container;
  private resizedObject: { key: string; obj: PlacedObject } | null = null;
  private resizeSizeLabel!: Phaser.GameObjects.Text;
  private resizeOutline!: Phaser.GameObjects.Graphics;

  // Drag-to-move state
  private dragMoving: boolean = false;
  private dragMoveObj: PlacedObject | null = null;
  private dragMoveKey: string = '';
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragGhost!: Phaser.GameObjects.Graphics;

  // DOM input element for text entry (level name, slot number)
  private domInput: HTMLInputElement | null = null;

  // Current level metadata (for editing existing levels)
  private currentLevelId: string | null = null;

  // Callbacks
  private onExit!: () => void;

  constructor() {
    super({ key: 'LevelEditorScene' });
  }

  init(data: { onExit?: () => void }) {
    this.onExit = data.onExit ?? (() => {});
    // Reset state on init
    this.objects = new Map();
    this.undoStack = [];
    this.redoStack = [];
    this.selectedTool = null;
    this.isDirty = false;
    this.scrollX = 0;
    this.paletteScrollY = 0;
    this.currentLevelId = null;
    this.resizedObject = null;
  }

  create() {
    createTextures(this);

    this.buildToolbar();
    this.buildPalette();
    this.buildCanvas();
    this.setupInputHandlers();

    // Modal container sits above everything
    this.modalContainer = this.add.container(0, 0);
    this.modalContainer.setDepth(2000);
    this.modalContainer.setVisible(false);

    this.buildResizePanel();
  }

  // ─── TOOLBAR (Task 6.2) ───────────────────────────────────────────────

  private buildToolbar(): void {
    this.toolbar = this.add.container(0, 0);

    // Dark background
    const bg = this.add.graphics();
    bg.fillStyle(0x222222, 1);
    bg.fillRect(0, 0, 800, TOOLBAR_HEIGHT);
    this.toolbar.add(bg);

    // Button definitions
    const buttons = [
      { label: 'Save', x: 30, handler: () => this.handleSave() },
      { label: 'Load', x: 100, handler: () => this.handleLoad() },
      { label: 'Undo', x: 170, handler: () => this.handleUndo() },
      { label: 'Redo', x: 240, handler: () => this.handleRedo() },
      { label: 'Save as Level', x: 360, handler: () => this.handleSaveAsLevel() },
      { label: 'Exit', x: 500, handler: () => this.handleExit() },
    ];

    for (const btn of buttons) {
      const text = this.add.text(btn.x, 12, btn.label, {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#444444',
        padding: { x: 8, y: 4 },
      });
      text.setInteractive({ useHandCursor: true });
      text.on('pointerover', () => text.setStyle({ backgroundColor: '#666666' }));
      text.on('pointerout', () => text.setStyle({ backgroundColor: '#444444' }));
      text.on('pointerdown', btn.handler);
      this.toolbar.add(text);
    }
  }

  // ─── PALETTE (Task 6.3) ───────────────────────────────────────────────

  private buildPalette(): void {
    this.palette = this.add.container(VIEWPORT_WIDTH, TOOLBAR_HEIGHT);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x333333, 1);
    bg.fillRect(0, 0, PALETTE_WIDTH, VIEWPORT_HEIGHT);
    this.palette.add(bg);

    // Selection highlight (reusable, hidden initially)
    this.paletteHighlight = this.add.graphics();
    this.paletteHighlight.setVisible(false);
    this.palette.add(this.paletteHighlight);

    // Tooltip
    this.tooltipText = this.add.text(0, 0, '', {
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
    });
    this.tooltipText.setVisible(false);
    this.tooltipText.setDepth(1000);

    // Build categorized items
    let yOffset = 8;
    const allTypes = Object.keys(OBJECT_CATEGORIES) as PlaceableObjectType[];

    for (const cat of CATEGORY_ORDER) {
      // Category header
      const header = this.add.text(8, yOffset, cat.label, {
        fontSize: '12px',
        color: '#ffcc00',
        fontStyle: 'bold',
      });
      this.palette.add(header);
      yOffset += 20;

      // Items in this category
      const items = allTypes.filter((t) => OBJECT_CATEGORIES[t] === cat.key);
      let col = 0;

      for (const itemType of items) {
        const ix = 8 + col * 38;
        const iy = yOffset;

        // Thumbnail background
        const thumbBg = this.add.graphics();
        thumbBg.fillStyle(0x555555, 1);
        thumbBg.fillRect(ix, iy, 34, 34);
        this.palette.add(thumbBg);

        // Sprite thumbnail
        const textureKey = TEXTURE_MAP[itemType];
        if (this.textures.exists(textureKey)) {
          const sprite = this.add.image(ix + 17, iy + 17, textureKey);
          // Scale to fit within 30x30
          const frame = this.textures.getFrame(textureKey);
          const scale = Math.min(30 / frame.width, 30 / frame.height, 1);
          sprite.setScale(scale);
          this.palette.add(sprite);
        } else {
          // Fallback text
          const fallback = this.add.text(ix + 2, iy + 8, itemType.substring(0, 4), {
            fontSize: '9px',
            color: '#aaaaaa',
          });
          this.palette.add(fallback);
        }

        // Interactive zone for click and hover
        const zone = this.add.zone(ix + 17, iy + 17, 34, 34).setInteractive({ useHandCursor: true });
        zone.setData('objectType', itemType);
        zone.setData('x', ix);
        zone.setData('y', iy);

        zone.on('pointerdown', () => {
          this.selectTool(itemType, ix, iy);
        });

        zone.on('pointerover', () => {
          this.startHoverTooltip(itemType, ix, iy);
        });

        zone.on('pointerout', () => {
          this.cancelHoverTooltip();
        });

        this.palette.add(zone);

        col++;
        if (col >= 4) {
          col = 0;
          yOffset += 38;
        }
      }

      if (col > 0) {
        yOffset += 38;
        col = 0;
      }
      yOffset += 4; // gap between categories
    }

    this.paletteContentHeight = yOffset;

    // Palette scroll via mouse wheel over palette area
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: unknown[], _deltaX: number, deltaY: number) => {
      const pointer = this.input.activePointer;
      if (pointer.x >= VIEWPORT_WIDTH && pointer.y >= TOOLBAR_HEIGHT) {
        // Scrolling over palette
        const maxScroll = Math.max(0, this.paletteContentHeight - VIEWPORT_HEIGHT);
        this.paletteScrollY = Phaser.Math.Clamp(
          this.paletteScrollY + (deltaY > 0 ? 20 : -20),
          0,
          maxScroll
        );
        this.palette.setY(TOOLBAR_HEIGHT - this.paletteScrollY);
      } else if (pointer.x < VIEWPORT_WIDTH && pointer.y >= TOOLBAR_HEIGHT) {
        // Scrolling over canvas — horizontal scroll
        this.scrollCanvas(deltaY > 0 ? SCROLL_STEP : -SCROLL_STEP);
      }
    });
  }

  private selectTool(type: PlaceableObjectType, ix: number, iy: number): void {
    this.selectedTool = type;

    // Update highlight
    this.paletteHighlight.clear();
    this.paletteHighlight.lineStyle(2, 0x00ff00, 1);
    this.paletteHighlight.strokeRect(ix - 1, iy - 1, 36, 36);
    this.paletteHighlight.setVisible(true);
  }

  private startHoverTooltip(type: PlaceableObjectType, ix: number, iy: number): void {
    this.cancelHoverTooltip();
    this.hoverTimer = setTimeout(() => {
      this.tooltipText.setText(DISPLAY_NAMES[type]);
      this.tooltipText.setPosition(VIEWPORT_WIDTH + ix - 40, TOOLBAR_HEIGHT + iy - 16);
      this.tooltipText.setVisible(true);
    }, 500);
  }

  private cancelHoverTooltip(): void {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
    this.tooltipText.setVisible(false);
  }

  // ─── CANVAS (Task 6.4) ────────────────────────────────────────────────

  private buildCanvas(): void {
    this.canvas = this.add.container(0, TOOLBAR_HEIGHT);

    // Canvas background (sky blue)
    const bg = this.add.graphics();
    bg.fillStyle(0x5c94fc, 1);
    bg.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    this.canvas.add(bg);

    // Grid overlay
    this.gridOverlay = this.add.graphics();
    this.drawGrid();
    this.canvas.add(this.gridOverlay);

    // Objects container (rendered objects go here)
    this.objectsContainer = this.add.container(0, 0);
    this.canvas.add(this.objectsContainer);

    // Position indicator
    this.positionText = this.add.text(4, VIEWPORT_HEIGHT - 18, 'X: 0', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 4, y: 2 },
    });
    this.canvas.add(this.positionText);

    // Mask/clip the canvas container to 640×440
    const maskShape = this.make.graphics({});
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, TOOLBAR_HEIGHT, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    const mask = maskShape.createGeometryMask();
    this.canvas.setMask(mask);
  }

  private drawGrid(): void {
    this.gridOverlay.clear();
    this.gridOverlay.lineStyle(1, 0xffffff, 0.2);

    // Vertical lines
    const startCol = Math.floor(this.scrollX / GRID_SIZE);
    const endCol = startCol + Math.ceil(VIEWPORT_WIDTH / GRID_SIZE) + 1;

    for (let col = startCol; col <= endCol; col++) {
      const x = col * GRID_SIZE - this.scrollX;
      this.gridOverlay.lineBetween(x, 0, x, VIEWPORT_HEIGHT);
    }

    // Horizontal lines
    const rows = Math.ceil(VIEWPORT_HEIGHT / GRID_SIZE) + 1;
    for (let row = 0; row <= rows; row++) {
      const y = row * GRID_SIZE;
      this.gridOverlay.lineBetween(0, y, VIEWPORT_WIDTH, y);
    }
  }

  // ─── RESIZE PANEL (D-pad) ───────────────────────────────────────────

  private buildResizePanel(): void {
    this.resizePanel = this.add.container(450, 430);
    this.resizePanel.setDepth(1500);

    // Background (rounded rect, semi-transparent dark)
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRoundedRect(-90, -55, 180, 110, 8);
    bg.lineStyle(2, 0x4488ff, 1);
    bg.strokeRoundedRect(-90, -55, 180, 110, 8);
    this.resizePanel.add(bg);

    // Size label
    this.resizeSizeLabel = this.add.text(0, -42, 'W: 1  H: 1', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.resizePanel.add(this.resizeSizeLabel);

    // Width controls (left side)
    const widthLabel = this.add.text(-55, -18, 'Width:', {
      fontSize: '11px', color: '#aaaaaa',
    }).setOrigin(0.5, 0.5);
    this.resizePanel.add(widthLabel);

    const wMinus = this.add.text(-80, 4, ' ◀ ', {
      fontSize: '16px', color: '#ffffff', backgroundColor: '#555555', padding: { x: 6, y: 2 },
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    wMinus.on('pointerdown', () => this.resizeAdjust('width', -1));
    wMinus.on('pointerover', () => wMinus.setStyle({ backgroundColor: '#777777' }));
    wMinus.on('pointerout', () => wMinus.setStyle({ backgroundColor: '#555555' }));
    this.resizePanel.add(wMinus);

    const wPlus = this.add.text(-30, 4, ' ▶ ', {
      fontSize: '16px', color: '#ffffff', backgroundColor: '#555555', padding: { x: 6, y: 2 },
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    wPlus.on('pointerdown', () => this.resizeAdjust('width', 1));
    wPlus.on('pointerover', () => wPlus.setStyle({ backgroundColor: '#777777' }));
    wPlus.on('pointerout', () => wPlus.setStyle({ backgroundColor: '#555555' }));
    this.resizePanel.add(wPlus);

    // Height controls (right side)
    const heightLabel = this.add.text(45, -18, 'Height:', {
      fontSize: '11px', color: '#aaaaaa',
    }).setOrigin(0.5, 0.5);
    this.resizePanel.add(heightLabel);

    const hPlus = this.add.text(25, 4, ' ▲ ', {
      fontSize: '16px', color: '#ffffff', backgroundColor: '#555555', padding: { x: 6, y: 2 },
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    hPlus.on('pointerdown', () => this.resizeAdjust('height', 1));
    hPlus.on('pointerover', () => hPlus.setStyle({ backgroundColor: '#777777' }));
    hPlus.on('pointerout', () => hPlus.setStyle({ backgroundColor: '#555555' }));
    this.resizePanel.add(hPlus);

    const hMinus = this.add.text(65, 4, ' ▼ ', {
      fontSize: '16px', color: '#ffffff', backgroundColor: '#555555', padding: { x: 6, y: 2 },
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    hMinus.on('pointerdown', () => this.resizeAdjust('height', -1));
    hMinus.on('pointerover', () => hMinus.setStyle({ backgroundColor: '#777777' }));
    hMinus.on('pointerout', () => hMinus.setStyle({ backgroundColor: '#555555' }));
    this.resizePanel.add(hMinus);

    // Done button
    const doneBtn = this.add.text(-30, 35, 'Done', {
      fontSize: '12px', color: '#ffffff', backgroundColor: '#007700', padding: { x: 10, y: 4 },
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    doneBtn.on('pointerdown', () => this.hideResizePanel());
    doneBtn.on('pointerover', () => doneBtn.setStyle({ backgroundColor: '#009900' }));
    doneBtn.on('pointerout', () => doneBtn.setStyle({ backgroundColor: '#007700' }));
    this.resizePanel.add(doneBtn);

    // Delete button
    const deleteBtn = this.add.text(40, 35, 'Delete', {
      fontSize: '12px', color: '#ffffff', backgroundColor: '#aa0000', padding: { x: 10, y: 4 },
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    deleteBtn.on('pointerdown', () => this.deleteSelectedObject());
    deleteBtn.on('pointerover', () => deleteBtn.setStyle({ backgroundColor: '#cc0000' }));
    deleteBtn.on('pointerout', () => deleteBtn.setStyle({ backgroundColor: '#aa0000' }));
    this.resizePanel.add(deleteBtn);

    // Resize outline graphics (drawn on canvas)
    this.resizeOutline = this.add.graphics();
    this.resizeOutline.setDepth(1499);
    this.resizeOutline.setVisible(false);

    this.resizePanel.setVisible(false);
  }

  private resizeAdjust(dimension: 'width' | 'height', delta: number): void {
    if (!this.resizedObject) return;
    const { key, obj } = this.resizedObject;

    const props = obj.properties ?? {};
    const currentWidth = props.width ?? 1;
    const currentHeight = props.height ?? 1;

    let newWidth = currentWidth;
    let newHeight = currentHeight;

    if (dimension === 'width') {
      newWidth = Phaser.Math.Clamp(currentWidth + delta, 1, 20);
    } else {
      newHeight = Phaser.Math.Clamp(currentHeight + delta, 1, 20);
    }

    if (newWidth === currentWidth && newHeight === currentHeight) return;

    // Remove old occupied cells
    for (let dc = 0; dc < currentWidth; dc++) {
      for (let dr = 0; dr < currentHeight; dr++) {
        this.objects.delete(`${obj.col + dc},${obj.row + dr}`);
      }
    }

    // Update properties
    const updatedProps: ObjectProperties = { ...props, width: newWidth, height: newHeight };
    const updatedObj: PlacedObject = { ...obj, properties: updatedProps };

    // Place in new occupied cells
    for (let dc = 0; dc < newWidth; dc++) {
      for (let dr = 0; dr < newHeight; dr++) {
        this.objects.set(`${updatedObj.col + dc},${updatedObj.row + dr}`, updatedObj);
      }
    }

    // Push undo action
    const prevProps: ObjectProperties = { ...(obj.properties ?? {}) };
    const action: EditorAction = {
      type: 'propertyChange',
      objectKey: key,
      prevProps,
      nextProps: updatedProps,
    };
    this.undoStack = pushAction(this.undoStack, action);
    this.redoStack = [];
    this.isDirty = true;

    // Update reference
    this.resizedObject = { key, obj: updatedObj };
    this.resizeSizeLabel.setText(`W: ${newWidth}  H: ${newHeight}`);
    this.renderObjects();
    this.drawResizeOutline();
  }

  private showResizePanel(key: string, obj: PlacedObject): void {
    this.resizedObject = { key, obj };
    const w = obj.properties?.width ?? 1;
    const h = obj.properties?.height ?? 1;
    this.resizeSizeLabel.setText(`W: ${w}  H: ${h}`);
    this.resizePanel.setVisible(true);
    this.drawResizeOutline();
  }

  private hideResizePanel(): void {
    this.resizedObject = null;
    this.resizePanel.setVisible(false);
    this.resizeOutline.clear();
    this.resizeOutline.setVisible(false);
  }

  private deleteSelectedObject(): void {
    if (!this.resizedObject) return;
    const { key, obj } = this.resizedObject;
    const w = obj.properties?.width ?? 1;
    const h = obj.properties?.height ?? 1;

    // Remove all occupied cells
    for (let dc = 0; dc < w; dc++) {
      for (let dr = 0; dr < h; dr++) {
        this.objects.delete(`${obj.col + dc},${obj.row + dr}`);
      }
    }

    const action: EditorAction = { type: 'delete', object: obj };
    this.undoStack = pushAction(this.undoStack, action);
    this.redoStack = [];
    this.isDirty = true;

    this.hideResizePanel();
    this.renderObjects();
  }

  /**
   * Determines if an object type should snap to grid (floors and enemies)
   * or can be placed freely (everything else).
   */
  private isGridSnappedType(type: PlaceableObjectType): boolean {
    const gridTypes: PlaceableObjectType[] = [
      'ground_block', 'purple_block', 'castle_wall', 'stair_block',
      'ice_block', 'bounce_block', 'breakable_block',
      'goomba', 'koopa', 'hammer_brother', 'piranha_plant',
      'koopa_shell', 'bullet_bill_cannon', 'fire_bar', 'lakitu', 'chain_chomp',
    ];
    return gridTypes.includes(type);
  }

  private drawResizeOutline(): void {
    this.resizeOutline.clear();
    if (!this.resizedObject) {
      this.resizeOutline.setVisible(false);
      return;
    }
    const { obj } = this.resizedObject;
    const w = obj.properties?.width ?? 1;
    const h = obj.properties?.height ?? 1;
    const x = obj.col * GRID_SIZE - this.scrollX;
    const y = obj.row * GRID_SIZE + TOOLBAR_HEIGHT;

    this.resizeOutline.lineStyle(3, 0x4488ff, 1);
    this.resizeOutline.strokeRect(x, y, w * GRID_SIZE, h * GRID_SIZE);
    this.resizeOutline.setVisible(true);
  }

  private isEnemyType(type: PlaceableObjectType): boolean {
    const enemies: PlaceableObjectType[] = [
      'goomba', 'koopa', 'hammer_brother', 'piranha_plant',
      'koopa_shell', 'bullet_bill_cannon', 'fire_bar', 'lakitu', 'chain_chomp',
    ];
    return enemies.includes(type);
  }

  /**
   * Find an object at a given pixel position by checking bounding boxes.
   * Works for both grid-snapped and free-placed objects.
   */
  private findObjectAtPixel(pixelX: number, pixelY: number): { key: string; obj: PlacedObject } | null {
    const rendered = new Set<string>();
    for (const [mapKey, obj] of this.objects.entries()) {
      const anchorKey = `${obj.col},${obj.row}`;
      if (rendered.has(anchorKey)) continue;
      rendered.add(anchorKey);

      const objW = (obj.properties?.width ?? 1) * GRID_SIZE;
      const objH = (obj.properties?.height ?? 1) * GRID_SIZE;
      const objX = obj.col * GRID_SIZE;
      const objY = obj.row * GRID_SIZE;

      if (pixelX >= objX && pixelX < objX + objW && pixelY >= objY && pixelY < objY + objH) {
        return { key: anchorKey, obj };
      }
    }
    return null;
  }

  private scrollCanvas(delta: number): void {
    this.scrollX = Math.max(0, this.scrollX + delta);
    this.positionText.setText(`X: ${this.scrollX}`);
    this.drawGrid();
    this.renderObjects();
  }

  private renderObjects(): void {
    // Clear existing rendered objects
    this.objectsContainer.removeAll(true);

    // Determine visible range
    const startCol = Math.floor(this.scrollX / GRID_SIZE);
    const endCol = startCol + Math.ceil(VIEWPORT_WIDTH / GRID_SIZE) + 1;

    // Render objects that are within the visible viewport
    const rendered = new Set<string>(); // avoid rendering same anchor twice
    for (const [_key, obj] of this.objects.entries()) {
      const anchorKey = `${obj.col},${obj.row}`;
      if (rendered.has(anchorKey)) continue;

      const objWidth = obj.properties?.width ?? 1;
      const objHeight = obj.properties?.height ?? 1;
      if (obj.col + objWidth - 1 >= startCol - 1 && obj.col <= endCol) {
        const x = obj.col * GRID_SIZE - this.scrollX;
        const y = obj.row * GRID_SIZE;

        // Special rendering for pipes: cap on top + body segments below
        if (obj.type.includes('pipe')) {
          const isPurple = obj.type.includes('purple');
          const capTex = isPurple ? 'purple_pipe_cap' : 'pipe_cap';
          const bodyTex = isPurple ? 'purple_pipe_body' : 'pipe_body';
          const pipeHeight = objHeight >= 2 ? objHeight : (obj.properties?.pipeHeight ?? 2);

          // Draw cap at top (wider than body)
          if (this.textures.exists(capTex)) {
            const cap = this.add.image(x + GRID_SIZE / 2, y + 9, capTex);
            const capFrame = this.textures.getFrame(capTex);
            cap.setDisplaySize(GRID_SIZE + 8, 18);
            this.objectsContainer.add(cap);
          }

          // Draw body segments below the cap
          for (let seg = 1; seg < pipeHeight; seg++) {
            if (this.textures.exists(bodyTex)) {
              const body = this.add.image(x + GRID_SIZE / 2, y + 18 + (seg - 1) * GRID_SIZE + GRID_SIZE / 2, bodyTex);
              body.setDisplaySize(GRID_SIZE, GRID_SIZE);
              this.objectsContainer.add(body);
            }
          }
        }
        // Normal rendering for non-pipe objects
        else {
          const textureKey = TEXTURE_MAP[obj.type];
          if (this.textures.exists(textureKey)) {
            if (objWidth > 1 || objHeight > 1) {
              const totalWidth = objWidth * GRID_SIZE;
              const totalHeight = objHeight * GRID_SIZE;
              const sprite = this.add.image(x + totalWidth / 2, y + totalHeight / 2, textureKey);
              sprite.setDisplaySize(totalWidth, totalHeight);
              this.objectsContainer.add(sprite);
            } else {
              const sprite = this.add.image(x + GRID_SIZE / 2, y + GRID_SIZE / 2, textureKey);
              const frame = this.textures.getFrame(textureKey);
              const scaleX = GRID_SIZE / frame.width;
              const scaleY = GRID_SIZE / frame.height;
              sprite.setScale(Math.min(scaleX, scaleY));
              this.objectsContainer.add(sprite);
            }
          } else {
            // Fallback colored rectangle
            const fallback = this.add.graphics();
            fallback.fillStyle(0xff00ff, 0.5);
            fallback.fillRect(x, y, GRID_SIZE * objWidth, GRID_SIZE * objHeight);
            this.objectsContainer.add(fallback);
          }
        }

        // Visual indicator for non-default properties (Task 8.4)
        if (this.hasNonDefaultProperties(obj)) {
          const indicator = this.add.graphics();
          indicator.fillStyle(0xffff00, 1);
          indicator.fillCircle(x + GRID_SIZE - 4, y + 4, 4);
          this.objectsContainer.add(indicator);
        }

        rendered.add(anchorKey);
      }
    }

    // Redraw resize outline if panel is visible
    if (this.resizedObject) {
      this.drawResizeOutline();
    }
  }

  /**
   * Check if an object has non-default property values.
   * Requirement 9.4: visual indicator on objects with non-default properties.
   */
  private hasNonDefaultProperties(obj: PlacedObject): boolean {
    if (!obj.properties) return false;
    const defaults = DEFAULT_PROPERTIES[obj.type];
    if (!defaults) return false;

    if (obj.type === 'moving_platform') {
      const speed = obj.properties.speed ?? 2;
      const range = obj.properties.movementRange ?? 4;
      const dir = obj.properties.direction ?? 'horizontal';
      return speed !== 2 || range !== 4 || dir !== 'horizontal';
    }

    if (obj.type.includes('pipe')) {
      const hasPiranha = obj.properties.hasPiranha ?? false;
      const defaultHeight = defaults.pipeHeight ?? 2;
      const height = obj.properties.pipeHeight ?? defaultHeight;
      return hasPiranha !== false || height !== defaultHeight;
    }

    return false;
  }

  // ─── INPUT HANDLERS ───────────────────────────────────────────────────

  private setupInputHandlers(): void {
    // Keyboard shortcuts
    const keyboard = this.input.keyboard;
    if (keyboard) {
      // Ctrl+Z → undo
      keyboard.on('keydown-Z', (event: KeyboardEvent) => {
        if (event.ctrlKey || event.metaKey) {
          this.handleUndo();
        }
      });

      // Ctrl+Y → redo
      keyboard.on('keydown-Y', (event: KeyboardEvent) => {
        if (event.ctrlKey || event.metaKey) {
          this.handleRedo();
        }
      });

      // Arrow keys for scrolling
      keyboard.on('keydown-LEFT', () => {
        this.scrollCanvas(-SCROLL_STEP);
      });

      keyboard.on('keydown-RIGHT', () => {
        this.scrollCanvas(SCROLL_STEP);
      });

      // Escape to close modals or exit
      keyboard.on('keydown-ESC', () => {
        if (this.modalContainer.visible) {
          this.closeModal();
        } else if (this.resizePanel.visible) {
          this.hideResizePanel();
        } else {
          this.handleExit();
        }
      });
    }

    // Canvas click to place objects or detect double-click
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Ignore clicks when modal is open
      if (this.modalContainer.visible) return;

      // Only handle clicks in the canvas area
      if (
        pointer.x >= 0 &&
        pointer.x < VIEWPORT_WIDTH &&
        pointer.y >= TOOLBAR_HEIGHT &&
        pointer.y < TOOLBAR_HEIGHT + VIEWPORT_HEIGHT
      ) {
        if (pointer.rightButtonDown()) {
          this.handleCanvasRightClick(pointer);
        } else if (pointer.leftButtonDown()) {
          this.handleCanvasLeftClick(pointer);
        }
      }
    });

    // Enable right-click
    this.input.mouse?.disableContextMenu();

    // Drag-to-move: track pointer movement
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragMoveObj) return;
      if (this.modalContainer.visible) return;

      const dx = Math.abs(pointer.x - this.dragStartX);
      const dy = Math.abs(pointer.y - this.dragStartY);

      // If moved more than 6 pixels, start actual drag
      if (!this.dragMoving && (dx > 6 || dy > 6)) {
        this.dragMoving = true;
        if (!this.dragGhost) {
          this.dragGhost = this.add.graphics();
          this.dragGhost.setDepth(1600);
        }
      }

      if (this.dragMoving) {
        // Draw ghost at cursor position
        const obj = this.dragMoveObj;
        const w = (obj.properties?.width ?? 1) * GRID_SIZE;
        const h = (obj.properties?.height ?? 1) * GRID_SIZE;
        const gx = pointer.x - w / 2;
        const gy = pointer.y - TOOLBAR_HEIGHT - h / 2 + TOOLBAR_HEIGHT;

        this.dragGhost.clear();
        this.dragGhost.fillStyle(0x00ff00, 0.3);
        this.dragGhost.fillRect(gx, gy, w, h);
        this.dragGhost.lineStyle(2, 0x00ff00, 0.8);
        this.dragGhost.strokeRect(gx, gy, w, h);
        this.dragGhost.setVisible(true);
      }
    });

    // Drag-to-move: finalize on pointer up
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragMoveObj) return;

      if (this.dragMoving) {
        // Finalize move
        const canvasX = pointer.x + this.scrollX;
        const canvasY = pointer.y - TOOLBAR_HEIGHT;

        const obj = this.dragMoveObj;
        const oldW = obj.properties?.width ?? 1;
        const oldH = obj.properties?.height ?? 1;

        // Remove from old position
        for (let dc = 0; dc < oldW; dc++) {
          for (let dr = 0; dr < oldH; dr++) {
            this.objects.delete(`${obj.col + dc},${obj.row + dr}`);
          }
        }

        // For grid-snapped types, snap to grid; for free types, use pixel position
        let newCol: number;
        let newRow: number;
        if (this.isGridSnappedType(obj.type)) {
          newCol = Math.floor(canvasX / GRID_SIZE);
          newRow = Math.floor(canvasY / GRID_SIZE);
        } else {
          // Free placement: store pixel position as fractional grid coords
          newCol = Math.round((canvasX - GRID_SIZE / 2) * 100 / GRID_SIZE) / 100;
          newRow = Math.round((canvasY - GRID_SIZE / 2) * 100 / GRID_SIZE) / 100;
        }

        // Place at new position
        const movedObj: PlacedObject = { ...obj, col: newCol, row: newRow };
        const newKey = `${newCol},${newRow}`;
        if (this.isGridSnappedType(obj.type)) {
          for (let dc = 0; dc < oldW; dc++) {
            for (let dr = 0; dr < oldH; dr++) {
              this.objects.set(`${newCol + dc},${newRow + dr}`, movedObj);
            }
          }
        } else {
          this.objects.set(newKey, movedObj);
        }

        this.isDirty = true;
        this.renderObjects();

        // Clean up ghost
        if (this.dragGhost) {
          this.dragGhost.clear();
          this.dragGhost.setVisible(false);
        }
      } else {
        // No drag — it was just a click. Show resize panel for non-enemies.
        if (this.dragMoveObj && !this.isEnemyType(this.dragMoveObj.type)) {
          this.showResizePanel(this.dragMoveKey, this.dragMoveObj);
        }
      }

      // Reset drag state
      this.dragMoving = false;
      this.dragMoveObj = null;
      this.dragMoveKey = '';
    });
  }

  private handleCanvasLeftClick(pointer: Phaser.Input.Pointer): void {
    // Convert pointer position to pixel coordinates on the canvas
    const canvasX = pointer.x + this.scrollX;
    const canvasY = pointer.y - TOOLBAR_HEIGHT;

    const col = Math.floor(canvasX / GRID_SIZE);
    const row = Math.floor(canvasY / GRID_SIZE);
    const key = `${col},${row}`;

    // Double-click detection (Task 8.4)
    const now = Date.now();
    if (key === this.lastClickKey && now - this.lastClickTime < 400) {
      this.lastClickTime = 0;
      this.lastClickKey = '';
      const hit = this.findObjectAtPixel(canvasX, canvasY);
      if (hit) {
        this.handleDoubleClick(hit.obj, hit.key);
        return;
      }
    }
    this.lastClickTime = now;
    this.lastClickKey = key;

    // Check if clicked on an existing object → start potential drag-move
    const hit = this.findObjectAtPixel(canvasX, canvasY);
    if (hit) {
      this.dragMoving = false;
      this.dragMoveObj = hit.obj;
      this.dragMoveKey = hit.key;
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
      return;
    }

    // If resize panel is visible and clicked empty space, hide it
    if (this.resizePanel.visible) {
      this.hideResizePanel();
    }

    // Normal placement
    if (!this.selectedTool) return;

    // For grid-snapped types, use grid position; for free types, use pixel position
    let placeCol: number;
    let placeRow: number;
    if (this.isGridSnappedType(this.selectedTool)) {
      placeCol = col;
      placeRow = row;
    } else {
      // Free placement: pixel-based (fractional grid coords)
      placeCol = Math.round((canvasX - GRID_SIZE / 2) * 100 / GRID_SIZE) / 100;
      placeRow = Math.round((canvasY - GRID_SIZE / 2) * 100 / GRID_SIZE) / 100;
    }

    const newObj: PlacedObject = {
      type: this.selectedTool,
      col: placeCol,
      row: placeRow,
    };

    // Set default properties for pipes (height 2 = cap + 1 body)
    if (this.selectedTool.includes('pipe')) {
      const defaultSegs = parseInt(this.selectedTool.charAt(this.selectedTool.length - 1), 10) || 2;
      newObj.properties = { height: defaultSegs, pipeHeight: defaultSegs as 2 | 3 | 4 };
    }

    // For free objects, just use a unique key based on position
    const objKey = `${placeCol},${placeRow}`;
    if (this.isGridSnappedType(this.selectedTool)) {
      const { newObjects, action } = placeObject(this.objects, newObj);
      this.objects = newObjects;
      this.undoStack = pushAction(this.undoStack, action);
    } else {
      this.objects.set(objKey, newObj);
      const action: EditorAction = { type: 'place', object: newObj };
      this.undoStack = pushAction(this.undoStack, action);
    }
    this.redoStack = [];
    this.isDirty = true;
    this.renderObjects();

    // Auto-deselect non-floor/non-enemy objects after placing (one-shot placement)
    if (!this.isGridSnappedType(this.selectedTool)) {
      this.selectedTool = null;
      this.paletteHighlight.setVisible(false);
    }
  }

  private handleCanvasRightClick(pointer: Phaser.Input.Pointer): void {
    const canvasX = pointer.x + this.scrollX;
    const canvasY = pointer.y - TOOLBAR_HEIGHT;

    // Use hit-test to find object at pixel position
    const hit = this.findObjectAtPixel(canvasX, canvasY);
    if (hit) {
      const obj = hit.obj;
      const w = obj.properties?.width ?? 1;
      const h = obj.properties?.height ?? 1;

      // Remove all occupied cells
      if (this.isGridSnappedType(obj.type)) {
        for (let dc = 0; dc < w; dc++) {
          for (let dr = 0; dr < h; dr++) {
            this.objects.delete(`${obj.col + dc},${obj.row + dr}`);
          }
        }
      } else {
        this.objects.delete(hit.key);
      }

      const action: EditorAction = { type: 'delete', object: obj };
      this.undoStack = pushAction(this.undoStack, action);
      this.redoStack = [];
      this.isDirty = true;
      this.renderObjects();
    }
  }

  // ─── DOUBLE-CLICK / PROPERTIES PANEL (Task 8.4) ──────────────────────

  private handleDoubleClick(obj: PlacedObject, key: string): void {
    if (obj.type === 'moving_platform') {
      this.showPlatformPropertiesPanel(obj, key);
    } else if (obj.type.includes('pipe')) {
      this.showPipePropertiesPanel(obj, key);
    }
  }

  private showPlatformPropertiesPanel(obj: PlacedObject, key: string): void {
    const props = obj.properties ?? {};
    const currentSpeed = props.speed ?? 2;
    const currentRange = props.movementRange ?? 4;
    const currentDirection = props.direction ?? 'horizontal';

    this.showModal((container) => {
      const panelW = 300;
      const panelH = 220;
      const px = (800 - panelW) / 2;
      const py = (480 - panelH) / 2;

      // Panel background
      const bg = this.add.graphics();
      bg.fillStyle(0x222222, 0.95);
      bg.fillRoundedRect(px, py, panelW, panelH, 8);
      bg.lineStyle(2, 0x00ff00, 1);
      bg.strokeRoundedRect(px, py, panelW, panelH, 8);
      container.add(bg);

      // Title
      const title = this.add.text(px + panelW / 2, py + 16, 'Platform Properties', {
        fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      container.add(title);

      // State for editing
      let editSpeed = currentSpeed;
      let editRange = currentRange;
      let editDirection = currentDirection;

      // Speed label and value
      const speedLabel = this.add.text(px + 20, py + 50, `Speed: ${editSpeed}`, {
        fontSize: '12px', color: '#ffffff',
      });
      container.add(speedLabel);

      // Speed -/+ buttons
      const speedMinus = this.add.text(px + 160, py + 48, ' - ', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#555555', padding: { x: 6, y: 2 },
      }).setInteractive({ useHandCursor: true });
      speedMinus.on('pointerdown', () => {
        editSpeed = clampProperty(editSpeed - 1, 1, 10);
        speedLabel.setText(`Speed: ${editSpeed}`);
      });
      container.add(speedMinus);

      const speedPlus = this.add.text(px + 200, py + 48, ' + ', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#555555', padding: { x: 6, y: 2 },
      }).setInteractive({ useHandCursor: true });
      speedPlus.on('pointerdown', () => {
        editSpeed = clampProperty(editSpeed + 1, 1, 10);
        speedLabel.setText(`Speed: ${editSpeed}`);
      });
      container.add(speedPlus);

      // Range label and value
      const rangeLabel = this.add.text(px + 20, py + 85, `Range: ${editRange}`, {
        fontSize: '12px', color: '#ffffff',
      });
      container.add(rangeLabel);

      // Range -/+ buttons
      const rangeMinus = this.add.text(px + 160, py + 83, ' - ', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#555555', padding: { x: 6, y: 2 },
      }).setInteractive({ useHandCursor: true });
      rangeMinus.on('pointerdown', () => {
        editRange = clampProperty(editRange - 1, 1, 20);
        rangeLabel.setText(`Range: ${editRange}`);
      });
      container.add(rangeMinus);

      const rangePlus = this.add.text(px + 200, py + 83, ' + ', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#555555', padding: { x: 6, y: 2 },
      }).setInteractive({ useHandCursor: true });
      rangePlus.on('pointerdown', () => {
        editRange = clampProperty(editRange + 1, 1, 20);
        rangeLabel.setText(`Range: ${editRange}`);
      });
      container.add(rangePlus);

      // Direction toggle
      const dirLabel = this.add.text(px + 20, py + 120, `Direction: ${editDirection}`, {
        fontSize: '12px', color: '#ffffff',
      });
      container.add(dirLabel);

      const dirToggle = this.add.text(px + 160, py + 118, 'Toggle', {
        fontSize: '12px', color: '#ffffff', backgroundColor: '#555555', padding: { x: 6, y: 2 },
      }).setInteractive({ useHandCursor: true });
      dirToggle.on('pointerdown', () => {
        editDirection = editDirection === 'horizontal' ? 'vertical' : 'horizontal';
        dirLabel.setText(`Direction: ${editDirection}`);
      });
      container.add(dirToggle);

      // Apply button
      const applyBtn = this.add.text(px + 50, py + 170, 'Apply', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#007700', padding: { x: 12, y: 4 },
      }).setInteractive({ useHandCursor: true });
      applyBtn.on('pointerdown', () => {
        const prevProps: ObjectProperties = { ...(obj.properties ?? {}) };
        const nextProps: ObjectProperties = {
          speed: clampProperty(editSpeed, 1, 10),
          movementRange: clampProperty(editRange, 1, 20),
          direction: editDirection,
        };

        // Update the object in the map
        const updatedObj: PlacedObject = { ...obj, properties: nextProps };
        this.objects.set(key, updatedObj);

        // Push propertyChange action to undo stack
        const action: EditorAction = {
          type: 'propertyChange',
          objectKey: key,
          prevProps,
          nextProps,
        };
        this.undoStack = pushAction(this.undoStack, action);
        this.redoStack = [];
        this.isDirty = true;

        this.closeModal();
        this.renderObjects();
      });
      container.add(applyBtn);

      // Cancel button
      const cancelBtn = this.add.text(px + 160, py + 170, 'Cancel', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#770000', padding: { x: 12, y: 4 },
      }).setInteractive({ useHandCursor: true });
      cancelBtn.on('pointerdown', () => {
        this.closeModal();
      });
      container.add(cancelBtn);
    });
  }

  private showPipePropertiesPanel(obj: PlacedObject, key: string): void {
    const props = obj.properties ?? {};
    const currentPiranha = props.hasPiranha ?? false;
    // Derive default height from pipe type suffix
    const typeSuffix = parseInt(obj.type.charAt(obj.type.length - 1), 10);
    const currentHeight = props.pipeHeight ?? (typeSuffix as 2 | 3 | 4);

    this.showModal((container) => {
      const panelW = 300;
      const panelH = 180;
      const px = (800 - panelW) / 2;
      const py = (480 - panelH) / 2;

      // Panel background
      const bg = this.add.graphics();
      bg.fillStyle(0x222222, 0.95);
      bg.fillRoundedRect(px, py, panelW, panelH, 8);
      bg.lineStyle(2, 0x00cc00, 1);
      bg.strokeRoundedRect(px, py, panelW, panelH, 8);
      container.add(bg);

      // Title
      const title = this.add.text(px + panelW / 2, py + 16, 'Pipe Properties', {
        fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      container.add(title);

      let editPiranha = currentPiranha;
      let editHeight = currentHeight;

      // Piranha toggle
      const piranhaLabel = this.add.text(px + 20, py + 50, `Piranha Plant: ${editPiranha ? 'ON' : 'OFF'}`, {
        fontSize: '12px', color: '#ffffff',
      });
      container.add(piranhaLabel);

      const piranhaToggle = this.add.text(px + 200, py + 48, 'Toggle', {
        fontSize: '12px', color: '#ffffff', backgroundColor: '#555555', padding: { x: 6, y: 2 },
      }).setInteractive({ useHandCursor: true });
      piranhaToggle.on('pointerdown', () => {
        editPiranha = !editPiranha;
        piranhaLabel.setText(`Piranha Plant: ${editPiranha ? 'ON' : 'OFF'}`);
      });
      container.add(piranhaToggle);

      // Height selector
      const heightLabel = this.add.text(px + 20, py + 85, `Height: ${editHeight}`, {
        fontSize: '12px', color: '#ffffff',
      });
      container.add(heightLabel);

      const heights: (2 | 3 | 4)[] = [2, 3, 4];
      heights.forEach((h, i) => {
        const hBtn = this.add.text(px + 140 + i * 40, py + 83, ` ${h} `, {
          fontSize: '12px',
          color: '#ffffff',
          backgroundColor: h === editHeight ? '#007700' : '#555555',
          padding: { x: 6, y: 2 },
        }).setInteractive({ useHandCursor: true });
        hBtn.on('pointerdown', () => {
          editHeight = h;
          heightLabel.setText(`Height: ${editHeight}`);
          // Update button highlight state — simple approach: rebuild not needed, just update text
        });
        container.add(hBtn);
      });

      // Apply button
      const applyBtn = this.add.text(px + 50, py + 130, 'Apply', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#007700', padding: { x: 12, y: 4 },
      }).setInteractive({ useHandCursor: true });
      applyBtn.on('pointerdown', () => {
        const prevProps: ObjectProperties = { ...(obj.properties ?? {}) };
        const nextProps: ObjectProperties = {
          hasPiranha: editPiranha,
          pipeHeight: editHeight,
        };

        const updatedObj: PlacedObject = { ...obj, properties: nextProps };
        this.objects.set(key, updatedObj);

        const action: EditorAction = {
          type: 'propertyChange',
          objectKey: key,
          prevProps,
          nextProps,
        };
        this.undoStack = pushAction(this.undoStack, action);
        this.redoStack = [];
        this.isDirty = true;

        this.closeModal();
        this.renderObjects();
      });
      container.add(applyBtn);

      // Cancel button
      const cancelBtn = this.add.text(px + 160, py + 130, 'Cancel', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#770000', padding: { x: 12, y: 4 },
      }).setInteractive({ useHandCursor: true });
      cancelBtn.on('pointerdown', () => {
        this.closeModal();
      });
      container.add(cancelBtn);
    });
  }

  // ─── MODAL HELPERS ────────────────────────────────────────────────────

  private showModal(buildContent: (container: Phaser.GameObjects.Container) => void): void {
    this.closeModal(); // close any existing modal

    // Semi-transparent backdrop
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.6);
    backdrop.fillRect(0, 0, 800, 480);
    backdrop.setInteractive(new Phaser.Geom.Rectangle(0, 0, 800, 480), Phaser.Geom.Rectangle.Contains);
    this.modalContainer.add(backdrop);

    buildContent(this.modalContainer);
    this.modalContainer.setVisible(true);
  }

  private closeModal(): void {
    this.modalContainer.removeAll(true);
    this.modalContainer.setVisible(false);
    this.removeDomInput();
  }

  // ─── DOM INPUT HELPERS ────────────────────────────────────────────────

  private createDomInput(x: number, y: number, width: number, placeholder: string, defaultValue: string = ''): HTMLInputElement {
    this.removeDomInput();

    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.value = defaultValue;
    input.style.position = 'absolute';
    input.style.left = `${rect.left + x}px`;
    input.style.top = `${rect.top + y}px`;
    input.style.width = `${width}px`;
    input.style.height = '28px';
    input.style.fontSize = '14px';
    input.style.padding = '2px 8px';
    input.style.border = '2px solid #00ff00';
    input.style.borderRadius = '4px';
    input.style.backgroundColor = '#111111';
    input.style.color = '#ffffff';
    input.style.outline = 'none';
    input.style.zIndex = '10000';
    document.body.appendChild(input);
    input.focus();

    this.domInput = input;
    return input;
  }

  private removeDomInput(): void {
    if (this.domInput) {
      if (this.domInput.parentElement) {
        this.domInput.parentElement.removeChild(this.domInput);
      }
      this.domInput = null;
    }
  }

  // ─── HANDLER METHODS ──────────────────────────────────────────────────

  // ─── SAVE LEVEL (Task 9.1) ────────────────────────────────────────────

  private handleSave(): void {
    // Run validation
    const objectsArray = Array.from(this.objects.values());
    // Use a temporary name for validation (we'll get the real name after)
    const errors = validateAll(objectsArray, 'temp_name');

    // Filter out level name error since we haven't prompted yet
    const structuralErrors = errors.filter((e) => !e.message.includes('Level name'));

    if (structuralErrors.length > 0) {
      this.showValidationErrors(structuralErrors.map((e) => e.message));
      return;
    }

    // Prompt for level name
    this.showSaveNamePrompt();
  }

  private showValidationErrors(messages: string[]): void {
    this.showModal((container) => {
      const panelW = 400;
      const panelH = 60 + messages.length * 25 + 50;
      const px = (800 - panelW) / 2;
      const py = (480 - panelH) / 2;

      const bg = this.add.graphics();
      bg.fillStyle(0x330000, 0.95);
      bg.fillRoundedRect(px, py, panelW, panelH, 8);
      bg.lineStyle(2, 0xff0000, 1);
      bg.strokeRoundedRect(px, py, panelW, panelH, 8);
      container.add(bg);

      const title = this.add.text(px + panelW / 2, py + 16, 'Validation Errors', {
        fontSize: '14px', color: '#ff4444', fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      container.add(title);

      messages.forEach((msg, i) => {
        const errText = this.add.text(px + 20, py + 45 + i * 25, `• ${msg}`, {
          fontSize: '11px', color: '#ffffff', wordWrap: { width: panelW - 40 },
        });
        container.add(errText);
      });

      const okBtn = this.add.text(px + panelW / 2, py + panelH - 30, 'OK', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#555555', padding: { x: 16, y: 4 },
      }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
      okBtn.on('pointerdown', () => this.closeModal());
      container.add(okBtn);
    });
  }

  private showSaveNamePrompt(): void {
    this.showModal((container) => {
      const panelW = 350;
      const panelH = 150;
      const px = (800 - panelW) / 2;
      const py = (480 - panelH) / 2;

      const bg = this.add.graphics();
      bg.fillStyle(0x222222, 0.95);
      bg.fillRoundedRect(px, py, panelW, panelH, 8);
      bg.lineStyle(2, 0x00aaff, 1);
      bg.strokeRoundedRect(px, py, panelW, panelH, 8);
      container.add(bg);

      const title = this.add.text(px + panelW / 2, py + 16, 'Save Level', {
        fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      container.add(title);

      const prompt = this.add.text(px + 20, py + 45, 'Level Name (1-50 chars):', {
        fontSize: '12px', color: '#cccccc',
      });
      container.add(prompt);

      // DOM text input for level name
      const input = this.createDomInput(px + 20, py + 68, panelW - 40, 'Enter level name...');

      // Save button
      const saveBtn = this.add.text(px + 60, py + 110, 'Save', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#007700', padding: { x: 12, y: 4 },
      }).setInteractive({ useHandCursor: true });
      saveBtn.on('pointerdown', () => {
        const name = (input.value ?? '').trim();
        if (name.length < 1 || name.length > 50) {
          // Show inline error
          prompt.setText('Name must be 1-50 characters!');
          prompt.setStyle({ color: '#ff4444' });
          return;
        }
        this.closeModal();
        this.performSave(name);
      });
      container.add(saveBtn);

      // Handle Enter key on input
      input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          saveBtn.emit('pointerdown');
        } else if (e.key === 'Escape') {
          this.closeModal();
        }
      });

      // Cancel button
      const cancelBtn = this.add.text(px + 190, py + 110, 'Cancel', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#770000', padding: { x: 12, y: 4 },
      }).setInteractive({ useHandCursor: true });
      cancelBtn.on('pointerdown', () => this.closeModal());
      container.add(cancelBtn);
    });
  }

  private performSave(name: string): void {
    // Check for duplicate name
    const allLevels = loadAll();
    const existing = allLevels.find((l) => l.name === name && l.id !== this.currentLevelId);

    if (existing) {
      this.showOverwriteConfirmation(name, existing.id);
      return;
    }

    this.executeSave(name, this.currentLevelId ?? undefined);
  }

  private showOverwriteConfirmation(name: string, existingId: string): void {
    this.showModal((container) => {
      const panelW = 320;
      const panelH = 120;
      const px = (800 - panelW) / 2;
      const py = (480 - panelH) / 2;

      const bg = this.add.graphics();
      bg.fillStyle(0x222222, 0.95);
      bg.fillRoundedRect(px, py, panelW, panelH, 8);
      bg.lineStyle(2, 0xffaa00, 1);
      bg.strokeRoundedRect(px, py, panelW, panelH, 8);
      container.add(bg);

      const msg = this.add.text(px + panelW / 2, py + 25, `"${name}" already exists.\nOverwrite?`, {
        fontSize: '12px', color: '#ffffff', align: 'center',
      }).setOrigin(0.5, 0);
      container.add(msg);

      const yesBtn = this.add.text(px + 70, py + 80, 'Overwrite', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#aa7700', padding: { x: 10, y: 4 },
      }).setInteractive({ useHandCursor: true });
      yesBtn.on('pointerdown', () => {
        this.closeModal();
        this.executeSave(name, existingId);
      });
      container.add(yesBtn);

      const noBtn = this.add.text(px + 190, py + 80, 'Cancel', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#770000', padding: { x: 10, y: 4 },
      }).setInteractive({ useHandCursor: true });
      noBtn.on('pointerdown', () => this.closeModal());
      container.add(noBtn);
    });
  }

  private executeSave(name: string, existingId?: string): void {
    const id = existingId ?? crypto.randomUUID();
    const now = new Date().toISOString();

    const levelData: LevelData = serialize(this.objects, {
      name,
      createdAt: now,
    });

    const entry: SavedLevelEntry = {
      id,
      name,
      createdAt: now,
      data: levelData,
    };

    try {
      saveLevel(entry);
      this.currentLevelId = id;
      this.isDirty = false;

      // Also save to file (public/levels/) via server API — works in dev only
      fetch('/api/save-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(levelData),
      }).then(res => res.json()).then(result => {
        if (result.success) {
          this.showSuccessMessage(`Saved to file: ${result.fileName}`);
        } else {
          this.showSuccessMessage('Saved to localStorage (file save unavailable)');
        }
      }).catch(() => {
        this.showSuccessMessage('Saved to localStorage');
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        downloadAsFile(levelData);
        this.showSuccessMessage('Storage full — downloaded as file.');
      } else {
        this.showValidationErrors(['Failed to save level. Please try again.']);
      }
    }
  }

  private showSuccessMessage(message: string): void {
    const successText = this.add.text(400, 240, message, {
      fontSize: '16px',
      color: '#00ff00',
      backgroundColor: '#003300',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5, 0.5).setDepth(3000);

    this.time.delayedCall(2000, () => {
      successText.destroy();
    });
  }

  // ─── LOAD / LEVEL LIBRARY (Task 9.2) ──────────────────────────────────

  private handleLoad(): void {
    this.showLevelLibrary();
  }

  private showLevelLibrary(): void {
    const levels = loadAll();

    this.showModal((container) => {
      const panelW = 500;
      const panelH = 360;
      const px = (800 - panelW) / 2;
      const py = (480 - panelH) / 2;

      const bg = this.add.graphics();
      bg.fillStyle(0x1a1a2e, 0.97);
      bg.fillRoundedRect(px, py, panelW, panelH, 8);
      bg.lineStyle(2, 0x0088ff, 1);
      bg.strokeRoundedRect(px, py, panelW, panelH, 8);
      container.add(bg);

      const title = this.add.text(px + panelW / 2, py + 14, 'Level Library', {
        fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      container.add(title);

      // Close button
      const closeBtn = this.add.text(px + panelW - 30, py + 10, 'X', {
        fontSize: '16px', color: '#ff4444', fontStyle: 'bold',
      }).setInteractive({ useHandCursor: true });
      closeBtn.on('pointerdown', () => this.closeModal());
      container.add(closeBtn);

      if (levels.length === 0) {
        // Empty state
        const emptyMsg = this.add.text(px + panelW / 2, py + panelH / 2, 'No saved levels yet.\nUse "Save" to create your first level!', {
          fontSize: '13px', color: '#888888', align: 'center',
        }).setOrigin(0.5, 0.5);
        container.add(emptyMsg);
        return;
      }

      // Level list (scrollable area)
      const listTop = py + 44;
      const listHeight = panelH - 60;
      const itemHeight = 44;
      const maxVisible = Math.floor(listHeight / itemHeight);
      const displayLevels = levels.slice(0, maxVisible);

      displayLevels.forEach((level, i) => {
        const itemY = listTop + i * itemHeight;

        // Row background
        const rowBg = this.add.graphics();
        rowBg.fillStyle(i % 2 === 0 ? 0x222244 : 0x1a1a3e, 0.8);
        rowBg.fillRect(px + 10, itemY, panelW - 20, itemHeight - 4);
        container.add(rowBg);

        // Level name
        const nameText = this.add.text(px + 20, itemY + 5, level.name, {
          fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
        });
        container.add(nameText);

        // Date
        const dateStr = new Date(level.createdAt).toLocaleDateString();
        const dateText = this.add.text(px + 20, itemY + 22, dateStr, {
          fontSize: '10px', color: '#888888',
        });
        container.add(dateText);

        // Slot indicator
        if (level.slotNumber) {
          const slotText = this.add.text(px + 200, itemY + 5, `[Slot ${level.slotNumber}]`, {
            fontSize: '10px', color: '#ffcc00',
          });
          container.add(slotText);
        }

        // Corrupted indicator check
        let isCorrupted = false;
        try {
          if (!level.data || !Array.isArray(level.data.objects)) {
            isCorrupted = true;
          }
        } catch {
          isCorrupted = true;
        }

        if (isCorrupted) {
          const errIndicator = this.add.text(px + 200, itemY + 22, '⚠ Corrupted', {
            fontSize: '10px', color: '#ff4444',
          });
          container.add(errIndicator);
        }

        // Edit button (disabled if corrupted)
        if (!isCorrupted) {
          const editBtn = this.add.text(px + panelW - 130, itemY + 10, 'Edit', {
            fontSize: '11px', color: '#ffffff', backgroundColor: '#005599', padding: { x: 8, y: 3 },
          }).setInteractive({ useHandCursor: true });
          editBtn.on('pointerdown', () => {
            this.closeModal();
            this.loadLevelIntoCanvas(level);
          });
          container.add(editBtn);
        }

        // Delete button
        const delBtn = this.add.text(px + panelW - 65, itemY + 10, 'Delete', {
          fontSize: '11px', color: '#ffffff', backgroundColor: '#770000', padding: { x: 8, y: 3 },
        }).setInteractive({ useHandCursor: true });
        delBtn.on('pointerdown', () => {
          this.closeModal();
          this.showDeleteConfirmation(level);
        });
        container.add(delBtn);
      });

      // If more levels than visible
      if (levels.length > maxVisible) {
        const moreText = this.add.text(px + panelW / 2, listTop + maxVisible * itemHeight + 5, `... and ${levels.length - maxVisible} more`, {
          fontSize: '11px', color: '#888888',
        }).setOrigin(0.5, 0);
        container.add(moreText);
      }
    });
  }

  private loadLevelIntoCanvas(entry: SavedLevelEntry): void {
    this.objects = deserialize(entry.data);
    this.currentLevelId = entry.id;
    this.undoStack = [];
    this.redoStack = [];
    this.isDirty = false;
    this.scrollX = 0;
    this.positionText.setText('X: 0');
    this.drawGrid();
    this.renderObjects();
  }

  private showDeleteConfirmation(level: SavedLevelEntry): void {
    this.showModal((container) => {
      const panelW = 320;
      const panelH = 120;
      const px = (800 - panelW) / 2;
      const py = (480 - panelH) / 2;

      const bg = this.add.graphics();
      bg.fillStyle(0x222222, 0.95);
      bg.fillRoundedRect(px, py, panelW, panelH, 8);
      bg.lineStyle(2, 0xff0000, 1);
      bg.strokeRoundedRect(px, py, panelW, panelH, 8);
      container.add(bg);

      const msg = this.add.text(px + panelW / 2, py + 20, `Delete "${level.name}"?\nThis cannot be undone.`, {
        fontSize: '12px', color: '#ffffff', align: 'center',
      }).setOrigin(0.5, 0);
      container.add(msg);

      const yesBtn = this.add.text(px + 60, py + 80, 'Delete', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#aa0000', padding: { x: 10, y: 4 },
      }).setInteractive({ useHandCursor: true });
      yesBtn.on('pointerdown', () => {
        deleteLevel(level.id);
        this.closeModal();
        // Re-open library to show updated list
        this.showLevelLibrary();
      });
      container.add(yesBtn);

      const noBtn = this.add.text(px + 190, py + 80, 'Cancel', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#555555', padding: { x: 10, y: 4 },
      }).setInteractive({ useHandCursor: true });
      noBtn.on('pointerdown', () => {
        this.closeModal();
        this.showLevelLibrary();
      });
      container.add(noBtn);
    });
  }

  // ─── SAVE AS GAME LEVEL (Task 9.3) ────────────────────────────────────

  private handleSaveAsLevel(): void {
    // First ensure level is saved
    const objectsArray = Array.from(this.objects.values());
    const errors = validateAll(objectsArray, 'temp_name');
    const structuralErrors = errors.filter((e) => !e.message.includes('Level name'));

    if (structuralErrors.length > 0) {
      this.showValidationErrors(structuralErrors.map((e) => e.message));
      return;
    }

    this.showSlotNumberPrompt();
  }

  private showSlotNumberPrompt(): void {
    // Find the next available slot
    const allLevels = loadAll();
    const usedSlots = allLevels
      .filter((l) => l.slotNumber !== undefined)
      .map((l) => l.slotNumber!);
    const nextSlot = usedSlots.length > 0 ? Math.max(...usedSlots) + 1 : 6;

    this.showModal((container) => {
      const panelW = 350;
      const panelH = 170;
      const px = (800 - panelW) / 2;
      const py = (480 - panelH) / 2;

      const bg = this.add.graphics();
      bg.fillStyle(0x222222, 0.95);
      bg.fillRoundedRect(px, py, panelW, panelH, 8);
      bg.lineStyle(2, 0xffaa00, 1);
      bg.strokeRoundedRect(px, py, panelW, panelH, 8);
      container.add(bg);

      const title = this.add.text(px + panelW / 2, py + 14, 'Save as Game Level', {
        fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      container.add(title);

      const promptText = this.add.text(px + 20, py + 45, `Slot number (6 or higher).\nNext available: ${nextSlot}`, {
        fontSize: '12px', color: '#cccccc',
      });
      container.add(promptText);

      // DOM input for slot number
      const input = this.createDomInput(px + 20, py + 85, 100, `${nextSlot}`, `${nextSlot}`);
      input.type = 'number';
      input.min = '6';

      // Assign button
      const assignBtn = this.add.text(px + 60, py + 125, 'Assign', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#aa7700', padding: { x: 12, y: 4 },
      }).setInteractive({ useHandCursor: true });
      assignBtn.on('pointerdown', () => {
        const slotNum = parseInt(input.value, 10);
        if (isNaN(slotNum) || slotNum < 6) {
          promptText.setText('Slot must be 6 or higher!');
          promptText.setStyle({ color: '#ff4444' });
          return;
        }
        this.closeModal();
        this.assignSlotAndSave(slotNum);
      });
      container.add(assignBtn);

      // Handle Enter key
      input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          assignBtn.emit('pointerdown');
        } else if (e.key === 'Escape') {
          this.closeModal();
        }
      });

      // Cancel button
      const cancelBtn = this.add.text(px + 190, py + 125, 'Cancel', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#770000', padding: { x: 12, y: 4 },
      }).setInteractive({ useHandCursor: true });
      cancelBtn.on('pointerdown', () => this.closeModal());
      container.add(cancelBtn);
    });
  }

  private assignSlotAndSave(slotNumber: number): void {
    // If we have a current level loaded, update its slot
    if (this.currentLevelId) {
      const allLevels = loadAll();
      const existing = allLevels.find((l) => l.id === this.currentLevelId);
      if (existing) {
        const updated: SavedLevelEntry = {
          ...existing,
          slotNumber,
          data: {
            ...existing.data,
            slotNumber,
          },
        };
        try {
          saveLevel(updated);
          this.showSuccessMessage(`Assigned to game slot ${slotNumber}!`);
          return;
        } catch (err: unknown) {
          if (err instanceof DOMException && err.name === 'QuotaExceededError') {
            downloadAsFile(updated.data);
            this.showSuccessMessage('Storage full — downloaded as file.');
          }
          return;
        }
      }
    }

    // If not saved yet, do a full save with slot number
    this.showSaveNamePromptWithSlot(slotNumber);
  }

  private showSaveNamePromptWithSlot(slotNumber: number): void {
    this.showModal((container) => {
      const panelW = 350;
      const panelH = 160;
      const px = (800 - panelW) / 2;
      const py = (480 - panelH) / 2;

      const bg = this.add.graphics();
      bg.fillStyle(0x222222, 0.95);
      bg.fillRoundedRect(px, py, panelW, panelH, 8);
      bg.lineStyle(2, 0xffaa00, 1);
      bg.strokeRoundedRect(px, py, panelW, panelH, 8);
      container.add(bg);

      const title = this.add.text(px + panelW / 2, py + 14, `Save as Game Level (Slot ${slotNumber})`, {
        fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      container.add(title);

      const prompt = this.add.text(px + 20, py + 45, 'Level Name (1-50 chars):', {
        fontSize: '12px', color: '#cccccc',
      });
      container.add(prompt);

      const input = this.createDomInput(px + 20, py + 68, panelW - 40, 'Enter level name...');

      const saveBtn = this.add.text(px + 60, py + 115, 'Save', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#aa7700', padding: { x: 12, y: 4 },
      }).setInteractive({ useHandCursor: true });
      saveBtn.on('pointerdown', () => {
        const name = (input.value ?? '').trim();
        if (name.length < 1 || name.length > 50) {
          prompt.setText('Name must be 1-50 characters!');
          prompt.setStyle({ color: '#ff4444' });
          return;
        }
        this.closeModal();
        this.executeSaveWithSlot(name, slotNumber);
      });
      container.add(saveBtn);

      input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          saveBtn.emit('pointerdown');
        } else if (e.key === 'Escape') {
          this.closeModal();
        }
      });

      const cancelBtn = this.add.text(px + 200, py + 115, 'Cancel', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#770000', padding: { x: 12, y: 4 },
      }).setInteractive({ useHandCursor: true });
      cancelBtn.on('pointerdown', () => this.closeModal());
      container.add(cancelBtn);
    });
  }

  private executeSaveWithSlot(name: string, slotNumber: number): void {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const levelData: LevelData = serialize(this.objects, {
      name,
      createdAt: now,
      slotNumber,
    });

    const entry: SavedLevelEntry = {
      id,
      name,
      createdAt: now,
      slotNumber,
      data: levelData,
    };

    try {
      saveLevel(entry);
      this.currentLevelId = id;
      this.isDirty = false;
      this.showSuccessMessage(`Saved as Game Level ${slotNumber}!`);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        downloadAsFile(levelData);
        this.showSuccessMessage('Storage full — downloaded as file.');
      } else {
        this.showValidationErrors(['Failed to save level. Please try again.']);
      }
    }
  }

  // ─── EXIT (Task 9.4) ──────────────────────────────────────────────────

  private handleExit(): void {
    if (this.isDirty) {
      this.showExitConfirmation();
    } else {
      this.performExit();
    }
  }

  private showExitConfirmation(): void {
    this.showModal((container) => {
      const panelW = 340;
      const panelH = 130;
      const px = (800 - panelW) / 2;
      const py = (480 - panelH) / 2;

      const bg = this.add.graphics();
      bg.fillStyle(0x222222, 0.95);
      bg.fillRoundedRect(px, py, panelW, panelH, 8);
      bg.lineStyle(2, 0xffaa00, 1);
      bg.strokeRoundedRect(px, py, panelW, panelH, 8);
      container.add(bg);

      const msg = this.add.text(px + panelW / 2, py + 20, 'You have unsaved changes.\nAre you sure you want to exit?', {
        fontSize: '12px', color: '#ffffff', align: 'center',
      }).setOrigin(0.5, 0);
      container.add(msg);

      const yesBtn = this.add.text(px + 60, py + 85, 'Exit', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#aa0000', padding: { x: 16, y: 4 },
      }).setInteractive({ useHandCursor: true });
      yesBtn.on('pointerdown', () => {
        this.closeModal();
        this.performExit();
      });
      container.add(yesBtn);

      const noBtn = this.add.text(px + 200, py + 85, 'Stay', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#007700', padding: { x: 16, y: 4 },
      }).setInteractive({ useHandCursor: true });
      noBtn.on('pointerdown', () => this.closeModal());
      container.add(noBtn);
    });
  }

  private performExit(): void {
    this.removeDomInput();
    this.onExit();
  }

  // ─── UNDO/REDO ────────────────────────────────────────────────────────

  private handleUndo(): void {
    const result = undo(this.objects, this.undoStack, this.redoStack);
    this.objects = result.newObjects;
    this.undoStack = result.newUndo;
    this.redoStack = result.newRedo;
    this.isDirty = true;
    this.renderObjects();
  }

  private handleRedo(): void {
    const result = redo(this.objects, this.undoStack, this.redoStack);
    this.objects = result.newObjects;
    this.undoStack = result.newUndo;
    this.redoStack = result.newRedo;
    this.isDirty = true;
    this.renderObjects();
  }
}
