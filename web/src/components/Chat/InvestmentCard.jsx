function formatCurrency(amount) {
  if (!amount) return '—';
  return `$${Number(amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`;
}

function truncateAddress(addr) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function InvestmentCard({ data }) {
  if (!data) return null;

  return (
    <div className="investment-card">
      <div className="investment-card-header">
        <span className="investment-card-provider">{data.provider}</span>
        <span className="investment-card-ref">Ref: {data.ref}</span>
      </div>
      <h3 className="investment-card-title">Investment Successful</h3>
      <div className="investment-card-grid">
        <div className="investment-card-field">
          <span className="investment-card-label">INVESTMENT AMOUNT</span>
          <span className="investment-card-value">{formatCurrency(data.amount)}</span>
        </div>
        <div className="investment-card-field">
          <span className="investment-card-label">START DATE</span>
          <span className="investment-card-value">{data.startDate || '—'}</span>
        </div>
        <div className="investment-card-field">
          <span className="investment-card-label">ANNUITY TYPE</span>
          <span className="investment-card-value">{data.type || 'Lifetime'}</span>
        </div>
        <div className="investment-card-field">
          <span className="investment-card-label">FIRST PAYMENT</span>
          <span className="investment-card-value">{data.firstPayment || '—'}</span>
        </div>

        {data.annuityAddress && (
          <div className="investment-card-field">
            <span className="investment-card-label">ANNUITY CONTRACT</span>
            <span className="investment-card-value investment-card-value--mono">
              {truncateAddress(data.annuityAddress)}
            </span>
          </div>
        )}
        {data.stablecoinAddress && (
          <div className="investment-card-field">
            <span className="investment-card-label">STABLECOIN CONTRACT</span>
            <span className="investment-card-value investment-card-value--mono">
              {truncateAddress(data.stablecoinAddress)}
            </span>
          </div>
        )}
        {data.txCount && (
          <div className="investment-card-field">
            <span className="investment-card-label">TRANSACTIONS</span>
            <span className="investment-card-value">{data.txCount} on-chain txs</span>
          </div>
        )}
        {data.rate && (
          <div className="investment-card-field">
            <span className="investment-card-label">MATCHED RATE</span>
            <span className="investment-card-value investment-card-value--rate">{data.rate} p.a.</span>
          </div>
        )}
      </div>
      <div className="investment-card-actions">
        <button className="btn btn--primary">Download Receipt</button>
        <button className="btn btn--outline">My Dashboard</button>
      </div>
    </div>
  );
}
