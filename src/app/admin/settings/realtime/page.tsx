import RealtimeSettings from './RealtimeSettings';

export default function RealtimePage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Real-Time Reviews</h1>
      <p className="text-sm text-gray-500 mb-8">
        Replace 5-minute cron polling with instant Google Pub/Sub push notifications.
        New reviews are processed in under 30 seconds instead of waiting for the next cron cycle.
      </p>
      <RealtimeSettings />
    </div>
  );
}
