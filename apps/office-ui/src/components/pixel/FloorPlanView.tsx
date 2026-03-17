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
      gfx.lineStyle(1, 0x111116);
      gfx.drawPolygon([-4, -4, 4, -4, 0, 4]); // Shirt V
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

// HELPER: Environment & Room Decorations
function drawRoomDecor(mapGraphics: PIXI.Graphics, zoneName: string, center: Point2D) {
  const isFounder = zoneName === 'founders_desk';
  const isLounge = zoneName === 'idle_lounge';
  const baseFloorColor = isFounder ? 0x181414 : (isLounge ? 0x0f0f12 : 0x1a1a20);
  const strokeColor = isFounder ? 0x4a3b3b : 0x2d2d38;
  const shadowColor = 0x000000;
  
  // 1. Drop Shadow for the Room (Elevated Platform Effect)
  mapGraphics.beginFill(shadowColor, 0.4);
  mapGraphics.drawRect(center.x - 145, center.y - 120, 300, 250);
  mapGraphics.endFill();

  // 2. Base Floor Plate
  mapGraphics.beginFill(baseFloorColor);
  mapGraphics.lineStyle(2, strokeColor, 1);
  mapGraphics.drawRect(center.x - 150, center.y - 125, 300, 250);
  mapGraphics.endFill();

  // 3. Inner Decorators / Scene Polish per Zone
  mapGraphics.lineStyle(0);
  
  if (zoneName === 'research_lab') {
    // Researcher: L-shaped desk and light-boards
    // Wall light board (cyan-ish)
    mapGraphics.beginFill(0x22d3ee, 0.15);
    mapGraphics.drawRect(center.x - 140, center.y - 115, 120, 10);
    mapGraphics.endFill();
    
    // Server Racks
    mapGraphics.beginFill(0x282835);
    mapGraphics.drawRect(center.x + 80, center.y - 110, 50, 25);
    mapGraphics.drawRect(center.x + 80, center.y - 80, 50, 25);
    mapGraphics.endFill();
    // Blinking lights on racks
    mapGraphics.beginFill(0x00ffcc, 0.6);
    mapGraphics.drawCircle(center.x + 85, center.y - 100, 2);
    mapGraphics.drawCircle(center.x + 85, center.y - 70, 2);
    mapGraphics.endFill();

    // L-Shaped Desk
    mapGraphics.beginFill(0x353545);
    mapGraphics.drawRect(center.x - 60, center.y - 20, 120, 40); // Main
    mapGraphics.drawRect(center.x - 60, center.y + 20, 40, 60);  // Wing
    mapGraphics.endFill();
    // Glowing tablets on desk
    mapGraphics.beginFill(0x9333ea, 0.4);
    mapGraphics.drawRect(center.x - 30, center.y - 10, 20, 15);
    mapGraphics.drawRect(center.x + 10, center.y - 10, 20, 15);
    mapGraphics.endFill();

  } else if (zoneName === 'analysis_room') {
    // Analyst: Dashboards, wide central table, data walls
    // Red/Green Wall metrics
    mapGraphics.beginFill(0x22c55e, 0.2); // Green up
    mapGraphics.drawRect(center.x - 120, center.y - 115, 60, 6);
    mapGraphics.beginFill(0xef4444, 0.2); // Red down
    mapGraphics.drawRect(center.x - 50, center.y - 115, 100, 6);
    mapGraphics.endFill();

    // Central wide console
    mapGraphics.beginFill(0x2a2a35);
    mapGraphics.drawRoundedRect(center.x - 80, center.y - 30, 160, 60, 8);
    mapGraphics.endFill();
    
    // Holographic displays / Monitors on table
    mapGraphics.beginFill(0x3b82f6, 0.3); // Blue glow
    mapGraphics.drawRect(center.x - 50, center.y - 15, 30, 20);
    mapGraphics.drawRect(center.x - 10, center.y - 15, 60, 20);
    mapGraphics.endFill();

  } else if (zoneName === 'creative_studio') {
    // Creative Studio: Warmer tone rug, brainstorming boards, circular table
    // Cozy rug
    mapGraphics.beginFill(0x831843, 0.3); // Deep pinkish rug
    mapGraphics.drawCircle(center.x, center.y, 80);
    mapGraphics.endFill();

    // Moodboard / Post-its wall
    mapGraphics.beginFill(0x2d2d38);
    mapGraphics.drawRect(center.x - 140, center.y - 80, 15, 160);
    mapGraphics.endFill();
    // Post-its
    mapGraphics.beginFill(0xfacc15, 0.8); // Yellow post-it
    mapGraphics.drawRect(center.x - 138, center.y - 60, 8, 8);
    mapGraphics.drawRect(center.x - 138, center.y - 45, 8, 8);
    mapGraphics.beginFill(0xf472b6, 0.8); // Pink post-it
    mapGraphics.drawRect(center.x - 138, center.y - 20, 8, 8);
    mapGraphics.drawRect(center.x - 138, center.y + 10, 8, 8);
    mapGraphics.endFill();

    // Central circular wood-like table
    mapGraphics.beginFill(0x453535);
    mapGraphics.drawCircle(center.x, center.y, 45);
    mapGraphics.endFill();
    // Scatter on table
    mapGraphics.beginFill(0xdddddd, 0.6);
    mapGraphics.drawRect(center.x - 15, center.y - 10, 15, 20); // papers
    mapGraphics.drawCircle(center.x + 20, center.y + 5, 4);     // mug
    mapGraphics.endFill();

  } else if (isFounder) {
    // Founder's Desk: "La Tarima" (The Dais) and majestic desk
    // Inner dais (raised platform)
    mapGraphics.beginFill(0x261d1d);
    mapGraphics.lineStyle(1, 0x5a4b4b, 0.5);
    // Beveled raised floor
    mapGraphics.drawRect(center.x - 120, center.y - 95, 240, 190);
    mapGraphics.lineStyle(0);
    mapGraphics.beginFill(0x2a2020);
    mapGraphics.drawRect(center.x - 110, center.y - 85, 220, 170);
    mapGraphics.endFill();

    // Executive Desk (Thicker U-Shape with rich wood/leather tones)
    mapGraphics.beginFill(0x1a1a1c); // Dark desk shadow
    mapGraphics.drawRect(center.x - 65, center.y - 25, 130, 25);
    mapGraphics.beginFill(0x4a3a3a); // Mahogany tone
    mapGraphics.drawRect(center.x - 70, center.y - 30, 140, 25); // Top
    mapGraphics.drawRect(center.x - 70, center.y - 5, 30, 50);  // Left wing
    mapGraphics.drawRect(center.x + 40, center.y - 5, 30, 50);  // Right wing
    mapGraphics.endFill();

    // Subtle golden glow under the chair area
    mapGraphics.beginFill(0xffaa00, 0.08);
    mapGraphics.drawCircle(center.x, center.y + 40, 60);
    mapGraphics.endFill();

  } else if (zoneName === 'command_center') {
    // Command Center: Hexagonal master console, tactical screens
    // Giant tactical screen on top wall
    mapGraphics.beginFill(0x101018);
    mapGraphics.drawRect(center.x - 100, center.y - 115, 200, 20);
    mapGraphics.beginFill(0x4ade80, 0.15); // Green tactical map glow
    mapGraphics.drawRect(center.x - 95, center.y - 110, 190, 10);
    mapGraphics.endFill();

    // Hexagonal command console
    mapGraphics.beginFill(0x22222a);
    mapGraphics.drawPolygon([
      center.x - 50, center.y - 30,
      center.x + 50, center.y - 30,
      center.x + 80, center.y + 10,
      center.x + 50, center.y + 50,
      center.x - 50, center.y + 50,
      center.x - 80, center.y + 10
    ]);
    mapGraphics.endFill();
    
    // Inner cut of console
    mapGraphics.beginFill(0x1a1a20);
    mapGraphics.drawPolygon([
      center.x - 30, center.y - 10,
      center.x + 30, center.y - 10,
      center.x + 50, center.y + 15,
      center.x + 30, center.y + 30,
      center.x - 30, center.y + 30,
      center.x - 50, center.y + 15
    ]);
    mapGraphics.endFill();

  } else if (isLounge) {
    // Idle Lounge: Large central rug, distinct plants, couch blocks
    // Large dark geometric rug
    mapGraphics.beginFill(0x181822);
    mapGraphics.drawRoundedRect(center.x - 80, center.y - 60, 160, 120, 20);
    mapGraphics.endFill();
    
    // Lounge Couches (L-shape seating)
    mapGraphics.beginFill(0x2a2a35); // modular couch
    mapGraphics.drawRoundedRect(center.x - 40, center.y - 90, 80, 25, 8); // top couch
    mapGraphics.drawRoundedRect(center.x - 90, center.y - 40, 25, 80, 8); // side couch
    mapGraphics.endFill();

    // Circular tables & Plants
    mapGraphics.beginFill(0x112211); // Plant shadow
    mapGraphics.drawCircle(center.x - 120, center.y - 95, 20);
    mapGraphics.drawCircle(center.x + 120, center.y + 95, 20);
    mapGraphics.beginFill(0x228833); // Plant leaves
    mapGraphics.drawCircle(center.x - 120, center.y - 95, 14);
    mapGraphics.drawCircle(center.x + 120, center.y + 95, 14);
    mapGraphics.beginFill(0x44aa44);
    mapGraphics.drawCircle(center.x - 123, center.y - 92, 7);
    mapGraphics.drawCircle(center.x + 117, center.y + 92, 7);
    mapGraphics.endFill();

    // Watercooler / Coffee machine corner
    mapGraphics.beginFill(0x252530);
    mapGraphics.drawRect(center.x + 100, center.y - 110, 35, 25);
    mapGraphics.beginFill(0x3bd5fa, 0.6); // Water jug
    mapGraphics.drawCircle(center.x + 110, center.y - 100, 8);
    mapGraphics.endFill();
  }

  // Zone Label Text (Stencil style, deeper into floor)
  const text = new PIXI.Text(zoneName.replace('_', ' ').toUpperCase(), new PIXI.TextStyle({
    fill: 0x555566,
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '900',
    letterSpacing: 4,
    align: 'center'
  }));
  text.alpha = 0.3; // Made slightly more transparent to not fight with richer decor
  text.anchor.set(0.5);
  // Push text lower in the lounge or founder context
  const textOffsetY = isFounder ? -110 : (isLounge ? -100 : -100);
  text.position.set(center.x, center.y + textOffsetY);
  
  // Return text to add it to stage dynamically, or mapGraphics directly handles drawing, 
  // but PIXI Text is a DisplayObject so it must be added to stage by the caller.
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
      backgroundColor: 0x0a0a0b,
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
    mapGraphics.lineStyle(1, 0xffffff, 0.03); // Very subtle white grid
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
        const baseScale = 1.1; // Reduced slightly compared to 4B since Meeples are bigger naturally
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
