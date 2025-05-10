import { NextRequest, NextResponse } from 'next/server';

const STAGE_MAPPING: Record<string, string> = {
  wistia_10: "Em processo de ver masterclass - falta terminar",
  wistia_25: "Em processo de ver masterclass - falta terminar",
  wistia_50: "Engajado",
  wistia_75: "Engajado",
  wistia_85: "Quase completou",
  wistia_90: "Completou Masterclass"
};

const TAGS_MAPPING: Record<string, string> = {
  wistia_10: "BAIXISSIMA_VISUALIZACAO",
  wistia_25: "QUASE_NAO_VIU",
  wistia_50: "ENGAJADO",
  wistia_75: "ENGAJADO",
  wistia_85: "QUASE_COMPLETOU",
  wistia_90: "COMPLETOU_MASTERCLASS"
};

export async function POST(request: NextRequest) {
  try {
    const { user_email, milestone } = await request.json();
    const API_KEY = process.env.PIPELINE_API_KEY;

    if (!user_email || !milestone) {
      return NextResponse.json({ error: "Email e milestone são obrigatórios" }, { status: 400 });
    }

    // Verificar se a pessoa existe
    const personRes = await fetch(`https://api.pipedrive.com/v1/persons/find?term=${user_email}&api_token=${API_KEY}`);
    const personData = await personRes.json();

    if (!personData.data || personData.data.length === 0) {
      return NextResponse.json({ error: "Pessoa não encontrada" }, { status: 404 });
    }

    const personId = personData.data[0].id;

    // Verificar se há um deal associado
    const dealRes = await fetch(`https://api.pipedrive.com/v1/deals?person_id=${personId}&api_token=${API_KEY}`);
    const dealData = await dealRes.json();

    if (!dealData.data || dealData.data.length === 0) {
      return NextResponse.json({ error: "Deal não encontrado" }, { status: 404 });
    }

    const dealId = dealData.data[0].id;
    const stage = STAGE_MAPPING[milestone] || "Em processo de ver masterclass - falta terminar";
    const tag = TAGS_MAPPING[milestone] || "SEM_TAG";

    // Atualizar Deal
    const updateDeal = await fetch(`https://api.pipedrive.com/v1/deals/${dealId}?api_token=${API_KEY}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage_id: stage,
        label: tag
      })
    });

    const updateData = await updateDeal.json();

    if (!updateDeal.ok) {
      throw new Error(`Erro ao atualizar Deal: ${JSON.stringify(updateData)}`);
    }

    console.log('Atualização realizada com sucesso:', updateData);
    return NextResponse.json({ success: true, data: updateData });

  } catch (error: any) {
    console.log('Erro na atualização:', error.message);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
