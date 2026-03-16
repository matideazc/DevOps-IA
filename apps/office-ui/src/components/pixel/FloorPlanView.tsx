import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import type { OfficeStateSnapshot } from '../../hooks/useOfficeState';
import { CANVAS_WIDTH, CANVAS_HEIGHT, ZONE_COORDINATES } from '../../lib/layoutMap';
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
  // Dictionary to keep track of active sprites
  const agentsMap = useRef<Record<string, PIXI.Container>>({});

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

    // Cleanup on unmount
    return () => {
      app.destroy(true, { children: true });
      appRef.current = null;
      agentsMap.current = {};
    };
  }, []);

  // 3. Sync React State to PixiJS Graph (runs on state change)
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;

    // Helper to get or create an agent container
    const syncAgent = (
      slug: string, role: string, agentState: string, zone: string | null, taskTitle: string | null
    ) => {
      let container = agentsMap.current[slug];
      
      if (!container) {
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
      }

      // Calculate Target Position
      let targetPos: Point2D = { x: 100, y: 100 };
      if (slug === 'matias') {
        targetPos = ZONE_COORDINATES.founders_desk;
      } else if (zone && ZONE_COORDINATES[zone as keyof typeof ZONE_COORDINATES]) {
        targetPos = ZONE_COORDINATES[zone as keyof typeof ZONE_COORDINATES];
        if (zone === 'idle_lounge') {
          targetPos = { x: targetPos.x - 50 + (slug.length * 10), y: targetPos.y };
        }
      }
      container.position.set(targetPos.x, targetPos.y);

      // Draw Graphics based on state
      const gfx = container.getChildByName('shape') as PIXI.Graphics;
      const baseColor = AGENT_COLORS[role] || 0xffffff;
      const isWorking = agentState === 'working';
      
      gfx.clear();
      gfx.beginFill(baseColor);
      gfx.drawCircle(0, 0, 15);
      gfx.endFill();

      if (isWorking) {
        gfx.beginFill(baseColor, 0.4);
        gfx.drawCircle(0, 0, 22);
        gfx.endFill();
        gfx.beginFill(0xffffff);
        gfx.drawCircle(10, -10, 4);
        gfx.endFill();
      }

      // Update Tooltip
      const tooltip = container.getChildByName('tooltip') as PIXI.Text;
      if (isWorking && taskTitle) {
        tooltip.text = taskTitle;
        tooltip.visible = true;
      } else {
        tooltip.visible = false;
      }
    };

    // Render Matias
    const pendingText = state.pendingDecisions > 0 ? `${state.pendingDecisions} DECISION PENDIENTE` : null;
    syncAgent('matias', 'human', state.pendingDecisions > 0 ? 'working' : 'idle', 'founders_desk', pendingText);

    // Render Agents
    state.agents.forEach(a => {
      syncAgent(a.slug, a.role, a.state, a.zone, a.currentTaskTitle);
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
