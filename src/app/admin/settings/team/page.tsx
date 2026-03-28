import TeamManager from './TeamManager';

export default function TeamPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Team Members</h1>
      <p className="text-sm text-gray-500 mb-8">
        Manage your team and invite new members to help manage reviews.
      </p>
      <TeamManager />
    </div>
  );
}
