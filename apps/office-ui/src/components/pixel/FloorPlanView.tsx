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

// HELPER: Avatar Drawing HQ
function drawAgentAvatar(
  gfx: PIXI.Graphics, role: string, state: string, baseColor: number, time: number, 
  localMatiasX: number, localMatiasY: number
) {
  const isWorking = state === 'working';
  const isBlocked = state === 'blocked' || state === 'awaiting_human';
  
  // 0. Base Avatar Ambient Shadow (Grounds the Meeple)
  gfx.beginFill(0x000000, 0.35);
  gfx.drawEllipse(0, 10, 14, 5); // Hard shadow directly below body
  gfx.endFill();

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

  // 2. Draw Body (Meeple / Chibi Pixel Art style)
  gfx.lineStyle(2, 0x111116, 1);

  // Tiny Shoes/Legs
  gfx.lineStyle(1, 0x111116, 1);
  gfx.beginFill(0x111116);
  gfx.drawRect(-6, 10, 4, 4); // left shoe
  gfx.drawRect(2, 10, 4, 4);  // right shoe
  gfx.endFill();

  // Torso / Shirt
  gfx.lineStyle(2, 0x111116, 1);
  gfx.beginFill(baseColor);
  gfx.drawRoundedRect(-12, -4, 24, 16, 4);
  gfx.endFill();

  // Draw Specific Heads & Hair based on role
  switch (role) {
    case 'human': // Founder Matías
      // Boss Suit Jacket overlay
      gfx.beginFill(0x1f2937); // Dark gray blazer
      gfx.drawRect(-12, -4, 8, 16);
      gfx.drawRect(4, -4, 8, 16);
      gfx.endFill();
      
      // Head
      gfx.beginFill(0xfacc15); // Yellow avatar
      gfx.drawCircle(0, -14, 12);
      gfx.endFill();
      // Boss Sunglasses
      gfx.beginFill(0x111116);
      gfx.drawRoundedRect(-10, -18, 20, 6, 2);
      gfx.endFill();
      break;

    case 'researcher': // Nora
      gfx.beginFill(0xffe0bd); // Skin
      gfx.drawCircle(0, -12, 11);
      gfx.endFill();
      // Purple Bob Hair
      gfx.beginFill(0x9333ea);
      gfx.arc(0, -14, 12, Math.PI, 0); // top dome
      gfx.drawPolygon([-12, -14, -15, -2, -6, -4]); // bangs L
      gfx.drawPolygon([12, -14, 15, -2, 6, -4]); // bangs R
      gfx.endFill();
      // Specs
      gfx.beginFill(0xffffff, 0.5);
      gfx.drawCircle(-4, -12, 4);
      gfx.drawCircle(4, -12, 4);
      gfx.endFill();
      break;

    case 'analyst': // Bruno
      // Hoodie strings
      gfx.lineStyle(1, 0x111116, 1);
      gfx.beginFill(0xffffff);
      gfx.drawRect(-4, -4, 2, 6);
      gfx.drawRect(2, -4, 2, 6);
      gfx.endFill();
      
      gfx.lineStyle(2, 0x111116, 1);
      gfx.beginFill(0xffcc99);
      gfx.drawCircle(0, -12, 10);
      gfx.endFill();
      // Headset
      gfx.beginFill(0x3b82f6);
      gfx.drawRect(-11, -15, 3, 6);
      gfx.drawRect(8, -15, 3, 6);
      gfx.endFill();
      break;

    case 'creative_director': // Bianca
      // Scarf
      gfx.beginFill(0xbe123c);
      gfx.drawRect(-8, -4, 16, 6);
      gfx.endFill();

      gfx.beginFill(0xfac090);
      gfx.drawCircle(0, -12, 10);
      gfx.endFill();
      // Flowing Hair
      gfx.beginFill(0xdb2777); // Pinkish red
      gfx.drawEllipse(0, -18, 12, 6);
      gfx.drawPolygon([-12, -18, -16, 0, -8, -4]); 
      gfx.endFill();
      break;

    case 'supervisor': // Alfred
      // White shirt V
      gfx.beginFill(0xffffff);
      gfx.drawPolygon([-4, -4, 4, -4, 0, 2]);
      gfx.endFill();
      // Tie
      gfx.lineStyle(1, 0x111116, 1);
      gfx.beginFill(0xef4444);
      gfx.drawRect(-1, -2, 2, 10);
      gfx.endFill();

      gfx.lineStyle(2, 0x111116, 1);
      gfx.beginFill(0xe2b999);
      gfx.drawCircle(0, -12, 10);
      gfx.endFill();
      // Stache
      gfx.beginFill(0x111116);
      gfx.drawRect(-5, -9, 10, 2);
      gfx.endFill();
      break;
    
    default:
      gfx.beginFill(0xffcccc);
      gfx.drawCircle(0, -12, 10);
      gfx.endFill();
      break;
  }
  gfx.endFill();
}

// Sub-Helpers for Pixel Props HQ
function drawShadowBox(gfx: PIXI.Graphics, x: number, y: number, w: number, h: number) {
  // Drop shadow universal prop
  gfx.beginFill(0x000000, 0.25);
  gfx.drawRect(x + 4, y + 4, w, h);
  gfx.endFill();
}

function drawLaptop(gfx: PIXI.Graphics, x: number, y: number) {
  drawShadowBox(gfx, x, y, 20, 15);
  // Base
  gfx.lineStyle(2, 0x111111, 1);
  gfx.beginFill(0x9ca3af); // Silver
  gfx.drawRect(x, y, 20, 15);
  gfx.endFill();
  // Screen
  gfx.lineStyle(0);
  gfx.beginFill(0x1a202c);
  gfx.drawRect(x + 2, y + 2, 16, 8);
  gfx.endFill();
  // Screen glare
  gfx.beginFill(0xffffff, 0.1);
  gfx.drawPolygon([x + 2, y + 2, x + 8, y + 2, x + 2, y + 8]);
  gfx.endFill();
  // Keyboard line
  gfx.beginFill(0x4b5563);
  gfx.drawRect(x + 3, y + 12, 14, 2);
  gfx.endFill();
}

function drawMug(gfx: PIXI.Graphics, x: number, y: number) {
  // Shadow
  gfx.beginFill(0x000000, 0.2);
  gfx.drawEllipse(x + 2, y + 2, 5, 2);
  gfx.endFill();
  // Cup
  gfx.lineStyle(1, 0x111111, 1);
  gfx.beginFill(0xffffff);
  gfx.drawRect(x - 4, y - 4, 8, 8);
  gfx.endFill();
  // Coffee inside
  gfx.lineStyle(0);
  gfx.beginFill(0x3e2723); // dark coffee
  gfx.drawRect(x - 2, y - 3, 4, 3);
  gfx.endFill();
}

function drawPlant(gfx: PIXI.Graphics, x: number, y: number) {
  // Shadow
  gfx.beginFill(0x000000, 0.25);
  gfx.drawEllipse(x + 3, y + 8, 12, 5);
  gfx.endFill();
  // Pot
  gfx.lineStyle(2, 0x111111, 1);
  gfx.beginFill(0xa0522d); // Sienna
  gfx.drawPolygon([x - 8, y - 5, x + 8, y - 5, x + 6, y + 8, x - 6, y + 8]);
  gfx.endFill();
  // Leaves HQ (Asymmetric)
  gfx.beginFill(0x2d6a4f);
  gfx.drawCircle(x - 5, y - 12, 7);
  gfx.drawCircle(x + 6, y - 10, 6);
  gfx.beginFill(0x40916c);
  gfx.drawCircle(x, y - 18, 8);
  gfx.drawCircle(x - 8, y - 6, 5);
  gfx.endFill();
}

function drawFilingCabinet(gfx: PIXI.Graphics, x: number, y: number) {
  drawShadowBox(gfx, x, y, 25, 40);
  gfx.lineStyle(2, 0x111111, 1);
  gfx.beginFill(0x64748b); // Slate
  gfx.drawRect(x, y, 25, 40);
  gfx.endFill();
  // Drawers
  gfx.lineStyle(1, 0x475569, 1);
  gfx.moveTo(x, y + 13); gfx.lineTo(x + 25, y + 13);
  gfx.moveTo(x, y + 26); gfx.lineTo(x + 25, y + 26);
  // Handles
  gfx.lineStyle(0);
  gfx.beginFill(0xcbd5e1);
  gfx.drawRect(x + 8, y + 4, 9, 3);
  gfx.drawRect(x + 8, y + 17, 9, 3);
  gfx.drawRect(x + 8, y + 30, 9, 3);
  gfx.endFill();
}

function drawChair(gfx: PIXI.Graphics, x: number, y: number, color: number) {
  // Base shadow
  gfx.beginFill(0x000000, 0.3);
  gfx.drawEllipse(x, y + 14, 12, 4);
  gfx.endFill();
  // Star base / Wheels
  gfx.lineStyle(2, 0x111111, 1);
  gfx.beginFill(0x1f2937);
  gfx.drawRect(x - 2, y + 6, 4, 8); // piston
  gfx.drawRect(x - 10, y + 12, 20, 3); // wheels
  gfx.endFill();
  // Seat
  gfx.beginFill(color);
  gfx.drawRoundedRect(x - 10, y, 20, 8, 2);
  gfx.endFill();
  // Backrest
  gfx.beginFill(color);
  gfx.drawRoundedRect(x - 9, y - 12, 18, 14, 4);
  gfx.endFill();
  // Detail
  gfx.lineStyle(0);
  gfx.beginFill(0xffffff, 0.1);
  gfx.drawRect(x - 6, y - 10, 12, 4);
  gfx.endFill();
}

function drawBookshelf(gfx: PIXI.Graphics, x: number, y: number, width: number, height: number) {
  drawShadowBox(gfx, x, y, width, height);
  gfx.lineStyle(2, 0x111111, 1);
  gfx.beginFill(0x5c3a21); // Darker wood frame
  gfx.drawRect(x, y, width, height);
  gfx.endFill();
  gfx.beginFill(0x8b5a2b); // Inner wood
  gfx.drawRect(x + 2, y + 2, width - 4, height - 4);
  gfx.endFill();
  // Shelves
  gfx.lineStyle(2, 0x3d2616, 1);
  gfx.moveTo(x + 2, y + height / 2);
  gfx.lineTo(x + width - 2, y + height / 2);
  // Books (Rects clustering)
  gfx.lineStyle(1, 0x111111, 1);
  gfx.beginFill(0xef4444); gfx.drawRect(x + 5, y + 5, 8, 14); // Red book
  gfx.beginFill(0x3b82f6); gfx.drawRect(x + 13, y + 7, 7, 12); // Blue book
  gfx.beginFill(0x10b981); gfx.drawRect(x + 22, y + 4, 6, 15); // Green book
  
  gfx.beginFill(0xeab308); gfx.drawRect(x + width - 15, y + height / 2 + 5, 10, 12); 
  gfx.beginFill(0x8b5cf6); gfx.drawRect(x + width - 25, y + height / 2 + 3, 8, 14); 
  gfx.endFill();
}

// Procedural Floors & Walls

function drawCheckerboardBase(gfx: PIXI.Graphics, rx: number, ry: number, rw: number, rh: number, c1: number, c2: number, size: number) {
  gfx.lineStyle(0);
  for (let y = 0; y < rh; y += size) {
    for (let x = 0; x < rw; x += size) {
      if (x + size > rw || y + size > rh) continue; // Keep clear bounds natively
      const isAlt = ((x / size) + (y / size)) % 2 !== 0;
      gfx.beginFill(isAlt ? c2 : c1);
      gfx.drawRect(rx + x, ry + y, Math.min(size, rw - x), Math.min(size, rh - y));
      gfx.endFill();
    }
  }
}

function drawWoodPlanks(gfx: PIXI.Graphics, rx: number, ry: number, rw: number, rh: number, baseColor: number) {
  // Base
  gfx.lineStyle(0);
  gfx.beginFill(baseColor);
  gfx.drawRect(rx, ry, rw, rh);
  gfx.endFill();
  
  gfx.lineStyle(1, 0x000000, 0.35); // Wood seams
  const pW = 16;
  const pH = 40;
  for (let x = 0; x < rw; x += pW) {
    gfx.moveTo(rx + x, ry);
    gfx.lineTo(rx + x, ry + rh);
    const stagger = (x / pW) % 2 === 0 ? 0 : pH / 2;
    for (let y = stagger; y < rh; y += pH) {
      gfx.moveTo(rx + x, ry + y);
      gfx.lineTo(Math.min(rx + x + pW, rx + rw), ry + y);
    }
  }
}

function drawIsometricWalls(gfx: PIXI.Graphics, rx: number, ry: number, rw: number, rh: number, wallColor: number, topColor: number) {
  // Left wall top
  gfx.lineStyle(3, 0x111111, 1);
  gfx.beginFill(topColor);
  gfx.drawPolygon([rx - 12, ry - 12, rx, ry, rx, ry + rh, rx - 12, ry + rh - 12]);
  gfx.endFill();
  
  // Top wall top
  gfx.beginFill(topColor);
  gfx.drawPolygon([rx - 12, ry - 12, rx + rw - 12, ry - 12, rx + rw, ry, rx, ry]);
  gfx.endFill();

  // Face wall (only for left wall, to give height illusion)
  gfx.lineStyle(2, 0x000000, 0.4);
  gfx.beginFill(wallColor);
  gfx.drawRect(rx - 12, ry - 12, 12, rh + 12);
  gfx.endFill();
}

function drawUnifiedBuilding(gfx: PIXI.Graphics) {
  const B_X = 100;
  const B_Y = 100;
  const B_W = 1000;
  const B_H = 600;

  // 1. Scene Shadowing (Global Outline Shadow attached to the floor)
  gfx.lineStyle(0);
  gfx.beginFill(0x000000, 0.4);
  gfx.drawRect(B_X + 16, B_Y + 16, B_W, B_H);
  gfx.endFill();

  // 2. Base Floor Geometry
  gfx.lineStyle(4, 0x111111, 1);
  gfx.beginFill(0x000000);
  gfx.drawRect(B_X, B_Y, B_W, B_H);
  gfx.endFill();

  // 3. Draw Room Floors
  // Top Layer
  drawWoodPlanks(gfx, 100, 100, 300, 250, 0xc18f59); // Creative
  drawWoodPlanks(gfx, 400, 100, 400, 250, 0x4a2c11); // Founder
  drawCheckerboardBase(gfx, 800, 100, 300, 250, 0xdfe2e6, 0xcbd5e1, 16); // Research
  
  // Middle Layer (Hallway)
  drawWoodPlanks(gfx, 100, 350, 1000, 100, 0x8b5a2b);
  
  // Bottom Layer
  drawCheckerboardBase(gfx, 100, 450, 300, 250, 0xf8fafc, 0x94a3b8, 20); // Lounge
  drawCheckerboardBase(gfx, 400, 450, 400, 250, 0x374151, 0x1f2937, 24); // Command
  drawCheckerboardBase(gfx, 800, 450, 300, 250, 0xdfe2e6, 0xcbd5e1, 16); // Analysis

  // 4. Draw Walls (Falso 3D Perimetral + Inter-room Division)
  // Outer perimeter Top + Left
  drawIsometricWalls(gfx, 100, 100, 1000, 600, 0x64748b, 0x94a3b8);
  
  // Top inner walls
  drawIsometricWalls(gfx, 400, 100, 10, 250, 0x64748b, 0x94a3b8);
  drawIsometricWalls(gfx, 800, 100, 10, 250, 0x64748b, 0x94a3b8);
  drawIsometricWalls(gfx, 100, 350, 1000, 10, 0x64748b, 0x94a3b8); // Horizontal top hall wall

  // Bottom inner walls
  drawIsometricWalls(gfx, 100, 450, 1000, 10, 0x64748b, 0x94a3b8); // Horizontal bottom hall wall
  drawIsometricWalls(gfx, 400, 450, 10, 250, 0x64748b, 0x94a3b8);
  drawIsometricWalls(gfx, 800, 450, 10, 250, 0x64748b, 0x94a3b8);

  // 5. Draw Doors (Openings in walls mapped over via Floor overlay hacks)
  gfx.lineStyle(0);
  drawWoodPlanks(gfx, 230, 340, 60, 30, 0x8b5a2b); // creative door
  drawWoodPlanks(gfx, 570, 340, 60, 30, 0x8b5a2b); // founder door
  drawWoodPlanks(gfx, 920, 340, 60, 30, 0x8b5a2b); // research door (joins wood hall)
  
  drawWoodPlanks(gfx, 230, 440, 60, 30, 0x8b5a2b); // lounge door
  drawWoodPlanks(gfx, 570, 440, 60, 30, 0x8b5a2b); // command door
  drawWoodPlanks(gfx, 920, 440, 60, 30, 0x8b5a2b); // analysis door
  
  // Perimeter border again to make bounds super crisp and cover bleeds
  gfx.lineStyle(4, 0x111111, 1);
  gfx.beginFill(0x000000, 0); // Transparent fill
  gfx.drawRect(100, 100, 1000, 600);
  gfx.endFill();
}

// HELPER: Environment Props & Furniture 
function drawZoneProps(mapGraphics: PIXI.Graphics, zoneName: string, center: Point2D) {
  const isFounder = zoneName === 'founders_desk';
  const isLounge = zoneName === 'idle_lounge';
  
  // Logical Room Bounds for exact prop placement
  let rx, ry, rw, rh;
  if (zoneName === 'creative_studio' || zoneName === 'idle_lounge') {
    rx = 100; rw = 300;
  } else if (zoneName === 'founders_desk' || zoneName === 'command_center') {
    rx = 400; rw = 400;
  } else {
    rx = 800; rw = 300;
  }
  ry = (zoneName === 'idle_lounge' || zoneName === 'command_center' || zoneName === 'analysis_room') ? 450 : 100;
  rh = 250;

  // 4. Props High Fidelity placement
  if (zoneName === 'research_lab') {
    drawBookshelf(mapGraphics, rx + 20, ry + 10, 80, 40);
    drawFilingCabinet(mapGraphics, rx + 110, ry + 10);
    drawPlant(mapGraphics, rx + 230, ry + 30);

    // Desks
    drawShadowBox(mapGraphics, center.x - 70, center.y - 10, 140, 40);
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0xb45309); // Amber wood desk
    mapGraphics.drawRect(center.x - 70, center.y - 10, 140, 40);
    mapGraphics.endFill();
    
    // Desks props
    drawLaptop(mapGraphics, center.x - 40, center.y - 5);
    drawChair(mapGraphics, center.x - 30, center.y + 40, 0x6366f1); // Indigo chair 1
    
    drawLaptop(mapGraphics, center.x + 20, center.y - 5);
    drawChair(mapGraphics, center.x + 30, center.y + 40, 0x6366f1); // Indigo chair 2
    
    drawMug(mapGraphics, center.x - 10, center.y);

  } else if (zoneName === 'analysis_room') {
    // 2x2 Desk layout
    const deskColor = 0xc2410c; // Orange-red wood
    const dims = [
      {cx: center.x - 60, cy: center.y - 50},
      {cx: center.x + 60, cy: center.y - 50},
      {cx: center.x - 60, cy: center.y + 50},
      {cx: center.x + 60, cy: center.y + 50}
    ];

    dims.forEach(d => {
      drawShadowBox(mapGraphics, d.cx - 30, d.cy - 15, 60, 30);
      mapGraphics.lineStyle(2, 0x111111);
      mapGraphics.beginFill(deskColor);
      mapGraphics.drawRect(d.cx - 30, d.cy - 15, 60, 30);
      mapGraphics.endFill();
      drawLaptop(mapGraphics, d.cx - 15, d.cy - 10);
      drawChair(mapGraphics, d.cx, d.cy + 25, 0x3b82f6); // Blue chairs
    });

    drawPlant(mapGraphics, rx + 30, ry + 30);
    drawFilingCabinet(mapGraphics, rx + rw - 35, ry + 10);

  } else if (zoneName === 'creative_studio') {
    // Sofa lounge area (Couches in L)
    drawShadowBox(mapGraphics, center.x - 80, center.y - 50, 40, 90);
    drawShadowBox(mapGraphics, center.x + 40, center.y - 50, 40, 90);
    
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0xec4899); // Pinkish sofas
    mapGraphics.drawRoundedRect(center.x - 80, center.y - 50, 40, 90, 8); // Left
    mapGraphics.drawRoundedRect(center.x + 40, center.y - 50, 40, 90, 8); // Right
    mapGraphics.endFill();

    // Wood Coffee table
    drawShadowBox(mapGraphics, center.x - 25, center.y - 20, 50, 30);
    mapGraphics.beginFill(0xd97706);
    mapGraphics.drawRect(center.x - 25, center.y - 20, 50, 30);
    mapGraphics.endFill();
    drawMug(mapGraphics, center.x, center.y - 5);
    drawMug(mapGraphics, center.x - 10, center.y + 2);

    // Painting / Board on wall
    drawShadowBox(mapGraphics, center.x - 50, ry + 10, 100, 20);
    mapGraphics.beginFill(0xfcd34d);
    mapGraphics.drawRect(center.x - 50, ry + 10, 100, 20); // Pin board
    mapGraphics.endFill();
    
    drawPlant(mapGraphics, rx + 30, ry + rh - 30);
    drawPlant(mapGraphics, rx + rw - 30, ry + rh - 30);

  } else if (isFounder) {
    // Soft under-rug
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0xbe123c); // Rich red rug
    mapGraphics.drawRoundedRect(center.x - 80, center.y - 70, 160, 160, 12);
    mapGraphics.endFill();

    // Luxury Desk U-Shape
    drawShadowBox(mapGraphics, center.x - 60, center.y - 30, 120, 30);
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0x1a0f0a); // Espresso wood
    mapGraphics.drawRect(center.x - 60, center.y - 30, 120, 30); // Top
    mapGraphics.drawRect(center.x - 60, center.y, 25, 40);  // Left wing
    mapGraphics.drawRect(center.x + 35, center.y, 25, 40);  // Right wing
    mapGraphics.endFill();

    drawLaptop(mapGraphics, center.x - 10, center.y - 20);
    drawMug(mapGraphics, center.x + 30, center.y - 20);
    
    // Golden Trophy
    mapGraphics.lineStyle(1, 0x111111);
    mapGraphics.beginFill(0xfbbf24);
    mapGraphics.drawRect(center.x - 45, center.y - 24, 12, 16);
    mapGraphics.endFill();

    // CEO Chair
    drawChair(mapGraphics, center.x, center.y + 10, 0x1f2937); // Leather black chair

    drawPlant(mapGraphics, rx + 40, ry + 40);
    drawPlant(mapGraphics, rx + rw - 40, ry + 40);
    drawBookshelf(mapGraphics, center.x - 50, ry + 10, 100, 30);

  } else if (zoneName === 'command_center') {
    // Giant tactical screen
    drawShadowBox(mapGraphics, center.x - 90, ry + 10, 180, 30);
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0x111827);
    mapGraphics.drawRect(center.x - 90, ry + 10, 180, 30);
    mapGraphics.endFill();
    mapGraphics.lineStyle(0);
    mapGraphics.beginFill(0x10b981); // Green data line
    mapGraphics.drawRect(center.x - 80, ry + 20, 60, 5);
    mapGraphics.beginFill(0xef4444);
    mapGraphics.drawRect(center.x + 10, ry + 25, 40, 5);
    mapGraphics.endFill();

    // Central wide desk
    drawShadowBox(mapGraphics, center.x - 90, center.y - 20, 180, 40);
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0x4b5563); // Gray metal desk
    mapGraphics.drawRect(center.x - 90, center.y - 20, 180, 40);
    mapGraphics.endFill();

    drawLaptop(mapGraphics, center.x - 70, center.y - 10);
    drawChair(mapGraphics, center.x - 60, center.y + 35, 0xef4444); // Red commander chair
    
    drawLaptop(mapGraphics, center.x + 50, center.y - 10);
    drawChair(mapGraphics, center.x + 60, center.y + 35, 0x10b981); // Green op chair

  } else if (isLounge) {
    // Breakroom
    // Vending Machine
    drawShadowBox(mapGraphics, rx + 20, ry + 10, 35, 50);
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0xef4444);
    mapGraphics.drawRect(rx + 20, ry + 10, 35, 50);
    mapGraphics.endFill();
    mapGraphics.beginFill(0xbfdbfe); // Glass
    mapGraphics.drawRect(rx + 25, ry + 15, 25, 30);
    mapGraphics.endFill();

    // Water cooler
    drawShadowBox(mapGraphics, rx + 70, ry + 30, 20, 30);
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0xf3f4f6);
    mapGraphics.drawRect(rx + 70, ry + 30, 20, 30);
    mapGraphics.beginFill(0x3bd5fa); // Jug
    mapGraphics.drawCircle(rx + 80, ry + 20, 9);
    mapGraphics.endFill();

    // Cafeteria Long tables
    drawShadowBox(mapGraphics, center.x - 40, center.y - 20, 80, 25);
    drawShadowBox(mapGraphics, center.x - 40, center.y + 40, 80, 25);
    
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0xd97706);
    mapGraphics.drawRect(center.x - 40, center.y - 20, 80, 25);
    mapGraphics.drawRect(center.x - 40, center.y + 40, 80, 25);
    mapGraphics.endFill();

    drawMug(mapGraphics, center.x - 20, center.y - 10);
    drawChair(mapGraphics, center.x, center.y - 35, 0xeab308); // Yellow dining chairs
    drawChair(mapGraphics, center.x, center.y + 25, 0xeab308);

    // Box stacks (Delivery)
    drawShadowBox(mapGraphics, rx + rw - 50, ry + rh - 40, 30, 30);
    mapGraphics.lineStyle(2, 0x111111);
    mapGraphics.beginFill(0xbe581e);
    mapGraphics.drawRect(rx + rw - 40, ry + rh - 40, 20, 20); // bottom box
    mapGraphics.drawRect(rx + rw - 35, ry + rh - 55, 20, 20); // top right
    mapGraphics.drawRect(rx + rw - 60, ry + rh - 30, 20, 20); // bottom left
    mapGraphics.endFill();
  }

  // Zone Label Text 
  const text = new PIXI.Text(zoneName.replace('_', ' ').toUpperCase(), new PIXI.TextStyle({
    fill: 0xffffff,
    fontSize: 14,
    fontFamily: 'monospace',
    letterSpacing: 2,
    align: 'center'
  }));
  text.alpha = 0.12; 
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
    
    // Draw Unified Building Floor and Walls
    drawUnifiedBuilding(mapGraphics);

    // Draw Props inside zones
    Object.entries(ZONE_COORDINATES).forEach(([zoneName, center]) => {
      if (zoneName === 'founders_office') return; // internal duplicate fix
      const textNode = drawZoneProps(mapGraphics, zoneName, center);
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

        // Base opacity and breathing scale HQ
        gfx.alpha = isIdle ? 0.85 : 1.0;
        const baseScale = 0.72; // Reduced scale for intimacy and harmony with HQ props
        const breathScale = isIdle ? baseScale + (Math.sin(time * 2) * 0.02) : baseScale;
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
