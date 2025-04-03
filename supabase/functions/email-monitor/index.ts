import { createClient } from "npm:@supabase/supabase-js@2.39.7";

interface EmailEvent {
  id: string;
  timestamp: string;
  type: 'sent' | 'delivered' | 'bounced' | 'failed';
  recipient: string;
  status: string;
  error?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Handle different routes
    const url = new URL(req.url);
    const path = url.pathname.replace('/email-monitor', '');

    if (req.method === "POST" && path === "/log") {
      const { event }: { event: EmailEvent } = await req.json();
      
      const { error } = await supabase
        .from('email_logs')
        .insert([{
          email_id: event.id,
          recipient: event.recipient,
          type: event.type,
          status: event.status,
          error: event.error,
          timestamp: event.timestamp
        }]);

      if (error) throw error;

      // If it's a failure, trigger alerts
      if (event.type === 'failed' || event.type === 'bounced') {
        await triggerAlert(event);
      }

      return new Response(
        JSON.stringify({ data: { success: true }, error: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "GET" && path === "/stats") {
      const { data, error } = await supabase
        .from('email_logs')
        .select('type, status')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const stats = {
        total: data.length,
        sent: data.filter(log => log.type === 'sent').length,
        delivered: data.filter(log => log.type === 'delivered').length,
        bounced: data.filter(log => log.type === 'bounced').length,
        failed: data.filter(log => log.type === 'failed').length,
      };

      return new Response(
        JSON.stringify({ data: stats, error: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not Found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function triggerAlert(event: EmailEvent) {
  console.error(`Email delivery failure: ${event.id}`, {
    recipient: event.recipient,
    type: event.type,
    status: event.status,
    error: event.error,
    timestamp: event.timestamp
  });
}