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

  const { email, firstName, lastName, source, listId } = req.body || {};
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ message: 'Adresse e-mail invalide' });
  }

  const apiKey = process.env.BREVO_API_KEY || process.env.VITE_BREVO_API_KEY;
  const configuredListId = listId || process.env.BREVO_LIST_ID || process.env.VITE_BREVO_LIST_ID;

  if (!apiKey) {
    return res.status(400).json({
      success: false,
      message: 'Clé API Brevo non configurée dans Vercel (BREVO_API_KEY).',
    });
  }

  try {
    const payload: Record<string, any> = {
      email: cleanEmail,
      updateEnabled: true,
      attributes: {
        SOURCE: source || 'Website Newsletter API',
        SIGNUP_DATE: new Date().toISOString().split('T')[0],
      },
    };

    if (firstName) payload.attributes.FIRSTNAME = firstName;
    if (lastName) payload.attributes.LASTNAME = lastName;
    if (configuredListId && !isNaN(Number(configuredListId))) {
      payload.listIds = [Number(configuredListId)];
    }

    const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    let isExisting = false;
    if (brevoRes.ok || brevoRes.status === 201 || brevoRes.status === 204) {
      isExisting = false;
    } else {
      const data = await brevoRes.json().catch(() => ({}));
      if (data?.code === 'duplicate_parameter' || brevoRes.status === 400) {
        isExisting = true;
      } else {
        return res.status(brevoRes.status).json({
          success: false,
          message: data?.message || 'Erreur lors de l’inscription Brevo',
        });
      }
    }

    // Try sending welcome email confirmation via Brevo SMTP API
    try {
      const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.VITE_BREVO_SENDER_EMAIL || 'youssef.dj003@gmail.com';
      const senderName = process.env.BREVO_SENDER_NAME || process.env.VITE_BREVO_SENDER_NAME || 'Club Joker ESEN';

      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: cleanEmail }],
          subject: '🃏 Bienvenue au Club Joker ESEN !',
          htmlContent: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #B93A34;">Bienvenue au Club Joker ESEN ! 🃏</h2>
              <p>Bonjour,</p>
              <p>Merci de vous être inscrit aux alertes et à la newsletter du <strong>Club Joker ESEN</strong> !</p>
              <p>Vous recevrez désormais nos actualités, billetteries d'événements et annonces en avant-première.</p>
              <p>À très bientôt sur le campus !</p>
            </div>
          `,
        }),
      });
    } catch (e) {
      console.warn('Welcome email warning in serverless function:', e);
    }

    return res.status(200).json({
      success: true,
      isExisting,
      message: isExisting
        ? 'Vous êtes déjà inscrit aux alertes, un e-mail de confirmation vous a été renvoyé !'
        : 'Merci ! Votre inscription est validée et un e-mail de confirmation vous a été envoyé.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur interne',
    });
  }
}
