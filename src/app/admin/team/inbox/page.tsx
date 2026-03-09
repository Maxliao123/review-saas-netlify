import TeamInbox from './TeamInbox';

export default function TeamInboxPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Team Inbox</h1>
      <p className="text-sm text-gray-500 mb-8">
        Assign and manage review responses across your team. Track who handles each review.
      </p>
      <TeamInbox />
    </div>
  );
}
