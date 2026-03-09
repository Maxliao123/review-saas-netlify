import BenchmarkDashboard from './BenchmarkDashboard';

export default function BenchmarksPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Industry Benchmarks</h1>
      <p className="text-sm text-gray-500 mb-8">
        See how your stores rank against industry peers. Percentiles based on anonymized data across all businesses in your vertical.
      </p>
      <BenchmarkDashboard />
    </div>
  );
}
