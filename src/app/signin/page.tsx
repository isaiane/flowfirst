'use client'
import { signIn } from 'next-auth/react'

export default function SignInPage() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Entrar</h1>
      <button onClick={() => signIn('github')} className="px-3 py-2 rounded bg-black text-white">
        Entrar com GitHub
      </button>
      <p className="text-sm text-gray-600">Após entrar, crie ou selecione um workspace.</p>
      <a className="underline block mt-2" href="/workspaces">Ir para Workspaces</a>
    </main>
  )
}


