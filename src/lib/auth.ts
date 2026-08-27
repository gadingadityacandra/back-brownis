import { supabaseAdmin } from './supabase-admin';

export async function verifyAuth(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}
