import PosManager from './PosManager';

export default function PosPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">POS Integrations</h1>
      <p className="text-sm text-gray-500 mb-8">
        Connect your Point-of-Sale system to automatically invite customers
        to leave reviews after their purchase.
      </p>
      <PosManager />
    </div>
  );
}
