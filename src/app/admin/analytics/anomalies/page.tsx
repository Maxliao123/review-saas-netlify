import AnomalyDashboard from './AnomalyDashboard';

export default function AnomaliesPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Anomaly Detection</h1>
      <p className="text-sm text-gray-500 mb-8">
        AI-powered fake review detection. Reviews are scored for suspicious patterns
        including generic text, burst timing, sentiment mismatches, and profile anomalies.
      </p>
      <AnomalyDashboard />
    </div>
  );
}
