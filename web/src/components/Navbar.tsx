'use client';

import { usePoints } from '@/lib/usePoints';

export default function Navbar() {
  const { balance, isLoading, error } = usePoints();

  return (
    <nav className="bg-white shadow-md border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-800">Prome-dify</h1>
            <span className="text-sm text-gray-500">AI Chat Platform</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Balance:</span>
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-4 w-12 bg-gray-300 rounded"></div>
                </div>
              ) : error ? (
                <span className="text-red-600 text-sm">Error</span>
              ) : (
                <span className="font-bold text-blue-600">
                  {balance?.toLocaleString() || 0} points
                </span>
              )}
            </div>
            
            {/* Refresh indicator */}
            {isLoading && balance !== undefined && (
              <div className="text-gray-400">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}