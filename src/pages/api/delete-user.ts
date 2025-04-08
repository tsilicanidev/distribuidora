// pages/api/delete-user.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// ⚠️ Nunca exponha essa key no frontend
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  const { id } = req.body

  if (!id) {
    return res.status(400).json({ message: 'User ID is required' })
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (error) {
      console.error('Erro ao deletar usuário:', error)
      return res.status(500).json({ message: error.message })
    }

    return res.status(200).json({ message: 'Usuário deletado com sucesso' })
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Erro interno' })
  }
}
