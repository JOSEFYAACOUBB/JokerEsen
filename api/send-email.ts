export default async function handler(req: any, res: any) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, api-key'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { subject, htmlContent, senderName, senderEmail, recipients } = req.body || {};

  const apiKey = req.headers['api-key'] || process.env.BREVO_API_KEY || process.env.VITE_BREVO_API_KEY;

  if (!apiKey) {
    return res.status(400).json({
      success: false,
      message: 'Clé API Brevo non fournie.',
    });
  }

  if (!subject || !htmlContent || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Paramètres manquants (sujet, contenu ou destinataires).',
    });
  }

  const cleanSenderName = senderName || 'Club Joker ESEN';
  const cleanSenderEmail = senderEmail || process.env.BREVO_SENDER_EMAIL || process.env.VITE_BREVO_SENDER_EMAIL || 'youssef.dj003@gmail.com';

  try {
    const toList = recipients.map((email: string) => ({ email: email.trim().toLowerCase() }));

    const payload = {
      sender: {
        name: cleanSenderName,
        email: cleanSenderEmail,
      },
      to: toList,
      subject,
      htmlContent,
    };

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (brevoRes.ok || brevoRes.status === 201 || brevoRes.status === 200) {
      const data = await brevoRes.json().catch(() => ({}));
      return res.status(200).json({
        success: true,
        message: `E-mail envoyé avec succès à ${recipients.length} destinataire(s) !`,
        messageId: data?.messageId,
      });
    }

    const errData = await brevoRes.json().catch(() => ({}));
    const rawMsg = errData?.message || `Erreur Brevo (${brevoRes.status})`;

    return res.status(brevoRes.status).json({
      success: false,
      message: rawMsg,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur interne lors de l’envoi de l’e-mail.',
    });
  }
}
