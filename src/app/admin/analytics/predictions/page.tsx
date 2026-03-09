import PredictiveDashboard from './PredictiveDashboard';

export default function PredictionsPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Predictive Analytics</h1>
      <p className="text-sm text-gray-500 mb-8">
        AI-powered trend analysis and early warning alerts for your review performance.
        Actionable insights to stay ahead of problems.
      </p>
      <PredictiveDashboard />
    </div>
  );
}
