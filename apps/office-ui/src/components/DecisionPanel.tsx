import { useState, useEffect } from 'react';
import { ShieldAlert, Check, X } from 'lucide-react';

interface DecisionPanelProps {
  pendingCount: number;
  onDecisionResolved: () => void;
}

export function DecisionPanel({ pendingCount, onDecisionResolved }: DecisionPanelProps) {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (pendingCount > 0) {
      fetch('/api/decisions/pending')
        .then(res => res.json())
        .then(data => setDecisions(data.decisions))
        .catch(console.error);
    } else {
      setDecisions([]);
    }
  }, [pendingCount]);

  const handleResolve = async (id: string, resolution: string) => {
    setSubmitting(id);
    try {
      const comment = comments[id] || undefined;
      await fetch(`/api/decisions/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: resolution,
          decidedBy: 'human:matias',
          comment
        })
      });
      onDecisionResolved();
      // Remove local copy just in case socket is slow
      setDecisions(prev => prev.filter(d => d.id !== id));
      setComments(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(null);
    }
  };

  if (pendingCount === 0 || decisions.length === 0) {
    return (
      <div style={{ marginTop: '1rem', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.05)', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexDirection: 'column' }}>
          <Check color="#22c55e" size={32} />
          <h3 style={{ margin: 0, color: '#22c55e', fontSize: '1rem' }}>Todo al día, Matías</h3>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>No hay decisiones estructurales pendientes de aprobación.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1rem', border: '1px solid #eab308', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(234, 179, 8, 0.2)' }}>
        <ShieldAlert color="#eab308" />
        <h3 style={{ margin: 0, color: '#eab308' }}>Decisiones Requeridas ({pendingCount})</h3>
      </div>
      
      <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {decisions.map(d => (
          <div key={d.id} style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <p className="text-muted" style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
              Pipeline: {d.pipelineRun?.id?.substring(0,8)} | Tarea: {d.task?.title}
            </p>
            <p style={{ fontWeight: 500, marginBottom: '1rem' }}>{d.question}</p>
            
            <textarea 
              placeholder="Comentario opcional..."
              value={comments[d.id] || ''}
              onChange={(e) => setComments({ ...comments, [d.id]: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                backgroundColor: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
              rows={2}
            />

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => handleResolve(d.id, 'approved')}
                disabled={submitting === d.id}
                style={{ flex: 1, padding: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid #22c55e', borderRadius: '6px', cursor: 'pointer' }}
              >
                <Check size={16} /> Aprobar
              </button>
              <button 
                onClick={() => handleResolve(d.id, 'rejected')}
                disabled={submitting === d.id}
                style={{ flex: 1, padding: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer' }}
              >
                <X size={16} /> Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
