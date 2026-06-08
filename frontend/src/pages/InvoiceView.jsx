import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoiceAPI } from '../utils/api';
import { formatCurrency, formatDate } from '../utils/helpers';
import ShareBillModal from '../components/ShareBillModal';

const INTERIOR_IMG =
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&fit=crop';

/* ═══════════════════════════════════════════════════
   BRAND COLOURS
═══════════════════════════════════════════════════ */
const C = {
  primary:  '#1a2b4a',
  accent:   '#c8860a',
  accentBg: '#fef3c7',
  border:   '#e2e8f0',
  muted:    '#64748b',
  text:     '#1e293b',
};

/* ═══════════════════════════════════════════════════
   A4 FIXED DIMENSIONS
   794 × 1123 px at 96 dpi  ≡  210 × 297 mm
═══════════════════════════════════════════════════ */
const A4_W  = 794;
const A4_H  = 1123;
const MX    = 24;   // margin left/right px
const MB    = 24;   // margin bottom px

/*
  Section height constants (px) — calibrated carefully.
  These are the ACTUAL rendered heights of each section
  inside the 794px fixed container.
*/
const H = {
  accentBar:  5,
  header:     148,   // logo + company name + chips + gstin
  parties:    118,   // bill-to + document details
  tableHead:  36,    // thead row
  row:        27,    // one tbody row
  contLabel:  30,    // "Continued (Page N)" label on page 2+
  // Footer sections — measured individually so we can check
  // if they fit together
  totalsBox:  145,   // 5 rows × ~29px each
  words:       52,   // amount in words box
  notesGrid:  110,   // terms + bank details box
  signRow:     80,   // signature space + label
  footerPad:  12,    // top padding of footer
};

// Total footer height (all grouped — never split)
H.footer = H.footerPad + H.totalsBox + H.words + H.notesGrid + H.signRow + 20; // ~419

/* ═══════════════════════════════════════════════════
   INLINE STYLE STRINGS
   All inline — zero dependency on global.css
═══════════════════════════════════════════════════ */
const S = {
  // Fixed A4 page shell — overflow:hidden clips anything beyond 1123px
  page: `
    width:${A4_W}px;
    height:${A4_H}px;
    background:#ffffff;
    overflow:hidden;
    font-family:'DM Sans',Arial,sans-serif;
    font-size:13px;
    color:${C.text};
    box-sizing:border-box;
    margin:0;
    padding:0;
  `,

  accentBar: `
    height:${H.accentBar}px;
    width:100%;
    background:linear-gradient(90deg,${C.primary} 0%,${C.accent} 60%,#f5a623 100%);
  `,

  header: `
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    padding:16px ${MX}px 12px;
    background:#fff;
    gap:16px;
  `,

  logo: `
    width:62px;
    height:62px;
    object-fit:contain;
    border-radius:8px;
    border:1px solid ${C.border};
    padding:4px;
    flex-shrink:0;
  `,

  coName: `
    font-size:16px;
    font-weight:800;
    color:${C.primary};
    letter-spacing:-0.4px;
    line-height:1.2;
    margin:0 0 3px;
  `,

  coSub: `
    font-size:10px;
    color:${C.muted};
    line-height:1.5;
    max-width:320px;
    margin:0 0 4px;
  `,

  chip: `
    display:inline-flex;
    align-items:center;
    gap:4px;
    font-size:10px;
    color:${C.muted};
    background:#f1f5fb;
    border:1px solid #dde4f0;
    border-radius:20px;
    padding:2px 8px;
    margin-right:5px;
    white-space:nowrap;
  `,

  gstin: `
    display:inline-block;
    margin-top:4px;
    font-family:'DM Mono',Courier,monospace;
    font-size:9px;
    background:${C.accentBg};
    color:#92400e;
    padding:2px 8px;
    border-radius:4px;
    border:1px solid #fcd34d;
    font-weight:700;
  `,

  typeBadge: `
    display:inline-block;
    background:${C.primary};
    color:#fff;
    font-size:12px;
    font-weight:800;
    letter-spacing:2.5px;
    padding:5px 15px;
    border-radius:5px;
    text-transform:uppercase;
    margin-bottom:8px;
  `,

  metaCard: `
    background:#f8fafd;
    border:1px solid ${C.border};
    border-radius:7px;
    padding:8px 13px;
    min-width:160px;
  `,

  mRow: (border) => `
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:12px;
    padding:${border ? '5px 0 2px' : '2px 0'};
    ${border ? 'border-top:1px solid #eef1f6;margin-top:3px;' : ''}
  `,

  mKey: `
    font-size:9px;
    text-transform:uppercase;
    letter-spacing:0.5px;
    color:${C.muted};
    font-weight:700;
  `,

  mVal: `
    font-family:'DM Mono',Courier,monospace;
    font-size:11px;
    font-weight:700;
    color:${C.primary};
    text-align:right;
  `,

  parties: `
    display:flex;
    border-top:1px solid #eef1f7;
    border-bottom:1px solid #eef1f7;
    background:#fafbfe;
  `,

  party: (b) => `
    padding:13px ${MX}px;
    flex:1;
    ${b ? 'border-right:1px solid #eef1f7;' : ''}
  `,

  partyLabel: `
    font-size:8px;
    font-weight:800;
    letter-spacing:1.2px;
    text-transform:uppercase;
    color:${C.accent};
    margin-bottom:6px;
    display:flex;
    align-items:center;
    gap:4px;
  `,

  partyLine: `
    display:inline-block;
    width:10px;
    height:2px;
    background:${C.accent};
    border-radius:2px;
  `,

  partyName: `
    font-size:14px;
    font-weight:800;
    color:${C.primary};
    line-height:1.3;
    margin-bottom:4px;
  `,

  partyDetail: `
    font-size:10px;
    color:${C.muted};
    line-height:1.5;
  `,

  tableWrap: `
    padding:0 ${MX}px;
  `,

  table: `
    width:100%;
    border-collapse:collapse;
    margin-top:8px;
    table-layout:fixed;
  `,

  th: (align) => `
    background:${C.primary};
    color:#fff;
    padding:7px 6px;
    font-size:9px;
    font-weight:700;
    letter-spacing:0.4px;
    text-transform:uppercase;
    text-align:${align || 'center'};
    white-space:nowrap;
  `,

  td: (align, bold, even) => `
    padding:6px 6px;
    font-size:10px;
    border-bottom:1px solid #f3f4f6;
    text-align:${align || 'center'};
    ${bold ? `font-weight:700;color:${C.primary};` : ''}
    ${even ? 'background:#fafafa;' : ''}
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  `,

  tdDesc: (even) => `
    padding:6px 6px;
    font-size:10px;
    border-bottom:1px solid #f3f4f6;
    text-align:left;
    font-weight:500;
    ${even ? 'background:#fafafa;' : ''}
    word-break:break-word;
    white-space:normal;
  `,

  contLabel: `
    padding:6px ${MX}px 2px;
    font-size:9px;
    font-weight:700;
    color:${C.muted};
    text-transform:uppercase;
    letter-spacing:0.5px;
  `,

  /* Footer */
  footerWrap: `padding:10px ${MX}px 0;`,

  totalsWrap: `
    display:flex;
    justify-content:flex-end;
    margin-top:6px;
  `,

  totalsBox: `
    width:275px;
    border:1px solid ${C.border};
    border-radius:7px;
    overflow:hidden;
  `,

  tRow: `
    display:flex;
    justify-content:space-between;
    padding:6px 13px;
    border-bottom:1px solid #f3f4f6;
    font-size:11px;
  `,

  tLabel: `color:${C.muted};`,
  tVal: `font-family:'DM Mono',Courier,monospace;font-weight:600;`,

  grandRow: `
    display:flex;
    justify-content:space-between;
    padding:8px 13px;
    background:${C.primary};
    font-weight:700;
    font-size:12px;
  `,

  grandLabel: `color:rgba(255,255,255,0.85);`,
  grandVal: `font-family:'DM Mono',Courier,monospace;color:#fff;`,

  words: `
    margin-top:10px;
    background:linear-gradient(135deg,#fffbeb,#fef9e2);
    border:1px solid #f5d87a;
    border-left:4px solid ${C.accent};
    border-radius:7px;
    padding:9px 14px;
  `,

  wordsLabel: `
    font-size:8px;
    font-weight:800;
    text-transform:uppercase;
    letter-spacing:1px;
    color:#b45309;
    margin-bottom:3px;
  `,

  wordsText: `
    font-size:12px;
    font-weight:700;
    color:#7c2d12;
    line-height:1.4;
  `,

  notesGrid: `
    display:flex;
    gap:0;
    margin-top:10px;
    border:1px solid #eef1f7;
    border-radius:7px;
    overflow:hidden;
  `,

  notesBlock: (first) => `
    padding:10px 13px;
    background:#fafbfe;
    flex:1;
    min-width:0;
    ${first ? 'border-right:1px solid #eef1f7;' : ''}
  `,

  notesLabel: `
    font-size:8px;
    font-weight:800;
    text-transform:uppercase;
    letter-spacing:1px;
    color:${C.primary};
    margin-bottom:5px;
    padding-bottom:5px;
    border-bottom:1px solid #eef1f7;
  `,

  notesText: `
    font-size:10px;
    color:${C.muted};
    white-space:pre-line;
    line-height:1.65;
  `,

  signRow: `
    display:flex;
    justify-content:flex-end;
    margin-top:18px;
    padding-top:10px;
    border-top:1px solid #f3f4f6;
  `,

  signBox: `text-align:center;min-width:130px;`,
  signLine: `border-top:1.5px solid ${C.primary};margin-top:36px;margin-bottom:5px;`,
  signLabel: `font-size:10px;color:${C.muted};font-weight:600;`,
};

/* ── Column widths: Sr + Desc + HSN + Size + Qty + Nos + Per + Rate + Amount ── */
const COLS = [26, 205, 60, 74, 48, 40, 46, 66, 78];

/* ═══════════════════════════════════════════════════
   HTML FRAGMENT BUILDERS
═══════════════════════════════════════════════════ */
function fAccentBar() {
  return `<div style="${S.accentBar}"></div>`;
}

function fHeader(co, type, num, date, count) {
  const logo = co.logo
    ? `<img src="${co.logo}" alt="logo" style="${S.logo}" />` : '';
  const phone = co.phone
    ? `<span style="${S.chip}">📞 ${co.phone}</span>` : '';
  const email = co.email
    ? `<span style="${S.chip}">✉️ ${co.email}</span>` : '';
  const gstin = co.gstin
    ? `<div style="${S.gstin}">GSTIN: ${co.gstin}</div>` : '';

  return `
    <div style="${S.header}">
      <div style="display:flex;align-items:flex-start;gap:13px;flex:1;min-width:0;">
        ${logo}
        <div style="min-width:0;">
          <div style="${S.coName}">${co.name || ''}</div>
          <div style="${S.coSub}">${co.address || ''}</div>
          <div style="margin-top:4px;">${phone}${email}</div>
          ${gstin}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="${S.typeBadge}">${type}</div>
        <div style="${S.metaCard}">
          <div style="${S.mRow(false)}">
            <span style="${S.mKey}">No.</span>
            <span style="${S.mVal}">${num}</span>
          </div>
          <div style="${S.mRow(true)}">
            <span style="${S.mKey}">Date</span>
            <span style="${S.mVal}">${formatDate(date)}</span>
          </div>
          <div style="${S.mRow(true)}">
            <span style="${S.mKey}">Items</span>
            <span style="${S.mVal}">${count}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function fParties(cl, num, date, type, count) {
  const cgstin = cl.gstin
    ? `<div style="${S.gstin};margin-top:4px;">${cl.gstin}</div>` : '';
  const csite = cl.siteAt
    ? `<div style="${S.partyDetail}">📍 ${cl.siteAt}</div>` : '';

  return `
    <div style="${S.parties}">
      <div style="${S.party(true)}">
        <div style="${S.partyLabel}">
          <span style="${S.partyLine}"></span>Bill To: M/S
        </div>
        <div style="${S.partyName}">${cl.name || ''}</div>
        <div style="${S.partyDetail}">${cl.address || ''}</div>
        ${csite}${cgstin}
      </div>
      <div style="${S.party(false)}background:linear-gradient(135deg,#f8faff,#f4f7fd);">
        <div style="${S.partyLabel}">
          <span style="${S.partyLine}"></span>Document Details
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;margin-top:3px;">
          <div>
            <div style="${S.mKey}">Invoice No.</div>
            <div style="${S.mVal};text-align:left;font-size:10px;">${num}</div>
          </div>
          <div>
            <div style="${S.mKey}">Date</div>
            <div style="${S.mVal};text-align:left;font-size:10px;">${formatDate(date)}</div>
          </div>
          <div>
            <div style="${S.mKey}">Type</div>
            <div style="${S.mVal};text-align:left;font-size:10px;">${type}</div>
          </div>
          <div>
            <div style="${S.mKey}">Items</div>
            <div style="${S.mVal};text-align:left;font-size:10px;">${count}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function fTableOpen() {
  const colgroup = COLS.map(w => `<col style="width:${w}px"/>`).join('');
  return `
    <div style="${S.tableWrap}">
      <table style="${S.table}">
        <colgroup>${colgroup}</colgroup>
        <thead><tr>
          <th style="${S.th('center')}">Sr</th>
          <th style="${S.th('left')}">Description</th>
          <th style="${S.th('center')}">HSN/SAC</th>
          <th style="${S.th('center')}">Size</th>
          <th style="${S.th('center')}">QTY</th>
          <th style="${S.th('center')}">NOS</th>
          <th style="${S.th('center')}">PER</th>
          <th style="${S.th('right')}">Rate</th>
          <th style="${S.th('right')}">Amount</th>
        </tr></thead>
        <tbody>
  `;
}

function fTableClose() {
  return `</tbody></table></div>`;
}

function fRow(item, idx) {
  const even = idx % 2 === 1;
  const size = (item.sizeA && item.sizeB)
    ? `${item.sizeA}×${item.sizeB} ${item.sizeUnit}` : '—';
  const qty = (item.qty !== '' && item.qty !== undefined) ? item.qty : '—';
  const mono = `font-family:'DM Mono',Courier,monospace;`;
  return `
    <tr>
      <td style="${S.td('center',false,even)}">${idx+1}</td>
      <td style="${S.tdDesc(even)}">${item.description||''}</td>
      <td style="${S.td('center',false,even)}">${item.hsnSacCode||'—'}</td>
      <td style="${S.td('center',false,even)}">${size}</td>
      <td style="${S.td('center',false,even)}${mono}">${qty}</td>
      <td style="${S.td('center',false,even)}">${item.nos||1}</td>
      <td style="${S.td('center',false,even)}">${item.per||''}</td>
      <td style="${S.td('right',false,even)}${mono}">${formatCurrency(item.rate)}</td>
      <td style="${S.td('right',true,even)}${mono}">${formatCurrency(item.amount)}</td>
    </tr>
  `;
}

function fContLabel(type, num, pageNum) {
  return `
    <div style="${S.contLabel}">
      ${type} ${num} — Continued (Page ${pageNum})
    </div>
  `;
}

function fFooter(inv) {
  const {
    totalAmount=0, cgstPercent=9, sgstPercent=9,
    cgstAmount=0, sgstAmount=0, roundOff=0, grandTotal=0,
    amountInWords='', notes='', bankDetails='',
  } = inv;

  const roundStr = roundOff < 0
    ? `–${formatCurrency(Math.abs(roundOff))}`
    : `+${formatCurrency(Math.abs(roundOff))}`;

  const wordsHtml = amountInWords ? `
    <div style="${S.words}">
      <div style="${S.wordsLabel}">Amount in Words</div>
      <div style="${S.wordsText}">${amountInWords}</div>
    </div>` : '';

  const notesHtml = (notes || bankDetails) ? `
    <div style="${S.notesGrid}">
      ${notes ? `
        <div style="${S.notesBlock(true)}">
          <div style="${S.notesLabel}">Terms &amp; Notes</div>
          <div style="${S.notesText}">${notes}</div>
        </div>` : ''}
      ${bankDetails ? `
        <div style="${S.notesBlock(false)}">
          <div style="${S.notesLabel}">Bank Details</div>
          <div style="${S.notesText}">${bankDetails}</div>
        </div>` : ''}
    </div>` : '';

  return `
    <div style="${S.footerWrap}">
      <div style="${S.totalsWrap}">
        <div style="${S.totalsBox}">
          <div style="${S.tRow}">
            <span style="${S.tLabel}">Total Amount</span>
            <span style="${S.tVal}">Rs. ${formatCurrency(totalAmount)}</span>
          </div>
          <div style="${S.tRow}">
            <span style="${S.tLabel}">CGST (${cgstPercent}%)</span>
            <span style="${S.tVal}">Rs. ${formatCurrency(cgstAmount)}</span>
          </div>
          <div style="${S.tRow}">
            <span style="${S.tLabel}">SGST (${sgstPercent}%)</span>
            <span style="${S.tVal}">Rs. ${formatCurrency(sgstAmount)}</span>
          </div>
          <div style="${S.tRow}">
            <span style="${S.tLabel}">Round Off</span>
            <span style="${S.tVal}">${roundStr}</span>
          </div>
          <div style="${S.grandRow}">
            <span style="${S.grandLabel}">GRAND TOTAL</span>
            <span style="${S.grandVal}">RS. ${formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>
      ${wordsHtml}
      ${notesHtml}
      <div style="${S.signRow}">
        <div style="${S.signBox}">
          <div style="${S.signLine}"></div>
          <div style="${S.signLabel}">Authorised Signatory</div>
        </div>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════
   generatePDF()

   ALGORITHM:
   ----------
   Track usedH (pixels used on current page = A4_H).
   Sections are appended one by one; when adding the
   next section would overflow the page, we CLOSE the
   current page and START a new one.

   PAGE 1:
     accentBar(5) + header(148) + parties(118) +
     tableHead(36) + rows(27 each)

   OVERFLOW:
     remaining < row_H + row_H  →  new page
     (we leave 1 row worth of buffer before deciding)

   AFTER LAST ROW:
     remaining >= footer_H  →  footer here
     remaining <  footer_H  →  new page for footer

   Each page is a 794×1123 div captured by html2canvas
   with windowWidth:794 (viewport-independent).
   scale:4 gives crisp text on all devices.
═══════════════════════════════════════════════════ */
async function generatePDF(invoice, setDlLoading) {
  setDlLoading(true);

  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF }   = await import('jspdf');

  const {
    company={}, client={}, items=[], type='INVOICE',
    invoiceNumber='', date='',
  } = invoice;

  const pdf    = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const PDF_W  = pdf.internal.pageSize.getWidth();   // 210mm
  const PDF_H  = pdf.internal.pageSize.getHeight();  // 297mm

  /* ── Capture one A4-sized page ── */
  async function capturePage(htmlStr, waitForImg) {
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      position:fixed;top:0;left:-9999px;
      width:${A4_W}px;height:${A4_H}px;
      background:#ffffff;overflow:hidden;z-index:-999;
    `;
    wrap.innerHTML = `<div style="${S.page}">${htmlStr}</div>`;
    document.body.appendChild(wrap);

    // Wait for logo image to load (first page only)
    if (waitForImg) {
      const img = wrap.querySelector('img');
      if (img && !img.complete) {
        await new Promise(res => {
          img.onload  = res;
          img.onerror = res;
          setTimeout(res, 4000);
        });
      }
    }

    // Paint-settle delay — CRITICAL on Android/iOS
    // 150ms is enough for Chrome; Safari sometimes needs 250ms
    await new Promise(r => setTimeout(r, 200));

    const canvas = await html2canvas(wrap.firstChild, {
      scale:           4,          // high-DPI — crisp on all devices
      useCORS:         true,
      allowTaint:      false,
      backgroundColor: '#ffffff',
      width:           A4_W,       // fixed — ignores real viewport
      height:          A4_H,
      windowWidth:     A4_W,       // KEY: forces 794px context everywhere
      windowHeight:    A4_H,
      logging:         false,
      imageTimeout:    15000,
    });

    document.body.removeChild(wrap);
    return canvas;
  }

  try {
    const pages = [];   // array of HTML strings, one per A4 page
    let html    = '';
    let usedH   = 0;
    let pageNum = 1;

    /* ── PAGE 1 fixed sections ── */
    html   += fAccentBar();
    html   += fHeader(company, type, invoiceNumber, date, items.length);
    html   += fParties(client, invoiceNumber, date, type, items.length);
    usedH   = H.accentBar + H.header + H.parties;

    /* Open table */
    html   += fTableOpen();
    usedH  += H.tableHead;

    /* ── Item rows with pagination ── */
    for (let i = 0; i < items.length; i++) {
      const isLast    = (i === items.length - 1);
      const remaining = A4_H - MB - usedH;

      // How much space do we need AFTER this row?
      // If last: need footer space. If not: need at least 2 more rows buffer.
      const spaceAfter = isLast ? H.footer : H.row * 2;

      if (remaining < H.row + spaceAfter) {
        // Current row won't fit cleanly → flush page, start new
        html  += fTableClose();
        pages.push(html);

        pageNum++;
        html   = fAccentBar();
        html  += fContLabel(type, invoiceNumber, pageNum);
        html  += fTableOpen();
        usedH  = H.accentBar + H.contLabel + H.tableHead;
      }

      // Add this row
      html  += fRow(items[i], i);
      usedH += H.row;

      // After placing the LAST row, decide where footer goes
      if (isLast) {
        html  += fTableClose();
        const remainAfter = A4_H - MB - usedH;

        if (remainAfter >= H.footer) {
          // Footer fits on this page
          html  += fFooter(invoice);
          pages.push(html);
        } else {
          // Not enough space — footer gets its own page
          pages.push(html);
          pageNum++;
          html  = fAccentBar();
          html += `<div style="${S.contLabel}">${type} ${invoiceNumber} — Summary</div>`;
          html += fFooter(invoice);
          pages.push(html);
        }
      }
    }

    // Edge: zero items
    if (items.length === 0) {
      html += fTableClose();
      const remaining = A4_H - MB - usedH;
      if (remaining >= H.footer) {
        html += fFooter(invoice);
        pages.push(html);
      } else {
        pages.push(html);
        html  = fAccentBar();
        html += fFooter(invoice);
        pages.push(html);
      }
    }

    /* ── Render each page → PDF ── */
    for (let p = 0; p < pages.length; p++) {
      const canvas  = await capturePage(pages[p], p === 0);
      const imgData = canvas.toDataURL('image/png', 1.0);

      // IMPORTANT: always use exact A4 dimensions (PDF_W × PDF_H)
      // NOT ratio-calculated height — that causes micro over/underflows
      if (p > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, PDF_W, PDF_H);
    }

    pdf.save(`${invoiceNumber || 'invoice'}.pdf`);

  } catch (err) {
    alert('PDF generation failed. Please try again.');
    console.error('PDF error:', err);
  } finally {
    setDlLoading(false);
  }
}

/* ═══════════════════════════════════════════════════
   InvoiceView — React component
   Screen layout: responsive (unchanged)
   PDF layout:    fixed 794px (generatePDF above)
═══════════════════════════════════════════════════ */
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

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <span>Loading invoice...</span>
    </div>
  );

  if (!invoice) return (
    <div style={{ textAlign:'center', padding:60, color:'#6b7280' }}>
      Invoice not found.
    </div>
  );

  const {
    company={}, client={}, items=[], type, invoiceNumber, date,
    totalAmount, cgstPercent, sgstPercent, cgstAmount, sgstAmount,
    roundOff, grandTotal, amountInWords, notes, bankDetails,
  } = invoice;

  return (
    <div>

      {/* ── Toolbar ── */}
      <div className="no-print inv-toolbar">
        <div>
          <h1 className="page-title">{type} — {invoiceNumber}</h1>
          <p className="page-subtitle">{client?.name} | {formatDate(date)}</p>
        </div>
        <div className="inv-toolbar-actions">
          <button className="btn btn-outline" onClick={() => navigate('/')}>← Back</button>
          <button className="btn btn-outline" onClick={() => navigate(`/edit/${id}`)}>✏️ Edit</button>
          <button className="btn btn-outline" onClick={handlePrint}>🖨 Print</button>
          <button className="btn btn-primary" onClick={() => setShowShare(true)}>🔗 Share</button>
          <button className="btn btn-accent" onClick={handlePDF} disabled={dlLoading}>
            {dlLoading ? '⏳ Generating...' : '⬇️ Download PDF'}
          </button>
        </div>
      </div>

      {/* ── Share Modal ── */}
      {showShare && invoice && (
        <ShareBillModal invoice={invoice} onClose={() => setShowShare(false)} />
      )}

      {/* ── Screen Preview (responsive, not used for PDF) ── */}
      <div ref={printRef} className="inv-page-layout">

        {/* Invoice preview */}
        <div className="invoice-preview">
          <div className="inv-accent-bar" />

          {/* Header */}
          <div className="inv-header">
            <div className="inv-header-left">
              {company?.logo && (
                <img src={company.logo} alt="logo" className="inv-header-logo" />
              )}
              <div className="inv-header-info">
                <div className="inv-company-name">{company?.name}</div>
                <div className="inv-company-sub">{company?.address}</div>
                <div className="inv-company-contact">
                  {company?.phone && (
                    <span className="inv-contact-chip"><span>📞</span>{company.phone}</span>
                  )}
                  {company?.email && (
                    <span className="inv-contact-chip"><span>✉️</span>{company.email}</span>
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
              {client?.address && <div className="inv-party-detail">{client.address}</div>}
              {client?.siteAt  && <div className="inv-party-detail">📍 Site: {client.siteAt}</div>}
              {client?.gstin   && <div style={{marginTop:6}}><span className="gstin-badge">{client.gstin}</span></div>}
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
                  <th style={{width:32}}>Sr</th>
                  <th style={{textAlign:'left',minWidth:160}}>Description</th>
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
                    <td style={{textAlign:'center',color:'#6b7280'}}>{idx+1}</td>
                    <td style={{textAlign:'left'}}>{item.description}</td>
                    <td>{item.hsnSacCode||'—'}</td>
                    <td>
                      {item.sizeA && item.sizeB
                        ? `${item.sizeA}×${item.sizeB} ${item.sizeUnit}` : '—'}
                    </td>
                    <td style={{fontFamily:'var(--mono)'}}>
                      {item.qty!==''&&item.qty!==undefined ? item.qty : '—'}
                    </td>
                    <td>{item.nos||1}</td>
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
                  <span className="t-val">{roundOff>=0?'+':''}{formatCurrency(roundOff)}</span>
                </div>
                <div className="inv-total-row grand-row">
                  <span className="t-label">GRAND TOTAL</span>
                  <span className="t-val">₹ {formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
            {amountInWords && (
              <div className="inv-words">
                <div className="inv-words-label">Amount in Words</div>
                <div className="inv-words-text">{amountInWords}</div>
              </div>
            )}
            {(notes||bankDetails) && (
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
            <div className="inv-sign-row">
              <div className="inv-sign-box">
                <div className="inv-sign-line" />
                <div className="inv-sign-label">Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>
        {/* end .invoice-preview */}

        {/* Right image panel */}
        <div className="inv-img-panel">
          <div className="inv-img-card">
            <div className="inv-img-badge">{company?.name||'InvoicePro'}</div>
            <img
              src={INTERIOR_IMG}
              alt="Premium work"
              className="inv-img-photo"
              crossOrigin="anonymous"
            />
            <div className="inv-img-overlay">
              <div className="inv-img-tagline">Premium Quality</div>
              <div className="inv-img-desc">
                Aluminium Fabrication &amp;<br/>Roofing Systems
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
                  ₹{grandTotal>=1000
                    ? `${Math.round(grandTotal/1000)}K`
                    : Math.round(grandTotal)}
                </div>
                <div className="inv-stat-lbl">Total</div>
              </div>
            </div>
            <div className="inv-stat-chip">
              <span className="inv-stat-icon">🏷️</span>
              <div>
                <div className="inv-stat-num">{type==='QUOTATION'?'QUO':'INV'}</div>
                <div className="inv-stat-lbl">Type</div>
              </div>
            </div>
          </div>
          <div className="inv-num-highlight">
            <div className="inv-num-hl-label">Reference Number</div>
            <div className="inv-num-hl-val">{invoiceNumber}</div>
            <div className="inv-num-hl-date">{formatDate(date)}</div>
          </div>
          <button className="inv-share-cta no-print" onClick={() => setShowShare(true)}>
            <span>🔗</span>
            Share this {type==='QUOTATION'?'Quotation':'Invoice'}
          </button>
        </div>

      </div>
    </div>
  );
}
