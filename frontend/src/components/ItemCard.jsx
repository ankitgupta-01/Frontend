import React from 'react';
import { UNIT_OPTIONS, formatCurrency } from '../utils/helpers';

export default function ItemCard({ item, index, onChange, onDelete, canDelete }) {

  const update = (field, value) => {
    const updated = { ...item, [field]: value };

    const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
    const has = v => { const n = parseFloat(v); return isFinite(n) && n > 0; };

    const a    = field === 'sizeA' ? num(value) : num(updated.sizeA);
    const b    = field === 'sizeB' ? num(value) : num(updated.sizeB);
    const nos  = field === 'nos'   ? num(value) : num(updated.nos);
    const rate = field === 'rate'  ? num(value) : num(updated.rate);

    const hasSizeA = has(field === 'sizeA' ? parseFloat(value) : parseFloat(updated.sizeA));
    const hasSizeB = has(field === 'sizeB' ? parseFloat(value) : parseFloat(updated.sizeB));
    const hasNos   = has(nos);

    // CASE 1: Both sizes → Qty = SizeA × SizeB × NOS
    if (hasSizeA && hasSizeB) {
      const effectiveNos = hasNos ? nos : 1;
      updated.qty    = parseFloat((a * b * effectiveNos).toFixed(4));
      updated.amount = parseFloat((updated.qty * rate).toFixed(2));

    // CASE 2: No sizes, NOS provided → Qty = NOS
    } else if (hasNos) {
      updated.qty    = nos;
      updated.amount = parseFloat((nos * rate).toFixed(2));

    // CASE 3: Only Rate → Qty = 1, Amount = Rate
    } else {
      updated.qty    = rate > 0 ? 1 : '';
      updated.amount = parseFloat(rate.toFixed(2));
    }

    onChange(updated);
  };

  const renderCalcHint = () => {
    if (!item.amount || item.amount <= 0) return null;
    const a   = parseFloat(item.sizeA);
    const b   = parseFloat(item.sizeB);
    const nos = parseFloat(item.nos);
    const r   = parseFloat(item.rate);
    const hasA = isFinite(a) && a > 0;
    const hasB = isFinite(b) && b > 0;
    const hasN = isFinite(nos) && nos > 0;

    if (hasA && hasB) {
      const effNos = hasN ? nos : 1;
      return (
        <div className="calc-hint">
          {a} × {b}{effNos > 1 ? ` × ${effNos}` : ''} = <strong>{item.qty} {item.sizeUnit}²</strong>
          &nbsp;&nbsp;|&nbsp;&nbsp;
          {item.qty} × ₹{r} = <strong>₹ {formatCurrency(item.amount)}</strong>
        </div>
      );
    }
    if (hasN) {
      return (
        <div className="calc-hint">
          {nos} NOS × ₹{r} = <strong>₹ {formatCurrency(item.amount)}</strong>
        </div>
      );
    }
    return (
      <div className="calc-hint">
        1 × ₹{r} = <strong>₹ {formatCurrency(item.amount)}</strong>
      </div>
    );
  };

  return (
    <div className="item-card">

      {/* Card Header */}
      <div className="item-card-header">
        <div className="item-card-num">Item #{index + 1}</div>
        <div className="item-card-amount-preview">
          {item.amount > 0
            ? <span className="amount-live">₹ {formatCurrency(item.amount)}</span>
            : <span className="amount-empty">₹ 0.00</span>
          }
        </div>
        {canDelete && (
          <button className="item-delete-btn" onClick={onDelete} title="Remove item">✕</button>
        )}
      </div>

      {/* Card Body */}
      <div className="item-card-body">

        {/* Row 1: Description + HSN/SAC */}
        <div className="fields-grid-2">
          <div className="form-field-group">
            <label className="field-label">Description</label>
            <input
              className="field-input"
              placeholder="e.g. R-70 DOOR WITH FRAME 8mm FLUTED GLASS"
              value={item.description}
              onChange={e => update('description', e.target.value)}
            />
          </div>
          <div className="form-field-group">
            <label className="field-label">HSN / SAC Code</label>
            <input
              className="field-input mono"
              placeholder="e.g. 7610"
              value={item.hsnSacCode}
              onChange={e => update('hsnSacCode', e.target.value)}
            />
          </div>
        </div>

        {/* Row 2: Size A × Size B × Nos = QTY | Unit
            Formula: QTY = Size A × Size B × Nos  */}
        <div className="size-row">

          {/* Size A */}
          <div className="form-field-group size-field">
            <label className="field-label">
              Size A <span className="field-optional">(opt)</span>
            </label>
            <input
              className="field-input center"
              type="number"
              placeholder="3"
              value={item.sizeA}
              onChange={e => update('sizeA', e.target.value)}
            />
          </div>

          <div className="size-multiply">×</div>

          {/* Size B */}
          <div className="form-field-group size-field">
            <label className="field-label">
              Size B <span className="field-optional">(opt)</span>
            </label>
            <input
              className="field-input center"
              type="number"
              placeholder="6"
              value={item.sizeB}
              onChange={e => update('sizeB', e.target.value)}
            />
          </div>

          <div className="size-multiply">×</div>

          {/* NOS — moved here so formula reads: A × B × Nos = QTY */}
          <div className="form-field-group size-field">
            <label className="field-label">
              NOS <span className="field-optional">(opt)</span>
            </label>
            <input
              className="field-input center"
              type="number"
              min="1"
              placeholder="1"
              value={item.nos}
              onChange={e => update('nos', e.target.value)}
            />
          </div>

          <div className="size-equals">=</div>

          {/* QTY — auto calculated */}
          <div className="form-field-group qty-result-field">
            <label className="field-label">QTY <span className="auto-tag">Auto</span></label>
            <div className="qty-result-box">
              {item.qty !== '' && item.qty !== undefined && item.qty > 0
                ? <>
                    <span className="qty-val">{item.qty}</span>
                    {parseFloat(item.sizeA) > 0 && parseFloat(item.sizeB) > 0 && (
                      <span className="qty-unit">{item.sizeUnit}²</span>
                    )}
                  </>
                : <span className="qty-placeholder">—</span>
              }
            </div>
          </div>

          {/* Unit — after QTY */}
          <div className="form-field-group size-unit-field">
            <label className="field-label">Unit</label>
            <select
              className="field-input"
              value={item.sizeUnit}
              onChange={e => update('sizeUnit', e.target.value)}
            >
              {UNIT_OPTIONS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>

        </div>

        {/* Row 3: Rate | Per (text input) | Amount
            Order: Rate → Per → Amount              */}
        <div className="calc-row">

          {/* Rate */}
          <div className="form-field-group">
            <label className="field-label">Rate (₹) <span className="required">*</span></label>
            <input
              className="field-input mono"
              type="number"
              placeholder="0.00"
              value={item.rate}
              onChange={e => update('rate', e.target.value)}
            />
          </div>

          {/* Per — FREE TEXT input (was dropdown) */}
          <div className="form-field-group">
            <label className="field-label">Per</label>
            <input
              className="field-input"
              type="text"
              placeholder="SFT"
              value={item.per}
              onChange={e => update('per', e.target.value)}
            />
          </div>

          {/* Amount — auto, spans 2 cols */}
          <div className="form-field-group" style={{ gridColumn: 'span 2' }}>
            <label className="field-label">Amount <span className="auto-tag">Auto</span></label>
            <div className={`amount-result-box ${item.amount > 0 ? 'has-value' : ''}`}>
              ₹ {item.amount ? formatCurrency(item.amount) : '0.00'}
            </div>
          </div>

        </div>

        {/* Calc hint — live formula display */}
        {renderCalcHint()}

      </div>
    </div>
  );
}
