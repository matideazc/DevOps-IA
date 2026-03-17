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

    // 2. Draw Static Map Background (Decorated)
    const mapGraphics = new PIXI.Graphics();
    
    // Draw Zones
    Object.entries(ZONE_COORDINATES).forEach(([zoneName, center]) => {
      const isFounder = zoneName === 'founders_desk';
      const isLounge = zoneName === 'idle_lounge';
      const baseFloorColor = isFounder ? 0x1f1919 : (isLounge ? 0x0f0f12 : 0x1e1e24);
      const strokeColor = isFounder ? 0x4a3b3b : 0x2d2d38;
      
      // Floor Plate
      mapGraphics.beginFill(baseFloorColor);
      mapGraphics.lineStyle(2, strokeColor, 1);
      // Founder has an octagonal or larger feel, but we stick to rect for collisions. Make it slightly thicker.
      mapGraphics.drawRect(center.x - 150, center.y - 125, 300, 250);
      mapGraphics.endFill();

      // Inner decorators (Sci-Fi Office Vibe)
      mapGraphics.lineStyle(0);
      if (zoneName === 'research_lab' || zoneName === 'analysis_room') {
        // Draw server racks / data banks
        mapGraphics.beginFill(0x282835);
        mapGraphics.drawRect(center.x - 130, center.y - 110, 40, 15);
        mapGraphics.drawRect(center.x - 80, center.y - 110, 40, 15);
        mapGraphics.drawRect(center.x - 30, center.y - 110, 40, 15);
        mapGraphics.endFill();
        // Console desk
        mapGraphics.beginFill(0x353545);
        mapGraphics.drawRect(center.x - 40, center.y - 20, 80, 40);
        mapGraphics.endFill();
      } else if (zoneName === 'creative_studio') {
        // Large canvas / whiteboard
        mapGraphics.beginFill(0x282835);
        mapGraphics.drawRect(center.x - 140, center.y - 100, 15, 200);
        mapGraphics.endFill();
        mapGraphics.beginFill(0x884488, 0.2); // subtle pink glow
        mapGraphics.drawRect(center.x - 130, center.y - 90, 10, 180);
        mapGraphics.endFill();
        // Central island
        mapGraphics.beginFill(0x353545);
        mapGraphics.drawCircle(center.x, center.y, 35);
        mapGraphics.endFill();
      } else if (isFounder) {
        // Executive Desk (U-Shape)
        mapGraphics.beginFill(0x403030);
        mapGraphics.drawRect(center.x - 60, center.y - 30, 120, 20); // Top
        mapGraphics.drawRect(center.x - 60, center.y - 10, 20, 40);  // Left wing
        mapGraphics.drawRect(center.x + 40, center.y - 10, 20, 40);  // Right wing
        mapGraphics.endFill();
        // Subtle glow on floor
        mapGraphics.beginFill(0xffaa00, 0.05);
        mapGraphics.drawCircle(center.x, center.y, 80);
        mapGraphics.endFill();
      } else if (zoneName === 'command_center') {
        // Hexagonal or multi-panel desk
        mapGraphics.beginFill(0x353545);
        mapGraphics.drawPolygon([
          center.x - 40, center.y - 20,
          center.x + 40, center.y - 20,
          center.x + 60, center.y + 10,
          center.x + 40, center.y + 40,
          center.x - 40, center.y + 40,
          center.x - 60, center.y + 10
        ]);
        mapGraphics.endFill();
      } else if (isLounge) {
        // Circular couch / resting area
        mapGraphics.beginFill(0x1a1a20);
        mapGraphics.drawCircle(center.x, center.y, 60);
        mapGraphics.beginFill(0x0f0f12);
        mapGraphics.drawCircle(center.x, center.y, 40);
        mapGraphics.endFill();
      }

      // Zone Label Text (more embedded, like floor stencils)
      const text = new PIXI.Text(zoneName.replace('_', ' ').toUpperCase(), new PIXI.TextStyle({
        fill: 0x555566,
        fontSize: 16,
        fontFamily: 'monospace',
        fontWeight: '900',
        letterSpacing: 4,
        align: 'center'
      }));
      text.alpha = 0.5;
      text.anchor.set(0.5);
      text.position.set(center.x, center.y - 100);
      app.stage.addChild(text);
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
        gfx.alpha = isIdle ? 0.7 : 1.0;
        const baseScale = 1.3; // Make characters larger overall
        const breathScale = isIdle ? baseScale + (Math.sin(time * 2) * 0.05) : baseScale;
        gfx.scale.set(breathScale);

        // Draw Aura
        if (isWorking) {
          const auraScale = 1 + Math.sin(time * 5) * 0.2; // Pulsing effect
          gfx.beginFill(baseColor, 0.25);
          gfx.drawCircle(0, 0, 24 * auraScale);
          gfx.endFill();
          
          // Activity indicator dot circulating
          gfx.beginFill(0xffffff);
          gfx.drawCircle(Math.cos(time * 4) * 16, Math.sin(time * 4) * 16, 3);
          gfx.endFill();
        } else if (isBlocked) {
          const pulse = (Math.sin(time * 10) + 1) / 2; // Fast pulse 0 to 1
          gfx.beginFill(0xff3333, 0.6 * pulse);
          gfx.drawCircle(0, 0, 28);
          gfx.endFill();
          
          if (data.state === 'awaiting_human') {
            // Draw a subtle line towards Matias desk
            const md = ZONE_COORDINATES.founders_desk;
            // Local coordinates for the line since it's drawn inside the container
            const localMatiasX = md.x - container.x;
            const localMatiasY = md.y - container.y;
            gfx.lineStyle(2, 0xffa500, 0.4 * pulse);
            gfx.moveTo(0,0);
            gfx.lineTo(localMatiasX, localMatiasY);
            gfx.lineStyle(0);
          }
        }

        // Draw Base Shape per Role with Strokes for better contrast
        gfx.lineStyle(2, 0x111116, 1); // Dark stroke for readability
        gfx.beginFill(baseColor);
        switch (data.role) {
          case 'researcher':
            gfx.drawRect(-10, -10, 20, 20); // Square
            break;
          case 'analyst':
            gfx.drawPolygon([-12, 10, 12, 10, 0, -12]); // Triangle
            break;
          case 'supervisor':
            gfx.drawPolygon([0, -14, 12, 0, 0, 14, -12, 0]); // Diamond
            break;
          case 'human':
            gfx.lineStyle(3, 0xffaaaa, 0.9); // Highlighted stroke for founder
            gfx.drawCircle(0, 0, 14); // Circle
            gfx.beginFill(0x1a1a20);
            gfx.drawCircle(0, 0, 8); // Hollow center 
            break;
          case 'creative_director':
          default:
            gfx.drawCircle(0, 0, 12); // Circle
            break;
        }
        gfx.endFill();

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
