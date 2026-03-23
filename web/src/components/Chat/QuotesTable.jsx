function formatCurrency(amount) {
  return `$${Number(amount).toLocaleString('en-AU')}`;
}

/**
 * Detect asset type from quote shape:
 * - Annuity quotes have `annualPayout`
 * - TD quotes have `totalReturn`
 * - NCD quotes have `discountedPrice`
 */
function detectAssetType(quotes) {
  const sample = quotes[0];
  if (sample?.annualPayout != null) return 'annuity';
  if (sample?.totalReturn != null) return 'term-deposit';
  if (sample?.discountedPrice != null) return 'ncd';
  return 'annuity';
}

const COLUMNS = {
  'annuity': { label: 'Annual Payout', getValue: (q) => formatCurrency(q.annualPayout) },
  'term-deposit': { label: 'Total Return', getValue: (q) => formatCurrency(q.totalReturn) },
  'ncd': { label: 'Purchase Price', getValue: (q) => formatCurrency(q.discountedPrice) },
};

export default function QuotesTable({ quotes, onSelect }) {
  if (!quotes || quotes.length === 0) return null;

  const assetType = detectAssetType(quotes);
  const col = COLUMNS[assetType];

  return (
    <div className="quotes-table-wrapper">
      <div className="quotes-table-header">
        <h4>LIVE QUOTES</h4>
        <span className="quotes-updated">UPDATED JUST NOW</span>
      </div>
      <table className="quotes-table">
        <thead>
          <tr>
            <th>Provider</th>
            <th>Rate</th>
            <th>{col.label}</th>
            {onSelect && <th></th>}
          </tr>
        </thead>
        <tbody>
          {quotes.map((q, i) => (
            <tr key={i} className={i === 0 ? 'quotes-row--best' : ''}>
              <td className="quotes-provider">
                <span className={`provider-dot provider-dot--${i}`} />
                {q.provider}
              </td>
              <td className="quotes-rate">{q.rate}</td>
              <td className="quotes-payout">{col.getValue(q)}</td>
              {onSelect && (
                <td>
                  <button
                    className="btn btn--select"
                    onClick={() => onSelect(`I'd like to go with ${q.provider}`)}
                  >
                    SELECT
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
