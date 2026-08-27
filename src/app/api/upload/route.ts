import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { v4 as uuidv4 } from 'uuid';
import { verifyAuth } from '@/lib/auth';

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
    const authResult = await verifyAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const formData = await request.formData();
    const media_file = formData.get('media_file') as File | null;

    if (!media_file) {
      return NextResponse.json({ error: 'File media wajib disertakan' }, { status: 400 });
    }

    const id = uuidv4();
    const fileExt = media_file.name.split('.').pop();
    const fileName = `${id}.${fileExt}`;
    
    let { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('media')
      .upload(fileName, media_file, {
        cacheControl: '3600',
        upsert: false
      });

    // Jika gagal, kemungkinan besar bucket 'media' belum ada. Kita buatkan otomatis!
    if (uploadError) {
       console.warn("Upload gagal, mencoba membuat bucket 'media' secara otomatis...");
       
       await supabaseAdmin.storage.createBucket('media', { public: true });
       
       // Coba upload lagi setelah bucket dibuat
       const retry = await supabaseAdmin
         .storage
         .from('media')
         .upload(fileName, media_file, {
           cacheControl: '3600',
           upsert: false
         });
         
       uploadData = retry.data;
       uploadError = retry.error;
    }

    if (uploadError) {
       console.error("Upload error:", uploadError);
       return NextResponse.json({ error: 'Gagal mengunggah file media ke Storage. Pastikan Supabase Anda tidak penuh atau error.' }, { status: 500 });
    }
    
    const { data: publicUrlData } = supabaseAdmin
      .storage
      .from('media')
      .getPublicUrl(fileName);
      
    const media_url = publicUrlData.publicUrl;

    return NextResponse.json({ success: true, url: media_url });

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
