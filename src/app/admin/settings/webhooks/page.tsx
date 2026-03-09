import WebhookManager from './WebhookManager';

export default function WebhooksPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Webhooks</h1>
      <p className="text-sm text-gray-500 mb-8">
        Send real-time event notifications to your systems. Connect with Salesforce,
        HubSpot, Slack, or any HTTPS endpoint.
      </p>
      <WebhookManager />
    </div>
  );
}
