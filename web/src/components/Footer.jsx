import { useRfq } from '../context/RfqContext';

export default function Footer() {
  const { state } = useRfq();

  return (
    <footer className="footer">
      <div className="footer-progress">
        <span className="footer-label">Overall Progress</span>
        <span className="footer-pct">{state.progress}%</span>
      </div>
      <div className="footer-bar">
        <div className="footer-bar-fill" style={{ width: `${state.progress}%` }} />
      </div>
      <p className="footer-privacy">
        Your application data is being securely handled in accordance with Australian privacy standards.
      </p>
    </footer>
  );
}
