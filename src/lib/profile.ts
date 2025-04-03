import { supabase } from './supabase';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js/types';

export interface UserProfile {
  name?: string;
  phone?: string;
  email: string;
  countryCode?: string;
}

export async function updateProfile(
  userId: string,
  data: Partial<UserProfile>
): Promise<UserProfile> {
  try {
    // Get current user data
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('User not found');

    // Validate phone number if provided
    if (data.phone) {
      try {
        const countryCode = (data.countryCode || 'RU') as CountryCode;
        const isValid = isValidPhoneNumber(data.phone, countryCode);
        if (!isValid) {
          throw new Error('Неверный формат номера телефона');
        }
        
        // Parse and format the phone number
        const phoneNumber = parsePhoneNumber(data.phone, countryCode);
        data.phone = phoneNumber.format('E.164');
      } catch (err) {
        throw new Error('Неверный формат номера телефона');
      }
    }

    // Update user metadata
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata, // Preserve existing metadata
        ...(data.name && { name: data.name }),
        ...(data.phone && { 
          phone: data.phone,
          countryCode: data.countryCode || 'RU'
        })
      }
    });

    if (updateError) throw updateError;

    // Return the updated profile
    return {
      name: updateData.user.user_metadata?.name || '',
      phone: updateData.user.user_metadata?.phone || '',
      email: updateData.user.email || '',
      countryCode: updateData.user.user_metadata?.countryCode || 'RU'
    };
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}