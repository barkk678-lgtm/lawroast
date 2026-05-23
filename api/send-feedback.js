import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, course, feedback, fileUrl } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    // ← זה החלק החדש - טוען את הקובץ ומצרף אותו למייל
    let attachments = [];
    if (fileUrl) {
      const fileRes = await fetch(fileUrl);
      const fileBuffer = Buffer.from(await fileRes.arrayBuffer());
      const fileName = decodeURIComponent(fileUrl.split('/').pop().split('?')[0]) || 'עבודה_בדוקה.pdf';
      attachments = [{ filename: fileName, content: fileBuffer }];
    }

    await transporter.sendMail({
      from: `"LawRoast 🔥" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `📝 המשוב על עבודתך מוכן — ${course}`,
      attachments, // ← זה מצרף את הקובץ
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#dc2626;">🔥 המשוב שלך מוכן</h2>
          <p>שלום <strong>${name}</strong>,</p>
          <p>סיימנו לבדוק את עבודתך בנושא <strong>${course}</strong>.</p>
          ${feedback ? `
            <div style="background:#f9f8f5;border-right:4px solid #dc2626;padding:16px 20px;margin:20px 0;border-radius:4px;">
              <p style="margin:0;line-height:1.7;white-space:pre-wrap;">${feedback}</p>
            </div>
          ` : ''}
          <p>העבודה הבדוקה מצורפת למייל זה.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#999;font-size:12px;">LawRoast · ביקורת משפטית שלא תשכח</p>
        </div>
      `,
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
