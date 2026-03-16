import { useRfq, STAGES } from '../../context/RfqContext';

const STAGE_LABELS = {
  introduction: 'Introduction',
  investment_summary: 'Investment Summary',
  beneficiary_info: 'Beneficiary Info',
  final_review: 'Final Review',
};

export default function RfqProgress() {
  const { state } = useRfq();

  return (
    <div className="rfq-progress">
      <h3 className="rfq-progress-title">DEAL PROGRESS</h3>
      <ul className="rfq-steps">
        {STAGES.map((stage) => {
          const isCompleted = state.completedStages.includes(stage);
          const isCurrent = state.currentStage === stage;
          let status = 'upcoming';
          if (isCompleted) status = 'completed';
          else if (isCurrent) status = 'current';

          return (
            <li key={stage} className={`rfq-step rfq-step--${status}`}>
              <div className="rfq-step-icon">
                {isCompleted ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill="#1B6B3A" />
                    <path d="M6 10l3 3 5-6" stroke="white" strokeWidth="2" fill="none" />
                  </svg>
                ) : isCurrent ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="#f35d00" strokeWidth="2" fill="none" />
                    <circle cx="10" cy="10" r="5" fill="#f35d00" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="#CBD5E1" strokeWidth="2" fill="none" />
                  </svg>
                )}
              </div>
              <div className="rfq-step-text">
                <span className="rfq-step-label">{STAGE_LABELS[stage]}</span>
                <span className="rfq-step-status">
                  {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Upcoming'}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
