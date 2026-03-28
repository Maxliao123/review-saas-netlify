'use client';

import dynamic from 'next/dynamic';
import { QrCode } from 'lucide-react';

const QRCodeCard = dynamic(() => import('@/components/QRCodeCard'), { ssr: false });

interface Store {
  id: number;
  name: string;
  slug: string;
}

export default function QRCodeManager({ stores }: { stores: Store[] }) {
  if (stores.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-4">
          <QrCode className="h-7 w-7 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">No stores yet</h3>
        <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
          Set up your first store to generate QR codes for customer review collection.
        </p>
        <a
          href="/admin/stores/setup"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Set Up a Store
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {stores.map((store) => (
        <QRCodeCard
          key={store.id}
          storeSlug={store.slug}
          storeName={store.name}
        />
      ))}
    </div>
  );
}
