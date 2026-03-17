import type { OfficeZone } from '@ai-office/shared-types';

export interface Point2D {
  x: number;
  y: number;
}

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;

// Central coordinates for each zone within the 1200x800 canvas
export const ZONE_COORDINATES: Record<OfficeZone | 'founders_desk', Point2D> = {
  // Top Left
  research_lab: { x: 250, y: 200 },
  // Bottom Left
  analysis_room: { x: 250, y: 600 },
  // Top Right
  creative_studio: { x: 950, y: 200 },
  // Bottom Right
  command_center: { x: 950, y: 600 },
  // Middle Neutral
  idle_lounge: { x: 600, y: 450 },
  // Top Center (Reserved for Matias)
  founders_desk: { x: 600, y: 150 },
  // Unused standard zone but required by OfficeZone type
  founders_office: { x: 600, y: 150 },
};

// Zone dimensions for drawing the base rectangles
export const ZONE_BOUNDS = {
  width: 300,
  height: 250
};

// Return a mildly randomized or slot-based position around a center
// to avoid perfect overlapping when multiple agents are idle
export function getSpacedPosition(center: Point2D, seedStr: string, isLounge: boolean): Point2D {
  // Use length of slug or char codes as a deterministic seed
  let seed = 0;
  for(let i=0; i<seedStr.length; i++) seed += seedStr.charCodeAt(i);
  
  // Lounge is bigger, more spread. Desks are tighter.
  const radiusX = isLounge ? 80 : 30;
  const radiusY = isLounge ? 50 : 20;
  
  // create pseudo-random angle and distance
  const angle = (seed * 137.5) * (Math.PI / 180);
  const distanceFunc = (seed % 100) / 100;

  return {
    x: center.x + Math.cos(angle) * (radiusX * distanceFunc),
    y: center.y + Math.sin(angle) * (radiusY * distanceFunc)
  };
}
