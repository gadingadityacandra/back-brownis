import { supabaseAdmin } from './supabase-admin';

export async function verifyAuth(request: Request): Promise<{ isValid: boolean, user?: any }> {
  const authHeader = request.headers.get('Authorization');
  console.log("verifyAuth: authHeader present?", !!authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("verifyAuth: Missing or invalid Authorization header");
    return { isValid: false };
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !data.user) {
      console.error("verifyAuth: getUser error:", error?.message || "No user found");
      return { isValid: false };
    }
    
    console.log("verifyAuth: User verified successfully", data.user.id);
    return { isValid: true, user: data.user };
  } catch (error: any) {
    console.error("verifyAuth: catch block error:", error?.message);
    return { isValid: false };
  }
}
