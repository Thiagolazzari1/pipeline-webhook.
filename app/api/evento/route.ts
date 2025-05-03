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

  try {
    // Buscar pessoa
    const personRes = await fetch(`https://api.pipelinecrm.com/api/v3/people?email=${email}`, {
      headers: {
        "Content-Type": "application/json",
        "api_key": API_KEY
      }
    });

    const people = await personRes.json();
    console.log("Resposta da busca de pessoa:", people);

    let person = people[0];

    // Criar pessoa se não existe
    if (!person) {
      const createPersonRes = await fetch("https://api.pipelinecrm.com/api/v3/people", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api_key": API_KEY
        },
        body: JSON.stringify({ name, email, phone })
      });

      const createdPerson = await createPersonRes.json();
      console.log("Pessoa criada:", createdPerson);

      if (!createPersonRes.ok) {
        throw new Error(`Erro ao criar pessoa: ${JSON.stringify(createdPerson)}`);
      }

      person = createdPerson;
    }

    // Buscar deals
    const dealsRes = await fetch(`https://api.pipelinecrm.com/api/v3/deals?person_id=${person.id}`, {
      headers: {
        "Content-Type": "application/json",
        "api_key": API_KEY
      }
    });

    const deals = await dealsRes.json();
    console.log("Deals encontrados:", deals);

    let deal = deals[0];

    // Criar deal se não existir
    if (!deal) {
      const createDealRes = await fetch("https://api.pipelinecrm.com/api/v3/deals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api_key": API_KEY
        },
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
      console.log("Deal criado:", createdDeal);

      if (!createDealRes.ok) {
        throw new Error(`Erro ao criar deal: ${JSON.stringify(createdDeal)}`);
      }

      deal = createdDeal;
    } else {
      // Atualizar deal se já existe
      const updateRes = await fetch(`https://api.pipelinecrm.com/api/v3/deals/${deal.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "api_key": API_KEY
        },
        body: JSON.stringify({
          tags: [TAGS[event]],
          stage: STAGES[event],
          notes: `Evento recebido: ${event}`
        })
      });

      const updateResult = await updateRes.json();
      console.log("Deal atualizado:", updateResult);

      if (!updateRes.ok) {
        throw new Error(`Erro ao atualizar deal: ${JSON.stringify(updateResult)}`);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error("Erro geral:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), { status: 500 });
  }
}
