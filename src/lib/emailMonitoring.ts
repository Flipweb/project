import { supabase } from './supabase';

export interface EmailStats {
  total_sent: number;
  total_delivered: number;
  total_bounced: number;
  total_failed: number;
  delivery_rate: number;
}

export interface EmailStatus {
  type: 'sent' | 'delivered' | 'bounced' | 'failed';
  status: string;
  timestamp: string;
  error?: string;
}

export async function getEmailStats(startDate: Date, endDate: Date): Promise<EmailStats> {
  try {
    const { data, error } = await supabase
      .rpc('get_email_stats', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error fetching email stats:', error);
    throw error;
  }
}

export async function getEmailStatus(recipient: string): Promise<EmailStatus | null> {
  try {
    console.log('🔍 Checking email status for:', recipient);
    
    // First, check auth.users table for confirmation status
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
    } else if (user) {
      console.log('👤 User confirmation status:', {
        email: user.email,
        confirmation_sent_at: user.confirmation_sent_at,
        email_confirmed_at: user.email_confirmed_at,
        last_sign_in_at: user.last_sign_in_at
      });
    }
    
    // Then check email_logs table
    const { data: logs, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('recipient', recipient)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching email logs:', error);
      throw error;
    }

    console.log('📧 Email logs found:', logs);

    if (!logs || logs.length === 0) {
      console.log('❌ No email logs found for:', recipient);
      return null;
    }

    console.log('📬 Latest email status:', logs[0]);
    return logs[0] as EmailStatus;
  } catch (error) {
    console.error('Error getting email status:', error);
    throw error;
  }
}

export async function monitorEmailDelivery(emailId: string, recipient: string): Promise<void> {
  try {
    console.log('🚀 Starting email delivery monitoring:', {
      emailId,
      recipient,
      timestamp: new Date().toISOString()
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      throw userError;
    }
    if (!user) {
      console.error('No authenticated user found');
      throw new Error('No authenticated user');
    }

    // Check if confirmation email was sent
    console.log('👤 User confirmation status:', {
      userId: user.id,
      email: user.email,
      confirmation_sent_at: user.confirmation_sent_at,
      email_confirmed_at: user.email_confirmed_at,
      last_sign_in_at: user.last_sign_in_at
    });

    // Insert initial email log
    const { error: insertError } = await supabase
      .from('email_logs')
      .insert([{
        email_id: emailId,
        recipient,
        type: 'sent',
        status: 'initiated',
        timestamp: new Date().toISOString(),
        user_id: user.id
      }]);

    if (insertError) {
      console.error('Error inserting email log:', insertError);
      throw insertError;
    }

    console.log('✅ Initial email log created');

    // Monitor delivery status
    const maxRetries = 3;
    let retryCount = 0;
    let lastStatus = null;

    const checkDeliveryStatus = async () => {
      try {
        console.log(`🔄 Checking delivery status (attempt ${retryCount + 1}/${maxRetries})`);

        const { data: logs, error } = await supabase
          .from('email_logs')
          .select('*')
          .eq('email_id', emailId)
          .order('timestamp', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error checking delivery status:', error);
          return;
        }

        const currentStatus = logs?.[0];
        console.log('📊 Current delivery status:', currentStatus);

        if (currentStatus?.status !== lastStatus) {
          console.log('📝 Status changed:', {
            from: lastStatus,
            to: currentStatus?.status
          });
          lastStatus = currentStatus?.status;
        }

        // Check if we need to retry
        if (currentStatus?.type === 'failed' && retryCount < maxRetries) {
          retryCount++;
          console.log(`🔄 Retrying email delivery (${retryCount}/${maxRetries})`);
          
          const { error: retryError } = await supabase
            .from('email_logs')
            .insert([{
              email_id: emailId,
              recipient,
              type: 'sent',
              status: 'retry',
              timestamp: new Date().toISOString(),
              user_id: user.id
            }]);

          if (retryError) {
            console.error('Error logging retry attempt:', retryError);
          }
        }
      } catch (error) {
        console.error('Error in checkDeliveryStatus:', error);
      }
    };

    // Check status every 30 seconds for 5 minutes
    const interval = setInterval(checkDeliveryStatus, 30000);
    setTimeout(() => {
      clearInterval(interval);
      console.log('⏱️ Email monitoring completed');
    }, 300000);

    // Initial check
    await checkDeliveryStatus();

  } catch (error) {
    console.error('❌ Error monitoring email delivery:', error);
    throw error;
  }
}