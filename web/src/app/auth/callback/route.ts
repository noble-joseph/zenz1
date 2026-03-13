import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check if user has completed onboarding
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .maybeSingle();
      
      const targetNext = profile?.display_name ? next : '/onboarding';

      const forwardedHost = request.headers.get('x-forwarded-host') 
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${targetNext}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${targetNext}`)
      } else {
        return NextResponse.redirect(`${origin}${targetNext}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Invalid_Auth_Code`)
}
