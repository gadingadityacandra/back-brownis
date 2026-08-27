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
    const adminEmail = authResult.user?.email || null;
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
    } else if ((media_type === 'video' || media_type === 'image') && media_link) {
      // Jika gambar/video, file sudah di-upload sebelumnya lewat /api/upload
      // Kita langsung terima URL-nya dari frontend
      media_url = media_link;
    }

    // Insert ke tabel messages (sesuaikan dengan skema baru)
    let payload: any = { id, recipient, sender, message, media_type, media_url, auto_delete, admin_email: adminEmail };
    let { data, error } = await supabaseAdmin.from('messages').insert([payload]).select();

    // Fallback jika user belum membuat kolom admin_email di Supabase
    if (error && error.message.includes('admin_email')) {
      console.warn("Kolom admin_email tidak ditemukan di Supabase. Melakukan fallback.");
      delete payload.admin_email;
      const fallbackResult = await supabaseAdmin.from('messages').insert([payload]).select();
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

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

export async function GET(request: Request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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
