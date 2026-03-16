
import type { AgentState, OfficeZone } from '@ai-office/shared-types';
import { Briefcase, Brain, Search, ShieldCheck } from 'lucide-react';

interface AgentCardProps {
  slug: string;
  name: string;
  role: string;
  state: AgentState;
  zone: OfficeZone | null;
  currentTaskTitle: string | null;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  researcher: <Search size={20} className="text-purple-400" />,
  analyst: <Brain size={20} className="text-blue-400" />,
  creative_director: <Briefcase size={20} className="text-pink-400" />,
  supervisor: <ShieldCheck size={20} className="text-green-400" />,
};

const ZONE_LABELS: Record<string, string> = {
  idle_lounge: 'Lounge Area',
  research_lab: 'Laboratorio',
  analysis_room: 'Sala de Análisis',
  creative_studio: 'Estudio Creativo',
  command_center: 'Centro de Comando',
};

export function AgentCard({ role, name, state, zone, currentTaskTitle }: AgentCardProps) {
  const isWorking = state === 'working';
  
  return (
    <div className={`agent-card ${isWorking ? 'working' : ''}`}>
      <div className="agent-card-header">
        <div className="agent-title">
          <span className="agent-role">{role}</span>
          <span className="agent-name">{name}</span>
        </div>
        {ROLE_ICONS[role]}
      </div>

      <div className={`status-badge ${isWorking ? 'working' : 'idle'}`}>
        <div className="status-dot" />
        {state}
      </div>

      <div className="zone-indicator">
        📍 {zone ? (ZONE_LABELS[zone] || zone) : 'Desconocido'}
      </div>

      {isWorking && currentTaskTitle && (
        <div className="task-box">
          <div className="text-muted mb-1" style={{ marginBottom: '4px' }}>Tarea actual:</div>
          <div>{currentTaskTitle}</div>
        </div>
      )}
    </div>
  );
}
