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
    return res.status(200).json({
      success: true,
      message: 'Inscription enregistrée (mode local/Supabase).',
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

    if (brevoRes.ok || brevoRes.status === 201 || brevoRes.status === 204) {
      return res.status(200).json({
        success: true,
        message: 'Inscription confirmée avec succès dans Brevo !',
      });
    }

    const data = await brevoRes.json().catch(() => ({}));
    if (data?.code === 'duplicate_parameter' || brevoRes.status === 400) {
      return res.status(200).json({
        success: true,
        isExisting: true,
        message: 'Vous êtes déjà inscrit à la newsletter du club Joker !',
      });
    }

    return res.status(brevoRes.status).json({
      success: false,
      message: data?.message || 'Erreur lors de l’inscription Brevo',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur interne',
    });
  }
}
