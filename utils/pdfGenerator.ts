import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Agreement } from '../hooks/useAgreement';

/**
 * Enhanced Markdown to HTML converter with proper bold/italic handling
 */
const markdownToHtml = (markdown: string): string => {
  let html = markdown;

  // Escape HTML special characters first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers (must be at start of line)
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1 class="section-title">$1</h1>');

  // Bold: **text** (non-greedy, handles multiple per line)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_ (after bold to avoid conflicts)
  html = html.replace(/(?<!\*)\*([^\*\n]+?)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/(?<!_)_([^_\n]+?)_(?!_)/g, '<em>$1</em>');

  // Unordered lists
  html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*?<\/li>\n?)+/g, '<ul>$&</ul>');

  // Numbered lists
  html = html.replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>');

  // Horizontal rules
  html = html.replace(/^(\*\s?\*\s?\*|---|___)$/gm, '<hr/>');

  // Line breaks to paragraphs
  const blocks = html.split('\n\n').filter(block => block.trim());
  html = blocks
    .map(block => {
      const trimmed = block.trim();
      // Don't wrap if already wrapped in block element
      if (/^<(h\d|ul|ol|hr|div)/.test(trimmed)) {
        return trimmed;
      }
      // Convert single line breaks to <br/>
      const withBreaks = trimmed.replace(/\n/g, '<br/>');
      return `<p>${withBreaks}</p>`;
    })
    .join('\n');

  return html;
};

export const generateAgreementPDF = async (agreement: Agreement) => {
  const contentHtml = markdownToHtml(agreement.agreement_text);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page {
            margin: 60px 40px;
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body { 
            font-family: 'Georgia', 'Times New Roman', serif;
            color: #1a1a1a; 
            line-height: 1.8;
            font-size: 11pt;
            position: relative;
            background: #fff;
          }

          /* Watermark */
          body::before {
            content: 'Eden';
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            font-weight: 900;
            color: rgba(0, 0, 0, 0.03);
            z-index: -1;
            letter-spacing: 20px;
            pointer-events: none;
            font-family: 'Arial Black', sans-serif;
          }

          /* Header */
          .document-header {
            text-align: center;
            margin-bottom: 50px;
            padding-bottom: 20px;
            border-bottom: 3px double #000;
          }

          .document-header h1 { 
            font-size: 28pt;
            text-transform: uppercase;
            letter-spacing: 3px;
            margin-bottom: 10px;
            font-weight: 700;
          }

          .document-header .subtitle {
            font-size: 10pt;
            color: #666;
            font-style: italic;
            font-family: 'Helvetica', sans-serif;
          }

          /* Content Styling */
          .content {
            text-align: left;
          }

          .section-title,
          h1:not(.document-header h1) { 
            font-size: 16pt;
            margin-top: 30px;
            margin-bottom: 15px;
            color: #000;
            font-weight: 700;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
            text-align: left;
          }

          h2 { 
            font-size: 14pt;
            margin-top: 25px;
            margin-bottom: 12px;
            font-weight: 600;
            color: #222;
            text-align: left;
          }

          h3 { 
            font-size: 12pt;
            margin-top: 20px;
            margin-bottom: 10px;
            font-weight: 600;
            color: #333;
            text-align: left;
          }

          p { 
            margin-bottom: 12px;
            text-align: left;
            line-height: 1.8;
          }

          ul, ol { 
            margin: 15px 0 15px 30px;
            padding-left: 10px;
            text-align: left;
          }

          li { 
            margin-bottom: 8px;
            line-height: 1.7;
            text-align: left;
          }

          strong { 
            font-weight: 700;
            color: #000;
          }

          em {
            font-style: italic;
          }

          hr {
            border: none;
            border-top: 1px solid #ccc;
            margin: 25px 0;
          }

          /* Signature Section */
          .signature-section {
            margin-top: 80px;
            page-break-inside: avoid;
            border-top: 3px double #000;
            padding-top: 40px;
          }

          .signature-title {
            text-align: center;
            font-size: 14pt;
            font-weight: 700;
            margin-bottom: 30px;
            text-transform: uppercase;
            letter-spacing: 2px;
          }

          .signature-container {
            display: table;
            width: 100%;
            table-layout: fixed;
            border-spacing: 20px 0;
          }

          .signature-box {
            display: table-cell;
            width: 50%;
            padding: 20px;
            background: linear-gradient(to bottom, #f9f9f9 0%, #fff 100%);
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            vertical-align: top;
          }

          .signature-label {
            font-weight: 700;
            font-size: 9pt;
            color: #444;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-family: 'Helvetica', sans-serif;
            text-align: left;
          }

          .signature-value {
            font-size: 13pt;
            padding: 15px 0;
            border-bottom: 2px solid ${agreement.owner_signed_at || agreement.renter_signed_at ? '#2ecc71' : '#999'};
            margin-bottom: 8px;
            font-family: 'Courier New', monospace;
            font-weight: 600;
            text-align: center;
            color: ${agreement.owner_signed_at || agreement.renter_signed_at ? '#2ecc71' : '#999'};
          }

          .signature-date {
            font-size: 9pt;
            color: #666;
            font-family: 'Helvetica', sans-serif;
            text-align: center;
          }

          .verification-badge {
            display: inline-block;
            background: #2ecc71;
            color: white;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 8pt;
            margin-left: 5px;
            font-weight: 700;
            text-transform: uppercase;
          }

          /* Footer */
          .document-footer { 
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            page-break-inside: avoid;
          }

          .verification-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            margin-bottom: 20px;
          }

          .verification-info h4 {
            font-size: 10pt;
            margin-bottom: 8px;
            color: #667eea;
            font-family: 'Helvetica', sans-serif;
            text-align: left;
          }

          .verification-info p {
            font-size: 9pt;
            color: #555;
            margin: 0 0 5px 0;
            text-align: left;
            font-family: 'Helvetica', sans-serif;
          }

          .verification-id {
            font-family: 'Courier New', monospace;
            background: #fff;
            padding: 5px 10px;
            border-radius: 4px;
            display: inline-block;
            margin-top: 5px;
            font-size: 8pt;
          }

          .copyright { 
            text-align: center;
            font-size: 8pt;
            color: #999;
            font-family: 'Helvetica', sans-serif;
            margin-top: 20px;
          }

          .copyright p {
            text-align: center;
            margin: 3px 0;
          }

          /* Print optimization */
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <!-- Document Header -->
        <div class="document-header">
          <h1>Tenancy Agreement</h1>
          <div class="subtitle">Legally Binding Digital Contract</div>
        </div>

        <!-- Agreement Content -->
        <div class="content">
          ${contentHtml}
        </div>

        <!-- Signature Section -->
        <div class="signature-section">
          <div class="signature-title">Digital Signatures</div>
          
          <div class="signature-container">
            <!-- Landlord Signature -->
            <div class="signature-box">
              <div class="signature-label">🏠 Landlord / Property Owner</div>
              <div class="signature-value">
                ${agreement.owner_signed_at ? '✓ SIGNED DIGITALLY' : '⏳ AWAITING SIGNATURE'}
                ${agreement.owner_signed_at ? '<span class="verification-badge">Verified</span>' : ''}
              </div>
              <div class="signature-date">
                ${agreement.owner_signed_at
      ? new Date(agreement.owner_signed_at).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      : 'Not yet signed'}
              </div>
            </div>

            <!-- Tenant Signature -->
            <div class="signature-box">
              <div class="signature-label">👤 Tenant / Renter</div>
              <div class="signature-value">
                ${agreement.renter_signed_at ? '✓ SIGNED DIGITALLY' : '⏳ AWAITING SIGNATURE'}
                ${agreement.renter_signed_at ? '<span class="verification-badge">Verified</span>' : ''}
              </div>
              <div class="signature-date">
                ${agreement.renter_signed_at
      ? new Date(agreement.renter_signed_at).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      : 'Not yet signed'}
              </div>
            </div>
          </div>
        </div>

        <!-- Document Footer -->
        <div class="document-footer">
          <div class="verification-info">
            <h4>🔒 Document Verification</h4>
            <p>This legally binding agreement was generated and digitally signed through the Eden secure platform.</p>
            <p>All signatures are verified and timestamped. This document cannot be altered after signing.</p>
            <div class="verification-id">ID: ${agreement.id}</div>
          </div>

          <div class="copyright">
            <p><strong>Eden</strong> — Trusted Property Management Platform</p>
            <p>&copy; ${new Date().getFullYear()} Eden Technologies. All rights reserved.</p>
            <p style="margin-top: 5px; font-size: 7pt;">Generated on ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: 'Tenancy Agreement PDF',
    });

    return true;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};