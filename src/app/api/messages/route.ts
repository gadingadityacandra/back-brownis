import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const recipient = formData.get('recipient') as string;
    const sender = formData.get('sender') as string;
    const message = formData.get('message') as string;
    
    // New fields
    const media_type = (formData.get('media_type') as string) || 'video'; // 'image', 'video', or 'youtube'
    const media_file = formData.get('media_file') as File | null;
    const media_link = formData.get('media_link') as string;
    const auto_delete_str = formData.get('auto_delete') as string;
    const auto_delete = auto_delete_str === 'false' ? false : true;

    if (!recipient || !sender || !message) {
      return NextResponse.json({ error: 'Data tidak lengkap (Penerima, Pengirim, dan Pesan wajib diisi)' }, { status: 400 });
    }

    const id = uuidv4();
    let media_url = null;

    if (media_type === 'youtube' && media_link) {
      // Jika youtube, langsung simpan URL-nya
      media_url = media_link;
    } else if ((media_type === 'video' || media_type === 'image') && media_file) {
      // Jika gambar/video, upload ke Supabase Storage
      const fileExt = media_file.name.split('.').pop();
      const fileName = `${id}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabaseAdmin
        .storage
        .from('videos') // Tetap gunakan bucket 'videos' untuk semua file media agar praktis
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
        
      media_url = publicUrlData.publicUrl;
    }

    // Insert ke tabel messages (sesuaikan dengan skema baru)
    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert([
        { id, recipient, sender, message, media_type, media_url, auto_delete }
      ])
      .select();

    if (error) {
      console.error("DB Error:", error);
      return NextResponse.json({ error: 'Gagal menyimpan pesan ke Database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data[0] });

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // 1. Lazy Cleanup: Hapus pesan yang sudah lebih dari 7 hari dan auto_delete = true
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    await supabaseAdmin
      .from('messages')
      .delete()
      .eq('auto_delete', true)
      .lt('created_at', sevenDaysAgo.toISOString());

    // 2. Ambil pesan yang tersisa
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("DB Error:", error);
      return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
