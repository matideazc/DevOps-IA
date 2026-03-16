import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { AgentState, OfficeZone } from '@ai-office/shared-types';

export interface OfficeStateSnapshot {
  agents: Array<{
    slug: string;
    name: string;
    role: string;
    state: AgentState;
    zone: OfficeZone | null;
    currentTaskTitle: string | null;
  }>;
  activePipeline: {
    id: string;
    status: string;
    currentStep: number;
    steps: any[];
  } | null;
  recentEvents: Array<{
    id: string;
    type: string;
    payload: any;
    timestamp: string;
  }>;
  pendingDecisions: number;
}

const BACKEND_URL = 'http://localhost:3001';

export function useOfficeState() {
  const [state, setState] = useState<OfficeStateSnapshot | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch full snapshot
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/office/state');
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setState(data);
      setError(null);
    } catch (err: any) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    let socket: Socket;

    // 1. Initial Load
    fetchState().then(() => {
      // 2. Connect to Socket.IO only after initial snapshot is loaded
      socket = io(BACKEND_URL);

      socket.on('connect', () => setIsConnected(true));
      socket.on('disconnect', () => setIsConnected(false));

      // 3. Listen to realtime events
      socket.on('office_event', (event: any) => {
        // When we receive an event, we merge it into the existing React state
        setState(prev => {
          if (!prev) return prev;

          const newState = { ...prev };
          
          // Prepend new event to timeline (limit to 50)
          newState.recentEvents = [event, ...prev.recentEvents].slice(0, 50);

          // Update Agent States depending on event types
          if (event.type === 'agent.state_changed') {
            const agentIdx = newState.agents.findIndex(a => a.slug === event.payload.agentSlug);
            if (agentIdx !== -1) {
              newState.agents[agentIdx] = {
                ...newState.agents[agentIdx],
                state: event.payload.state,
                zone: event.payload.zone
              };
            }
          } else if (event.type === 'task.created') {
             const agentIdx = newState.agents.findIndex(a => a.slug === event.payload.agentSlug);
             if (agentIdx !== -1) {
               newState.agents[agentIdx].currentTaskTitle = event.payload.type;
             }
          } else if (event.type === 'task.completed' || event.type === 'task.failed') {
             const agentIdx = newState.agents.findIndex(a => a.slug === event.payload.agentSlug);
             if (agentIdx !== -1) {
               newState.agents[agentIdx].currentTaskTitle = null;
             }
          } else if (event.type === 'pipeline.started') {
             // For a robust system, we would just re-fetch the pipeline.
             fetchState(); 
          } else if (event.type === 'pipeline.step_completed') {
             if (newState.activePipeline && newState.activePipeline.id === event.payload.pipelineId) {
                // Advance step
                newState.activePipeline.currentStep = event.payload.step + 1;
             }
          } else if (event.type === 'pipeline.completed' || event.type === 'pipeline.failed') {
             // When completed, fetch state to clear active pipeline and re-sync
             fetchState();
          } else if (event.type === 'decision.required') {
             newState.pendingDecisions += 1;
          } else if (event.type === 'decision.resolved') {
             fetchState(); // Re-sync entirely to be safe
          }

          return newState;
        });
      });
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [fetchState]);

  return { state, error, isConnected, refresh: fetchState };
}
