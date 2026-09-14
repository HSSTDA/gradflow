import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'GradFlow <noreply@gradflow.online>',
      to,
      subject,
      html,
    })
    return { success: !error, data }
  } catch (err) {
    console.error(err)
    return { success: false }
  }
}
