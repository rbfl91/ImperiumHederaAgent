import { useRfq } from '../../context/RfqContext';

function formatCurrency(amount) {
  if (!amount) return '—';
  return `$${Number(amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`;
}

export default function InvestmentDetails() {
  const { state } = useRfq();
  const d = state.details;
  const hasData = d.premiumAmount || d.age || d.residence;

  return (
    <div className="investment-details">
      <h3 className="investment-details-title">INVESTMENT DETAILS</h3>

      {!hasData ? (
        <p className="investment-details-empty">
          Details will appear here as you share your investment goals with the advisor.
        </p>
      ) : (
        <>
          <div className="detail-card detail-card--premium">
            <span className="detail-label">Premium Amount</span>
            <span className="detail-value detail-value--large">
              {formatCurrency(d.premiumAmount)}
            </span>
            {d.source && (
              <span className="detail-source">SOURCE: {d.source.toUpperCase()}</span>
            )}
          </div>

          <div className="detail-grid">
            {d.age && (
              <div className="detail-row">
                <span className="detail-label">Age</span>
                <span className="detail-value">{d.age} Years</span>
              </div>
            )}
            {d.residence && (
              <div className="detail-row">
                <span className="detail-label">Residence</span>
                <span className="detail-value">{d.residence}</span>
              </div>
            )}
            {d.topRate && (
              <div className="detail-row">
                <span className="detail-label">Top Match Rate</span>
                <span className="detail-value detail-value--rate">{d.topRate} p.a.</span>
              </div>
            )}
            {d.annuityType && (
              <div className="detail-row">
                <span className="detail-label">Annuity Type</span>
                <span className="detail-value">{d.annuityType}</span>
              </div>
            )}
            {d.payoutFrequency && (
              <div className="detail-row">
                <span className="detail-label">Payout Frequency</span>
                <span className="detail-value">{d.payoutFrequency}</span>
              </div>
            )}
          </div>

          <div className="advisor-tip">
            <div className="advisor-tip-header">ADVISOR TIP</div>
            <p>
              Lifetime annuities provide income for life, regardless of how long you live.
              They are also eligible for the Age Pension assets test discount.
            </p>
          </div>

          <button className="btn btn--outline btn--full">Save Quote Progress</button>
        </>
      )}
    </div>
  );
}
