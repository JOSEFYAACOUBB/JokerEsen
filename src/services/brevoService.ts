import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface BrevoConfig {
  apiKey: string;
  listId?: number;
  senderName?: string;
  senderEmail?: string;
}

export interface NewsletterSubscriber {
  id?: string;
  email: string;
  created_at?: string;
  source?: string;
  synced_to_brevo?: boolean;
}

export interface BrevoSender {
  id: number;
  name: string;
  email: string;
  active: boolean;
}

const LOCAL_STORAGE_BREVO_KEY = 'joker_brevo_api_key';
const LOCAL_STORAGE_BREVO_LIST_KEY = 'joker_brevo_list_id';
const LOCAL_STORAGE_BREVO_SENDER_NAME_KEY = 'joker_brevo_sender_name';
const LOCAL_STORAGE_BREVO_SENDER_EMAIL_KEY = 'joker_brevo_sender_email';
const LOCAL_STORAGE_SUBSCRIBERS_KEY = 'joker_newsletter_subscribers';

/**
 * Retrieve current Brevo API Key and config from Environment or Local Storage
 */
export function getBrevoConfig(): BrevoConfig {
  const envKey = (import.meta as any).env?.VITE_BREVO_API_KEY || '';
  const envListId = (import.meta as any).env?.VITE_BREVO_LIST_ID;
  const envSenderName = (import.meta as any).env?.VITE_BREVO_SENDER_NAME || 'Club Joker ESEN';
  const envSenderEmail = (import.meta as any).env?.VITE_BREVO_SENDER_EMAIL || '';

  const savedKey = localStorage.getItem(LOCAL_STORAGE_BREVO_KEY) || envKey;
  const savedListId = localStorage.getItem(LOCAL_STORAGE_BREVO_LIST_KEY)
    ? Number(localStorage.getItem(LOCAL_STORAGE_BREVO_LIST_KEY))
    : (envListId ? Number(envListId) : undefined);
  const savedSenderName = localStorage.getItem(LOCAL_STORAGE_BREVO_SENDER_NAME_KEY) || envSenderName;
  const savedSenderEmail = localStorage.getItem(LOCAL_STORAGE_BREVO_SENDER_EMAIL_KEY) || envSenderEmail;

  return {
    apiKey: savedKey.trim(),
    listId: savedListId && !isNaN(savedListId) ? savedListId : undefined,
    senderName: savedSenderName,
    senderEmail: savedSenderEmail,
  };
}

/**
 * Save Brevo settings to Local Storage for dynamic admin configuration
 */
export function saveBrevoConfig(
  apiKey: string,
  listId?: number,
  senderName?: string,
  senderEmail?: string
): void {
  if (apiKey) {
    localStorage.setItem(LOCAL_STORAGE_BREVO_KEY, apiKey.trim());
  } else {
    localStorage.removeItem(LOCAL_STORAGE_BREVO_KEY);
  }

  if (listId && !isNaN(listId)) {
    localStorage.setItem(LOCAL_STORAGE_BREVO_LIST_KEY, String(listId));
  } else {
    localStorage.removeItem(LOCAL_STORAGE_BREVO_LIST_KEY);
  }

  if (senderName) {
    localStorage.setItem(LOCAL_STORAGE_BREVO_SENDER_NAME_KEY, senderName.trim());
  }

  if (senderEmail) {
    localStorage.setItem(LOCAL_STORAGE_BREVO_SENDER_EMAIL_KEY, senderEmail.trim());
  }
}

/**
 * Get all cached newsletter subscribers
 */
export function getCachedSubscribers(): NewsletterSubscriber[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SUBSCRIBERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save subscriber to local cache
 */
export function cacheSubscriberLocally(email: string, synced: boolean = false): void {
  try {
    const existing = getCachedSubscribers();
    if (!existing.some(s => s.email.toLowerCase() === email.toLowerCase())) {
      const updated = [
        {
          id: `sub-${Date.now()}`,
          email: email.trim().toLowerCase(),
          created_at: new Date().toISOString(),
          source: 'website_agenda',
          synced_to_brevo: synced,
        },
        ...existing,
      ];
      localStorage.setItem(LOCAL_STORAGE_SUBSCRIBERS_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Error caching subscriber locally:', err);
  }
}

/**
 * Subscribe an email address to Brevo newsletter and sync with Supabase / local database
 */
export async function subscribeToNewsletter(
  email: string,
  options?: { firstName?: string; lastName?: string; source?: string }
): Promise<{ success: boolean; message: string; isExisting?: boolean }> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, message: 'Veuillez entrer une adresse e-mail valide.' };
  }

  const { apiKey, listId } = getBrevoConfig();
  let brevoSuccess = false;
  let isExistingContact = false;

  // 1. Try Brevo API
  if (apiKey) {
    try {
      const payload: Record<string, any> = {
        email: cleanEmail,
        updateEnabled: true,
        attributes: {
          SOURCE: options?.source || 'Website Agenda Band',
          SIGNUP_DATE: new Date().toISOString().split('T')[0],
        },
      };

      if (options?.firstName) {
        payload.attributes.FIRSTNAME = options.firstName;
      }
      if (options?.lastName) {
        payload.attributes.LASTNAME = options.lastName;
      }
      if (listId) {
        payload.listIds = [listId];
      }

      const response = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok || response.status === 201 || response.status === 204) {
        brevoSuccess = true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (errorData?.code === 'duplicate_parameter' || response.status === 400) {
          brevoSuccess = true;
          isExistingContact = true;
        } else {
          console.warn('Brevo API response:', errorData);
        }
      }
    } catch (err) {
      console.warn('Brevo subscription network request failed (fallback to Supabase/local):', err);
    }
  }

  // 2. Dual-write to Supabase if configured
  if (isSupabaseConfigured) {
    try {
      await supabase.from('newsletter_subscribers').upsert(
        {
          email: cleanEmail,
          source: options?.source || 'website_agenda',
          synced_to_brevo: brevoSuccess,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      );
    } catch (err) {
      console.warn('Supabase newsletter subscriber storage notice:', err);
    }
  }

  // 3. Always cache locally
  cacheSubscriberLocally(cleanEmail, brevoSuccess);

  if (isExistingContact) {
    return {
      success: true,
      message: 'Vous êtes déjà inscrit aux alertes et actualités du Club Joker !',
      isExisting: true,
    };
  }

  return {
    success: true,
    message: 'Merci ! Votre inscription aux alertes et à la newsletter a bien été confirmée.',
  };
}

/**
 * Fetch verified senders from Brevo account
 */
export async function getBrevoSenders(): Promise<BrevoSender[]> {
  const { apiKey } = getBrevoConfig();
  if (!apiKey) return [];

  try {
    const response = await fetch('https://api.brevo.com/v3/senders', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return (data?.senders || []).filter((s: any) => s.active !== false);
    }
  } catch (err) {
    console.warn('Could not fetch Brevo senders:', err);
  }
  return [];
}

/**
 * Test the Brevo API connection with the provided key
 */
export async function testBrevoConnection(apiKey: string): Promise<{ success: boolean; message: string; accountEmail?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: 'La clé API Brevo est vide.' };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey.trim(),
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: 'Connexion à Brevo établie avec succès !',
        accountEmail: data?.email,
      };
    } else {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        message: data?.message || 'Clé API Brevo invalide ou non autorisée.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Erreur de connexion : ${err?.message || 'Impossible de joindre Brevo'}`,
    };
  }
}

/**
 * Send an email broadcast / newsletter via Brevo Transactional SMTP API
 */
export async function sendNewsletterBroadcast(params: {
  subject: string;
  htmlContent: string;
  senderName?: string;
  senderEmail?: string;
  recipients: string[];
}): Promise<{ success: boolean; message: string; sentCount?: number }> {
  const { apiKey, senderName: defaultName, senderEmail: defaultEmail } = getBrevoConfig();

  if (!apiKey) {
    return { success: false, message: 'Clé API Brevo manquante. Veuillez la configurer dans les paramètres.' };
  }

  const senderName = params.senderName || defaultName || 'Club Joker ESEN';
  const senderEmail = params.senderEmail || defaultEmail;

  if (!senderEmail) {
    return {
      success: false,
      message: 'Veuillez renseigner une adresse e-mail expéditeur (autorisée dans votre compte Brevo).',
    };
  }

  const validRecipients = params.recipients
    .map(e => e.trim().toLowerCase())
    .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  if (validRecipients.length === 0) {
    return { success: false, message: 'Aucun destinataire valide sélectionné.' };
  }

  try {
    // Send in batches to avoid payload limits
    const BATCH_SIZE = 50;
    let totalSent = 0;

    for (let i = 0; i < validRecipients.length; i += BATCH_SIZE) {
      const chunk = validRecipients.slice(i, i + BATCH_SIZE);
      const toList = chunk.map(email => ({ email }));

      const payload = {
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: toList,
        subject: params.subject,
        htmlContent: params.htmlContent,
      };

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const rawMsg = errorData?.message || `Erreur Brevo (Code ${response.status})`;

        if (rawMsg.toLowerCase().includes('smtp account is not yet activated') || rawMsg.toLowerCase().includes('contact@brevo.com')) {
          throw new Error(
            'Votre compte d’envoi Brevo (SMTP Transactionnel) est en attente d’activation par Brevo. Pour activer l’envoi, connectez-vous sur app.brevo.com > Transactionnel ou contactez le support Brevo pour débloquer les envois.'
          );
        }

        if (rawMsg.toLowerCase().includes('sender') && rawMsg.toLowerCase().includes('not allowed')) {
          throw new Error(
            `L’adresse expéditeur "${senderEmail}" n'est pas encore validée dans votre compte Brevo. Allez sur app.brevo.com > Paramètres > Expéditeurs pour l'autoriser.`
          );
        }

        throw new Error(rawMsg);
      }

      totalSent += chunk.length;
    }

    return {
      success: true,
      message: `E-mail envoyé avec succès à ${totalSent} destinataire(s) !`,
      sentCount: totalSent,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Une erreur est survenue lors de l’envoi de la newsletter.',
    };
  }
}

/**
 * Generate a responsive branded Joker ESEN email HTML template
 */
export function generateJokerEmailTemplate(options: {
  title: string;
  badge?: string;
  subtitle?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  bannerUrl?: string;
}): string {
  const currentYear = new Date().getFullYear();
  const ctaButtonHtml = options.ctaText && options.ctaUrl ? `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 32px 0 16px 0;">
      <tr>
        <td align="center">
          <a href="${options.ctaUrl}" target="_blank" style="display: inline-block; background-color: #B93A34; color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; padding: 14px 32px; border-radius: 50px; box-shadow: 0 4px 15px rgba(185,58,52,0.4);">
            ${options.ctaText} &rarr;
          </a>
        </td>
      </tr>
    </table>
  ` : '';

  const bannerImgHtml = options.bannerUrl ? `
    <tr>
      <td align="center" style="padding: 0; overflow: hidden; border-radius: 16px;">
        <img src="${options.bannerUrl}" alt="${options.title}" width="560" style="width: 100%; max-width: 560px; height: auto; display: block; border-radius: 16px; border: 1px solid rgba(243,196,160,0.2);" />
      </td>
    </tr>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F080D; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #F5EDE4;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0F080D; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #1A0E15; border: 1px solid rgba(243,196,160,0.25); border-radius: 24px; padding: 36px 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
          
          <!-- Logo & Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <span style="font-size: 26px; font-weight: 900; letter-spacing: 2px; color: #F5EDE4; text-transform: uppercase;">
                      JOKER<span style="color: #B93A34;">ESEN</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 4px;">
                    <span style="font-size: 10px; font-weight: bold; letter-spacing: 3px; color: #F3C4A0; text-transform: uppercase;">
                      Club ESEN &middot; Est. 2016
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${bannerImgHtml}

          <!-- Badge -->
          ${options.badge ? `
          <tr>
            <td align="center" style="padding-top: 20px;">
              <span style="display: inline-block; background-color: rgba(185,58,52,0.18); border: 1px solid rgba(185,58,52,0.4); color: #F3C4A0; font-size: 11px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 14px; border-radius: 50px;">
                ${options.badge}
              </span>
            </td>
          </tr>
          ` : ''}

          <!-- Headline -->
          <tr>
            <td align="center" style="padding: 16px 0 8px 0;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; color: #FFFFFF; letter-spacing: -0.5px; line-height: 1.2;">
                ${options.title}
              </h1>
              ${options.subtitle ? `
              <p style="margin: 6px 0 0 0; font-size: 13px; font-weight: 600; color: #F3C4A0;">
                ${options.subtitle}
              </p>
              ` : ''}
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 16px 4px; font-size: 14px; line-height: 1.65; color: #E8DCD5;">
              ${options.bodyHtml}
            </td>
          </tr>

          <!-- CTA Button -->
          ${ctaButtonHtml}

          <!-- Divider -->
          <tr>
            <td style="padding-top: 24px; border-top: 1px solid rgba(243,196,160,0.15);">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="font-size: 11px; color: #A08C98; line-height: 1.5;">
                    <p style="margin: 0 0 6px 0;">Vous recevez cet e-mail car vous êtes inscrit aux actualités du Club Joker ESEN.</p>
                    <p style="margin: 0;">Campus Universitaire Manouba, Tunisie &middot; &copy; ${currentYear} Club Joker ESEN</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
