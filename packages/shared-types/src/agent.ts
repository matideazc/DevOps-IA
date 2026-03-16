import { z } from 'zod';
import type { AgentRole, AgentState, OfficeZone } from './enums.js';

// Config stored in Agent.config (JSONB)
export interface AgentConfig {
  allowedTools: string[];
  forbiddenTools: string[];
  maxBudgetPerRun: number; // USD
  maxSteps: number;
}

// What the API returns for each agent
export interface AgentPublicState {
  id: string;
  slug: string;
  name: string;
  role: AgentRole;
  description: string;
  state: AgentState;
  zone: OfficeZone | null;
  currentTaskId: string | null;
}

// Static registry — the 4 agents of the creative pipeline
export const AGENT_REGISTRY = {
  nora: {
    slug: 'nora',
    name: 'Nora — Investigación',
    role: 'researcher' as const,
    description: 'Investiga tendencias, competencia y movimientos de mercado',
    defaultZone: 'research_lab' as const,
    config: {
      allowedTools: ['web_search', 'analyze_social_media', 'read_reports'],
      forbiddenTools: ['generate_content', 'publish', 'schedule'],
      maxBudgetPerRun: 0.30,
      maxSteps: 8,
    } satisfies AgentConfig,
  },
  bruno: {
    slug: 'bruno',
    name: 'Bruno — Análisis',
    role: 'analyst' as const,
    description: 'Analiza contenido, patrones, hooks y rendimiento',
    defaultZone: 'analysis_room' as const,
    config: {
      allowedTools: ['analyze_metrics', 'extract_hooks', 'compare_formats'],
      forbiddenTools: ['generate_content', 'publish', 'web_search'],
      maxBudgetPerRun: 0.30,
      maxSteps: 8,
    } satisfies AgentConfig,
  },
  bianca: {
    slug: 'bianca',
    name: 'Bianca — Directora Creativa',
    role: 'creative_director' as const,
    description: 'Sintetiza investigación + análisis y genera propuestas de contenido original',
    defaultZone: 'creative_studio' as const,
    config: {
      allowedTools: ['generate_ideas', 'score_idea', 'adapt_tone', 'create_outline'],
      forbiddenTools: ['web_search', 'publish', 'analyze_metrics'],
      maxBudgetPerRun: 0.50,
      maxSteps: 10,
    } satisfies AgentConfig,
  },
  alfred: {
    slug: 'alfred',
    name: 'Alfred — Supervisor',
    role: 'supervisor' as const,
    description: 'Supervisa calidad, filtra ideas y escala lo importante a Matías',
    defaultZone: 'command_center' as const,
    config: {
      allowedTools: ['approve_idea', 'discard_idea', 'escalate_to_human'],
      forbiddenTools: ['generate_ideas', 'web_search', 'publish'],
      maxBudgetPerRun: 0.20,
      maxSteps: 6,
    } satisfies AgentConfig,
  },
} as const;

export type AgentSlug = keyof typeof AGENT_REGISTRY;
