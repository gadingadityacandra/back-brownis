import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { v4 as uuidv4 } from 'uuid';

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
    },
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const media_file = formData.get('media_file') as File | null;

    if (!media_file) {
      return NextResponse.json({ error: 'File media wajib disertakan' }, { status: 400 });
    }

    const id = uuidv4();
    const fileExt = media_file.name.split('.').pop();
    const fileName = `${id}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('videos')
      .upload(fileName, media_file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
       console.error("Upload error:", uploadError);
       return NextResponse.json({ error: 'Gagal mengunggah file media ke Storage' }, { status: 500 });
    }
    
    const { data: publicUrlData } = supabaseAdmin
      .storage
      .from('videos')
      .getPublicUrl(fileName);
      
    const media_url = publicUrlData.publicUrl;

    return NextResponse.json({ success: true, url: media_url });

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
