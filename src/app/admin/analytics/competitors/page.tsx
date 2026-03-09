import CompetitorDashboard from './CompetitorDashboard';

export default function CompetitorPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Competitor Comparison</h1>
      <p className="text-sm text-gray-500 mb-8">
        Your rating, review volume, and response rate vs. nearby competitors.
      </p>
      <CompetitorDashboard />
    </div>
  );
}
