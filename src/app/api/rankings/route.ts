import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data, error } = await supabase
    .from('rankings')
    .select('*')
    .order('score', { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { score, message, userId } = await request.json();

  if (!score || !userId) {
    return NextResponse.json({ error: 'Score and userId are required' }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: existing, error: selectError } = await supabase
    .from('rankings')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00.000Z`)
    .lte('created_at', `${today}T23:59:59.999Z`);

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 });
  }

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: '하루에 한 번만 등록할 수 있습니다.' }, { status: 429 });
  }

  const { error } = await supabase
    .from('rankings')
    .insert([{ score, message, user_id: userId }]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 