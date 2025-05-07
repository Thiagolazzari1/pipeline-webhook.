import { NextRequest, NextResponse } from 'next/server';

const STAGE_MAPPING = {
  BAIXISSIMA_VISUALIZACAO: "Em processo de ver masterclass - falta terminar",
  COMPLETOU_MASTERCLASS: "Terminou de ver masterclass - pronto para feedback",
  NAO_ASSISTIU: "Em processo de ver masterclass - falta terminar",
  PAROU_NO_MEIO: "Em processo de ver masterclass - falta terminar",
  QUASE_COMPLETOU: "Em processo de ver masterclass - falta terminar",
  QUASE_NAO_VIU: "Em processo de ver masterclass - falta terminar",
  ENGAJADO: "Em processo de ver masterclass - falta terminar",
  VISUALIZACAO_FRACA: "Em processo de ver masterclass - falta terminar",
  COMPROU_MASTERCLASS: "Aguardando assistir"
};

export async function POST(request: NextRequest) {
  try {
    console.log('Requisição recebida no endpoint /api/update-stage');

    const { user_email, tag } = await request.json();
    const API_KEY = process.env.PIPELINE_API_KEY;

    if (!user_email || !tag) {
      return NextResponse.json({ error: "Email e tag são obrigatórios." }, { status: 400 });
    }

    // Buscar Pessoa
    const personRes = await fetch(`https://api.pipedrive.com/v1/persons?api_token=${API_KEY}`);
    const personData = await personRes.json();

    if (!personData.data || personData.data.length === 0) {
      return NextResponse.json({ error: "Pessoa não encontrada." }, { status: 404 });
    }

    const person = personData.data.find((p: any) => {
      const emails = p.email ? p.email.map((e: any) => e.value.toLowerCase()) : [];
      return emails.includes(user_email.toLowerCase());
    });

    if (!person) {
      return NextResponse.json({ error: "Pessoa não encontrada." }, { status: 404 });
    }

    const personId = person.id;

    // Buscar Deal
    const dealRes = await fetch(`https://api.pipedrive.com/v1/deals?person_id=${personId}&api_token=${API_KEY}`);
    const dealData = await dealRes.json();

    if (!dealData.data || dealData.data.length === 0) {
      return NextResponse.json({ error: "Deal não encontrado." }, { status: 404 });
    }

    const dealId = dealData.data[0].id;

    // Atualizar Deal
    const updateRes = await fetch(`https://api.pipedrive.com/v1/deals/${dealId}?api_token=${API_KEY}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        label: [tag]
      })
    });

    const updateData = await updateRes.json();

    if (!updateRes.ok) {
      throw new Error(`Erro ao atualizar Deal: ${JSON.stringify(updateData)}`);
    }

    console.log('Atualização realizada com sucesso:', updateData);
    return NextResponse.json({ success: true, data: updateData });

  } catch (error: any) {
    console.log('Erro na atualização:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
