import { PrismaAdapter } from '@next-auth/prisma-adapter'
import EmailProvider from 'next-auth/providers/email'
import type { NextAuthOptions } from 'next-auth'
import nodemailer from 'nodemailer'
import fs from 'node:fs'
import path from 'node:path'
import { prisma } from './db'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'database' },
  pages: { signIn: '/signin' },
  providers: [
    EmailProvider({
      async sendVerificationRequest({ identifier, url }) {
        let transporter: any
        let usedEthereal = false
        const logPath = path.join(process.cwd(), '.ethereal-preview.log')

        if (process.env.EMAIL_HOST) {
          transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT ?? 587),
            secure: false,
            auth: process.env.EMAIL_USER
              ? { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
              : undefined,
          })
        } else {
          const testAccount = await nodemailer.createTestAccount()
          transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass },
          })
          usedEthereal = true
          console.log('[Auth] Usando Ethereal para e-mails de desenvolvimento:', testAccount.user)
        }

        const host = new URL(url).host
        const subject = `Seu link de login para ${host}`
        const text = `Entre no ${host} usando este link:\n${url}\n\nO link expira em alguns minutos.`
        const html = `
          <div style=\"font-family:sans-serif\">\n            <p>Entre no <b>${host}</b> usando este link:</p>\n            <p><a href=\"${url}\">${url}</a></p>\n            <p style=\"color:#666;font-size:12px\">O link expira em alguns minutos.</p>\n          </div>
        `

        async function sendAndLog(t: any) {
          const info = await t.sendMail({
            to: identifier,
            from: process.env.EMAIL_FROM ?? 'no-reply@example.com',
            subject,
            text,
            html,
          })
          const previewUrl = (nodemailer as any).getTestMessageUrl?.(info)
          if (previewUrl) {
            console.log('[Auth] Preview Ethereal:', previewUrl)
            try { fs.appendFileSync(logPath, previewUrl + '\n') } catch {}
          }
        }

        try {
          await sendAndLog(transporter)
        } catch (err) {
          const testAccount = await nodemailer.createTestAccount()
          const etherealTransporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass },
          })
          usedEthereal = true
          console.warn('[Auth] SMTP primário falhou, caindo para Ethereal:', (err as Error).message)
          await sendAndLog(etherealTransporter)
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        ;(session.user as any).id = user.id
      }
      return session
    },
  },
}


