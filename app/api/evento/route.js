export async function POST(request) {
  const body = await request.json();
  const { email, event } = body;

  if (!email || !event) {
    return new Response(JSON.stringify({ error: "Email e evento obrigatórios" }), { status: 400 });
  }

  const TAGS = {
    wistia_10: "baixissima_visualizacao",
    wistia_25: "parou_no_meio",
    wistia_50: "engajado",
    wistia_85: "quase_completou",
    wistia_90: "quase_completou",
    wistia_100: "completou_masterclass"
  };

  const STAGES = {
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

    const [person] = await personRes.json();
    if (!person) return new Response(JSON.stringify({ error: "Pessoa não encontrada" }), { status: 404 });

    const dealsRes = await fetch(`https://api.pipelinecrm.com/api/v3/deals?person_id=${person.id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    const [deal] = await dealsRes.json();
    if (!deal) return new Response(JSON.stringify({ error: "Negócio não encontrado" }), { status: 404 });

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

    if (!updateRes.ok) throw new Error("Erro ao atualizar negócio");

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
