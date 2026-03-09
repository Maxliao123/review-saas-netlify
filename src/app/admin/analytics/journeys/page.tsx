import JourneyDashboard from './JourneyDashboard';

export default function JourneysPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Customer Journey</h1>
      <p className="text-sm text-gray-500 mb-8">
        Track the complete customer path from QR scan to published Google review.
        Identify drop-off points and optimize conversion at every stage.
      </p>
      <JourneyDashboard />
    </div>
  );
}
