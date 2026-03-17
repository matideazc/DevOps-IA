import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import type { OfficeStateSnapshot } from '../../hooks/useOfficeState';
import { CANVAS_WIDTH, CANVAS_HEIGHT, ZONE_COORDINATES, getSpacedPosition } from '../../lib/layoutMap';
import type { Point2D } from '../../lib/layoutMap';

interface FloorPlanViewProps {
  state: OfficeStateSnapshot;
}

const AGENT_COLORS: Record<string, number> = {
  researcher: 0xc084fc,      // purple
  analyst: 0x60a5fa,         // blue
  creative_director: 0xf472b6, // pink
  supervisor: 0x4ade80,      // green
  human: 0xfacc15,           // yellow
};

// HELPER: Avatar Drawing
function drawAgentAvatar(
  gfx: PIXI.Graphics, role: string, state: string, baseColor: number, time: number, 
  localMatiasX: number, localMatiasY: number
) {
  const isWorking = state === 'working';
  const isBlocked = state === 'blocked' || state === 'awaiting_human';
  
  // 1. Auras / Extras
  if (isWorking) {
    const auraScale = 1 + Math.sin(time * 5) * 0.2;
    gfx.beginFill(baseColor, 0.25);
    gfx.drawCircle(0, 0, 24 * auraScale);
    gfx.endFill();
    
    // Typing / working hands micro-animation
    const handOffset = Math.sin(time * 15) * 2;
    gfx.beginFill(0xffffff, 0.8);
    gfx.drawCircle(-8, -5 + handOffset, 3);
    gfx.drawCircle(8, -5 - handOffset, 3);
    gfx.endFill();

    // Orbital dot
    gfx.beginFill(0xffffff);
    gfx.drawCircle(Math.cos(time * 4) * 16, Math.sin(time * 4) * 16, 3);
    gfx.endFill();
  } else if (isBlocked) {
    const pulse = (Math.sin(time * 10) + 1) / 2;
    gfx.beginFill(0xff3333, 0.6 * pulse);
    gfx.drawCircle(0, 0, 28);
    gfx.endFill();
    
    if (state === 'awaiting_human') {
      gfx.lineStyle(2, 0xffa500, 0.5 * pulse);
      gfx.moveTo(0,0);
      gfx.lineTo(localMatiasX, localMatiasY);
      gfx.lineStyle(0);
    }
  }

  // 2. Base Character Shadow
  gfx.beginFill(0x000000, 0.4);
  gfx.drawEllipse(0, 15, 12, 4);
  gfx.endFill();

  // 3. Draw Body (Meeple style with Strokes)
  gfx.lineStyle(2, 0x111116, 1);
  gfx.beginFill(baseColor);

  switch (role) {
    case 'human':
      // Founder: Taller capsule, more imposing
      gfx.drawRoundedRect(-14, -8, 28, 24, 6);
      gfx.endFill();
      // Head
      gfx.beginFill(0xfacc15); // Yellow head
      gfx.drawCircle(0, -18, 12);
      gfx.endFill();
      // Glasses (sunglasses vibe)
      gfx.beginFill(0x111116);
      gfx.drawRoundedRect(-10, -22, 20, 6, 2);
      gfx.lineStyle(0);
      gfx.beginFill(0xffffff, 0.3); // reflection
      gfx.drawRect(-8, -21, 4, 2);
      break;

    case 'researcher':
      // Nora: Rounded bottom, flat top body
      gfx.drawRoundedRect(-12, -4, 24, 18, 5);
      gfx.endFill();
      // Head
      gfx.beginFill(0xffe0bd); // Skin tone
      gfx.drawCircle(0, -14, 10);
      gfx.endFill();
      // Hair (Purple bob)
      gfx.beginFill(0x9333ea);
      gfx.arc(0, -14, 11, Math.PI, 0);
      gfx.endFill();
      // Glasses
      gfx.lineStyle(1, 0x111116);
      gfx.beginFill(0xffffff, 0.6);
      gfx.drawCircle(-4, -14, 3);
      gfx.drawCircle(4, -14, 3);
      gfx.moveTo(-1, -14).lineTo(1, -14); // bridge
      break;

    case 'analyst':
      // Bruno: Trapezoid body (hoodie)
      gfx.drawPolygon([-10, -5, 10, -5, 14, 15, -14, 15]);
      gfx.endFill();
      // Head
      gfx.beginFill(0xffcc99);
      gfx.drawCircle(0, -14, 9);
      gfx.endFill();
      // Headset
      gfx.lineStyle(2, 0x111116);
      gfx.arc(0, -14, 10, Math.PI, 0);
      gfx.beginFill(0x3b82f6); // blue earpiece
      gfx.drawCircle(-10, -14, 3);
      gfx.drawCircle(10, -14, 3);
      gfx.beginFill(0xffffff); // mic
      gfx.drawCircle(-12, -10, 2);
      break;

    case 'creative_director':
      // Bianca: Flowing sweater (rounded)
      gfx.drawEllipse(0, 5, 14, 10);
      gfx.endFill();
      // Head
      gfx.beginFill(0xfac090);
      gfx.drawCircle(0, -12, 9);
      gfx.endFill();
      // Beret / Hat (Pink)
      gfx.beginFill(0xdb2777);
      gfx.drawEllipse(2, -22, 10, 4);
      gfx.endFill();
      break;

    case 'supervisor':
      // Alfred: Broad shoulders, Suit
      gfx.drawRect(-12, -4, 24, 18);
      gfx.endFill();
      // Shirt/Tie
      gfx.beginFill(0xffffff);
      gfx.lineStyle(2, 0x111116);
      gfx.drawPolygon([-4, -4, 4, -4, 0, 4]); // Shirt V
      gfx.lineStyle(0);
      gfx.beginFill(0x22c55e);
      gfx.drawRect(-2, -2, 4, 10); // Tie
      gfx.endFill();
      // Head
      gfx.lineStyle(2, 0x111116);
      gfx.beginFill(0xe2b999);
      gfx.drawCircle(0, -14, 9);
      gfx.endFill();
      // Glasses / Moustache combo
      gfx.lineStyle(0);
      gfx.beginFill(0x111116);
      gfx.drawRect(-6, -11, 12, 2); // stache
      break;
    
    default:
      gfx.drawRoundedRect(-10, -5, 20, 20, 6);
      gfx.endFill();
      gfx.beginFill(0xffcccc);
      gfx.drawCircle(0, -14, 10);
      break;
  }
  gfx.endFill();
}

// Sub-Helpers for Pixel Props
function drawLaptop(gfx: PIXI.Graphics, x: number, y: number) {
  // Base
  gfx.lineStyle(2, 0x111111, 1);
  gfx.beginFill(0xc0c0c0);
  gfx.drawRect(x, y, 20, 15);
  gfx.endFill();
  // Screen
  gfx.lineStyle(0);
  gfx.beginFill(0x1a202c);
  gfx.drawRect(x + 2, y + 2, 16, 8);
  gfx.endFill();
  // Keyboard line
  gfx.beginFill(0x999999);
  gfx.drawRect(x + 3, y + 12, 14, 2);
  gfx.endFill();
}

function drawMug(gfx: PIXI.Graphics, x: number, y: number) {
  gfx.lineStyle(1, 0x111111, 1);
  gfx.beginFill(0xffffff);
  gfx.drawCircle(x, y, 4);
  gfx.endFill();
  gfx.lineStyle(0);
  gfx.beginFill(0x6b4c3a); // coffee
  gfx.drawCircle(x, y, 2.5);
  gfx.endFill();
}

function drawPlant(gfx: PIXI.Graphics, x: number, y: number) {
  // Shadow
  gfx.beginFill(0x000000, 0.2);
  gfx.drawCircle(x, y + 5, 12);
  gfx.endFill();
  // Pot
  gfx.lineStyle(2, 0x111111, 1);
  gfx.beginFill(0xca8a04);
  gfx.drawRect(x - 8, y - 8, 16, 16);
  gfx.endFill();
  // Leaves
  gfx.beginFill(0x22c55e);
  gfx.drawCircle(x - 6, y - 10, 8);
  gfx.drawCircle(x + 6, y - 10, 8);
  gfx.drawCircle(x, y - 15, 9);
  gfx.endFill();
}

function drawBookshelf(gfx: PIXI.Graphics, x: number, y: number, width: number, height: number) {
  gfx.lineStyle(2, 0x111111, 1);
  gfx.beginFill(0x8b5a2b);
  gfx.drawRect(x, y, width, height);
  gfx.endFill();
  // Shelves
  gfx.lineStyle(2, 0x5c3a21, 1);
  gfx.moveTo(x + 2, y + height / 2);
  gfx.lineTo(x + width - 2, y + height / 2);
  // Books (Rects)
  gfx.lineStyle(1, 0x111111, 1);
  gfx.beginFill(0xef4444); gfx.drawRect(x + 5, y + 5, 6, 12); // Red book
  gfx.beginFill(0x3b82f6); gfx.drawRect(x + 15, y + 5, 8, 12); // Blue book
  gfx.beginFill(0xeab308); gfx.drawRect(x + 30, y + height / 2 + 5, 10, 12); // Yellow book
  gfx.endFill();
}

// HELPER: Environment & Room Decorations - Pixel Office Vibe
function drawRoomDecor(mapGraphics: PIXI.Graphics, zoneName: string, center: Point2D) {
  const isFounder = zoneName === 'founders_desk';
  const isLounge = zoneName === 'idle_lounge';
  
  // Floor Types
  const isWood = zoneName === 'creative_studio' || zoneName === 'command_center' || isFounder;
  const isTiles = zoneName === 'research_lab' || zoneName === 'analysis_room' || isLounge;

  // Base Room Rect
  const rw = 260; 
  const rh = 220;
  const rx = center.x - rw/2;
  const ry = center.y - rh/2;

  // 1. Drop Shadow (thick dark border feeling)
  mapGraphics.beginFill(0x000000, 0.5);
  mapGraphics.drawRect(rx + 6, ry + 6, rw, rh);
  mapGraphics.endFill();

  // 2. Base Floor
  const baseWoodColor = isFounder ? 0x4a3b32 : 0x8b6540;
  const baseTileColor = isLounge ? 0x242d38 : 0xccd1d9;
  
  mapGraphics.beginFill(isWood ? baseWoodColor : baseTileColor);
  mapGraphics.lineStyle(4, 0x111111, 1); // Thick outer wall
  mapGraphics.drawRect(rx, ry, rw, rh);
  mapGraphics.endFill();

  // 3. Floor Textures
  mapGraphics.lineStyle(1, 0x000000, 0.15);
  if (isWood) {
    // Vertical wood planks
    for (let i = 10; i < rw; i += 20) {
      mapGraphics.moveTo(rx + i, ry);
      mapGraphics.lineTo(rx + i, ry + rh);
    }
  } else if (isTiles) {
    // Tile grid
    for (let i = 20; i < rw; i += 30) {
      mapGraphics.moveTo(rx + i, ry);
      mapGraphics.lineTo(rx + i, ry + rh);
    }
    for (let j = 20; j < rh; j += 30) {
      mapGraphics.moveTo(rx, ry + j);
      mapGraphics.lineTo(rx + rw, ry + j);
    }
  }
  mapGraphics.lineStyle(0);

  // 4. Props & Furniture por zona
  
  if (zoneName === 'research_lab') {
    // Bookshelves on top wall
    drawBookshelf(mapGraphics, rx + 20, ry + 10, 80, 40);
    drawBookshelf(mapGraphics, rx + 120, ry + 10, 80, 40);
    drawPlant(mapGraphics, rx + 230, ry + 30);

    // Desks
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0xcd853f); // Wood desk
    mapGraphics.drawRect(center.x - 70, center.y - 10, 140, 40);
    mapGraphics.endFill();
    
    // Details
    drawLaptop(mapGraphics, center.x - 40, center.y - 5);
    drawLaptop(mapGraphics, center.x + 20, center.y - 5);
    drawMug(mapGraphics, center.x - 10, center.y);

  } else if (zoneName === 'analysis_room') {
    // 2x2 Desk layout
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0xcd853f);
    mapGraphics.drawRect(center.x - 80, center.y - 60, 60, 35);
    mapGraphics.drawRect(center.x + 20, center.y - 60, 60, 35);
    mapGraphics.drawRect(center.x - 80, center.y + 40, 60, 35);
    mapGraphics.drawRect(center.x + 20, center.y + 40, 60, 35);
    mapGraphics.endFill();

    drawLaptop(mapGraphics, center.x - 60, center.y - 55);
    drawLaptop(mapGraphics, center.x + 40, center.y - 55);
    drawLaptop(mapGraphics, center.x - 60, center.y + 45);
    drawLaptop(mapGraphics, center.x + 40, center.y + 45);
    drawPlant(mapGraphics, rx + 30, ry + 30);
    drawPlant(mapGraphics, rx + rw - 30, ry + rh - 30);
    
    // Server Rack Right Wall
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0xd1d5db);
    mapGraphics.drawRect(rx + rw - 30, ry + 50, 20, 80);
    mapGraphics.endFill();
    mapGraphics.beginFill(0x3b82f6); // blink lights
    mapGraphics.drawRect(rx + rw - 25, ry + 60, 10, 5);
    mapGraphics.drawRect(rx + rw - 25, ry + 80, 10, 5);
    mapGraphics.drawRect(rx + rw - 25, ry + 100, 10, 5);
    mapGraphics.endFill();

  } else if (zoneName === 'creative_studio') {
    // Sofa lounge area (Couches in L)
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0xd946ef); // Pinkish sofas
    mapGraphics.drawRoundedRect(center.x - 80, center.y - 50, 40, 90, 8); // Left
    mapGraphics.drawRoundedRect(center.x + 40, center.y - 50, 40, 90, 8); // Right
    mapGraphics.endFill();

    // Coffee table
    mapGraphics.beginFill(0xcd853f);
    mapGraphics.drawRect(center.x - 25, center.y - 20, 50, 30);
    mapGraphics.endFill();
    drawMug(mapGraphics, center.x, center.y - 5);

    // Painting / Board on top wall
    mapGraphics.beginFill(0xfacc15, 0.4);
    mapGraphics.drawRect(center.x - 50, ry + 10, 100, 20); // Pin board
    mapGraphics.endFill();
    drawPlant(mapGraphics, rx + 20, ry + rh - 20);

  } else if (isFounder) {
    // Luxury Desk
    // Soft under-rug
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0x831843); // Deep red rug
    mapGraphics.drawRoundedRect(center.x - 70, center.y - 60, 140, 140, 12);
    mapGraphics.endFill();

    // Desk
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0x2d1b11); // Dark rich wood
    mapGraphics.drawRect(center.x - 60, center.y - 30, 120, 30); // Top
    mapGraphics.drawRect(center.x - 60, center.y, 25, 40);  // Left wing
    mapGraphics.drawRect(center.x + 35, center.y, 25, 40);  // Right wing
    mapGraphics.endFill();

    drawLaptop(mapGraphics, center.x - 10, center.y - 20);
    drawMug(mapGraphics, center.x + 30, center.y - 20);
    
    // Golden Trophy / Award
    mapGraphics.lineStyle(1, 0x000000);
    mapGraphics.beginFill(0xfacc15);
    mapGraphics.drawRect(center.x - 45, center.y - 20, 10, 10);
    mapGraphics.endFill();

    drawPlant(mapGraphics, rx + 40, ry + 40);
    drawPlant(mapGraphics, rx + rw - 40, ry + 40);
    drawBookshelf(mapGraphics, center.x - 40, ry + 10, 80, 30);

  } else if (zoneName === 'command_center') {
    // Big tactical desk
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0x4b5563); // Gray metal desk
    mapGraphics.drawRect(center.x - 100, center.y - 20, 200, 40);
    mapGraphics.endFill();

    // Multiple laptops
    drawLaptop(mapGraphics, center.x - 80, center.y - 10);
    drawLaptop(mapGraphics, center.x - 20, center.y - 10);
    drawLaptop(mapGraphics, center.x + 40, center.y - 10);

    // Giant screen on wall
    mapGraphics.beginFill(0x111827);
    mapGraphics.drawRect(center.x - 90, ry + 10, 180, 30);
    mapGraphics.endFill();
    mapGraphics.lineStyle(0);
    mapGraphics.beginFill(0x10b981); // Green data line
    mapGraphics.drawRect(center.x - 80, ry + 20, 60, 5);
    mapGraphics.drawRect(center.x + 10, ry + 25, 40, 5);
    mapGraphics.endFill();

  } else if (isLounge) {
    // Breakroom
    // Vending Machine
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0xef4444); // Red machine
    mapGraphics.drawRect(rx + 20, ry + 10, 35, 50);
    mapGraphics.endFill();
    mapGraphics.beginFill(0xbfdbfe); // Glass
    mapGraphics.drawRect(rx + 25, ry + 15, 25, 30);
    mapGraphics.endFill();

    // Water cooler
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0xf3f4f6); // White base
    mapGraphics.drawRect(rx + 70, ry + 30, 20, 30);
    mapGraphics.beginFill(0x3bd5fa); // Jug
    mapGraphics.drawRect(rx + 72, ry + 10, 16, 20);
    mapGraphics.endFill();

    // Long tables
    mapGraphics.beginFill(0xcd853f);
    mapGraphics.drawRect(center.x - 40, center.y - 20, 80, 25);
    mapGraphics.drawRect(center.x - 40, center.y + 40, 80, 25);
    mapGraphics.endFill();

    drawMug(mapGraphics, center.x - 20, center.y - 10);
    drawMug(mapGraphics, center.x + 10, center.y + 50);

    // Box stacks
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0xd97706);
    mapGraphics.drawRect(rx + rw - 40, ry + rh - 40, 20, 20);
    mapGraphics.drawRect(rx + rw - 35, ry + rh - 55, 20, 20);
    mapGraphics.drawRect(rx + rw - 60, ry + rh - 30, 20, 20);
    mapGraphics.endFill();
  }

  // Text Stencil (More subtle)
  const text = new PIXI.Text(zoneName.replace('_', ' ').toUpperCase(), new PIXI.TextStyle({
    fill: 0xffffff,
    fontSize: 14,
    fontFamily: 'monospace',
    letterSpacing: 2,
    align: 'center'
  }));
  text.alpha = 0.15; // Very subtle
  text.anchor.set(0.5);
  text.position.set(center.x, ry + rh - 20);
  
  return text;
}

export function FloorPlanView({ state }: FloorPlanViewProps) {
  console.log("FloorPlanView render start.");
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  // Dictionaries for visual objects and logical targets
  const agentsMap = useRef<Record<string, PIXI.Container>>({});
  const agentsData = useRef<Record<string, { targetX: number, targetY: number, role: string, state: string, taskTitle: string | null, slug: string }>>({});

  useEffect(() => {
    if (!canvasRef.current) return;

    // 1. Initialize PixiJS Application
    const app = new PIXI.Application({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: 0x111424, // Navy Void instead of Pure Dark Blue/Black
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });
    
    // Append the native canvas DOM element
    // cast to any to bypass exact HTMLCanvasElement signature differences in older TS
    canvasRef.current.appendChild(app.view as any);
    appRef.current = app;

    // 2. Draw Static Map Background (Decorated & Grid)
    const mapGraphics = new PIXI.Graphics();
    
    // --- Draw Global Floor Grid ---
    // NO GRID ANYMORE for Pixel Art aesthetic (rely on room floors and void)
    // -----------------------------
    const gridSize = 40;
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
      mapGraphics.moveTo(x, 0);
      mapGraphics.lineTo(x, CANVAS_HEIGHT);
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
      mapGraphics.moveTo(0, y);
      mapGraphics.lineTo(CANVAS_WIDTH, y);
    }
    mapGraphics.lineStyle(0);
    // -----------------------------
    
    // Draw Zones using the detailed Scene Polish Helper
    Object.entries(ZONE_COORDINATES).forEach(([zoneName, center]) => {
      // Draw decor directly onto the mapGraphics context
      const textNode = drawRoomDecor(mapGraphics, zoneName, center);
      // Append text stencils
      app.stage.addChild(textNode);
    });

    app.stage.addChildAt(mapGraphics, 0);

    // 3. Main Game Loop (Ticker)
    const tick = (delta: number) => {
      const time = Date.now() / 1000;

      Object.keys(agentsMap.current).forEach(slug => {
        const container = agentsMap.current[slug];
        const data = agentsData.current[slug];
        if (!data || !container) return;

        // Force Matias to always be on top (highest z-index)
        container.zIndex = slug === 'matias' ? 100 : 50;

        // LERP: Smooth movement towards target
        const dx = data.targetX - container.x;
        const dy = data.targetY - container.y;
        container.x += dx * 0.08 * delta;
        container.y += dy * 0.08 * delta;

        // Visual Updates
        const gfx = container.getChildByName('shape') as PIXI.Graphics;
        const tooltip = container.getChildByName('tooltip') as PIXI.Text;
        
        gfx.clear();
        const baseColor = AGENT_COLORS[data.role] || 0xffffff;
        const isWorking = data.state === 'working';
        const isBlocked = data.state === 'blocked' || data.state === 'awaiting_human';
        const isIdle = data.state === 'idle';

        // Base opacity and breathing scale
        gfx.alpha = isIdle ? 0.8 : 1.0;
        const baseScale = 0.85; // Smaller, intimate scale!
        const breathScale = isIdle ? baseScale + (Math.sin(time * 2) * 0.03) : baseScale;
        gfx.scale.set(breathScale);

        // Calculate Target Line to Matias local coords
        const md = ZONE_COORDINATES.founders_desk;
        const localMatiasX = md.x - container.x;
        const localMatiasY = md.y - container.y;

        // Draw the rich avatar using the helper
        drawAgentAvatar(gfx, data.role, data.state, baseColor, time, localMatiasX, localMatiasY);

        // Update Tooltip Visibility
        if (data.taskTitle && (isWorking || isBlocked)) {
          tooltip.text = data.taskTitle;
          tooltip.visible = true;
          // color tooltip red if blocked
          tooltip.style.fill = data.state === 'blocked' ? 0xff5555 : 0xffa500;
        } else {
          tooltip.visible = false;
        }
      });
    };

    app.ticker.add(tick);

    // Cleanup on unmount
    return () => {
      app.ticker.remove(tick);
      app.destroy(true, { children: true });
      appRef.current = null;
      agentsMap.current = {};
      agentsData.current = {};
    };
  }, []);

  // 4. Sync React State to Logical Targets (runs on state change)
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;

    // Helper to setup/update agent logical target
    const syncAgentLogic = (
      slug: string, role: string, agentState: string, zone: string | null, taskTitle: string | null
    ) => {
      let container = agentsMap.current[slug];
      
      if (!container) {
        // Initial Mount setup
        container = new PIXI.Container();
        const gfx = new PIXI.Graphics();
        gfx.name = 'shape';
        
        const label = new PIXI.Text(slug.toUpperCase(), new PIXI.TextStyle({
          fill: 0xffffff, 
          fontSize: 12, 
          fontFamily: 'monospace', 
          fontWeight: 'bold',
          dropShadow: true,
          dropShadowColor: '#000000',
          dropShadowBlur: 2,
          dropShadowDistance: 1,
          dropShadowAlpha: 0.8
        }));
        label.anchor.set(0.5);
        label.position.set(0, -32);
        label.zIndex = 10;
        
        const tooltip = new PIXI.Text('', new PIXI.TextStyle({
          fill: 0xffa500, 
          fontSize: 11, 
          fontFamily: 'monospace',
          fontWeight: 'bold',
          dropShadow: true,
          dropShadowColor: '#000000',
          dropShadowBlur: 3,
          dropShadowDistance: 2,
          dropShadowAlpha: 0.9,
          wordWrap: true,
          wordWrapWidth: 150,
          align: 'center'
        }));
        tooltip.name = 'tooltip';
        tooltip.anchor.set(0.5);
        tooltip.position.set(0, 32);
        tooltip.zIndex = 10;

        container.addChild(gfx);
        container.addChild(label);
        container.addChild(tooltip);
        
        // Z-Index sorting enabler
        container.sortableChildren = true;
        app.stage.sortableChildren = true;
        
        app.stage.addChild(container);
        agentsMap.current[slug] = container;
        
        // Spawn at center initially
        container.position.set(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      }

      // Calculate Target Position mathematically
      let targetPos: Point2D = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
      
      if (slug === 'matias') {
        targetPos = getSpacedPosition(ZONE_COORDINATES.founders_desk, slug, false);
      } else if (zone && ZONE_COORDINATES[zone as keyof typeof ZONE_COORDINATES]) {
        const baseCenter = ZONE_COORDINATES[zone as keyof typeof ZONE_COORDINATES];
        targetPos = getSpacedPosition(baseCenter, slug, zone === 'idle_lounge');
      }

      // Update the logical data map so the Ticker morphs it
      agentsData.current[slug] = {
        slug,
        role,
        state: agentState,
        taskTitle,
        targetX: targetPos.x,
        targetY: targetPos.y
      };
    };

    // Sync Matias logically
    const pendingText = state.pendingDecisions > 0 ? `${state.pendingDecisions} DECISION(ES) PENDIENTES` : null;
    syncAgentLogic('matias', 'human', state.pendingDecisions > 0 ? 'awaiting_human' : 'idle', 'founders_desk', pendingText);

    // Sync Agents logically
    state.agents.forEach(a => {
      syncAgentLogic(a.slug, a.role, a.state, a.zone, a.currentTaskTitle);
    });

  }, [state]);

  return (
    <div 
      style={{ 
        width: '100%', height: '100%', 
        borderRadius: '12px', overflow: 'hidden', 
        border: '1px solid var(--border-color)', 
        position: 'relative'
      }}
    >
      <div 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', display: 'flex' }}
      >
        <style dangerouslySetInnerHTML={{__html: `canvas { width: 100% !important; height: 100% !important; object-fit: contain; }`}} />
      </div>
    </div>
  );
}
