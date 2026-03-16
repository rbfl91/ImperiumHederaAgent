import { useCallback } from 'react';

function formatCurrency(amount) {
  return `$${Number(amount).toLocaleString('en-AU')}`;
}

export default function QuotesTable({ quotes, onSelect }) {
  if (!quotes || quotes.length === 0) return null;

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
            <th>Annual Payout</th>
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
              <td className="quotes-payout">{formatCurrency(q.annualPayout)}</td>
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
