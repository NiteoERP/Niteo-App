
export default function LoadingProveedores() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="h-8 bg-neutral-800/50 animate-pulse rounded-lg w-1/4"></div>
        <div className="h-10 bg-neutral-800/50 animate-pulse rounded-xl w-32"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-neutral-800/30 animate-pulse rounded-2xl border border-neutral-800"></div>
        ))}
      </div>
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl p-5 space-y-4">
        <div className="h-10 bg-neutral-800/30 animate-pulse rounded-xl w-full mb-6"></div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 bg-neutral-800/20 animate-pulse rounded-xl border border-neutral-800/50 w-full"></div>
        ))}
      </div>
    </div>
  );
}

