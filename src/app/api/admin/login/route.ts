import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
    const textBody = await request.text();
    console.log("Raw body received:", textBody);
    
    let body;
    try {
      body = JSON.parse(textBody);
    } catch (e) {
      console.error("Failed to parse JSON body");
      return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 });
    }

    const email = body.email || body.username;
    const password = body.password;
    console.log("Parsed email:", email);

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan Password wajib diisi' }, { status: 400 })
    }

    // Menggunakan Supabase Auth (bawaan)
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) {
      console.error("Supabase Auth Error:", error);
      let errorMessage = error.message;
      if (errorMessage === "Invalid login credentials") {
        errorMessage = "Email atau password salah!";
      } else if (errorMessage === "Email not confirmed") {
        errorMessage = "Email belum dikonfirmasi! Pastikan Anda sudah mematikan opsi 'Confirm email' di Supabase.";
      }
      return NextResponse.json({ error: errorMessage }, { status: error.status || 400 })
    }

    if (!data.session) {
      return NextResponse.json({ error: 'Sesi tidak valid' }, { status: 401 })
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
