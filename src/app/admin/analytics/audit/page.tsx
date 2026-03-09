import AuditDashboard from './AuditDashboard';

export default function AuditPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Review Auditor</h1>
      <p className="text-sm text-gray-500 mb-8">
        AI-powered detection of competitor manipulation, coordinated attacks,
        and review bombing. Protects your reputation with actionable intelligence.
      </p>
      <AuditDashboard />
    </div>
  );
}
