import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoiceAPI } from '../utils/api';
import { formatCurrency, formatDate } from '../utils/helpers';
import ShareBillModal from '../components/ShareBillModal';

const INTERIOR_IMG =
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&fit=crop';

/* ─────────────────────────────────────────────────────────────────────────
   buildPdfHtml()
   Builds a FIXED 794px self-contained HTML string with ALL styles inline.
   Zero dependency on global.css, viewport width, or responsive breakpoints.
   This is what html2canvas captures — screen layout is completely separate.
───────────────────────────────────────────────────────────────────────── */
function buildPdfHtml(invoice) {
  const {
    company = {},
    client = {},
    items = [],
    type = 'INVOICE',
    invoiceNumber = '',
    date = '',
    totalAmount = 0,
    cgstPercent = 9,
    sgstPercent = 9,
    cgstAmount = 0,
    sgstAmount = 0,
    roundOff = 0,
    grandTotal = 0,
    amountInWords = '',
    notes = '',
    bankDetails = '',
  } = invoice;

  /* ── Brand colours ── */
  const C = {
    primary:  '#1a2b4a',
    accent:   '#c8860a',
    accentBg: '#fef3c7',
    border:   '#e2e8f0',
    muted:    '#64748b',
    light:    '#f8fafc',
    white:    '#ffffff',
    text:     '#1e293b',
  };

  /* ── Reusable inline style strings ── */
  const S = {
    page: `
      width:794px;min-height:1123px;background:#fff;
      font-family:'DM Sans',Arial,sans-serif;font-size:13px;
      color:${C.text};box-sizing:border-box;padding:0;margin:0;
    `,
    accentBar: `
      height:5px;width:100%;
      background:linear-gradient(90deg,${C.primary} 0%,${C.accent} 60%,#f5a623 100%);
    `,
    header: `
      display:flex;justify-content:space-between;align-items:flex-start;
      padding:24px 28px 18px;background:#fff;gap:16px;
    `,
    logo: `
      width:68px;height:68px;object-fit:contain;border-radius:8px;
      border:1px solid ${C.border};padding:4px;flex-shrink:0;
    `,
    coName: `
      font-size:18px;font-weight:800;color:${C.primary};
      letter-spacing:-0.4px;line-height:1.2;margin:0 0 3px;
    `,
    coSub: `
      font-size:11px;color:${C.muted};line-height:1.55;
      max-width:340px;margin:0 0 6px;
    `,
    chip: `
      display:inline-flex;align-items:center;gap:4px;font-size:11px;
      color:${C.muted};background:#f1f5fb;border:1px solid #dde4f0;
      border-radius:20px;padding:3px 9px;margin-right:6px;white-space:nowrap;
    `,
    gstin: `
      display:inline-block;margin-top:6px;
      font-family:'DM Mono',Courier,monospace;font-size:10px;
      background:${C.accentBg};color:#92400e;padding:3px 9px;
      border-radius:5px;border:1px solid #fcd34d;
      font-weight:700;letter-spacing:0.4px;
    `,
    typeBadge: `
      display:inline-block;background:${C.primary};color:#fff;
      font-size:13px;font-weight:800;letter-spacing:3px;
      padding:6px 18px;border-radius:5px;
      text-transform:uppercase;margin-bottom:10px;
    `,
    metaCard: `
      background:#f8fafd;border:1px solid ${C.border};
      border-radius:8px;padding:10px 14px;min-width:175px;
    `,
    metaRow: (border) => `
      display:flex;justify-content:space-between;align-items:center;
      gap:14px;padding:${border ? '8px 0 4px' : '4px 0'};
      ${border ? `border-top:1px solid #eef1f6;margin-top:4px;` : ''}
    `,
    metaKey: `
      font-size:9px;text-transform:uppercase;letter-spacing:0.6px;
      color:${C.muted};font-weight:700;
    `,
    metaVal: `
      font-family:'DM Mono',Courier,monospace;font-size:12px;
      font-weight:700;color:${C.primary};text-align:right;
    `,
    parties: `
      display:flex;border-top:1px solid #eef1f7;
      border-bottom:1px solid #eef1f7;background:#fafbfe;
    `,
    party: (hasBorder) => `
      padding:18px 24px;flex:1;
      ${hasBorder ? `border-right:1px solid #eef1f7;` : ''}
    `,
    partyLabel: `
      font-size:9px;font-weight:800;letter-spacing:1.3px;
      text-transform:uppercase;color:${C.accent};
      margin-bottom:9px;display:flex;align-items:center;gap:5px;
    `,
    partyLabelLine: `
      display:inline-block;width:12px;height:2px;
      background:${C.accent};border-radius:2px;
    `,
    partyName: `
      font-size:15px;font-weight:800;color:${C.primary};
      line-height:1.3;margin-bottom:5px;
    `,
    partyDetail: `font-size:12px;color:${C.muted};line-height:1.6;`,
    tableWrap: `padding:0 24px;overflow:hidden;`,
    table: `
      width:100%;border-collapse:collapse;
      margin-top:14px;margin-bottom:4px;table-layout:fixed;
    `,
    th: (align) => `
      background:${C.primary};color:#fff;padding:9px 7px;
      font-size:10px;font-weight:700;letter-spacing:0.5px;
      text-transform:uppercase;text-align:${align || 'center'};
      white-space:nowrap;
    `,
    td: (align, bold, even) => `
      padding:8px 7px;font-size:11px;
      border-bottom:1px solid #f3f4f6;
      text-align:${align || 'center'};
      ${bold ? `font-weight:700;color:${C.primary};` : ''}
      ${even ? `background:#fafafa;` : ''}
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    `,
    tdDesc: (even) => `
      padding:8px 7px;font-size:11px;
      border-bottom:1px solid #f3f4f6;text-align:left;font-weight:500;
      ${even ? `background:#fafafa;` : ''}
      word-break:break-word;white-space:normal;
    `,
    footer: `padding:14px 24px 22px;`,
    totalsWrap: `display:flex;justify-content:flex-end;margin-top:10px;`,
    totalsBox: `
      width:290px;border:1px solid ${C.border};
      border-radius:8px;overflow:hidden;
    `,
    totalRow: `
      display:flex;justify-content:space-between;
      padding:7px 14px;border-bottom:1px solid #f3f4f6;font-size:12px;
    `,
    totalLabel: `color:${C.muted};`,
    totalVal: `font-family:'DM Mono',Courier,monospace;font-weight:600;`,
    grandRow: `
      display:flex;justify-content:space-between;
      padding:9px 14px;background:${C.primary};
      font-weight:700;font-size:13px;
    `,
    grandLabel: `color:rgba(255,255,255,0.85);`,
    grandVal: `font-family:'DM Mono',Courier,monospace;color:#fff;`,
    words: `
      margin-top:14px;
      background:linear-gradient(135deg,#fffbeb,#fef9e2);
      border:1px solid #f5d87a;border-left:4px solid ${C.accent};
      border-radius:8px;padding:12px 16px;
    `,
    wordsLabel: `
      font-size:9px;font-weight:800;text-transform:uppercase;
      letter-spacing:1.2px;color:#b45309;margin-bottom:4px;
    `,
    wordsText: `
      font-size:13px;font-weight:700;color:#7c2d12;line-height:1.5;
    `,
    notesGrid: `
      display:flex;gap:0;margin-top:16px;
      border:1px solid #eef1f7;border-radius:8px;overflow:hidden;
    `,
    notesBlock: (first) => `
      padding:14px 16px;background:#fafbfe;flex:1;
      ${first ? `border-right:1px solid #eef1f7;` : ''}
    `,
    notesLabel: `
      font-size:9px;font-weight:800;text-transform:uppercase;
      letter-spacing:1.1px;color:${C.primary};margin-bottom:8px;
      padding-bottom:6px;border-bottom:1px solid #eef1f7;
    `,
    notesText: `
      font-size:11px;color:${C.muted};
      white-space:pre-line;line-height:1.75;
    `,
    signRow: `
      display:flex;justify-content:flex-end;
      margin-top:24px;padding-top:12px;
      border-top:1px solid #f3f4f6;
    `,
    signBox: `text-align:center;min-width:140px;`,
    signLine: `
      border-top:1.5px solid ${C.primary};
      margin-top:40px;margin-bottom:6px;
    `,
    signLabel: `font-size:11px;color:${C.muted};font-weight:600;`,
  };

  /* ── Item rows ── */
  const itemRows = items.map((item, idx) => {
    const even = idx % 2 === 1;
    const size = (item.sizeA && item.sizeB)
      ? `${item.sizeA}×${item.sizeB} ${item.sizeUnit}`
      : '—';
    const qty = (item.qty !== '' && item.qty !== undefined) ? item.qty : '—';
    return `
      <tr>
        <td style="${S.td('center', false, even)}">${idx + 1}</td>
        <td style="${S.tdDesc(even)}">${item.description || ''}</td>
        <td style="${S.td('center', false, even)}">${item.hsnSacCode || '—'}</td>
        <td style="${S.td('center', false, even)}">${size}</td>
        <td style="${S.td('center', false, even)};font-family:'DM Mono',Courier,monospace;">${qty}</td>
        <td style="${S.td('center', false, even)}">${item.nos || 1}</td>
        <td style="${S.td('center', false, even)}">${item.per || ''}</td>
        <td style="${S.td('right', false, even)};font-family:'DM Mono',Courier,monospace;">${formatCurrency(item.rate)}</td>
        <td style="${S.td('right', true, even)};font-family:'DM Mono',Courier,monospace;">${formatCurrency(item.amount)}</td>
      </tr>
    `;
  }).join('');

  /* ── Optional sections ── */
  const logoHtml = company.logo
    ? `<img src="${company.logo}" alt="logo" style="${S.logo}" />`
    : '';

  const phoneChip = company.phone
    ? `<span style="${S.chip}">📞 ${company.phone}</span>` : '';
  const emailChip = company.email
    ? `<span style="${S.chip}">✉️ ${company.email}</span>` : '';
  const gstinHtml = company.gstin
    ? `<div style="${S.gstin}">GSTIN: ${company.gstin}</div>` : '';
  const clientGstin = client.gstin
    ? `<div style="${S.gstin};margin-top:6px;">${client.gstin}</div>` : '';
  const clientSite = client.siteAt
    ? `<div style="${S.partyDetail}">📍 Site: ${client.siteAt}</div>` : '';
  const wordsHtml = amountInWords ? `
    <div style="${S.words}">
      <div style="${S.wordsLabel}">Amount in Words</div>
      <div style="${S.wordsText}">${amountInWords}</div>
    </div>` : '';
  const footerHtml = (notes || bankDetails) ? `
    <div style="${S.notesGrid}">
      ${notes ? `<div style="${S.notesBlock(true)}">
        <div style="${S.notesLabel}">Terms &amp; Notes</div>
        <div style="${S.notesText}">${notes}</div>
      </div>` : ''}
      ${bankDetails ? `<div style="${S.notesBlock(false)}">
        <div style="${S.notesLabel}">Bank Details</div>
        <div style="${S.notesText}">${bankDetails}</div>
      </div>` : ''}
    </div>` : '';

  /* ── Full A4 HTML ── */
  return `
    <div style="${S.page}">

      <div style="${S.accentBar}"></div>

      <!-- Header -->
      <div style="${S.header}">
        <div style="display:flex;align-items:flex-start;gap:16px;flex:1;min-width:0;">
          ${logoHtml}
          <div style="min-width:0;">
            <div style="${S.coName}">${company.name || ''}</div>
            <div style="${S.coSub}">${company.address || ''}</div>
            <div style="margin-top:6px;">${phoneChip}${emailChip}</div>
            ${gstinHtml}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="${S.typeBadge}">${type}</div>
          <div style="${S.metaCard}">
            <div style="${S.metaRow(false)}">
              <span style="${S.metaKey}">Invoice No.</span>
              <span style="${S.metaVal}">${invoiceNumber}</span>
            </div>
            <div style="${S.metaRow(true)}">
              <span style="${S.metaKey}">Date</span>
              <span style="${S.metaVal}">${formatDate(date)}</span>
            </div>
            <div style="${S.metaRow(true)}">
              <span style="${S.metaKey}">Items</span>
              <span style="${S.metaVal}">${items.length}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Parties -->
      <div style="${S.parties}">
        <div style="${S.party(true)}">
          <div style="${S.partyLabel}">
            <span style="${S.partyLabelLine}"></span>Bill To: M/S
          </div>
          <div style="${S.partyName}">${client.name || ''}</div>
          <div style="${S.partyDetail}">${client.address || ''}</div>
          ${clientSite}${clientGstin}
        </div>
        <div style="${S.party(false)}background:linear-gradient(135deg,#f8faff,#f4f7fd);">
          <div style="${S.partyLabel}">
            <span style="${S.partyLabelLine}"></span>Document Details
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 16px;margin-top:4px;">
            <div>
              <div style="${S.metaKey}">Invoice No.</div>
              <div style="${S.metaVal};text-align:left;">${invoiceNumber}</div>
            </div>
            <div>
              <div style="${S.metaKey}">Date</div>
              <div style="${S.metaVal};text-align:left;">${formatDate(date)}</div>
            </div>
            <div>
              <div style="${S.metaKey}">Type</div>
              <div style="${S.metaVal};text-align:left;">${type}</div>
            </div>
            <div>
              <div style="${S.metaKey}">Items</div>
              <div style="${S.metaVal};text-align:left;">${items.length}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <div style="${S.tableWrap}">
        <table style="${S.table}">
          <colgroup>
            <col style="width:32px" />
            <col style="width:200px" />
            <col style="width:64px" />
            <col style="width:80px" />
            <col style="width:52px" />
            <col style="width:44px" />
            <col style="width:50px" />
            <col style="width:70px" />
            <col style="width:80px" />
          </colgroup>
          <thead>
            <tr>
              <th style="${S.th('center')}">Sr</th>
              <th style="${S.th('left')}">Description</th>
              <th style="${S.th('center')}">HSN/SAC</th>
              <th style="${S.th('center')}">Size</th>
              <th style="${S.th('center')}">QTY</th>
              <th style="${S.th('center')}">NOS</th>
              <th style="${S.th('center')}">PER</th>
              <th style="${S.th('right')}">Rate</th>
              <th style="${S.th('right')}">Amount</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>

      <!-- Footer -->
      <div style="${S.footer}">
        <div style="${S.totalsWrap}">
          <div style="${S.totalsBox}">
            <div style="${S.totalRow}">
              <span style="${S.totalLabel}">Total Amount</span>
              <span style="${S.totalVal}">Rs. ${formatCurrency(totalAmount)}</span>
            </div>
            <div style="${S.totalRow}">
              <span style="${S.totalLabel}">CGST (${cgstPercent}%)</span>
              <span style="${S.totalVal}">Rs. ${formatCurrency(cgstAmount)}</span>
            </div>
            <div style="${S.totalRow}">
              <span style="${S.totalLabel}">SGST (${sgstPercent}%)</span>
              <span style="${S.totalVal}">Rs. ${formatCurrency(sgstAmount)}</span>
            </div>
            <div style="${S.totalRow}">
              <span style="${S.totalLabel}">Round Off</span>
              <span style="${S.totalVal}">${roundOff >= 0 ? '' : '-'}${formatCurrency(Math.abs(roundOff))}</span>
            </div>
            <div style="${S.grandRow}">
              <span style="${S.grandLabel}">GRAND TOTAL</span>
              <span style="${S.grandVal}">RS. ${formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
        ${wordsHtml}
        ${footerHtml}
        <div style="${S.signRow}">
          <div style="${S.signBox}">
            <div style="${S.signLine}"></div>
            <div style="${S.signLabel}">Authorised Signatory</div>
          </div>
        </div>
      </div>

    </div>
  `;
}

/* ─────────────────────────────────────────────────────────────────────────
   generatePDF()
   1. Builds fixed 794px HTML via buildPdfHtml()
   2. Injects into hidden off-screen div (position:fixed, left:-9999px)
   3. Waits for logo image to load
   4. Captures with html2canvas at scale:3, windowWidth:794 (ignores viewport)
   5. Exports via jsPDF as A4
   6. Removes hidden div
   Result: identical PDF on desktop, Android, iPhone — every time.
───────────────────────────────────────────────────────────────────────── */
async function generatePDF(invoice, setDlLoading) {
  setDlLoading(true);

  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF }   = await import('jspdf');

  /* Hidden container — position:fixed + left:-9999px keeps it invisible.
     Explicit 794px width means viewport size has zero influence. */
  const container = document.createElement('div');
  container.style.cssText = [
    'position:fixed',
    'top:0',
    'left:-9999px',
    'width:794px',
    'min-height:1123px',
    'z-index:-1',
    'background:#ffffff',
    'overflow:hidden',
  ].join(';');

  container.innerHTML = buildPdfHtml(invoice);
  document.body.appendChild(container);

  /* Wait for logo <img> to fully load before capturing */
  const logoImg = container.querySelector('img');
  if (logoImg && !logoImg.complete) {
    await new Promise(resolve => {
      logoImg.onload  = resolve;
      logoImg.onerror = resolve;    // don't block on broken image
      setTimeout(resolve, 3000);   // 3s hard timeout safety net
    });
  }

  /* Small paint-settle delay */
  await new Promise(r => setTimeout(r, 150));

  try {
    const canvas = await html2canvas(container, {
      scale:           3,           // crisp on all devices including retina
      useCORS:         true,
      allowTaint:      false,
      backgroundColor: '#ffffff',
      width:           794,
      height:          container.scrollHeight,
      windowWidth:     794,         // ← KEY FIX: forces 794px context, ignores real viewport
      windowHeight:    container.scrollHeight,
      logging:         false,
      imageTimeout:    5000,
    });

    const imgData   = canvas.toDataURL('image/png', 1.0);
    const pdf       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth  = pdf.internal.pageSize.getWidth();   // 210mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${invoice.invoiceNumber || 'invoice'}.pdf`);

  } catch (err) {
    alert('PDF generation failed. Please try again.');
    console.error('PDF error:', err);
  } finally {
    document.body.removeChild(container);
    setDlLoading(false);
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   InvoiceView component
───────────────────────────────────────────────────────────────────────── */
export default function InvoiceView() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const printRef    = useRef();
  const [invoice,   setInvoice]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [dlLoading, setDlLoading] = useState(false);

  useEffect(() => {
    invoiceAPI
      .getOne(id)
      .then(res => { setInvoice(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handlePDF   = () => generatePDF(invoice, setDlLoading);
  const handlePrint = () => window.print();

  /* ── Loading ── */
  if (loading) return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <span>Loading invoice...</span>
    </div>
  );

  /* ── Not found ── */
  if (!invoice) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
      Invoice not found.
    </div>
  );

  const {
    company = {},
    client = {},
    items = [],
    type,
    invoiceNumber,
    date,
    totalAmount,
    cgstPercent,
    sgstPercent,
    cgstAmount,
    sgstAmount,
    roundOff,
    grandTotal,
    amountInWords,
    notes,
    bankDetails,
  } = invoice;

  return (
    <div>

      {/* ══════════════════════════════════════
          TOOLBAR
      ══════════════════════════════════════ */}
      <div className="no-print inv-toolbar">
        <div>
          <h1 className="page-title">{type} — {invoiceNumber}</h1>
          <p className="page-subtitle">{client?.name} | {formatDate(date)}</p>
        </div>
        <div className="inv-toolbar-actions">
          <button className="btn btn-outline" onClick={() => navigate('/')}>
            ← Back
          </button>
          <button className="btn btn-outline" onClick={() => navigate(`/edit/${id}`)}>
            ✏️ Edit
          </button>
          <button className="btn btn-outline" onClick={handlePrint}>
            🖨 Print
          </button>
          <button className="btn btn-primary" onClick={() => setShowShare(true)}>
            🔗 Share
          </button>
          <button
            className="btn btn-accent"
            onClick={handlePDF}
            disabled={dlLoading}
          >
            {dlLoading ? '⏳ Preparing...' : '⬇️ Download PDF'}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════
          SHARE MODAL
      ══════════════════════════════════════ */}
      {showShare && invoice && (
        <ShareBillModal
          invoice={invoice}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* ══════════════════════════════════════
          SCREEN PREVIEW
          (responsive — for display only, NOT used for PDF)
      ══════════════════════════════════════ */}
      <div ref={printRef} className="inv-page-layout">

        {/* ── Invoice Preview (left) ── */}
        <div className="invoice-preview">

          <div className="inv-accent-bar" />

          {/* Header */}
          <div className="inv-header">
            <div className="inv-header-left">
              {company?.logo && (
                <img
                  src={company.logo}
                  alt="logo"
                  className="inv-header-logo"
                />
              )}
              <div className="inv-header-info">
                <div className="inv-company-name">{company?.name}</div>
                <div className="inv-company-sub">{company?.address}</div>
                <div className="inv-company-contact">
                  {company?.phone && (
                    <span className="inv-contact-chip">
                      <span>📞</span>{company.phone}
                    </span>
                  )}
                  {company?.email && (
                    <span className="inv-contact-chip">
                      <span>✉️</span>{company.email}
                    </span>
                  )}
                </div>
                {company?.gstin && (
                  <div className="gstin-badge">GSTIN: {company.gstin}</div>
                )}
              </div>
            </div>
            <div className="inv-right-info">
              <div className="inv-type-badge">{type}</div>
              <div className="inv-meta-card">
                <div className="inv-meta-row">
                  <span className="inv-meta-key">Invoice No.</span>
                  <span className="inv-meta-val">{invoiceNumber}</span>
                </div>
                <div className="inv-meta-row">
                  <span className="inv-meta-key">Date</span>
                  <span className="inv-meta-val">{formatDate(date)}</span>
                </div>
                <div className="inv-meta-row">
                  <span className="inv-meta-key">Items</span>
                  <span className="inv-meta-val">{items.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="inv-parties">
            <div className="inv-party">
              <div className="inv-party-label">Bill To: M/S</div>
              <div className="inv-party-name">{client?.name}</div>
              {client?.address && (
                <div className="inv-party-detail">{client.address}</div>
              )}
              {client?.siteAt && (
                <div className="inv-party-detail">📍 Site: {client.siteAt}</div>
              )}
              {client?.gstin && (
                <div style={{ marginTop: 6 }}>
                  <span className="gstin-badge">{client.gstin}</span>
                </div>
              )}
            </div>
            <div className="inv-party inv-party-meta">
              <div className="inv-party-label">Document Details</div>
              <div className="inv-meta-grid">
                <div>
                  <div className="inv-meta-key">Invoice No.</div>
                  <div className="inv-meta-val">{invoiceNumber}</div>
                </div>
                <div>
                  <div className="inv-meta-key">Date</div>
                  <div className="inv-meta-val">{formatDate(date)}</div>
                </div>
                <div>
                  <div className="inv-meta-key">Type</div>
                  <div className="inv-meta-val">{type}</div>
                </div>
                <div>
                  <div className="inv-meta-key">Items</div>
                  <div className="inv-meta-val">{items.length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>Sr</th>
                  <th style={{ textAlign: 'left', minWidth: 160 }}>Description</th>
                  <th>HSN/SAC</th>
                  <th>Size</th>
                  <th>QTY</th>
                  <th>NOS</th>
                  <th>PER</th>
                  <th>Rate</th>
                  <th className="td-r">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', color: '#6b7280' }}>
                      {idx + 1}
                    </td>
                    <td style={{ textAlign: 'left' }}>{item.description}</td>
                    <td>{item.hsnSacCode || '—'}</td>
                    <td>
                      {item.sizeA && item.sizeB
                        ? `${item.sizeA}×${item.sizeB} ${item.sizeUnit}`
                        : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)' }}>
                      {item.qty !== '' && item.qty !== undefined
                        ? item.qty
                        : '—'}
                    </td>
                    <td>{item.nos || 1}</td>
                    <td>{item.per}</td>
                    <td className="td-r">{formatCurrency(item.rate)}</td>
                    <td className="td-r td-bold">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="inv-footer">

            {/* Totals */}
            <div className="inv-totals">
              <div className="inv-totals-box">
                <div className="inv-total-row">
                  <span className="t-label">Total Amount</span>
                  <span className="t-val">₹ {formatCurrency(totalAmount)}</span>
                </div>
                <div className="inv-total-row">
                  <span className="t-label">CGST ({cgstPercent}%)</span>
                  <span className="t-val">₹ {formatCurrency(cgstAmount)}</span>
                </div>
                <div className="inv-total-row">
                  <span className="t-label">SGST ({sgstPercent}%)</span>
                  <span className="t-val">₹ {formatCurrency(sgstAmount)}</span>
                </div>
                <div className="inv-total-row">
                  <span className="t-label">Round Off</span>
                  <span className="t-val">
                    {roundOff >= 0 ? '+' : ''}{formatCurrency(roundOff)}
                  </span>
                </div>
                <div className="inv-total-row grand-row">
                  <span className="t-label">GRAND TOTAL</span>
                  <span className="t-val">₹ {formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Amount in Words */}
            {amountInWords && (
              <div className="inv-words">
                <div className="inv-words-label">Amount in Words</div>
                <div className="inv-words-text">{amountInWords}</div>
              </div>
            )}

            {/* Notes + Bank Details */}
            {(notes || bankDetails) && (
              <div className="inv-notes">
                {notes && (
                  <div className="inv-notes-block">
                    <label>Terms &amp; Notes</label>
                    <p>{notes}</p>
                  </div>
                )}
                {bankDetails && (
                  <div className="inv-notes-block">
                    <label>Bank Details</label>
                    <p>{bankDetails}</p>
                  </div>
                )}
              </div>
            )}

            {/* Signature */}
            <div className="inv-sign-row">
              <div className="inv-sign-box">
                <div className="inv-sign-line" />
                <div className="inv-sign-label">Authorised Signatory</div>
              </div>
            </div>

          </div>
        </div>
        {/* end .invoice-preview */}

        {/* ── Right Image Panel ── */}
        <div className="inv-img-panel">

          <div className="inv-img-card">
            <div className="inv-img-badge">
              {company?.name || 'InvoicePro'}
            </div>
            <img
              src={INTERIOR_IMG}
              alt="Premium work"
              className="inv-img-photo"
              crossOrigin="anonymous"
            />
            <div className="inv-img-overlay">
              <div className="inv-img-tagline">Premium Quality</div>
              <div className="inv-img-desc">
                Aluminium Fabrication &amp;<br />Roofing Systems
              </div>
            </div>
          </div>

          <div className="inv-img-stats">
            <div className="inv-stat-chip">
              <span className="inv-stat-icon">📦</span>
              <div>
                <div className="inv-stat-num">{items.length}</div>
                <div className="inv-stat-lbl">Items</div>
              </div>
            </div>
            <div className="inv-stat-chip">
              <span className="inv-stat-icon">💰</span>
              <div>
                <div className="inv-stat-num">
                  ₹{grandTotal >= 1000
                    ? `${Math.round(grandTotal / 1000)}K`
                    : Math.round(grandTotal)}
                </div>
                <div className="inv-stat-lbl">Total</div>
              </div>
            </div>
            <div className="inv-stat-chip">
              <span className="inv-stat-icon">🏷️</span>
              <div>
                <div className="inv-stat-num">
                  {type === 'QUOTATION' ? 'QUO' : 'INV'}
                </div>
                <div className="inv-stat-lbl">Type</div>
              </div>
            </div>
          </div>

          <div className="inv-num-highlight">
            <div className="inv-num-hl-label">Reference Number</div>
            <div className="inv-num-hl-val">{invoiceNumber}</div>
            <div className="inv-num-hl-date">{formatDate(date)}</div>
          </div>

          <button
            className="inv-share-cta no-print"
            onClick={() => setShowShare(true)}
          >
            <span>🔗</span>
            Share this {type === 'QUOTATION' ? 'Quotation' : 'Invoice'}
          </button>

        </div>
        {/* end .inv-img-panel */}

      </div>
      {/* end .inv-page-layout */}

    </div>
  );
}