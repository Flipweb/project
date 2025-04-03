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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { email, redirectTo } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Log the recovery attempt
    const { data: tracking, error: trackingError } = await supabase
      .from('email_tracking_logs')
      .insert([{
        email,
        event: 'password_recovery_requested',
        status: 'pending',
        template_type: 'recovery',
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'web',
          redirectTo
        }
      }])
      .select()
      .single();

    if (trackingError) {
      console.error('Tracking error:', trackingError);
    }

    // Check if user exists
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers({
      filter: {
        email: email
      }
    });

    if (userError) {
      throw userError;
    }

    const userExists = users.length > 0;

    if (!userExists) {
      if (tracking) {
        await supabase
          .from('email_tracking_logs')
          .update({
            event: 'password_recovery_failed',
            status: 'error',
            error: 'User not found',
            metadata: {
              ...tracking.metadata,
              error_at: new Date().toISOString(),
              error_details: 'User not found'
            }
          })
          .eq('id', tracking.id);
      }

      return new Response(
        JSON.stringify({ error: "Email not found" }),
        { 
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Get email template
    const { data: templates, error: templateError } = await supabase
      .rpc('get_template', { template_type: 'recovery' });

    if (templateError) {
      console.error('Template error:', templateError);
      throw new Error('Failed to get email template');
    }

    if (!templates || templates.length === 0) {
      throw new Error('Email template not found');
    }

    const template = templates[0];

    // Generate recovery link
    const { data, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectTo || `${Deno.env.get('SITE_URL')}/reset-password`
      }
    });

    if (resetError) {
      if (tracking) {
        await supabase
          .from('email_tracking_logs')
          .update({
            event: 'password_recovery_failed',
            status: 'error',
            error: resetError.message,
            metadata: {
              ...tracking.metadata,
              error_at: new Date().toISOString(),
              error_details: resetError.message
            }
          })
          .eq('id', tracking.id);
      }
      throw resetError;
    }

    // Send recovery email
    try {
      const emailContent = template.content.replace(
        '{{ .ConfirmationURL }}',
        data.properties.action_link
      );

      await smtp.send({
        from: Deno.env.get("SMTP_FROM"),
        to: email,
        subject: template.subject,
        text: emailContent,
        attachment: [{
          data: `<html>${emailContent}</html>`,
          alternative: true
        }]
      });

      // Update tracking status
      if (tracking) {
        await supabase
          .from('email_tracking_logs')
          .update({
            event: 'password_recovery_email_sent',
            status: 'success',
            metadata: {
              ...tracking.metadata,
              sent_at: new Date().toISOString()
            }
          })
          .eq('id', tracking.id);
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Recovery email sent successfully"
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    } catch (error) {
      // Update tracking with error
      if (tracking) {
        await supabase
          .from('email_tracking_logs')
          .update({
            status: 'error',
            event: 'email_send_failed',
            error: error.message,
            metadata: {
              ...tracking.metadata,
              error_at: new Date().toISOString(),
              error_details: error.message
            }
          })
          .eq('id', tracking.id);
      }

      throw error;
    }
  } catch (error) {
    console.error('Password recovery error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send recovery email' }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});