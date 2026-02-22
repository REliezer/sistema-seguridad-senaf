import { createHash } from "node:crypto";
import nodemailer from "nodemailer";

export const CODE_TTL_MS = 10 * 60 * 1000;
export const CODE_MAX_ATTEMPTS = 3;

export function hashCode(code) {
  return createHash("sha256")
    .update(String(code || ""))
    .digest("hex");
}

export async function sendPasswordCode({ email, code }) {
  console.log({ email, code });

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error("Faltan credenciales de Gmail");
return { success: false, error: "Faltan credenciales de Gmail" };
  }

  const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const safeCode = String(code).replace(/[^0-9]/g, "");

  const htmlContent = `
    <div style="font-family: sans-serif; background-color: #f5f5f5; padding: 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background: #ffffff;">
        <tr>
          <td style="padding: 20px 30px; text-align: center;">
            <img
              src="https://senaf.gob.hn/wp-content/uploads/2025/03/logo.png"
              width="100"
              style="display:block; margin:0 auto;"
            />
            <h1 style="color: #2c3e50; text-align: center;">
              Código de verificación
            </h1>
            <p style="color: #333;">Tu código de verificación es:</p>
            <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; background:#f4f6f8; padding:10px 15px; display:inline-block;">
              ${safeCode}
            </p>
            <p style="color:#555;">Este código expira en 10 minutos.</p>
            <p style="color:#999; font-size:12px;">
              Si no solicitaste este código, puedes ignorar este mensaje.
            </p>
            <p style="color: #999; font-size: 11px;">
              Este mensaje fue generado automáticamente. No responder.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 15px 30px; background-color: #f0f0f0; text-align: center; font-size: 12px; color: #999;">
            © ${new Date().getFullYear()} SENAF — Sistema Seguridad
          </td>
        </tr>
      </table>
    </div>
  `;
  try {
    const info = await transporter.sendMail({
      from: `"SENAF Sistema" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Código de verificación SENAF",
      html: htmlContent,
      text: `Tu código de verificación es: ${safeCode}`,
    });

    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function buildUserJwtPayload(user) {
  return {
    sub: user.externalId || String(user._id),
    email: user.email || null,
    name: user.name || null,
    roles: Array.isArray(user.roles) ? user.roles : [],
    permissions: Array.isArray(user.perms) ? user.perms : [],
  };
}

export function clearAuthCookies(res) {
  const names = [
    "access_token",
    "id_token",
    "refresh_token",
    "token",
    "jwt",
    "connect.sid",
  ];

  for (const name of names) {
    res.clearCookie(name, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    res.clearCookie(name, {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
}
