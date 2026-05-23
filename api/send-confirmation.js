import nodemailer from 'nodemailer';

const PLANS = {
  1: { name: 'סטנדרטי', time: '5 ימי עסקים', price: '₪120' },
  2: { name: 'מהיר',    time: '3 ימי עסקים', price: '₪150' },
  3: { name: 'SOS 🔥',  time: '36 שעות',      price: '₪200' },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, course, planId, orderId } = req.body;
  const plan = PLANS[planId] || PLANS[1];

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    // מייל לסטודנט
    await transporter.sendMail({
      from: `"LawRoast 🔥" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '✅ קיבלנו את עבודתך — LawRoast',
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#dc2626;">🔥 LawRoast</h2>
          <p>שלום <strong>${name}</strong>,</p>
          <p>קיבלנו את עבודתך בנושא <strong>${course}</strong> בהצלחה.</p>
          <table style="border-collapse:collapse;width:100%;margin:20px 0;border:1px solid #eee;border-radius:8px;">
            <tr style="background:#f9f8f5;">
              <td style="padding:10px 14px;font-weight:bold;">מסלול</td>
              <td style="padding:10px 14px;">${plan.name}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:bold;">מחיר</td>
              <td style="padding:10px 14px;">${plan.price}</td>
            </tr>
            <tr style="background:#f9f8f5;">
              <td style="padding:10px 14px;font-weight:bold;">זמן טיפול</td>
              <td style="padding:10px 14px;">עד ${plan.time}</td>
            </tr>
          </table>
          <p>עורך דין מהצוות שלנו יעבור בהקדם על העבודה הבינונית שלך וינסה לעזור לך לשפר אותה. אפשר להתנחם בכך שכבר נתקלנו בהמון עבודות בינוניות. קשה יהיה להפתיע אותנו 😉</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#999;font-size:12px;">LawRoast · ביקורת משפטית שלא תשכח</p>
        </div>
      `,
    });

    // התראה לאדמין
    await transporter.sendMail({
      from: `"LawRoast System" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `🔥 הגשה חדשה — ${name}`,
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#dc2626;">הגשה חדשה התקבלה!</h2>
          <table style="border-collapse:collapse;width:100%;border:1px solid #eee;">
            <tr style="background:#f9f8f5;"><td style="padding:10px 14px;font-weight:bold;">שם</td><td style="padding:10px 14px;">${name}</td></tr>
            <tr><td style="padding:10px 14px;font-weight:bold;">מייל</td><td style="padding:10px 14px;">${email}</td></tr>
            <tr style="background:#f9f8f5;"><td style="padding:10px 14px;font-weight:bold;">קורס</td><td style="padding:10px 14px;">${course}</td></tr>
            <tr><td style="padding:10px 14px;font-weight:bold;">מסלול</td><td style="padding:10px 14px;">${plan.name} (${plan.price})</td></tr>
          </table>
          <p style="margin-top:20px;">
            <a href="https://lawroast.vercel.app/#admin"
               style="background:#dc2626;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">
              כנס למערכת הניהול →
            </a>
          </p>
        </div>
      `,
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
