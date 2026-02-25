import nodemailer from "nodemailer";

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function normEmail(e) {
  return String(e || "")
    .trim()
    .toLowerCase();
}

export function normBool(v, def = true) {
  if (v === undefined || v === null) return !!def;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    return ["1", "true", "yes", "on"].includes(v.toLowerCase());
  }
  return !!v;
}

export function toStringArray(v) {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  if (typeof v === "string") {
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

// Detecta si un usuario tiene rol de guardia (convenciones: guardia, guard, rondasqr.guard)
export function isGuardRole(u) {
  const NS = process.env.IAM_ROLES_NAMESPACE || "https://senaf.local/roles";
  const roles = [
    ...(Array.isArray(u?.roles) ? u.roles : []),
    ...(Array.isArray(u?.[NS]) ? u[NS] : []),
  ]
    .map((r) => String(r).toLowerCase().trim())
    .filter(Boolean);

  return (
    roles.includes("guardia") ||
    roles.includes("guard") ||
    roles.includes("rondasqr.guard")
  );
}

export async function sendDataUserRegister({ nombre, email, password, fechaRegistro, roles = [] }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error("Faltan credenciales de Gmail");
    return { success: false, error: "Faltan credenciales de Gmail" };
  }

  console.log(`[EMAIL] 📧 Enviando correo a: ${email}`);

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    // Configuración adicional para manejar timeouts
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false,
      minVersion: "TLSv1.2"
    },
    debug: process.env.NODE_ENV === "development",
    logger: process.env.NODE_ENV === "development"

  });

  const htmlContent = `
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
                    Deberás cambiar tu contraseña al iniciar sesión por primera
                    vez.
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
  try {
    const info = await transporter.sendMail({
      from: `"SENAF Sistema" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Credenciales de acceso",
      html: htmlContent,
      text: `Datos de registro de nuevo usuario.`,
    });

    console.log(`[EMAIL] ✅ Correo enviado exitosamente a ${email}.`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL] ❌ Error al enviar correo a ${email}:`, error.message);
    return { success: false, error: error.message };
  }
}
