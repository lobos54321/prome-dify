'use client';

import ChatBox from '@/components/ChatBox';
import { usePoints } from '@/lib/usePoints';

export default function Home() {
  const { mutate: mutatePoints } = usePoints();

  const handleUsageEvent = (newBalance: number) => {
    console.log('Usage event:', { newBalance });
    // This is where you could trigger other UI updates if needed
    // The balance in the navbar will update automatically via SWR
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Welcome to Prome-dify
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Chat with AI using your point balance
          </p>
          <p className="text-sm text-gray-500">
            Your balance updates automatically every 30 seconds and when you send messages
          </p>
        </div>

        <div className="mb-8">
          <ChatBox 
            onUsageEvent={handleUsageEvent}
            mutatePoints={mutatePoints}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Features</h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Live balance polling every 30 seconds
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Optimistic updates on message send
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Automatic refresh on window focus
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Real-time balance display in navigation
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
