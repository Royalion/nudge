import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase } from './supabase';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-be80a8fc`;

export async function signUpUser(email: string, password: string, name: string) {
  const response = await fetch(`${SERVER_URL}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`
    },
    body: JSON.stringify({ email, password, name })
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to sign up');
  }
  return data;
}
