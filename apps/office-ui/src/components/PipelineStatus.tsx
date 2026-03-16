
import type { OfficeStateSnapshot } from '../hooks/useOfficeState';

interface PipelineStatusProps {
  pipeline: OfficeStateSnapshot['activePipeline'];
}

export function PipelineStatus({ pipeline }: PipelineStatusProps) {
  if (!pipeline) {
    return (
      <div className="panel">
        <h2 style={{ marginBottom: '0.5rem' }}>Pipeline Activo</h2>
        <div className="text-muted">No hay ejecuciones activas en este momento.</div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="pipeline-header">
        <h2>Pipeline Activo</h2>
        <span className={`status-badge ${pipeline.status === 'running' ? 'working' : 'idle'}`}>
          <div className="status-dot" />
          {pipeline.status}
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
