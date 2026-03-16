import { Container, Graphics, Text } from '@pixi/react';
import { useCallback } from 'react';
import * as PIXI from 'pixi.js';
import type { AgentState, OfficeZone } from '@ai-office/shared-types';
import type { Point2D } from '../../lib/layoutMap';
import { ZONE_COORDINATES } from '../../lib/layoutMap';

interface AgentSpriteProps {
  slug: string;
  name: string;
  role: string;
  state: AgentState;
  zone: OfficeZone | null;
  currentTaskTitle: string | null;
}

const AGENT_COLORS: Record<string, number> = {
  researcher: 0xc084fc,      // purple
  analyst: 0x60a5fa,         // blue
  creative_director: 0xf472b6, // pink
  supervisor: 0x4ade80,      // green
  human: 0xfacc15,           // yellow
};

export function AgentSprite({ slug, role, state, zone, currentTaskTitle }: AgentSpriteProps) {
  const isWorking = state === 'working';
  
  // Calculate Target Position
  // If we have a zone, stand near its center. Otherwise default to a corner.
  let targetPos: Point2D = { x: 100, y: 100 };
  
  if (slug === 'matias') {
    targetPos = ZONE_COORDINATES.founders_desk;
  } else if (zone && ZONE_COORDINATES[zone as keyof typeof ZONE_COORDINATES]) {
    targetPos = ZONE_COORDINATES[zone as keyof typeof ZONE_COORDINATES];
    // Slightly offset based on role pseudo-randomly to avoid overlapping exactly in the middle if multiple are in lounge
    if (zone === 'idle_lounge') {
      const offset = slug.length * 10;
      targetPos = { x: targetPos.x - 50 + offset, y: targetPos.y };
    }
  }

  // Draw the actual sprite (a circle for now)
  const drawShape = useCallback((g: PIXI.Graphics) => {
    g.clear();
    const baseColor = AGENT_COLORS[role] || 0xffffff;

    // Body
    g.beginFill(baseColor);
    g.drawCircle(0, 0, 15);
    g.endFill();

    // Work indicator aura
    if (isWorking) {
      g.beginFill(baseColor, 0.4);
      g.drawCircle(0, 0, 22);
      g.endFill();
      
      // small floating indicator
      g.beginFill(0xffffff);
      g.drawCircle(10, -10, 4);
      g.endFill();
    }
  }, [role, isWorking]);

  return (
    <Container position={[targetPos.x, targetPos.y]}>
      <Graphics draw={drawShape} />
      
      {/* Name Label */}
      <Text 
        text={slug.toUpperCase()} 
        anchor={0.5} 
        x={0} 
        y={-25} 
        style={new PIXI.TextStyle({
          fill: 0xffffff,
          fontSize: 10,
          fontFamily: 'monospace',
          fontWeight: 'bold'
        })} 
      />

      {/* Task Tooltip directly inside canvas (MVP) */}
      {isWorking && currentTaskTitle && (
        <Text 
          text={currentTaskTitle} 
          anchor={0.5} 
          x={0} 
          y={25} 
          style={new PIXI.TextStyle({
            fill: 0xffa500, // orange-ish
            fontSize: 10,
            fontFamily: 'monospace'
          })} 
        />
      )}
    </Container>
  );
}
