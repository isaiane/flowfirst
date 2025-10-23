'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'

export default function SignInPage() {
  const [emailInput, setEmailInput] = useState('')

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Entrar</h1>

      <form
        className="flex items-center gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!emailInput) return
          await signIn('email', { email: emailInput, callbackUrl: '/workspaces' })
        }}
      >
        <input
          type="email"
          required
          placeholder="seu@email.com"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          className="px-3 py-2 border rounded w-72"
        />
        <button type="submit" className="px-3 py-2 rounded bg-black text-white">
          Enviar link de login
        </button>
      </form>

      <p className="text-sm text-gray-600">Verifique seu e-mail para o link mágico.</p>
      <a className="underline block mt-2" href="/workspaces">Ir para Workspaces</a>
    </main>
  )
}


