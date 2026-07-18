const escapeHtml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

type Brand = { logoUrl: string; productName: string };

const layout = (brand: Brand, preheader: string, heading: string, body: string, cta?: { label: string; url: string }) => {
  const safeLogo = escapeHtml(brand.logoUrl);
  const safeProduct = escapeHtml(brand.productName);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(heading)}</title></head>
<body style="margin:0;background:#eceeea;font-family:Arial,Helvetica,sans-serif;color:#171717">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eceeea;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #ffffff">
<tr><td style="height:6px;background:#ff7a00"></td></tr>
<tr><td align="center" style="padding:34px 28px 12px">
${safeLogo ? `<img src="${safeLogo}" width="76" height="76" alt="${safeProduct}" style="display:block;width:76px;height:76px;object-fit:contain;border:0">` : ''}
<div style="font-size:25px;font-weight:800;margin-top:10px">${safeProduct}</div>
</td></tr>
<tr><td style="padding:12px 34px 34px">
<h1 style="margin:0 0 14px;font-size:26px;line-height:1.25;text-align:center">${escapeHtml(heading)}</h1>
<div style="font-size:15px;line-height:1.65;color:#62645f">${body}</div>
${cta ? `<div style="text-align:center;margin:28px 0 8px"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#ff7a00;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:15px 28px;border-radius:999px">${escapeHtml(cta.label)}</a></div>` : ''}
</td></tr>
<tr><td style="padding:20px 28px;background:#f7f7f4;text-align:center;color:#92938f;font-size:12px;line-height:1.6">Sent securely by ${safeProduct}. If you did not request this message, you can safely ignore it.</td></tr>
</table></td></tr></table></body></html>`;
};

export const welcomeTemplate = (brand: Brand, displayName: string) => ({
  subject: 'Welcome to OmniTask',
  text: `Welcome to OmniTask, ${displayName}. Your productivity workspace is ready.`,
  html: layout(brand, 'Your OmniTask workspace is ready.', `Welcome, ${displayName}`, '<p style="margin:0">Your OmniTask workspace is ready. Plan events, organize notes, build focus sessions, and keep the important parts of your day in one calm place.</p>'),
});

export const verificationTemplate = (brand: Brand, displayName: string, link: string) => ({
  subject: 'Verify your OmniTask email',
  text: `Hi ${displayName}, verify your OmniTask email: ${link}\n\nThis link can only be used to verify your account.`,
  html: layout(brand, 'Verify your email to open OmniTask.', 'Verify your email', `<p style="margin:0 0 14px">Hi ${escapeHtml(displayName)},</p><p style="margin:0">Confirm your email address to finish securing your OmniTask account and open your workspace.</p>`, { label: 'Verify email', url: link }),
});

export const passwordResetTemplate = (brand: Brand, displayName: string, link: string) => ({
  subject: 'Reset your OmniTask password',
  text: `Hi ${displayName}, reset your OmniTask password: ${link}\n\nIf you did not request this, ignore this email.`,
  html: layout(brand, 'Use this secure link to reset your password.', 'Reset your password', `<p style="margin:0 0 14px">Hi ${escapeHtml(displayName)},</p><p style="margin:0">We received a request to reset your OmniTask password. This secure Firebase link will guide you through choosing a new password.</p>`, { label: 'Reset password', url: link }),
});
