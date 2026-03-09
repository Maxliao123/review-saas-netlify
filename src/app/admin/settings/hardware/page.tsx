import HardwareManager from './HardwareManager';

export default function HardwarePage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Hardware & Devices</h1>
      <p className="text-sm text-gray-500 mb-8">
        Manage NFC stands, QR displays, table talkers, and other physical review collection
        devices across your store locations.
      </p>
      <HardwareManager />
    </div>
  );
}
