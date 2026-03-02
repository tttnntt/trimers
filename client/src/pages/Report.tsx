import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Report.css';

export default function Report() {
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="report-page">
      <h1>Report</h1>
      <p className="subtitle">Report inappropriate content or behavior</p>
      {submitted ? (
        <div className="success-msg">
          <p>Thank you. Your report has been submitted. We will review it shortly.</p>
          <Link to="/" className="btn-primary">Back to Home</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="report-form">
          <label>Describe the issue</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What would you like to report?"
            rows={4}
          />
          <button type="submit" className="btn-primary">Submit Report</button>
        </form>
      )}
    </div>
  );
}
