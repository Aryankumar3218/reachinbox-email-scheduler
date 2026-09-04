import nodemailer, { Transporter } from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter: Transporter | null = null;
let activeTestAccount: { user: string; pass: string; web?: string } | null = null;

export async function getSmtpTransporter(): Promise<Transporter> {
  if (transporter) {
    return transporter;
  }

  const user = process.env.ETHEREAL_USER;
  const pass = process.env.ETHEREAL_PASS;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user, pass },
    });
    activeTestAccount = { user, pass };
    console.log(`📧 Configured Ethereal SMTP transporter using provided credentials (${user})`);
  } else {
    // Dynamically generate disposable Ethereal test account
    console.log('🔄 No Ethereal credentials in .env, generating new test account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      activeTestAccount = {
        user: testAccount.user,
        pass: testAccount.pass,
        web: testAccount.web,
      };
      console.log(`✅ Generated dynamic Ethereal test account: ${testAccount.user}`);
    } catch (err: any) {
      console.error('❌ Failed to generate Ethereal test account, using mock transporter:', err.message);
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  return transporter;
}

export function getActiveSmtpAccount() {
  return activeTestAccount;
}

export function getPreviewUrl(info: any): string | false {
  return nodemailer.getTestMessageUrl(info);
}
