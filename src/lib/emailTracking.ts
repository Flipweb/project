import { supabase } from './supabase';

export interface TrackingEvent {
  user_id?: string;
  email: string;
  event: string;
  status: string;
  error?: string;
}

export async function logEmailEvent({
  user_id,
  email,
  event,
  status,
  error
}: TrackingEvent) {
  try {
    const { data, error: logError } = await supabase
      .from('email_tracking_logs')
      .insert([{
        user_id,
        email,
        event,
        status,
        error,
        created_at: new Date().toISOString()
      }]);

    if (logError) throw logError;
    return data;
  } catch (error) {
    console.error('Failed to log email event:', error);
    throw error;
  }
}

export async function getEmailTrackingLogs(email: string) {
  try {
    const { data, error } = await supabase
      .from('email_tracking_logs')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching email tracking logs:', error);
    throw error;
  }
}