export async function POST(request: Request) {
  const body = await request.json();
  const { email, event } = body;

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

  const API_KEY = process.env.PIPELINE_API_KEY;

  try {
    const personRes = await fetch(`https://api.pipelinecrm.com/api/v3/people?email=${email}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    const people = await personRes.json();
    if (!Array.isArray(people) || people.length === 0) {
      return new Response(JSON.stringify({ error: "Pessoa não encontrada" }), { status: 404 });
    }
    const person = people[0];

    const dealsRes = await fetch(`https://api.pipelinecrm.com/api/v3/deals?person_id=${person.id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    const deals = await dealsRes.json();
    if (!Array.isArray(deals) || deals.length === 0) {
      return new Response(JSON.stringify({ error: "Negócio não encontrado" }), { status: 404 });
    }
    const deal = deals[0];

    const updateRes = await fetch(`https://api.pipelinecrm.com/api/v3/deals/${deal.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tags: [TAGS[event]],
        stage: STAGES[event],
        notes: `Evento recebido: ${event}`
      })
    });

    if (!updateRes.ok) {
      const errorData = await updateRes.text();
      throw new Error(`Erro ao atualizar negócio: ${errorData}`);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error("Erro no webhook:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), { status: 500 });
  }
}
