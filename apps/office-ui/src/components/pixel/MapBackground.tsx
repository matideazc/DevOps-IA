import { Graphics } from '@pixi/react';
import { useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { ZONE_COORDINATES, ZONE_BOUNDS, CANVAS_WIDTH, CANVAS_HEIGHT } from '../../lib/layoutMap';

const ZONE_COLORS = {
  research_lab: 0x1e1e24,
  analysis_room: 0x1e1e24,
  creative_studio: 0x1e1e24,
  command_center: 0x1e1e24,
  idle_lounge: 0x0f0f12,
  founders_desk: 0x2a1b1b, // slightly red/amber tint
};

export function MapBackground() {
  const draw = useCallback((g: PIXI.Graphics) => {
    g.clear();

    // 1. Draw outer floor base
    g.beginFill(0x0a0a0b); // Base background color
    g.drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    g.endFill();

    // 2. Draw Zones
    Object.entries(ZONE_COORDINATES).forEach(([zoneName, center]) => {
      const color = ZONE_COLORS[zoneName as keyof typeof ZONE_COLORS] || 0x222222;
      
      g.beginFill(color);
      g.lineStyle(1, 0x333333, 1);
      
      // Draw centered rectangle for each zone
      g.drawRect(
        center.x - ZONE_BOUNDS.width / 2,
        center.y - ZONE_BOUNDS.height / 2,
        ZONE_BOUNDS.width,
        ZONE_BOUNDS.height
      );
      g.endFill();

      // Add a small desk indicator in the center
      g.beginFill(0x444444);
      g.lineStyle(0);
      g.drawRect(center.x - 30, center.y - 15, 60, 30);
      g.endFill();
    });
  }, []);

  return <Graphics draw={draw} />;
}
