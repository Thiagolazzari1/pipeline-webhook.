// File: /app/api/evento/route.ts

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, phone, event } = body;

  if (!email || !event) {
    return new Response(JSON.stringify({ error: "Email e evento obrigatórios" }), { status: 400 });
  }

  const TAGS: Record<string, string> = {
    wistia_10: "baixissima_visualizacao",
    wistia_25: "parou_no_meio",
    wistia_50: "engajado",
    wistia_85: "quase_completou",
    wistia_90: "quase_completou",
    wistia_100: "completou_masterclass"
  };

  const STAGES: Record<string, string> = {
    wistia_10: "acessou parcialmente",
    wistia_25: "acessou parcialmente",
    wistia_50: "engajado",
    wistia_85: "quase convertido",
    wistia_90: "quase convertido",
    wistia_100: "quase convertido"
  };

  const PRIORITY: Record<string, number> = {
    wistia_10: 1,
    wistia_25: 2,
    wistia_50: 3,
    wistia_85: 4,
    wistia_90: 5,
    wistia_100: 6
  };

  const API_KEY = process.env.PIPELINE_API_KEY;

  try {
    const personRes = await fetch(`https://api.pipelinecrm.com/api/v3/people?email=${email}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    const people = await personRes.json();
    let person = people[0];

    // Se a pessoa não existir, cria
    if (!person) {
      const newPersonRes = await fetch(`https://api.pipelinecrm.com/api/v3/people`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, phone })
      });
      person = await newPersonRes.json();
    }

    // Buscar deal existente
    const dealsRes = await fetch(`https://api.pipelinecrm.com/api/v3/deals?person_id=${person.id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    let deal = (await dealsRes.json())[0];

    // Se não tiver deal, cria
    if (!deal) {
      const newDealRes = await fetch(`https://api.pipelinecrm.com/api/v3/deals`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: `Negócio de ${name || email}`,
          person_id: person.id,
          value: 97,
          stage: STAGES[event],
          tags: [TAGS[event]],
          notes: `Evento inicial: ${event}`
        })
      });
      deal = await newDealRes.json();
    } else {
      // Se já tiver evento anterior de prioridade maior, ignora
      const currentPriority = PRIORITY[event];
      const existingStage = deal.stage;
      const stageKey = Object.keys(STAGES).find(key => STAGES[key] === existingStage);
      if (stageKey && PRIORITY[stageKey] >= currentPriority) {
        return new Response(JSON.stringify({ skipped: true, reason: "Evento menos relevante que o atual." }), { status: 200 });
      }

      // Atualiza deal com novo evento mais relevante
      await fetch(`https://api.pipelinecrm.com/api/v3/deals/${deal.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tags: [TAGS[event]],
          stage: STAGES[event],
          notes: `Evento atualizado: ${event}`
        })
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error("Erro ao processar evento:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), { status: 500 });
  }
}
