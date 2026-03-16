
import type { OfficeStateSnapshot } from '../hooks/useOfficeState';

interface EventTimelineProps {
  events: OfficeStateSnapshot['recentEvents'];
}

export function EventTimeline({ events }: EventTimelineProps) {
  if (!events || events.length === 0) {
    return <div className="text-muted" style={{ padding: '1.5rem' }}>Esperando eventos...</div>;
  }

  return (
    <div className="timeline">
      {events.map((evt) => {
        const time = new Date(evt.timestamp).toLocaleTimeString();
        let safeClass = evt.type.replace(/\./g, '-').replace(/:/g, '-');
        
        return (
          <div key={evt.id} className={`timeline-event ${safeClass}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="event-type">{evt.type}</span>
              <span className="event-time">{time}</span>
            </div>
            
            {/* Show a mini summary based on type instead of dumping full JSON if possible */}
            {evt.type === 'agent.state_changed' && (
              <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                {evt.payload.agentSlug} → {evt.payload.newState} ({evt.payload.zone})
              </div>
            )}
            
            {evt.type === 'task.completed' && (
              <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                {evt.payload.agentSlug} completó su paso.
              </div>
            )}
            
            {evt.type.startsWith('idea.') && (
              <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                {evt.payload.title} (Score: {evt.payload.totalScore})
              </div>
            )}
            
            {/* Fallback payload minimal view */}
            {!['agent.state_changed', 'task.completed', 'idea.proposed', 'idea.approved', 'idea.discarded'].includes(evt.type) && (
              <div className="event-payload">
                {JSON.stringify(evt.payload, null, 2)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
