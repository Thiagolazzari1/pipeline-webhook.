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

  const API_KEY = process.env.PIPELINE_API_KEY;
  const BASE = "https://api.pipelinecrm.com/api/v3";

  try {
    // Buscar pessoa
    const personRes = await fetch(`${BASE}/people?email=${email}&api_key=${API_KEY}`);
    const people = await personRes.json();
    console.log("Pessoa encontrada?", people);

    let person = people[0];

    // Criar se não existir
    if (!person) {
      const createPersonRes = await fetch(`${BASE}/people?api_key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone })
      });

      const createdPerson = await createPersonRes.json();
      if (!createPersonRes.ok) throw new Error(`Erro ao criar pessoa: ${JSON.stringify(createdPerson)}`);
      person = createdPerson;
      console.log("Pessoa criada:", person);
    }

    // Buscar deal
    const dealsRes = await fetch(`${BASE}/deals?person_id=${person.id}&api_key=${API_KEY}`);
    const deals = await dealsRes.json();
    let deal = deals[0];

    if (!deal) {
      const createDealRes = await fetch(`${BASE}/deals?api_key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Lead ${name || email}`,
          person_id: person.id,
          stage: STAGES[event],
          tags: [TAGS[event]],
          value: 97,
          notes: `Evento recebido: ${event}`
        })
      });

      const createdDeal = await createDealRes.json();
      if (!createDealRes.ok) throw new Error(`Erro ao criar deal: ${JSON.stringify(createdDeal)}`);
      deal = createdDeal;
      console.log("Deal criado:", deal);
    } else {
      const updateRes = await fetch(`${BASE}/deals/${deal.id}?api_key=${API_KEY}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tags: [TAGS[event]],
          stage: STAGES[event],
          notes: `Evento recebido: ${event}`
        })
      });

      const updatedDeal = await updateRes.json();
      if (!updateRes.ok) throw new Error(`Erro ao atualizar deal: ${JSON.stringify(updatedDeal)}`);
      console.log("Deal atualizado:", updatedDeal);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error("Erro geral:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), { status: 500 });
  }
}
