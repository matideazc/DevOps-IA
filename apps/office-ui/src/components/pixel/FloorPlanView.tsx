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

    // 2. Draw Static Map Background
    const mapGraphics = new PIXI.Graphics();
    
    // Draw Zones
    Object.entries(ZONE_COORDINATES).forEach(([zoneName, center]) => {
      const isFounder = zoneName === 'founders_desk';
      const color = isFounder ? 0x2a1b1b : (zoneName === 'idle_lounge' ? 0x0f0f12 : 0x1e1e24);
      
      mapGraphics.beginFill(color);
      mapGraphics.lineStyle(1, 0x333333, 1);
      mapGraphics.drawRect(center.x - 150, center.y - 125, 300, 250);
      mapGraphics.endFill();

      // Small desk
      mapGraphics.beginFill(0x444444);
      mapGraphics.lineStyle(0);
      mapGraphics.drawRect(center.x - 30, center.y - 15, 60, 30);
      mapGraphics.endFill();

      // Zone Label Text
      const text = new PIXI.Text(zoneName.replace('_', ' ').toUpperCase(), new PIXI.TextStyle({
        fill: 0x444444,
        fontSize: 14,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        letterSpacing: 2
      }));
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

        // Base opacity
        gfx.alpha = data.state === 'idle' ? 0.6 : 1.0;

        // Draw Aura
        if (isWorking) {
          const scale = 1 + Math.sin(time * 4) * 0.15; // Pulsing effect
          gfx.beginFill(baseColor, 0.3);
          gfx.drawCircle(0, 0, 24 * scale);
          gfx.endFill();
          
          // Activity indicator dot
          gfx.beginFill(0xffffff);
          gfx.drawCircle(10, -10, 4);
          gfx.endFill();
        } else if (isBlocked) {
          const pulse = (Math.sin(time * 8) + 1) / 2; // Fast pulse 0 to 1
          gfx.beginFill(0xff3333, 0.5 * pulse);
          gfx.drawCircle(0, 0, 26);
          gfx.endFill();
        }

        // Draw Base Shape per Role
        gfx.beginFill(baseColor);
        switch (data.role) {
          case 'researcher':
            gfx.drawRect(-12, -12, 24, 24); // Square
            break;
          case 'analyst':
            gfx.drawPolygon([-15, 12, 15, 12, 0, -15]); // Triangle
            break;
          case 'supervisor':
            gfx.drawPolygon([0, -15, 12, 0, 0, 15, -12, 0]); // Diamond
            break;
          case 'human':
            gfx.lineStyle(2, 0xffffff, 0.8);
            gfx.drawCircle(0, 0, 16); // Larger hollow circle for Matías
            gfx.lineStyle(0);
            gfx.drawCircle(0, 0, 15);
            break;
          case 'creative_director':
          default:
            gfx.drawCircle(0, 0, 14); // Circle
            break;
        }
        gfx.endFill();

        // Update Tooltip Visibility
        if (data.taskTitle && (isWorking || isBlocked)) {
          tooltip.text = data.taskTitle;
          tooltip.visible = true;
          // color tooltip red if blocked
          tooltip.style.fill = isBlocked ? 0xff5555 : 0xffa500;
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
          fill: 0xffffff, fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold'
        }));
        label.anchor.set(0.5);
        label.position.set(0, -25);
        
        const tooltip = new PIXI.Text('', new PIXI.TextStyle({
          fill: 0xffa500, fontSize: 10, fontFamily: 'monospace'
        }));
        tooltip.name = 'tooltip';
        tooltip.anchor.set(0.5);
        tooltip.position.set(0, 25);

        container.addChild(gfx);
        container.addChild(label);
        container.addChild(tooltip);
        
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
