import MarketplaceBrowser from './MarketplaceBrowser';

export default function MarketplacePage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Specialist Marketplace</h1>
      <p className="text-sm text-gray-500 mb-8">
        Hire professional review response specialists to craft high-quality, personalized
        replies to your customer reviews. Browse by industry, language, and rating.
      </p>
      <MarketplaceBrowser />
    </div>
  );
}
