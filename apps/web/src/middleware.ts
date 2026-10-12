import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get('host') || '';
  const pathname = url.pathname;

  // Ignorar arquivos estáticos, assets e chamadas de API internas
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/branding') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Detecta se a requisição veio através do subdomínio admin.aprovamind.com.br
  const isSubdomainAdmin =
    host.startsWith('admin.') ||
    host.includes('admin.aprovamind.com.br') ||
    host.includes('admin.localhost');

  if (isSubdomainAdmin) {
    // Se a rota já começar com /admin, não duplica
    if (!pathname.startsWith('/admin')) {
      url.pathname = `/admin${pathname === '/' ? '' : pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
