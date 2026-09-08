
export const standardPrintCss = `
@page { size: A4; margin: 10mm; }
html, body { margin: 0; padding: 0; }
body { -webkit-print-color-adjust: exact; color: #1f2937; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 12px; line-height: 1.5; }
.wrapper { width: 100%; margin: 0 auto; max-width: 210mm; display: flex; flex-direction: column; min-height: 277mm; }
.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 16px; }
.logo-box { display:flex; gap: 16px; align-items: flex-start; }
.logo { height: 64px; width: auto; max-width: 120px; object-fit: contain; }
.company { font-size: 12px; color: #374151; }
.title-box { text-align: right; }
.doc-title { font-size: 24px; font-weight: 800; color: #000; margin-bottom: 8px; text-transform: uppercase; }
.doc-meta { display: grid; grid-template-columns: auto auto; gap: 4px 16px; justify-content: end; font-size: 12px; }
.doc-meta > div:nth-child(odd) { font-weight: 600; color: #6b7280; text-align: right; }
.doc-meta > div:nth-child(even) { font-weight: 600; color: #111827; text-align: right; }

.section { margin-bottom: 16px; }
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
.h2 { font-size: 14px; font-weight: 700; color: #000; margin: 0 0 8px 0; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }

table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
th { background: #f3f4f6; text-align: left; font-weight: 700; color: #374151; padding: 6px 10px; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #d1d5db; }
td { border-bottom: 1px solid #e5e7eb; padding: 6px 10px; color: #111827; vertical-align: top; }
.text-right { text-align: right; }
td.text-right, th.text-right { text-align: right; }

.totals { width: 280px; margin-left: auto; }
.totals-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
.totals-row span:first-child { color: #6b7280; font-weight: 500; }
.totals-row span:last-child { color: #111827; font-weight: 600; }
.totals-row:last-child { border-bottom: 2px solid #111827; border-top: 1px solid #e5e7eb; margin-top: 8px; padding-top: 8px; }
.totals-row:last-child span { font-size: 14px; font-weight: 800; color: #111827; }

.footer { border-top: 2px solid #111827; padding-top: 10px; margin-top: auto; position: relative; break-inside: avoid; page-break-inside: avoid; }
.footer-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; font-size: 10px; color: #6b7280; }
.footer-col { white-space: pre-line; line-height: 1.4; }
.footer-col:nth-child(2) { text-align: center; }
.footer-col:nth-child(3) { text-align: right; }

.note { font-size: 10px; color: #6b7280; text-align: center; margin-top: 8px; font-style: italic; }
.page-number { position: absolute; bottom: -20px; left: 0; right: 0; text-align: center; font-size: 9px; color: #9ca3af; }

.muted { color: #6b7280; }
`;

export function getSignatureSection(leftTitle: string, rightTitle: string): string {
  return `
    <div class="grid2 section" style="margin-top: 16px; page-break-inside: avoid; break-inside: avoid;">
      <div style="border: 1px solid #e5e7eb; border-radius: 4px; padding: 12px;">
        <div class="h2" style="border:none; margin-bottom:20px;">${leftTitle}</div>
        <div style="border-top: 1px solid #111827; width: 80%;"></div>
        <div style="font-size:10px; color:#6b7280; margin-top:4px;">Date et Signature</div>
      </div>
      <div style="border: 1px solid #e5e7eb; border-radius: 4px; padding: 12px;">
        <div class="h2" style="border:none; margin-bottom:20px;">${rightTitle}</div>
        <div style="border-top: 1px solid #111827; width: 80%;"></div>
        <div style="font-size:10px; color:#6b7280; margin-top:4px;">Date et Signature</div>
      </div>
    </div>
  `;
}

export function getFooterSection(col1: string, col2: string, col3: string, note?: string): string {
  return `
    <div class="footer">
      <div class="footer-grid">
        <div class="footer-col">${col1 || ''}</div>
        <div class="footer-col">${col2 || ''}</div>
        <div class="footer-col">${col3 || ''}</div>
      </div>
      ${note ? `<div class="note">${note}</div>` : ''}
      <div class="page-number">Page <span class="page-curr">1</span></div>
    </div>
  `;
}
