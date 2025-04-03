import { supabase } from './supabase';

export interface UserProfile {
  name?: string;
  phone?: string;
  email: string;
}

export async function updateProfile(
  userId: string,
  data: Partial<UserProfile>
): Promise<UserProfile> {
  try {
    // Update user metadata directly using the auth API
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      data: {
        name: data.name,
        phone: data.phone
      }
    });

    if (updateError) throw updateError;

    // Return the updated profile
    return {
      name: updateData.user.user_metadata?.name,
      phone: updateData.user.user_metadata?.phone,
      email: updateData.user.email || ''
    };
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}