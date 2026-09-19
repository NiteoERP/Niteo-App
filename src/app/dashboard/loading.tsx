import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-6 w-full space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div className="space-y-2">
          <div className="h-8 bg-neutral-800/60 rounded-lg w-48 animate-pulse"></div>
          <div className="h-4 bg-neutral-800/40 rounded w-64 animate-pulse"></div>
        </div>
        <div className="h-10 bg-neutral-800/60 rounded-xl w-32 animate-pulse"></div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl">
            <div className="flex justify-between items-center mb-4">
              <div className="h-4 bg-neutral-800/60 rounded w-24 animate-pulse"></div>
              <div className="h-8 w-8 bg-neutral-800/60 rounded-full animate-pulse"></div>
            </div>
            <div className="h-8 bg-neutral-800/70 rounded w-32 animate-pulse mb-2"></div>
            <div className="h-4 bg-neutral-800/40 rounded w-40 animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 min-h-[300px]">
          <div className="h-6 bg-neutral-800/60 rounded w-48 animate-pulse mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-neutral-800/30 rounded-xl w-full animate-pulse border border-neutral-800/40"></div>
            ))}
          </div>
        </div>
        <div className="col-span-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 min-h-[300px]">
          <div className="h-6 bg-neutral-800/60 rounded w-32 animate-pulse mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex space-x-4">
                 <div className="h-12 w-12 bg-neutral-800/60 rounded-xl animate-pulse"></div>
                 <div className="space-y-2 flex-1">
                    <div className="h-4 bg-neutral-800/60 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-neutral-800/40 rounded w-1/2 animate-pulse"></div>
                 </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
