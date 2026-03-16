import { useState, useEffect } from 'react';
import type { AgentState, OfficeZone } from '@ai-office/shared-types';
import { Briefcase, Brain, Search, ShieldCheck, Clock } from 'lucide-react';

interface AgentCardProps {
  slug: string;
  name: string;
  role: string;
  state: AgentState;
  zone: OfficeZone | null;
  currentTaskTitle: string | null;
  updatedAt: string;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  researcher: <Search size={20} className="text-purple-400" />,
  analyst: <Brain size={20} className="text-blue-400" />,
  creative_director: <Briefcase size={20} className="text-pink-400" />,
  supervisor: <ShieldCheck size={20} className="text-green-400" />,
  human: <Clock size={20} className="text-yellow-400" />
};

const ZONE_LABELS: Record<string, string> = {
  idle_lounge: 'Lounge Area',
  research_lab: 'Laboratorio',
  analysis_room: 'Sala de Análisis',
  creative_studio: 'Estudio Creativo',
  command_center: 'Centro de Comando',
};

function formatRelativeTime(dateString?: string | null) {
  if (!dateString) return 'desconocido';
  const time = new Date(dateString).getTime();
  if (isNaN(time)) return 'desconocido';
  
  const diff = Math.max(0, Date.now() - time);
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `hace ${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `hace ${mins}m`;
  return `hace ${Math.floor(mins / 60)}h`;
}

export function AgentCard({ role, name, state, zone, currentTaskTitle, updatedAt }: AgentCardProps) {
  const isWorking = state === 'working';
  
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000); // refresh relative strings every 10s
    return () => clearInterval(interval);
  }, []);
  
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

      <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <Clock size={12} />
        Actualizado {formatRelativeTime(updatedAt)}
      </div>
    </div>
  );
}
