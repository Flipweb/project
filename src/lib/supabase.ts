import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const siteUrl = import.meta.env.VITE_APP_URL;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

if (!siteUrl) {
  throw new Error('Missing VITE_APP_URL environment variable');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: true,
    // Configure redirect URLs
    redirectTo: `${siteUrl}/reset-password`,
    // Ensure site URL is properly configured
    site_url: siteUrl,
    // Disable magic links to ensure password-based signup
    enableMagicLink: false,
    storageKey: 'supabase.auth.token',
    storage: window.localStorage
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js/2.39.7'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Enhanced auth state change monitoring with email focus
supabase.auth.onAuthStateChange((event, session) => {
  // Log auth state changes with detailed information
  console.log(`🔐 [Auth Event] ${event}`, {
    session,
    timestamp: new Date().toISOString(),
    details: {
      user: session?.user,
      eventType: event,
      confirmationSent: session?.user?.confirmation_sent_at,
      emailConfirmed: session?.user?.email_confirmed_at,
      lastSignIn: session?.user?.last_sign_in_at,
      emailRedirectTo: `${siteUrl}/reset-password`,
      siteUrl: siteUrl
    }
  });

  // Handle specific auth events
  switch (event) {
    case 'SIGNED_UP':
      console.log('📧 User signed up - Verification email should be sent:', {
        user: session?.user,
        email: session?.user?.email,
        confirmationSent: session?.user?.confirmation_sent_at,
        timestamp: new Date().toISOString()
      });
      break;
    case 'SIGNED_IN':
      console.log('👤 User signed in:', {
        user: session?.user,
        timestamp: new Date().toISOString()
      });
      break;
    case 'SIGNED_OUT':
      console.log('👋 User signed out');
      break;
    case 'USER_UPDATED':
      console.log('✏️ User updated:', {
        user: session?.user,
        timestamp: new Date().toISOString()
      });
      break;
    case 'USER_DELETED':
      console.log('🗑️ User deleted');
      break;
    case 'PASSWORD_RECOVERY':
      console.log('🔑 Password recovery requested');
      break;
    case 'TOKEN_REFRESHED':
      console.log('🔄 Token refreshed');
      break;
    default:
      console.log(`ℹ️ Auth event: ${event}`);
  }

  // Log any errors
  if (session?.error) {
    console.error('🔥 Auth Error:', {
      event,
      error: session.error,
      timestamp: new Date().toISOString()
    });
  }
});

// Configure Edge Functions
supabase.functions.setAuth(supabaseAnonKey);