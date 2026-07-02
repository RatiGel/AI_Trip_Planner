import nodemailer from "nodemailer";

const SUBJECTS: Record<string, string> = {
  en: "Reset your password",
  ka: "პაროლის აღდგენა",
  ru: "Сброс пароля",
};

const BODY: Record<string, (link: string) => string> = {
  en: (link) =>
    `<p>We received a request to reset your password.</p>
     <p><a href="${link}">Click here to set a new password</a>. This link expires in 1 hour.</p>
     <p>If you didn't request this, ignore this email.</p>`,
  ka: (link) =>
    `<p>მივიღეთ პაროლის აღდგენის მოთხოვნა.</p>
     <p><a href="${link}">დააჭირეთ აქ ახალი პაროლის დასაყენებლად</a>. ბმული მოქმედებს 1 საათის განმავლობაში.</p>
     <p>თუ ეს თქვენ არ მოგითხოვიათ, უგულებელყავით ეს წერილი.</p>`,
  ru: (link) =>
    `<p>Мы получили запрос на сброс пароля.</p>
     <p><a href="${link}">Нажмите здесь, чтобы задать новый пароль</a>. Ссылка действует 1 час.</p>
     <p>Если вы не запрашивали это, проигнорируйте письмо.</p>`,
};

function getTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD not configured");
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendPasswordResetEmail(to: string, link: string, locale: string) {
  const lang = SUBJECTS[locale] ? locale : "en";
  const transport = getTransport();
  // MAIL_FROM = display "from" (e.g. "Visit Tbilisi <visit@tbilisi.ge>").
  // Gmail rewrites this to GMAIL_USER unless it's a verified "Send mail as" alias.
  const from = process.env.MAIL_FROM || process.env.GMAIL_USER;
  await transport.sendMail({
    from,
    replyTo: from,
    to,
    subject: SUBJECTS[lang],
    html: BODY[lang](link),
  });
}
