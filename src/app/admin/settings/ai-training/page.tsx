import TrainingDashboard from './TrainingDashboard';

export default function AiTrainingPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">AI Training Data</h1>
      <p className="text-sm text-gray-500 mb-8">
        Track AI reply quality per vertical. As you approve, reject, or edit AI drafts,
        the system collects training data for future model fine-tuning.
      </p>
      <TrainingDashboard />
    </div>
  );
}
