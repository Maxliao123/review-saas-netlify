import TemplatesManager from './TemplatesManager';

export default function TemplatesPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Reply Templates</h1>
      <p className="text-sm text-gray-500 mb-8">
        Pre-built templates for common review types. Matched by rating, language, and category to reduce AI costs.
      </p>
      <TemplatesManager />
    </div>
  );
}
