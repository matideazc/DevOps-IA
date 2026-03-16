import { useState } from 'react';
import type { OfficeStateSnapshot } from '../hooks/useOfficeState';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface EventTimelineProps {
  events: OfficeStateSnapshot['recentEvents'];
}

/* Event Row Component to encapsulate individual toggle state */
function EventRow({ evt }: { evt: any }) {
  const [expanded, setExpanded] = useState(false);
  
  const time = new Date(evt.timestamp).toLocaleTimeString();
  
  // Color classification
  let rowClass = 'timeline-event';
  if (evt.type.startsWith('idea.')) rowClass += ' event-idea';
  else if (evt.type.startsWith('task.')) rowClass += ' event-task';
  else if (evt.type.startsWith('pipeline.')) rowClass += ' event-pipeline';
  else if (evt.type.startsWith('decision.')) rowClass += ' event-decision';
  
  // Custom message handling instead of raw dump
  let summary = '';
  const isExpandable = evt.payload && Object.keys(evt.payload).length > 0;

  if (evt.type === 'agent.state_changed') {
    summary = `${evt.payload.agentSlug} → ${evt.payload.newState || 'unknown'} (${evt.payload.zone || 'unknown'})`;
  } else if (evt.type === 'task.completed') {
    summary = `${evt.payload.agentSlug} ha completado su paso.`;
  } else if (evt.type.startsWith('idea.')) {
    summary = `${evt.payload.title} (Score: ${evt.payload.totalScore || 'N/A'})`;
  } else if (evt.type === 'pipeline.started') {
    summary = `Flujo de trabajo iniciado.`;
  }

  return (
    <div className={rowClass}>
      <div 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: isExpandable ? 'pointer' : 'default' }}
        onClick={() => isExpandable && setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isExpandable && (
            <span style={{ color: 'var(--text-muted)' }}>
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
          <span className="event-type">{evt.type}</span>
        </div>
        <span className="event-time">{time}</span>
      </div>
      
      {summary && (
        <div className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem', paddingLeft: isExpandable ? '1.5rem' : '0' }}>
          {summary}
        </div>
      )}
      
      {/* Expanded view for raw payload */}
      {expanded && isExpandable && (
        <div className="event-payload" style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '4px', overflowX: 'auto', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', borderLeft: '2px solid var(--border-color)', marginLeft: '1.5rem' }}>
          {JSON.stringify(evt.payload, null, 2)}
        </div>
      )}
    </div>
  );
}

export function EventTimeline({ events }: EventTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px', margin: '1rem' }}>
        No hay actividad en las oficinas aún.
      </div>
    );
  }

  return (
    <div className="timeline">
      {events.map((evt) => (
        <EventRow key={evt.id} evt={evt} />
      ))}
    </div>
  );
}
