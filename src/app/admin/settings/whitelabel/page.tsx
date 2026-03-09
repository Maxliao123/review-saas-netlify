import WhiteLabelSettings from './WhiteLabelSettings';

export default function WhiteLabelPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">White Label</h1>
      <p className="text-sm text-gray-500 mb-8">
        Fully rebrand the platform with your own logo, colors, domain, and email identity.
        Enterprise plan required.
      </p>
      <WhiteLabelSettings />
    </div>
  );
}
