// pages/api/create-user.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Supabase Admin Client com a service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  const { email, password, full_name, role } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios.' })
  }

  try {
    // 1. Cria o usuário no auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      user_metadata: {
        full_name: full_name.trim(),
        role,
      },
    });
  
    if (error) {
      console.error('Erro ao criar usuário no auth:', error);
      return res.status(500).json({ message: error.message });
    }
  
    const userId = data?.user?.id;
    if (!userId) {
      return res.status(500).json({ message: 'ID do usuário não foi retornado pelo Supabase.' });
    }
  
    // 2. Cria o profile associado
    const { error: profileError } = await supabaseAdmin.from('profiles').insert([
      {
        id: userId,
        email: email.trim(),
        full_name: full_name.trim(),
        role,
        created_at: new Date().toISOString(), // se sua tabela tiver esse campo
      },
    ]);
  
    if (profileError) {
      console.error('Erro ao criar profile:', profileError);
  
      // Rollback: deleta o usuário no auth
      await supabaseAdmin.auth.admin.deleteUser(userId);
  
      return res.status(500).json({
        message: 'Erro ao criar perfil. O usuário foi removido por segurança.',
      });
    }
  
    // 3. Sucesso total
    return res.status(201).json({
      message: 'Usuário e perfil criados com sucesso.',
      user: data.user,
    });
  
  } catch (err: any) {
    console.error('Erro inesperado no servidor:', err);
    return res.status(500).json({ message: err.message || 'Erro interno no servidor' });
  }
}