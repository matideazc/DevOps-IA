import type { OfficeZone } from '@ai-office/shared-types';

export interface Point2D {
  x: number;
  y: number;
}

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;

// Central coordinates for each zone within the 1200x800 canvas
// Unified Office Layout (1000x600 Building)
export const ZONE_COORDINATES: Record<OfficeZone | 'founders_desk', Point2D> = {
  // Top Left
  creative_studio: { x: 250, y: 225 },
  // Bottom Left
  idle_lounge: { x: 250, y: 575 },
  // Top Center
  founders_desk: { x: 600, y: 225 },
  founders_office: { x: 600, y: 225 },
  // Bottom Center
  command_center: { x: 600, y: 575 },
  // Top Right
  research_lab: { x: 950, y: 225 },
  // Bottom Right
  analysis_room: { x: 950, y: 575 },
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
