import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;

    if (!id) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error("DB Error:", error);
      return NextResponse.json({ error: 'Pesan tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    if (!id) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

    const formData = await request.formData();
    const recipient = formData.get('recipient') as string;
    const sender = formData.get('sender') as string;
    const message = formData.get('message') as string;
    const auto_delete = formData.get('auto_delete') === 'true';

    const updateData: any = { recipient, sender, message, auto_delete };

    // Jika admin mengubah media
    const mediaType = formData.get('media_type') as string | null;
    if (mediaType) {
      let mediaUrl = '';
      if (mediaType === 'youtube') {
        mediaUrl = formData.get('media_link') as string;
      } else if (mediaType === 'image' || mediaType === 'video') {
        const file = formData.get('media_file') as File;
        if (!file) {
          return NextResponse.json({ error: 'File media tidak ditemukan' }, { status: 400 });
        }
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabaseAdmin
          .storage
          .from('media')
          .upload(filePath, file, {
            contentType: file.type,
          });

        if (uploadError) {
          console.error("Upload Error:", uploadError);
          return NextResponse.json({ error: 'Gagal mengunggah media baru' }, { status: 500 });
        }

        const { data: publicUrlData } = supabaseAdmin
          .storage
          .from('media')
          .getPublicUrl(filePath);

        mediaUrl = publicUrlData.publicUrl;
      }

      updateData.media_type = mediaType;
      updateData.media_url = mediaUrl;
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error("DB Error:", error);
      return NextResponse.json({ error: 'Gagal mengupdate data' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    if (!id) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

    // 1. Ambil data dulu untuk mengecek apakah ada file media di storage
    const { data: msgData, error: msgError } = await supabaseAdmin
      .from('messages')
      .select('media_type, media_url')
      .eq('id', id)
      .single();

    if (msgError) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }

    // 2. Hapus file di storage jika tipenya image atau video
    if (msgData && (msgData.media_type === 'image' || msgData.media_type === 'video') && msgData.media_url) {
      // Ekstrak nama file dari URL (bagian terakhir setelah /)
      const parts = msgData.media_url.split('/');
      const fileName = parts[parts.length - 1];
      if (fileName) {
        await supabaseAdmin.storage.from('videos').remove([fileName]);
      }
    }

    // 3. Hapus data di database
    const { error: deleteError } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: 'Gagal menghapus data dari database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Data berhasil dihapus' });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
