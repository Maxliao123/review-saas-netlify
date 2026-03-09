import ExperimentsDashboard from './ExperimentsDashboard';

export default function ExperimentsPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">A/B Experiments</h1>
      <p className="text-sm text-gray-500 mb-8">
        Test different reply tones and styles. Track which approach gets better results.
      </p>
      <ExperimentsDashboard />
    </div>
  );
}
