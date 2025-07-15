import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_RESUME_API_BASE_URL || 'https://resumebuilder-arfb.onrender.com';
const API_KEY = process.env.NEXT_OPENAI_API_KEY;

export async function POST(req: Request) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key is not configured.' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    formData.append('api_key', API_KEY);

    const response = await fetch(`${API_BASE_URL}/api/ai-enhance`, {
      method: 'POST',
      body: formData,
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'An error occurred' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
