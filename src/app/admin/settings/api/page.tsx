import ApiKeyManager from './ApiKeyManager';

export default function ApiKeysPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">API Keys</h1>
      <p className="text-sm text-gray-500 mb-8">
        Manage API keys for programmatic access to your review data.
        Use the REST API to integrate with your own systems.
      </p>
      <ApiKeyManager />
    </div>
  );
}
