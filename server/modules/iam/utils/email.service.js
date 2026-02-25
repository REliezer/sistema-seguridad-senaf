/**
 * Servicio de envío de emails usando SendGrid
 * Compatible con producción en cualquier hosting (Vercel, Railway, etc)
 * 100 emails/día gratis, sin restricciones de destinatarios
 */

import nodemailer from "nodemailer";

const USE_SENDGRID = process.env.USE_SENDGRID === "1" || process.env.SENDGRID_API_KEY;

/**
 * Envía correo usando SendGrid API (cloud-friendly, sin restricciones)
 */
async function sendWithSendGrid({ to, subject, html }) {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY no configurado");
  }

  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "sistema@senaf.gob.hn";

  // SendGrid usa SMTP también, pero con sus credenciales
  const transporter = nodemailer.createTransport({
    host: "smtp.sendgrid.net",
    port: 587,
    secure: false,
    auth: {
      user: "apikey", // SendGrid siempre usa 'apikey' como usuario
      pass: process.env.SENDGRID_API_KEY,
    },
  });

  const info = await transporter.sendMail({
    from: `"SENAF Sistema" <${fromEmail}>`,
    to,
    subject,
    html,
  });

  return { success: true, messageId: info.messageId };
}

/**
 * Envía correo usando SMTP/Gmail (solo funciona en local/VPS)
 */
async function sendWithGmail({ to, subject, html }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("GMAIL_USER o GMAIL_APP_PASSWORD no configurados");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false,
      minVersion: "TLSv1.2",
    },
  });

  const info = await transporter.sendMail({
    from: `"SENAF Sistema" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });

  return { success: true, messageId: info.messageId };
}

/**
 * Envía correo usando el método disponible
 * Prioridad: SendGrid (prod) > Gmail (local)
 */
export async function sendEmail({ to, subject, html }) {
  try {
    const method = USE_SENDGRID ? "SendGrid" : "Gmail";
    console.log(`[EMAIL] 📧 Enviando correo a: ${to} (método: ${method})`);

    let result;
    if (USE_SENDGRID) {
      result = await sendWithSendGrid({ to, subject, html });
    } else {
      result = await sendWithGmail({ to, subject, html });
    }

    console.log(`[EMAIL] ✅ Correo enviado exitosamente. MessageId: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`[EMAIL] ❌ Error al enviar correo:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Construye el HTML para el email de registro de usuario
 */
export function buildUserRegistrationHTML({ nombre, email, password, fechaRegistro, roles = "" }) {
  return `
    <div style="font-family: sans-serif; background-color: #f5f5f5; padding: 20px;">
      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="background-color:#f4f6f8; padding:20px 0;"
      >
        <tr>
          <td align="center">
            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="max-width:600px; background:#ffffff; border-radius:8px; overflow:hidden;"
            >
              <tr>
                <td align="center" style="padding:15px 20px;">
                  <img
                    src="https://senaf.gob.hn/wp-content/uploads/2025/03/logo.png"
                    width="90"
                    style="display:block; margin-bottom:5px;"
                  />
                  <h2 style="margin:0; color:#2c3e50;">Registro completado</h2>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 30px; color:#333;">
                  <p style="font-size:16px; margin-bottom:20px;">
                    Tu registro ha sido realizado correctamente. A continuación, encontrarás tus credenciales de acceso:
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-bottom:15px;">
                        <p style="margin:0 0 5px; font-size:13px; color:#888;">
                          Nombre completo
                        </p>
                        <table
                          width="100%"
                          cellpadding="0"
                          cellspacing="0"
                          style="border-bottom:1px solid #ddd; background:#fafafa;"
                        >
                          <tr>
                            <td style="padding:10px; font-size:14px;">
                              ${nombre}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:15px;">
                        <p style="margin:0 0 5px; font-size:13px; color:#888;">
                          Correo electrónico
                        </p>
                        <table
                          width="100%"
                          cellpadding="0"
                          cellspacing="0"
                          style="border-bottom:1px solid #ddd; background:#fafafa;"
                        >
                          <tr>
                            <td style="padding:10px; font-size:14px;">
                              ${email}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:15px;">
                        <p style="margin:0 0 5px; font-size:13px; color:#888;">
                          Contraseña temporal
                        </p>
                        <table
                          width="100%"
                          cellpadding="0"
                          cellspacing="0"
                          style="border-bottom:1px solid #ddd; background:#fafafa;"
                        >
                          <tr>
                            <td style="padding:10px; font-size:14px; font-family: monospace;">
                              ${password}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:15px;">
                        <p style="margin:0 0 5px; font-size:13px; color:#888;">
                          Roles asignados
                        </p>
                        <table
                          width="100%"
                          cellpadding="0"
                          cellspacing="0"
                          style="border-bottom:1px solid #ddd; background:#fafafa;"
                        >
                          <tr>
                            <td style="padding:10px; font-size:14px;">
                              ${roles}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:15px;">
                        <p style="margin:0 0 5px; font-size:13px; color:#888;">
                          Fecha de registro
                        </p>
                        <table
                          width="100%"
                          cellpadding="0"
                          cellspacing="0"
                          style="border-bottom:1px solid #ddd; background:#fafafa;"
                        >
                          <tr>
                            <td style="padding:10px; font-size:14px;">
                              ${fechaRegistro}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <p style="text-align:center; font-size:13px; color:#777; margin-top:20px;">
                    Deberás cambiar tu contraseña al iniciar sesión por primera vez.
                  </p>
                  <table
                    align="center"
                    cellpadding="0"
                    cellspacing="0"
                    style="margin-top:20px;"
                  >
                    <tr>
                      <td
                        align="center"
                        bgcolor="#2c3e50"
                        style="border-radius:5px;"
                      >
                        <a
                          href="https://seguridad-senaf.vercel.app/login"
                          style="display:inline-block; padding:12px 20px; color:#ffffff; text-decoration:none; font-size:14px;"
                        >
                          Iniciar sesión
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td
                  align="center"
                  style="padding:15px 20px; font-size:12px; color:#999;"
                >
                  © ${new Date().getFullYear()} SENAF — Sistema de Seguridad
                  <br />
                  Este correo fue generado automáticamente.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}
