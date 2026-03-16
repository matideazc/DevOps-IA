import { useState, useEffect } from 'react';
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

export function useOfficeState(pollingIntervalMs = 2000) {
  const [state, setState] = useState<OfficeStateSnapshot | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchState() {
      try {
        const res = await fetch('/api/office/state');
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        if (mounted) {
          setState(data);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) setError(err);
      }
    }

    // Fetch immediately
    fetchState();

    // Setup polling
    const interval = setInterval(fetchState, pollingIntervalMs);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [pollingIntervalMs]);

  return { state, error };
}
