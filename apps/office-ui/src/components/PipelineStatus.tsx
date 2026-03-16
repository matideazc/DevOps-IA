
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
      
      <div className="text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
        ID: {pipeline.id.split('-')[0]}...
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
    </div>
  );
}
