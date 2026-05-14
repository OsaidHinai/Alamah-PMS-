import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function proxy(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname.replace('/api/', '');
  const search = req.nextUrl.search;
  const url = `${BACKEND_URL}/${path}${search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!['host', 'connection', 'transfer-encoding'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer();

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body: body && body.byteLength > 0 ? body : undefined,
    redirect: 'manual',
  });

  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'transfer-encoding') {
      resHeaders.set(key, value);
    }
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
