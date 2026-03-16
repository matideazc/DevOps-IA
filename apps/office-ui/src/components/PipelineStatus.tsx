
import type { OfficeStateSnapshot } from '../hooks/useOfficeState';

interface PipelineStatusProps {
  pipeline: OfficeStateSnapshot['activePipeline'];
}

export function PipelineStatus({ pipeline }: PipelineStatusProps) {
  if (!pipeline) {
    return (
      <div className="panel">
        <div className="pipeline-header">
          <h2>Pipeline Activo</h2>
          <span className="status-badge idle">
            <div className="status-dot" /> IDLE
          </span>
        </div>
        <div className="text-muted" style={{ marginTop: '1rem', fontStyle: 'italic' }}>
          No hay ejecuciones activas ni historial disponible.
        </div>
      </div>
    );
  }

  const isCompleted = pipeline.status === 'completed' || pipeline.status === 'failed';
  const displayStatus = pipeline.status.toUpperCase();

  return (
    <div className="panel" style={{ border: isCompleted ? '1px solid var(--border-color)' : '1px solid var(--status-working)' }}>
      <div className="pipeline-header">
        <h2>{isCompleted ? 'Último Pipeline Ejecutado' : 'Pipeline Activo'}</h2>
        <span className={`status-badge ${isCompleted ? 'idle' : 'working'}`}>
          <div className="status-dot" />
          {displayStatus}
        </span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', margin: '1rem 0', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Brief</span>
          <span style={{ fontWeight: 500 }}>{pipeline.brief?.title || 'Sin Título'}</span>
        </div>
        
        {pipeline.ideaStats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ideas Producidas</span>
            <span style={{ fontWeight: 500, display: 'flex', gap: '0.75rem' }}>
              <span title="Aprobadas" style={{ color: '#22c55e' }}>✨ {pipeline.ideaStats.approved}</span>
              <span title="Descartadas" style={{ color: '#ef4444' }}>🗑️ {pipeline.ideaStats.discarded}</span>
              {pipeline.ideaStats.proposed > 0 ? <span title="Propuestas" style={{ color: '#eab308' }}>💡 {pipeline.ideaStats.proposed}</span> : null}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end', marginLeft: 'auto' }}>
          <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pipeline ID</span>
          <span className="text-muted" style={{ fontFamily: 'var(--font-mono)' }}>{pipeline.id.split('-')[0]}</span>
        </div>
      </div>

      <div className="pipeline-steps">
        {pipeline.steps.map((step, idx) => {
          let className = 'step-indicator';
          if (idx < pipeline.currentStep) className += ' completed';
          else if (idx === pipeline.currentStep && pipeline.status === 'running') className += ' active';
          
          return (
            <div 
              key={idx} 
              className={className} 
              title={`Paso ${idx + 1}: ${step.agentSlug}`}
            />
          );
        })}
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Actualizado {pipeline.updatedAt ? new Date(pipeline.updatedAt).toLocaleTimeString() : 'N/A'}
      </div>
    </div>
  );
}
