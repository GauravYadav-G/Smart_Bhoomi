const nodemailer = require('nodemailer');

/* ═══════════════════════════════════════════════════════════════
   Smart Bhoomi — Unified Design System Email Service
   Government Property Registry • Bharat Land Chain
   Aesthetic: Matches the portal UI — clean modern cards,
   government blue (#0B3D91), Inter sans-serif, subtle shadows,
   tricolor accents, white backgrounds, #E2E8F0 borders
   ═══════════════════════════════════════════════════════════════ */

// ─── Design Tokens (mirroring App.css :root) ───
const GOV_BLUE        = '#0B3D91';
const GOV_BLUE_DARK   = '#072C6B';
const GOV_BLUE_LIGHT  = '#1A5BC4';
const SAFFRON         = '#FF9933';
const GREEN           = '#138808';
const WHITE           = '#FFFFFF';

const BG_PAGE         = '#F8FAFC';
const BG_SECONDARY    = '#F1F5F9';
const BG_CARD         = '#FFFFFF';
const BG_DARK         = '#0F172A';

const TEXT_PRIMARY     = '#0F172A';
const TEXT_SECONDARY   = '#334155';
const TEXT_TERTIARY    = '#64748B';
const TEXT_MUTED       = '#94A3B8';

const BORDER_LIGHT     = '#E2E8F0';
const BORDER_MEDIUM    = '#CBD5E1';

const SUCCESS          = '#059669';
const SUCCESS_BG       = '#ECFDF5';
const SUCCESS_BORDER   = '#A7F3D0';
const WARNING          = '#D97706';
const WARNING_BG       = '#FFFBEB';
const WARNING_BORDER   = '#FDE68A';
const ERROR            = '#DC2626';
const ERROR_BG         = '#FEF2F2';
const ERROR_BORDER     = '#FECACA';
const INFO             = '#0284C7';
const INFO_BG          = '#F0F9FF';
const INFO_BORDER      = '#BAE6FD';

const RADIUS           = '12px';
const RADIUS_SM        = '8px';
const FONT_STACK       = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const FONT_MONO        = "'JetBrains Mono', 'SF Mono', 'Fira Code', Consolas, monospace";


// ═══════════════════════════════════════════════
//  Property Visualization Card
// ═══════════════════════════════════════════════
const generatePropertyCard = (property) => {
  const type = property?.propertyDetails?.propertyType || 'residential';
  const area = property?.propertyDetails?.area?.value || 0;
  const areaUnit = property?.propertyDetails?.area?.unit || 'sq ft';
  const addr = property?.propertyDetails?.address || {};
  const fullAddr = [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ');
  const lat = property?.propertyDetails?.coordinates?.latitude;
  const lng = property?.propertyDetails?.coordinates?.longitude;
  const boundary = property?.propertyDetails?.boundary?.length || 0;

  const typeConfig = {
    residential:  { icon: '🏠', label: 'Residential', color: GOV_BLUE },
    commercial:   { icon: '🏢', label: 'Commercial', color: '#7C3AED' },
    agricultural: { icon: '🌾', label: 'Agricultural', color: SUCCESS },
    industrial:   { icon: '🏭', label: 'Industrial', color: WARNING }
  };
  const tc = typeConfig[type] || typeConfig.residential;

  return `
    <div style="margin: 24px 0; border: 1px solid ${BORDER_LIGHT}; border-radius: ${RADIUS}; overflow: hidden; box-shadow: 0 4px 14px rgba(15, 76, 129, 0.08);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, ${GOV_BLUE} 0%, ${GOV_BLUE_DARK} 100%); padding: 20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td>
            <div style="font-size: 10px; color: rgba(255,255,255,0.6); letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">Property Record</div>
            <div style="color: #fff; font-size: 18px; font-weight: 700; font-family: ${FONT_STACK}; letter-spacing: -0.01em;">${property?.propertyDetails?.title || 'Property'}</div>
          </td>
          <td align="right" valign="middle">
            <div style="background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.15); border-radius: ${RADIUS_SM}; padding: 6px 14px; display: inline-block;">
              <span style="font-size: 14px; margin-right: 4px;">${tc.icon}</span>
              <span style="color: #fff; font-size: 11px; font-weight: 600; letter-spacing: 0.3px;">${tc.label}</span>
            </div>
          </td>
        </tr></table>
      </div>

      <!-- Body -->
      <div style="background: ${BG_CARD}; padding: 20px 24px;">
        ${fullAddr ? `<div style="color: ${TEXT_TERTIARY}; font-size: 12px; margin-bottom: 16px;">📍 ${fullAddr}</div>` : ''}
        
        <!-- Stats Grid -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="33%" style="padding-right: 6px;">
              <div style="background: ${BG_SECONDARY}; border-radius: ${RADIUS_SM}; padding: 14px 10px; text-align: center;">
                <div style="color: ${TEXT_MUTED}; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">Area</div>
                <div style="color: ${TEXT_PRIMARY}; font-size: 20px; font-weight: 800; margin-top: 4px;">${area}</div>
                <div style="color: ${TEXT_TERTIARY}; font-size: 10px;">${areaUnit}</div>
              </div>
            </td>
            <td width="34%" style="padding: 0 3px;">
              <div style="background: ${BG_SECONDARY}; border-radius: ${RADIUS_SM}; padding: 14px 10px; text-align: center;">
                <div style="color: ${TEXT_MUTED}; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">Boundary</div>
                <div style="color: ${TEXT_PRIMARY}; font-size: 20px; font-weight: 800; margin-top: 4px;">${boundary}</div>
                <div style="color: ${TEXT_TERTIARY}; font-size: 10px;">vertices</div>
              </div>
            </td>
            <td width="33%" style="padding-left: 6px;">
              <div style="background: ${BG_SECONDARY}; border-radius: ${RADIUS_SM}; padding: 14px 10px; text-align: center;">
                <div style="color: ${TEXT_MUTED}; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">Coordinates</div>
                <div style="color: ${TEXT_PRIMARY}; font-size: 14px; font-weight: 700; margin-top: 4px; font-family: ${FONT_MONO};">${lat ? lat.toFixed(3) + '°' : '—'}</div>
                <div style="color: ${TEXT_TERTIARY}; font-size: 10px;">${lng ? lng.toFixed(3) + '°E' : ''}</div>
              </div>
            </td>
          </tr>
        </table>

        ${lat && lng ? `
        <div style="margin-top: 14px; border-radius: ${RADIUS_SM}; overflow: hidden; border: 1px solid ${BORDER_LIGHT};">
          <img src="https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=560x140&maptype=mapnik&markers=${lat},${lng},lightblue" 
               alt="Property Location" width="100%" style="display: block;" />
        </div>
        <div style="text-align: right; margin-top: 6px;">
          <a href="https://www.google.com/maps?q=${lat},${lng}" style="color: ${GOV_BLUE}; font-size: 11px; text-decoration: none; font-weight: 500;">View on Google Maps →</a>
        </div>
        ` : ''}
      </div>
    </div>
  `;
};


// ═══════════════════════════════════════════════
//  Email Wrapper — Matches Portal Design
// ═══════════════════════════════════════════════
const emailWrapper = (content, preheader = '') => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Smart Bhoomi — Government of India</title>
  <!--[if mso]>
  <style>body,table,td{font-family:Arial,sans-serif!important;}</style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background: ${BG_PAGE}; font-family: ${FONT_STACK}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>
  
  <table width="100%" cellpadding="0" cellspacing="0" style="background: ${BG_PAGE}; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; border-radius: ${RADIUS}; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
          
          <!-- ═══ TRICOLOR BAR ═══ -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="33.33%" style="height: 3px; background: ${SAFFRON};"></td>
                <td width="33.34%" style="height: 3px; background: ${WHITE};"></td>
                <td width="33.33%" style="height: 3px; background: ${GREEN};"></td>
              </tr></table>
            </td>
          </tr>

          <!-- ═══ HEADER ═══ -->
          <tr>
            <td style="background: linear-gradient(135deg, ${GOV_BLUE} 0%, ${GOV_BLUE_DARK} 100%); padding: 28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td valign="middle">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td valign="middle" style="padding-right: 14px;">
                      <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.12); border: 1.5px solid rgba(255,255,255,0.2); border-radius: 10px; text-align: center; line-height: 40px; font-size: 18px; font-weight: 800; color: #fff;">🏛</div>
                    </td>
                    <td valign="middle">
                      <div style="color: #fff; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2;">Smart Bhoomi</div>
                      <div style="color: rgba(255,255,255,0.6); font-size: 10px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px;">National Digital Land Registry</div>
                    </td>
                  </tr></table>
                </td>
                <td align="right" valign="middle">
                  <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: ${RADIUS_SM}; padding: 8px 14px;">
                    <div style="color: rgba(255,255,255,0.5); font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Secured by</div>
                    <div style="color: #fff; font-size: 12px; font-weight: 700; margin-top: 2px;">🔗 Bharat Land Chain</div>
                  </div>
                </td>
              </tr></table>
            </td>
          </tr>

          <!-- ═══ CONTENT ═══ -->
          <tr>
            <td style="background: ${BG_CARD}; padding: 32px 32px 28px;">
              ${content}
            </td>
          </tr>

          <!-- ═══ FOOTER ═══ -->
          <tr>
            <td style="background: ${BG_DARK}; padding: 24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <div style="text-align: center; color: rgba(255,255,255,0.3); font-size: 9px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">Official Automated Correspondence</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 14px;">
                    <p style="color: rgba(255,255,255,0.35); font-size: 11px; margin: 0 0 12px; line-height: 1.7; text-align: center;">
                      This communication is issued under the authority of the Ministry of Land Resources, 
                      Government of India. All records are cryptographically secured on the Bharat Land Chain.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"><tr>
                      <td><span style="color: rgba(255,255,255,0.25); font-size: 10px;">© ${new Date().getFullYear()} Smart Bhoomi · Government of India</span></td>
                      <td align="right"><span style="color: rgba(255,255,255,0.25); font-size: 10px;">Digital India Initiative 🇮🇳</span></td>
                    </tr></table>
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
</html>`;


// ═══════════════════════════════════════════════
//  Reusable Components
// ═══════════════════════════════════════════════

const sectionTitle = (title, subtitle = '') => `
  <div style="margin: 24px 0 14px;">
    <div style="color: ${GOV_BLUE}; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px;">${title}</div>
    ${subtitle ? `<div style="color: ${TEXT_TERTIARY}; font-size: 13px; line-height: 1.5;">${subtitle}</div>` : ''}
    <div style="height: 2px; background: linear-gradient(90deg, ${GOV_BLUE}, ${GOV_BLUE_LIGHT}22); margin-top: 8px; border-radius: 1px;"></div>
  </div>`;

const infoRow = (label, value, mono = false) => `
  <tr>
    <td style="padding: 10px 14px; color: ${TEXT_TERTIARY}; font-size: 12px; font-weight: 500; border-bottom: 1px solid ${BG_SECONDARY}; width: 38%;">${label}</td>
    <td style="padding: 10px 14px; color: ${TEXT_PRIMARY}; font-size: 13px; font-weight: 600; border-bottom: 1px solid ${BG_SECONDARY};${mono ? ` font-family: ${FONT_MONO}; font-size: 11px; word-break: break-all; color: ${TEXT_SECONDARY};` : ''}">${value || '—'}</td>
  </tr>`;

const dataTable = (rows) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background: ${BG_CARD}; border: 1px solid ${BORDER_LIGHT}; border-radius: ${RADIUS_SM}; overflow: hidden;">
    ${rows}
  </table>`;

const statusBadge = (text, variant = 'info') => {
  const variants = {
    success: { color: SUCCESS, bg: SUCCESS_BG, border: SUCCESS_BORDER },
    warning: { color: WARNING, bg: WARNING_BG, border: WARNING_BORDER },
    error:   { color: ERROR,   bg: ERROR_BG,   border: ERROR_BORDER },
    info:    { color: INFO,    bg: INFO_BG,     border: INFO_BORDER },
    neutral: { color: TEXT_SECONDARY, bg: BG_SECONDARY, border: BORDER_LIGHT }
  };
  const v = variants[variant] || variants.info;
  return `<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; color: ${v.color}; background: ${v.bg}; border: 1px solid ${v.border}; letter-spacing: 0.3px;">${text}</span>`;
};

const ctaButton = (text, url, variant = 'primary') => {
  const styles = {
    primary: `background: ${GOV_BLUE}; color: #ffffff; border: none;`,
    success: `background: ${SUCCESS}; color: #ffffff; border: none;`,
    danger:  `background: ${ERROR}; color: #ffffff; border: none;`,
    outline: `background: transparent; color: ${GOV_BLUE}; border: 2px solid ${GOV_BLUE};`
  };
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
    <tr><td align="center">
      <a href="${url}" style="display: inline-block; ${styles[variant] || styles.primary} padding: 12px 32px; border-radius: ${RADIUS_SM}; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 0.3px;">${text}</a>
    </td></tr>
  </table>`;
};

const divider = () => `<div style="height: 1px; background: ${BORDER_LIGHT}; margin: 24px 0;"></div>`;

const calloutBox = (text, variant = 'info') => {
  const colors = {
    info:    { border: GOV_BLUE,  bg: '#EEF2FF', text: GOV_BLUE_DARK },
    success: { border: SUCCESS,   bg: SUCCESS_BG, text: '#064E3B' },
    warning: { border: WARNING,   bg: WARNING_BG, text: '#92400E' },
    error:   { border: ERROR,     bg: ERROR_BG,   text: '#991B1B' }
  };
  const c = colors[variant] || colors.info;
  return `
  <div style="border-left: 3px solid ${c.border}; padding: 14px 18px; margin: 18px 0; background: ${c.bg}; border-radius: 0 ${RADIUS_SM} ${RADIUS_SM} 0;">
    <p style="color: ${c.text}; font-size: 13px; margin: 0; line-height: 1.65;">${text}</p>
  </div>`;
};

const timestampBlock = () => `
  <div style="border-top: 1px solid ${BORDER_LIGHT}; padding-top: 16px; margin-top: 24px; text-align: center;">
    <div style="color: ${TEXT_MUTED}; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">Issued On</div>
    <div style="color: ${TEXT_SECONDARY}; font-size: 12px; font-weight: 600;">${new Date().toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST</div>
  </div>`;

const greeting = (name) => `
  <p style="color: ${TEXT_PRIMARY}; font-size: 15px; font-weight: 400; margin: 0 0 6px; line-height: 1.5;">Hello <strong style="font-weight: 700;">${name}</strong>,</p>`;

const stepItem = (number, title, description) => `
  <tr>
    <td style="padding: 14px 0; ${number > 1 ? `border-top: 1px solid ${BG_SECONDARY};` : ''}">
      <table cellpadding="0" cellspacing="0"><tr>
        <td valign="top" style="padding-right: 14px;">
          <div style="width: 28px; height: 28px; background: ${GOV_BLUE}; border-radius: 50%; text-align: center; line-height: 28px; color: #fff; font-size: 12px; font-weight: 700;">${number}</div>
        </td>
        <td valign="top">
          <div style="color: ${TEXT_PRIMARY}; font-size: 13px; font-weight: 700; margin-bottom: 2px;">${title}</div>
          <div style="color: ${TEXT_TERTIARY}; font-size: 12px; line-height: 1.5;">${description}</div>
        </td>
      </tr></table>
    </td>
  </tr>`;

const blockchainCard = (fields) => `
  <div style="background: ${BG_DARK}; border-radius: ${RADIUS_SM}; padding: 20px; margin: 16px 0;">
    <div style="margin-bottom: 14px;">
      <span style="color: rgba(255,255,255,0.4); font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">🔗 Blockchain Record</span>
    </div>
    ${fields.map((f, i) => `
      <div style="${i > 0 ? `border-top: 1px solid rgba(255,255,255,0.06); padding-top: 12px; margin-top: 12px;` : ''}">
        <div style="color: rgba(255,255,255,0.4); font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">${f.label}</div>
        <div style="color: rgba(255,255,255,0.85); font-family: ${FONT_MONO}; font-size: 11px; margin-top: 5px; word-break: break-all; line-height: 1.5;">${f.value || 'Pending...'}</div>
      </div>
    `).join('')}
  </div>`;


// ═══════════════════════════════════════════════
//  Email Service Class
// ═══════════════════════════════════════════════
class EmailService {
  constructor() {
    this.from = {
      email: process.env.EMAIL_FROM || 'noreply@smart-bhoomi.gov.in',
      name: process.env.EMAIL_FROM_NAME || 'Smart Bhoomi · Government of India'
    };
    this.isConfigured = false;
    this.transporter = null;
    this.clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    if (process.env.GMAIL_USER &&
        process.env.GMAIL_APP_PASSWORD &&
        process.env.GMAIL_USER.includes('@gmail.com')) {
      try {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
          }
        });
        this.isConfigured = true;
        console.log('✅ Gmail email service initialized');
      } catch (error) {
        console.log('⚠️  Email service running in simulation mode');
      }
    } else {
      console.log('⚠️  Email service running in simulation mode (no valid Gmail credentials)');
    }
  }

  async sendEmail(to, subject, html, text) {
    try {
      if (!this.isConfigured) {
        console.log(`📧 [SIMULATED] To: ${to} | Subject: ${subject}`);
        return { success: true, messageId: `sim_${Date.now()}`, status: 'delivered', simulated: true };
      }
      const info = await this.transporter.sendMail({
        from: `"${this.from.name}" <${process.env.GMAIL_USER}>`,
        to, subject,
        text: text || subject,
        html
      });
      console.log(`✅ Email sent to ${to}: ${subject}`);
      return { success: true, messageId: info.messageId, status: 'delivered' };
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      return { success: false, error: error.message, status: 'failed' };
    }
  }


  // ═══════════════════════════════════════════════
  //  1. WELCOME — Registration Confirmation
  // ═══════════════════════════════════════════════
  async sendRegistrationEmail(user) {
    const subject = 'Welcome to Smart Bhoomi — Your Account is Active';
    const content = `
      ${greeting(user.name)}
      <p style="color: ${TEXT_SECONDARY}; font-size: 14px; line-height: 1.7; margin: 8px 0 20px;">
        Your account on the <strong>National Digital Land Registry</strong> has been successfully created. 
        You can now register properties, manage records, and initiate secure blockchain-based transfers.
      </p>

      ${sectionTitle('Account Details')}
      ${dataTable(`
        ${infoRow('Full Name', user.name)}
        ${infoRow('Email Address', user.email)}
        ${infoRow('Role', (user.role || 'property_owner').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))}
        ${infoRow('Blockchain ID', user.blockchainId || 'Auto-assigned on first transaction', true)}
        ${infoRow('Registered On', new Date().toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))}
      `)}

      ${divider()}

      ${sectionTitle('Getting Started')}
      <table width="100%" cellpadding="0" cellspacing="0">
        ${stepItem(1, 'Complete KYC Verification', 'Submit your Aadhaar and PAN details for identity authentication')}
        ${stepItem(2, 'Enroll Biometrics', 'Register facial signature and fingerprint for secure property transfers')}
        ${stepItem(3, 'Register Your Property', 'Upload title deeds, mark boundaries, and add property coordinates')}
      </table>

      ${calloutBox('Your account is protected with 256-bit encryption and all transactions are recorded on the Bharat Land Chain for complete transparency.', 'info')}

      ${ctaButton('Go to Dashboard', `${this.clientUrl}/dashboard`)}
      ${timestampBlock()}
    `;
    return await this.sendEmail(user.email, subject, emailWrapper(content, `Welcome to Smart Bhoomi, ${user.name}. Your digital land registry account is now active.`));
  }


  // ═══════════════════════════════════════════════
  //  2. PROPERTY REGISTRATION
  // ═══════════════════════════════════════════════
  async sendPropertyRegistrationEmail(user, property) {
    const subject = `Property Registered — ${property.propertyDetails?.title || 'New Property'}`;
    const addr = property.propertyDetails?.address || {};
    const area = property.propertyDetails?.area;

    const content = `
      ${greeting(user.name)}
      <p style="color: ${TEXT_SECONDARY}; font-size: 14px; line-height: 1.7; margin: 8px 0 4px;">
        Your property has been successfully registered on the <strong>Bharat Land Chain</strong> and is now pending verification by the competent authority.
      </p>

      ${generatePropertyCard(property)}

      ${sectionTitle('Registration Details')}
      ${dataTable(`
        ${infoRow('Property ID', property.propertyId, true)}
        ${infoRow('Title', property.propertyDetails?.title)}
        ${infoRow('Type', (property.propertyDetails?.propertyType || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))}
        ${infoRow('Total Area', area ? `${area.value} ${area.unit}` : '—')}
        ${infoRow('Survey Number', property.propertyDetails?.surveyNumber)}
        ${infoRow('Plot Number', property.propertyDetails?.plotNumber)}
        ${infoRow('Address', [addr.street, addr.city, addr.state, addr.zipCode, addr.country].filter(Boolean).join(', '))}
        ${infoRow('Coordinates', property.propertyDetails?.coordinates?.latitude ? `${property.propertyDetails.coordinates.latitude.toFixed(6)}°N, ${property.propertyDetails.coordinates.longitude.toFixed(6)}°E` : 'Pending survey', true)}
        ${infoRow('Boundary Points', `${property.propertyDetails?.boundary?.length || 0} vertices marked`)}
        ${infoRow('Documents', `${property.documents?.length || 0} uploaded`)}
      `)}

      ${divider()}

      ${sectionTitle('Blockchain Entry')}
      ${blockchainCard([
        { label: 'Block Hash', value: property.blockchainHash },
        { label: 'Transaction ID', value: property.blockchainTransactionId },
        { label: 'Verification Status', value: (property.verification?.status || 'PENDING').toUpperCase() }
      ])}

      ${calloutBox('Your property is now pending verification. The reviewing authority will examine your submission and you will be notified once the review is complete — typically within 24–48 hours.', 'warning')}

      ${ctaButton('View Property', `${this.clientUrl}/properties/${property.propertyId}`)}
      ${timestampBlock()}
    `;
    return await this.sendEmail(user.email, subject, emailWrapper(content, `Property "${property.propertyDetails?.title}" registered on Smart Bhoomi · ID: ${property.propertyId}`));
  }


  // ═══════════════════════════════════════════════
  //  3. VERIFICATION RESULT
  // ═══════════════════════════════════════════════
  async sendVerificationEmail(user, property, isApproved, notes) {
    const subject = isApproved
      ? `✅ Property Verified — ${property.propertyDetails?.title || property.propertyId}`
      : `❌ Verification Declined — ${property.propertyDetails?.title || property.propertyId}`;

    const content = `
      ${greeting(user.name)}
      <p style="color: ${TEXT_SECONDARY}; font-size: 14px; line-height: 1.7; margin: 8px 0 4px;">
        The verification review for your property has been completed. Your property has been 
        ${isApproved 
          ? `<strong style="color: ${SUCCESS};">approved and verified</strong>` 
          : `<strong style="color: ${ERROR};">declined</strong>`
        } by the reviewing authority.
      </p>

      <!-- Status Banner -->
      <div style="background: ${isApproved ? SUCCESS_BG : ERROR_BG}; border: 1px solid ${isApproved ? SUCCESS_BORDER : ERROR_BORDER}; border-radius: ${RADIUS_SM}; padding: 16px 20px; margin: 20px 0; text-align: center;">
        <div style="font-size: 24px; margin-bottom: 6px;">${isApproved ? '✅' : '❌'}</div>
        <div style="color: ${isApproved ? SUCCESS : ERROR}; font-size: 16px; font-weight: 800; letter-spacing: -0.01em;">${isApproved ? 'Property Verified' : 'Verification Declined'}</div>
        <div style="color: ${isApproved ? '#065F46' : '#991B1B'}; font-size: 12px; margin-top: 4px;">${isApproved ? 'Your property is now officially verified on the blockchain' : 'Please review the notes below and resubmit'}</div>
      </div>

      ${generatePropertyCard(property)}

      ${sectionTitle('Review Summary')}
      ${dataTable(`
        ${infoRow('Property ID', property.propertyId, true)}
        ${infoRow('Title', property.propertyDetails?.title)}
        ${infoRow('Decision', isApproved ? 'Approved ✓' : 'Declined ✗')}
        ${infoRow('Reviewed By', property.verification?.verifiedBy?.name || property.verification?.adminReviewedBy?.name || 'Government Authority')}
        ${infoRow('Review Date', new Date().toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))}
        ${notes ? infoRow('Official Notes', notes) : ''}
      `)}

      ${isApproved ? `
        ${calloutBox('This property is now officially verified and sealed on the Bharat Land Chain. It is eligible for ownership transfers, collateral applications, and all government services requiring authenticated land title records.', 'success')}
      ` : `
        ${calloutBox(property.verification?.rejectionReason || notes || 'The submitted documentation did not satisfy verification requirements. Please review the official remarks and resubmit with the necessary amendments.', 'error')}
      `}

      ${ctaButton(
        isApproved ? 'View Verified Property' : 'Review & Resubmit',
        `${this.clientUrl}/properties/${property.propertyId}`,
        isApproved ? 'success' : 'danger'
      )}
      ${timestampBlock()}
    `;
    return await this.sendEmail(user.email, subject, emailWrapper(content, `Property "${property.propertyDetails?.title}" has been ${isApproved ? 'verified and approved' : 'declined for verification'}.`));
  }


  // ═══════════════════════════════════════════════
  //  4. TRANSFER REQUEST
  // ═══════════════════════════════════════════════
  async sendTransferRequestEmail(owner, buyer, property, transferRequest) {
    const subject = `Transfer Request — ${property.propertyDetails?.title || property.propertyId}`;

    const content = `
      ${greeting(owner.name)}
      <p style="color: ${TEXT_SECONDARY}; font-size: 14px; line-height: 1.7; margin: 8px 0 4px;">
        A formal request for the transfer of ownership has been submitted for your registered property. Please review the details below.
      </p>

      ${generatePropertyCard(property)}

      ${sectionTitle('Transfer Details')}
      ${dataTable(`
        ${infoRow('Request ID', transferRequest.requestId, true)}
        ${infoRow('Property', property.propertyDetails?.title)}
        ${infoRow('Property ID', property.propertyId, true)}
        ${infoRow('Requested By', buyer.name)}
        ${infoRow('Buyer Email', buyer.email)}
        ${infoRow('Offered Amount', `₹ ${transferRequest.proposedPrice?.toLocaleString('en-IN') || '0'}`)}
        ${property.valuation?.currentValue ? infoRow('Current Valuation', `₹ ${property.valuation.currentValue.toLocaleString('en-IN')}`) : ''}
        ${infoRow('Requested On', new Date().toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))}
      `)}

      ${property.valuation?.currentValue && transferRequest.proposedPrice ? `
        <div style="background: ${BG_SECONDARY}; border-radius: ${RADIUS_SM}; padding: 14px 18px; margin: 16px 0;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="color: ${TEXT_SECONDARY}; font-size: 13px;">
              <strong>Valuation Analysis:</strong> The offered amount represents 
              <strong style="color: ${transferRequest.proposedPrice >= property.valuation.currentValue ? SUCCESS : WARNING};">
                ${((transferRequest.proposedPrice / property.valuation.currentValue) * 100).toFixed(1)}%
              </strong> of the current assessed valuation${transferRequest.proposedPrice >= property.valuation.currentValue ? ' — meets the minimum threshold.' : ' — below assessed value.'}
            </td>
          </tr></table>
        </div>
      ` : ''}

      ${calloutBox('Accepting this request will initiate the biometric-secured peer-to-peer transfer protocol. Both parties will need to complete identity verification before the transfer is finalized on the blockchain.', 'info')}

      ${ctaButton('Review Transfer Request', `${this.clientUrl}/transfers`)}
      ${timestampBlock()}
    `;
    return await this.sendEmail(owner.email, subject, emailWrapper(content, `Transfer request for "${property.propertyDetails?.title}" from ${buyer.name} — ₹${transferRequest.proposedPrice?.toLocaleString('en-IN')}`));
  }


  // ═══════════════════════════════════════════════
  //  5. TRANSFER COMPLETION
  // ═══════════════════════════════════════════════
  async sendTransferCompletionEmail(user, property, transferRequest, transactionDetails) {
    const subject = `✅ Transfer Complete — ${property.propertyDetails?.title || property.propertyId}`;

    const content = `
      ${greeting(user.name)}
      <p style="color: ${TEXT_SECONDARY}; font-size: 14px; line-height: 1.7; margin: 8px 0 4px;">
        The ownership transfer has been <strong style="color: ${SUCCESS};">completed and permanently sealed</strong> on the Bharat Land Chain. This record is now immutable and irrevocable.
      </p>

      <!-- Success Banner -->
      <div style="background: ${SUCCESS_BG}; border: 1px solid ${SUCCESS_BORDER}; border-radius: ${RADIUS_SM}; padding: 20px; margin: 20px 0; text-align: center;">
        <div style="font-size: 28px; margin-bottom: 8px;">🎉</div>
        <div style="color: ${SUCCESS}; font-size: 18px; font-weight: 800;">Transfer Successful</div>
        <div style="color: #065F46; font-size: 12px; margin-top: 4px;">Property ownership has been updated on the blockchain</div>
      </div>

      ${generatePropertyCard(property)}

      ${sectionTitle('Transfer Record')}
      ${dataTable(`
        ${infoRow('Transfer Ref.', transferRequest.requestId, true)}
        ${infoRow('Property', property.propertyDetails?.title)}
        ${infoRow('Property ID', property.propertyId, true)}
        ${infoRow('Transfer Amount', `₹ ${transferRequest.proposedPrice?.toLocaleString('en-IN') || '0'}`)}
        ${infoRow('Payment ID', transactionDetails?.paymentId, true)}
        ${infoRow('Completed On', new Date().toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))}
      `)}

      ${divider()}

      ${sectionTitle('Blockchain Seal')}
      ${blockchainCard([
        { label: 'Transaction Hash', value: transferRequest.blockchainTransactionHash || 'Recorded on-chain' },
        { label: 'Status', value: '✅ PERMANENTLY SEALED' }
      ])}

      ${calloutBox('This transfer is an irrevocable record on the sovereign blockchain. The updated ownership title is now enforceable and verifiable by all government authorities.', 'success')}

      ${ctaButton('View Your Property', `${this.clientUrl}/properties/${property.propertyId}`, 'success')}
      ${timestampBlock()}
    `;
    return await this.sendEmail(user.email, subject, emailWrapper(content, `Ownership of "${property.propertyDetails?.title}" has been transferred and sealed on the Bharat Land Chain.`));
  }


  // ═══════════════════════════════════════════════
  //  6. PAYMENT CONFIRMATION
  // ═══════════════════════════════════════════════
  async sendPaymentConfirmationEmail(user, paymentDetails) {
    const subject = '💳 Payment Confirmed — Smart Bhoomi Property Transaction';

    const content = `
      ${greeting(user.name)}
      <p style="color: ${TEXT_SECONDARY}; font-size: 14px; line-height: 1.7; margin: 8px 0 20px;">
        Your payment has been received and verified. This receipt confirms the successful processing of your transaction through the Smart Bhoomi payment gateway.
      </p>

      <!-- Amount Card -->
      <div style="background: linear-gradient(135deg, ${GOV_BLUE} 0%, ${GOV_BLUE_DARK} 100%); border-radius: ${RADIUS}; padding: 28px 24px; text-align: center; margin: 20px 0;">
        <div style="color: rgba(255,255,255,0.5); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">Amount Received</div>
        <div style="color: #fff; font-size: 36px; font-weight: 800; margin-top: 8px; letter-spacing: -0.02em;">₹ ${paymentDetails.amount?.toLocaleString('en-IN') || '0'}</div>
        <div style="margin-top: 14px;">${statusBadge('Payment Verified', 'success')}</div>
      </div>

      ${sectionTitle('Transaction Receipt')}
      ${dataTable(`
        ${infoRow('Transaction ID', paymentDetails.transactionId, true)}
        ${infoRow('Payment Method', (paymentDetails.method || 'Online').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))}
        ${infoRow('Amount', `₹ ${paymentDetails.amount?.toLocaleString('en-IN') || '0'}`)}
        ${infoRow('Status', 'Confirmed ✓')}
        ${infoRow('Processed On', new Date(paymentDetails.timestamp || Date.now()).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }))}
      `)}

      ${calloutBox('This payment has been recorded on the blockchain ledger for complete transparency and auditability. The property transfer process will proceed to the next stage.', 'info')}

      ${ctaButton('View Transfers', `${this.clientUrl}/transfers`)}
      ${timestampBlock()}
    `;
    return await this.sendEmail(user.email, subject, emailWrapper(content, `Payment of ₹${paymentDetails.amount?.toLocaleString('en-IN')} confirmed · Smart Bhoomi Government Property Registry`));
  }
  // ═══════════════════════════════════════════════
  //  7. OTP LOGIN — Email One-Time Password
  // ═══════════════════════════════════════════════
  async sendOTPEmail(user, otp) {
    const subject = '🔐 Your Smart Bhoomi Login OTP';
    const content = `
      ${greeting(user.name)}
      <p style="color: ${TEXT_SECONDARY}; font-size: 14px; line-height: 1.7; margin: 8px 0 20px;">
        You requested a one-time password to log in to your <strong>Smart Bhoomi</strong> account. Use the code below within <strong>10 minutes</strong>.
      </p>

      <!-- OTP Code Card -->
      <div style="background: linear-gradient(135deg, ${GOV_BLUE} 0%, ${GOV_BLUE_DARK} 100%); border-radius: ${RADIUS}; padding: 32px 24px; text-align: center; margin: 24px 0;">
        <div style="color: rgba(255,255,255,0.5); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">Your Login Code</div>
        <div style="color: #fff; font-size: 42px; font-weight: 800; letter-spacing: 12px; font-family: ${FONT_MONO};">${otp}</div>
        <div style="color: rgba(255,255,255,0.4); font-size: 11px; margin-top: 12px;">Expires in 10 minutes</div>
      </div>

      ${calloutBox('If you did not request this code, someone may be trying to access your account. Please secure your account by changing your password immediately.', 'warning')}

      ${timestampBlock()}
    `;
    return await this.sendEmail(user.email, subject, emailWrapper(content, `Your Smart Bhoomi OTP is ${otp}. Valid for 10 minutes.`));
  }


  // ═══════════════════════════════════════════════
  //  8. NOMINEE SETUP — Confirmation Email
  // ═══════════════════════════════════════════════
  async sendNomineeSetupEmail(user, nomineeData) {
    const subject = '👤 Nominee Access Configured — Smart Bhoomi';
    const content = `
      ${greeting(user.name)}
      <p style="color: ${TEXT_SECONDARY}; font-size: 14px; line-height: 1.7; margin: 8px 0 20px;">
        You have successfully configured <strong>nominee access</strong> for your Smart Bhoomi account. In the event of your passing, your nominee can use the passphrase you set to gain read-only access to your property records.
      </p>

      ${sectionTitle('Nominee Details')}
      ${dataTable(`
        ${infoRow('Nominee Name', nomineeData.name)}
        ${infoRow('Relationship', nomineeData.relationship)}
        ${infoRow('Email', nomineeData.email)}
        ${infoRow('Phone', nomineeData.phoneNumber || '—')}
        ${infoRow('Government ID', nomineeData.governmentId ? '••••' + nomineeData.governmentId.slice(-4) : '—')}
        ${infoRow('Configured On', new Date().toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))}
      `)}

      ${calloutBox('The nominee passphrase is securely hashed and cannot be recovered. Please store it safely. Nominee access grants read-only access and cannot be used to transfer properties.', 'info')}

      ${timestampBlock()}
    `;
    return await this.sendEmail(user.email, subject, emailWrapper(content, `Nominee access has been configured for your Smart Bhoomi account — ${nomineeData.name}.`));
  }


  // ═══════════════════════════════════════════════
  //  9. BIOMETRIC FALLBACK OTP — When face/fingerprint fails
  // ═══════════════════════════════════════════════
  async sendBiometricFallbackOTP(user, otp) {
    const subject = '🔑 Biometric Fallback OTP — Smart Bhoomi';
    const content = `
      ${greeting(user.name)}
      <p style="color: ${TEXT_SECONDARY}; font-size: 14px; line-height: 1.7; margin: 8px 0 20px;">
        Your biometric verification could not be completed. Use this one-time password to proceed with your login via <strong>email OTP fallback</strong>.
      </p>

      <!-- OTP Code Card -->
      <div style="background: linear-gradient(135deg, ${WARNING} 0%, #B45309 100%); border-radius: ${RADIUS}; padding: 28px 24px; text-align: center; margin: 24px 0;">
        <div style="color: rgba(255,255,255,0.6); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Fallback Code</div>
        <div style="color: #fff; font-size: 38px; font-weight: 800; letter-spacing: 12px; font-family: ${FONT_MONO};">${otp}</div>
        <div style="color: rgba(255,255,255,0.5); font-size: 11px; margin-top: 10px;">Expires in 10 minutes</div>
      </div>

      ${calloutBox('If you did not attempt to log in, please contact the Smart Bhoomi helpdesk immediately. Your account security may be compromised.', 'error')}

      ${timestampBlock()}
    `;
    return await this.sendEmail(user.email, subject, emailWrapper(content, `Your biometric fallback OTP is ${otp}. Valid for 10 minutes.`));
  }
}

module.exports = new EmailService();
