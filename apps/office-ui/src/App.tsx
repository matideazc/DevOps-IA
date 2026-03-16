
import { useOfficeState } from './hooks/useOfficeState';
import { AgentGrid } from './components/AgentGrid';
import { EventTimeline } from './components/EventTimeline';
import { PipelineStatus } from './components/PipelineStatus';
import { DecisionPanel } from './components/DecisionPanel';
import { FloorPlanView } from './components/pixel/FloorPlanView';
import { Bot, RefreshCw, Wifi, WifiOff, LayoutDashboard, Map } from 'lucide-react';
import { useState } from 'react';

function App() {
  const { state, error, isConnected, refresh } = useOfficeState();
  const [viewMode, setViewMode] = useState<'dashboard' | 'floorplan'>('dashboard');

  if (error) {
    return (
      <div className="dashboard-container" style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <h2 style={{ color: 'var(--status-error)' }}>Error conectando al servidor</h2>
        <p className="text-muted">{error.message}</p>
        <p className="text-muted mt-2" style={{ marginTop: '1rem' }}>Asegúrate de que la API está corriendo en http://localhost:3001</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="dashboard-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw className="animate-spin text-muted" size={32} style={{ animation: 'pulse 1.5s infinite' }} />
        <span style={{ marginLeft: '1rem' }} className="text-muted">Cargando estado de la oficina...</span>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Main Content Area */}
      <main className="main-content">
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Bot size={28} className="text-accent" style={{ color: 'var(--text-accent)' }} />
            <h1>AI Virtual Office</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: isConnected ? '#22c55e' : '#ef4444', fontSize: '0.875rem' }}>
            {isConnected ? <><Wifi size={18} /> LIVE (Socket.IO)</> : <><WifiOff size={18} /> Desconectado</>}
            <button onClick={refresh} title="Resincronizar estado completo" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
              <RefreshCw size={18} />
            </button>
          </div>
        </header>

        {/* Top Section: Active Pipeline */}
        <PipelineStatus pipeline={state.activePipeline} />

        {/* View Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0 0.5rem' }}>
          <button 
            onClick={() => setViewMode('dashboard')}
            className={`view-tab ${viewMode === 'dashboard' ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button 
            onClick={() => setViewMode('floorplan')}
            className={`view-tab ${viewMode === 'floorplan' ? 'active' : ''}`}
          >
            <Map size={18} /> Floor Plan
          </button>
        </div>

        {/* Dynamic Main Body */}
        {viewMode === 'dashboard' ? (
          <>
             <AgentGrid agents={state.agents} />
          </>
        ) : (
          <div style={{ flex: 1, minHeight: '600px' }}>
             <FloorPlanView state={state} />
          </div>
        )}
      </main>

      {/* Right Sidebar: Timeline & Audits */}
      <aside className="sidebar">
        <div style={{ padding: '1.5rem 1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Registro de Eventos</h3>
          <span className="status-badge" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            {state.recentEvents.length} eventos
          </span>
        </div>
        
        {state.pendingDecisions > 0 && (
          <div style={{ padding: '0 1.5rem', marginTop: '1rem' }}>
            <div className="status-badge working" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}>
              <div className="status-dot" style={{ backgroundColor: '#eab308', boxShadow: '0 0 8px #eab308' }} />
              {state.pendingDecisions} Decisiones Requeridas
            </div>
            <DecisionPanel pendingCount={state.pendingDecisions} onDecisionResolved={refresh} />
          </div>
        )}

        <EventTimeline events={state.recentEvents} />
      </aside>
    </div>
  );
}

export default App;
