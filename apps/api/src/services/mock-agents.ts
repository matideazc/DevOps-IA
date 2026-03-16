export async function executeAgentMock(agentSlug: string, input: any): Promise<any> {
  // Simulate LLM delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  switch (agentSlug) {
    case 'nora':
      return {
        trends: [
          {
            name: "AI Automation in SMEs",
            description: "Small businesses are adopting AI for daily ops",
            relevance: "high",
            source: "Gartner 2026",
          },
          {
            name: "Micro-teams",
            description: "Companies of 2-3 people generating MM revenue",
            relevance: "high",
            source: "Forbes",
          },
          {
            name: "Founder Led Sales",
            description: "Founders selling through personal branding",
            relevance: "medium",
            source: "LinkedIn Data",
          },
        ],
        competitors: [
          {
            name: "Legacy Corp",
            strategy: "Heavy outbound",
            strength: "Brand recognition",
            weakness: "Slow innovation",
          },
          {
            name: "Startup AI",
            strategy: "Product-led growth",
            strength: "Agility",
            weakness: "Low retention",
          },
        ],
        opportunities: [
          "Target founders with \"time-saving\" messaging",
          "Highlight case studies of small teams doing big things",
        ],
        market_signals: [
          "Increased search volume for 'AI workflow automation'",
        ],
      };

    case 'bruno':
      return {
        patterns: [
          {
            pattern: "Contrarian takes",
            evidence: "Posts going against common advice get 3x engagement",
            frequency: "high",
          },
          {
            pattern: "Vulnerability hooks",
            evidence: "Founders sharing failures get high shares",
            frequency: "medium",
          },
        ],
        top_hooks: [
          {
            hook: "El secreto que nadie te cuenta sobre X",
            why_works: "Generates curiosity gap",
            engagement_score: 95,
          },
          {
            hook: "Cómo hicimos X en Y tiempo sin Z",
            why_works: "Clear value prop and overcoming objections",
            engagement_score: 88,
          },
        ],
        format_recommendations: [
          {
            format: "carousel",
            rationale: "High save rate for educational content",
            effort: "medium",
          },
          {
            format: "video",
            rationale: "Builds trust quickly for personal brands",
            effort: "high",
          },
        ],
        content_gaps: [
          "Falta contenido técnico profundo explicado simple",
        ],
      };

    case 'bianca':
      return {
        ideas: [
          {
            title: "El ROI invisible de no automatizar",
            concept: "Mostrar con datos cuánto pierden las startups que evitan automatizar procesos repetitivos.",
            hook: "¿Cuántas horas perdés por semana sin darte cuenta?",
            format: "carousel",
            scores: {
              hook_engagement: 5,
              data_backed: 4,
              originality: 4,
              brand_voice: 5,
              production_ease: 4,
            },
          },
          {
            title: "El stack de un equipo de 2 que rinde como 10",
            concept: "Exponer el stack real de herramientas de un micro-equipo altamente productivo.",
            hook: "2 personas. 10x output. Acá está el secreto.",
            format: "thread",
            scores: {
              hook_engagement: 5,
              data_backed: 3,
              originality: 4,
              brand_voice: 5,
              production_ease: 5,
            },
          },
          {
            title: "Cómo los mejores CTOs de LATAM toman decisiones rápidas",
            concept: "Citar patrones de decisión de CTOs exitosos.",
            hook: "No es suerte. Es un framework que podés replicar.",
            format: "video",
            scores: {
              hook_engagement: 4,
              data_backed: 4,
              originality: 3,
              brand_voice: 4,
              production_ease: 3,
            },
          },
          {
            title: "Por qué el 80% de los proyectos de IA fallan",
            concept: "Análisis de causas de fracaso de proyectos de IA.",
            hook: "No fallaron por la tecnología.",
            format: "blog",
            scores: {
              hook_engagement: 4,
              data_backed: 2,
              originality: 3,
              brand_voice: 4,
              production_ease: 2,
            },
          },
          {
            title: "3 tools que nadie te recomienda pero todos usan",
            concept: "Lista de herramientas sin diferenciación clara.",
            hook: "Dejá de usar lo mismo que todos.",
            format: "reel",
            scores: {
              hook_engagement: 3,
              data_backed: 2,
              originality: 2,
              brand_voice: 3,
              production_ease: 5,
            },
          },
        ],
      };

    case 'alfred':
      // Alfred reviews Bianca's mock output.
      return {
        approved: [
          "El ROI invisible de no automatizar",
          "El stack de un equipo de 2 que rinde como 10",
          "Cómo los mejores CTOs de LATAM toman decisiones rápidas",
        ],
        discarded: [
          {
            title: "Por qué el 80% de los proyectos de IA fallan",
            reason: "Score bajo (3.0). Datos insuficientes y producción compleja.",
          },
          {
            title: "3 tools que nadie te recomienda pero todos usan",
            reason: "Score bajo (3.0). Hook genérico y baja originalidad.",
          },
        ],
        escalate_to_human: [
          // Example of a mock escalation to trigger HumanDecision
          // {
          //   title: "El stack de un equipo de 2 que rinde como 10",
          //   reason: "Revela herramientas internas, requiere confirmación de Matías.",
          // }
        ],
      };

    default:
      throw new Error(`Mock not defined for agent slug: ${agentSlug}`);
  }
}
