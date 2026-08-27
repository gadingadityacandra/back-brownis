import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan Password wajib diisi' }, { status: 400 })
    }

    // Menggunakan Supabase Auth (bawaan)
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error || !data.session) {
      return NextResponse.json({ error: 'Email atau Password salah!' }, { status: 401 })
    }

    // Mengirimkan token ke frontend
    return NextResponse.json({ 
      success: true, 
      message: 'Login berhasil',
      token: data.session.access_token 
    })

  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
