
import { AgentCard } from './AgentCard';
import type { OfficeStateSnapshot } from '../hooks/useOfficeState';

interface AgentGridProps {
  agents: OfficeStateSnapshot['agents'];
}

export function AgentGrid({ agents }: AgentGridProps) {
  if (!agents || agents.length === 0) {
    return <div className="text-muted">Cargando agentes...</div>;
  }

  return (
    <div className="agent-grid">
      {agents.map((agent) => (
        <AgentCard key={agent.slug} {...agent} />
      ))}
    </div>
  );
}
