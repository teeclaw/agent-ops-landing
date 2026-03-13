import { NextRequest, NextResponse } from 'next/server';
import { generateDownloadUrl } from '@/lib/download-url';
import { sendDownloadEmail } from '@/lib/email';
import { storePayment } from '@/lib/payments';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('Gumroad webhook received:', body);

    // Verify seller_id matches environment variable
    if (body.seller_id !== process.env.GUMROAD_SELLER_ID) {
      console.error('Invalid seller_id:', body.seller_id);
      return NextResponse.json({
        error: 'Invalid seller',
      }, { status: 401 });
    }

    // Extract buyer info
    const { email, sale_id, product_name } = body;

    // Validate required fields
    if (!email || !sale_id) {
      console.error('Missing required fields:', { email: !!email, sale_id: !!sale_id });
      return NextResponse.json({
        error: 'Missing required fields: email and sale_id',
      }, { status: 400 });
    }

    // 1. Generate signed download URL
    const relativePath = generateDownloadUrl(sale_id);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const downloadUrl = `${baseUrl}${relativePath}`;

    // 2. Send email with download link
    try {
      await sendDownloadEmail({
        to: email,
        productName: product_name || 'Agent 18608 Revenue Playbook',
        downloadUrl,
        saleId: sale_id,
      });
      console.log('Download email sent:', { email, sale_id });
    } catch (emailError) {
      // Email failure is non-fatal — still return 200 to Gumroad
      console.error('Failed to send download email:', emailError);
    }

    // 3. Store in Redis (non-fatal on failure)
    try {
      await storePayment({
        saleId: sale_id,
        email,
        downloadUrl: relativePath,
        source: 'gumroad',
        verifiedAt: new Date().toISOString(),
      });
    } catch (storeError) {
      console.error('Failed to store Gumroad payment in Redis:', storeError);
    }

    // 4. Log purchase details
    console.log('Gumroad purchase processed:', {
      email,
      sale_id,
      product_name,
      downloadUrl: relativePath,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Purchase processed',
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({
      error: 'Webhook failed',
    }, { status: 500 });
  }
}
