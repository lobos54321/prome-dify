'use client';

import { useState } from 'react';
import { updatePointsOptimistically } from '@/lib/usePoints';
import { KeyedMutator } from 'swr';

interface ChatBoxProps {
  onUsageEvent?: (newBalance: number) => void;
  mutatePoints?: KeyedMutator<{ balance: number }>;
}

interface UsageResponse {
  success: boolean;
  balance: number;
  conversationId?: string;
  error?: string;
}

export default function ChatBox({ onUsageEvent, mutatePoints }: ChatBoxProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      // Simulate usage event that costs points
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const usageResponse = await fetch(`${apiUrl}/api/usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cost: 10 }), // Each message costs 10 points
      });

      const usageData: UsageResponse = await usageResponse.json();

      if (usageData.success) {
        // Optimistically update the points cache
        if (mutatePoints) {
          updatePointsOptimistically(mutatePoints, usageData.balance);
        }

        // Call the usage event handler
        if (onUsageEvent) {
          onUsageEvent(usageData.balance);
        }

        // Simulate AI response
        setResponse(`AI Response to: "${message}"`);
        setMessage('');
      } else {
        setResponse(`Error: ${usageData.error}`);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setResponse('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Chat with AI</h2>
      
      {response && (
        <div className="mb-4 p-3 bg-gray-100 rounded-lg">
          <p className="text-gray-700">{response}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your message here..."
          className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          disabled={isLoading}
        />
        
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !message.trim()}
          className="self-end px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Sending...' : 'Send Message'}
        </button>
      </div>

      <p className="text-sm text-gray-500 mt-2">
        Each message costs 10 points
      </p>
    </div>
  );
}