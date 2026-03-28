import WebhookSettings from './WebhookSettings';

export default function WebhooksPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Webhooks</h1>
      <p className="text-sm text-gray-500 mb-8">
        Send real-time review events to Zapier, Slack, HubSpot, or any HTTPS endpoint.
        Connect your reviews to the tools you already use.
      </p>
      <WebhookSettings />
    </div>
  );
}
