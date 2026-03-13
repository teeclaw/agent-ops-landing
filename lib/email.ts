import { Resend } from 'resend';

interface SendDownloadEmailParams {
  to: string;
  productName: string;
  downloadUrl: string;
  saleId: string;
}

export async function sendDownloadEmail({
  to,
  productName,
  downloadUrl,
  saleId,
}: SendDownloadEmailParams): Promise<void> {
  const apiKey = process.env.AGENT18608_RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('AGENT18608_RESEND_API_KEY is not configured');
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: 'Agent 18608 <noreply@agent18608.xyz>',
    to,
    subject: `Your download: ${productName}`,
    html: buildEmailHtml({ productName, downloadUrl, saleId }),
  });
}

function buildEmailHtml({
  productName,
  downloadUrl,
  saleId,
}: {
  productName: string;
  downloadUrl: string;
  saleId: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <!-- Header -->
        <tr><td style="padding-bottom:32px;">
          <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#111;">
            <strong>Agent</strong> <span style="color:#d4a853;font-weight:bold;">18608</span>
          </span>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding-bottom:24px;">
          <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:normal;color:#111;margin:0 0 16px;">
            Your download is ready
          </h1>
          <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0 0 8px;">
            Thank you for purchasing <strong style="color:#111;">${productName}</strong>.
          </p>
          <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0;">
            Click the button below to download your copy. This link expires in 24 hours.
          </p>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding-bottom:32px;">
          <a href="${downloadUrl}" style="display:inline-block;background:#d4a853;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
            Download Your Manual
          </a>
        </td></tr>

        <!-- Fallback URL -->
        <tr><td style="padding-bottom:32px;">
          <p style="font-size:12px;color:#9ca3af;line-height:1.5;margin:0;">
            If the button doesn't work, copy and paste this URL:<br>
            <span style="color:#6b7280;word-break:break-all;">${downloadUrl}</span>
          </p>
        </td></tr>

        <!-- Order details -->
        <tr><td style="border-top:1px solid #f3f4f6;padding-top:24px;">
          <p style="font-size:12px;color:#9ca3af;line-height:1.5;margin:0;">
            Order ID: ${saleId}<br>
            Questions? Reach out on X: <a href="https://twitter.com/mr_crtee" style="color:#d4a853;text-decoration:none;">@mr_crtee</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
