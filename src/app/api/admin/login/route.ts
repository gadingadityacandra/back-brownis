import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan Password wajib diisi' }, { status: 400 })
    }

    // Query ke tabel Auth (schema public)
    const { data, error } = await supabaseAdmin
      .from('Auth')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single()

    if (error || !data) {
      // Menangani error jika data tidak ditemukan atau salah
      return NextResponse.json({ error: 'Username atau Password salah!' }, { status: 401 })
    }

    // Jika berhasil
    return NextResponse.json({ success: true, message: 'Login berhasil' })

  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
