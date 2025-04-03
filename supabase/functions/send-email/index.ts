import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import { SMTPClient } from "npm:emailjs@4.0.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Configure SMTP client
const smtp = new SMTPClient({
  user: Deno.env.get("SMTP_USER"),
  password: Deno.env.get("SMTP_PASSWORD"),
  host: Deno.env.get("SMTP_HOST"),
  port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
  tls: true,
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { email, template_type, data } = await req.json();

    if (!email || !template_type) {
      return new Response(
        JSON.stringify({ error: "Email and template_type are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get email template
    const { data: template, error: templateError } = await supabase.rpc(
      "get_email_template",
      { template_type }
    );

    if (templateError || !template) {
      throw new Error("Failed to get email template");
    }

    // Track email sending attempt
    const { data: tracking, error: trackingError } = await supabase
      .from("email_tracking_logs")
      .insert([
        {
          email,
          event: "email_send_initiated",
          status: "pending",
          template_type,
          metadata: {
            timestamp: new Date().toISOString(),
            template_data: data,
          },
        },
      ])
      .select()
      .single();

    if (trackingError) {
      throw trackingError;
    }

    try {
      // Send email
      await smtp.send({
        from: Deno.env.get("SMTP_FROM"),
        to: email,
        subject: template.subject,
        text: template.content.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, key) => {
          return data[key.trim()] || "";
        }),
      });

      // Update tracking status
      await supabase
        .from("email_tracking_logs")
        .update({
          status: "sent",
          event: "email_sent",
          metadata: {
            ...tracking.metadata,
            sent_at: new Date().toISOString(),
          },
        })
        .eq("id", tracking.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Email sent successfully",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      // Update tracking with error
      await supabase
        .from("email_tracking_logs")
        .update({
          status: "error",
          event: "email_send_failed",
          error: error.message,
          metadata: {
            ...tracking.metadata,
            error_at: new Date().toISOString(),
            error_details: error.message,
          },
        })
        .eq("id", tracking.id);

      throw error;
    }
  } catch (error) {
    console.error("Email sending error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});