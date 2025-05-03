import { NextRequest, NextResponse } from 'next/server'; // Boa prática importar explicitamente

export async function POST(request: NextRequest) { // Usar NextRequest para melhor tipagem
  try {
    const body = await request.json();
    const { name, email, phone, event } = body;

    console.log("Recebido POST:", { name, email, event }); // Log inicial

    if (!email || !event) {
      console.error("Erro: Email ou evento faltando no body");
      return NextResponse.json({ error: "Email e evento obrigatórios" }, { status: 400 });
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

    // --- LOG ADICIONADO AQUI ---
    console.log('Verificando PIPELINE_API_KEY:', API_KEY ? `Carregada (${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)})` : 'NÃO CARREGADA ou VAZIA');

    if (!API_KEY) {
      console.error("Erro Crítico: PIPELINE_API_KEY não está definida nas variáveis de ambiente!");
      return NextResponse.json({ error: "Configuração interna do servidor: API Key faltando." }, { status: 500 });
    }

    // --- FIM DO LOG ADICIONADO ---

    // Buscar pessoa
    console.log(`Buscando pessoa com email: ${email}`);
    const personSearchUrl = `${BASE}/people?email=${encodeURIComponent(email)}&api_key=${API_KEY}`;
    const personRes = await fetch(personSearchUrl);
    const personData = await personRes.json(); // Ler como JSON primeiro

    if (!personRes.ok) {
      // Se a busca já der erro de API key, logar aqui
       console.error("Erro ao BUSCAR pessoa:", personData);
       throw new Error(`Erro ao buscar pessoa (${personRes.status}): ${JSON.stringify(personData)}`);
    }
    console.log("Resposta da busca de pessoa:", personData);

    // A API retorna um array, mesmo buscando por email único
    let person = personData.entries && personData.entries.length > 0 ? personData.entries[0] : null;

    // Criar se não existir
    if (!person) {
      console.log(`Pessoa com email ${email} não encontrada. Tentando criar...`);
      const createPersonUrl = `${BASE}/people?api_key=${API_KEY}`; // Ainda usando query string nesta versão
      const createPersonRes = await fetch(createPersonUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person: { // API pode esperar o objeto aninhado em "person"
              first_name: name || email.split('@')[0], // Tentar extrair primeiro nome
              email: email,
              phone: phone
           }
        })
      });

      const createdPerson = await createPersonRes.json();
      if (!createPersonRes.ok) {
        console.error("Falha ao CRIAR pessoa:", createdPerson);
        throw new Error(`Erro ao criar pessoa (${createPersonRes.status}): ${JSON.stringify(createdPerson)}`);
      }
      person = createdPerson;
      console.log("Pessoa criada com sucesso:", person);
    } else {
       console.log(`Pessoa encontrada: ID ${person.id}`);
    }

    // Garantir que temos um person.id para prosseguir
    if (!person || !person.id) {
       console.error("Erro: Não foi possível obter ou criar um ID de pessoa válido.");
       throw new Error("ID da pessoa não encontrado após busca/criação.");
    }

    // Buscar deal da pessoa
    console.log(`Buscando deals para pessoa ID: ${person.id}`);
    const dealsSearchUrl = `${BASE}/deals?person_id=${person.id}&api_key=${API_KEY}`;
    const dealsRes = await fetch(dealsSearchUrl);
    const dealsData = await dealsRes.json(); // Ler como JSON

    if (!dealsRes.ok) {
        console.error("Erro ao BUSCAR deals:", dealsData);
        throw new Error(`Erro ao buscar deals (${dealsRes.status}): ${JSON.stringify(dealsData)}`);
    }
    console.log("Resposta da busca de deals:", dealsData);

    let deal = dealsData.entries && dealsData.entries.length > 0 ? dealsData.entries[0] : null;
    const dealTag = TAGS[event] || "tag_desconhecida"; // Fallback para tag
    const dealStage = STAGES[event] || "estagio_desconhecido"; // Fallback para estágio

    if (!deal) {
      console.log(`Nenhum deal encontrado para pessoa ID ${person.id}. Criando novo deal...`);
      const createDealUrl = `${BASE}/deals?api_key=${API_KEY}`; // Ainda usando query string
      const createDealRes = await fetch(createDealUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal: { // API pode esperar o objeto aninhado em "deal"
            name: `Lead ${name || email}`,
            person_id: person.id,
            pipeline_label: dealStage, // verificar se o campo é pipeline_label ou stage
            // stage: dealStage, // Ou talvez seja stage? Verificar docs
            custom_field_values: { // Tags podem ser campos customizados? Verificar docs
               // "custom_NomeDoCampoDeTags": [dealTag]
            },
             // tags: [dealTag], // Se existir um campo 'tags' direto
            source_id: 1, // Verificar se precisa e qual source usar
            deal_value: 97,
            // value: 97, // Ou talvez 'value'? Verificar docs
            notes_attributes: [{ content: `Evento recebido: ${event}` }] // Notas podem ser assim? Verificar docs
            // notes: `Evento recebido: ${event}` // Ou assim?
          }
        })
      });

      const createdDeal = await createDealRes.json();
      if (!createDealRes.ok) {
        console.error("Falha ao CRIAR deal:", createdDeal);
        throw new Error(`Erro ao criar deal (${createDealRes.status}): ${JSON.stringify(createdDeal)}`);
      }
      deal = createdDeal;
      console.log("Deal criado com sucesso:", deal);

    } else {
      console.log(`Deal encontrado: ID ${deal.id}. Atualizando...`);
      const updateDealUrl = `${BASE}/deals/${deal.id}?api_key=${API_KEY}`; // Ainda usando query string
      const updateRes = await fetch(updateDealUrl, {
        method: "PATCH", // Ou PUT? Verificar docs
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal:{ // API pode esperar o objeto aninhado em "deal"
            pipeline_label: dealStage, // Verificar campo
             // stage: dealStage, // Verificar campo
             custom_field_values: { // Verificar campo de tags
                 // "custom_NomeDoCampoDeTags": [dealTag]
             },
             // tags: [dealTag], // Verificar campo
             notes_attributes: [{ content: `Evento recebido: ${event}` }], // Verificar campo de notas
             // notes: `Evento recebido: ${event}` // Verificar campo
          }
        })
      });

      const updatedDeal = await updateRes.json();
      if (!updateRes.ok) {
        console.error("Falha ao ATUALIZAR deal:", updatedDeal);
        throw new Error(`Erro ao atualizar deal (${updateRes.status}): ${JSON.stringify(updatedDeal)}`);
      }
      console.log("Deal atualizado com sucesso:", updatedDeal);
    }

    console.log("Processo concluído com sucesso.");
    return NextResponse.json({ success: true, personId: person.id, dealId: deal.id }, { status: 200 });

  } catch (err: any) {
    console.error("Erro GERAL na função:", err);
    // Evitar expor detalhes internos no erro retornado ao cliente
    const errorMessage = err.message.includes("Unknown api_key")
      ? "Erro de autenticação com o CRM."
      : "Ocorreu um erro interno no servidor.";
    return NextResponse.json({ error: errorMessage, details: err.message }, { status: 500 }); // Manter detalhes internos apenas no log
  }
}
