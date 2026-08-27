import { NextResponse } from 'next/server';

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://brownies-app.web.app',
  'https://iambrownies.my.id',
  'https://www.iambrownies.my.id',
  'https://back-brownis.vercel.app',
  'https://front-brownis.vercel.app',
];

export function middleware(request: Request) {
  const origin = request.headers.get('origin') ?? '';
  
  // Set origin jika sesuai, atau biarkan '*' (kurang aman untuk production, tapi oke untuk MVP awal)
  const isAllowedOrigin = allowedOrigins.includes(origin);
  const corsOrigin = isAllowedOrigin ? origin : '*';

  // Handle preflight (OPTIONS)
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Handle actual request
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', corsOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
