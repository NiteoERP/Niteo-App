
export default function LoadingCreditos() {
  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      <div className="w-full lg:w-[400px] bg-neutral-950 flex flex-col border-r border-neutral-800">
        <div className="p-4 border-b border-neutral-800 bg-neutral-950/50">
          <div className="h-8 bg-neutral-800/50 animate-pulse rounded-lg w-1/3 mb-4"></div>
          <div className="h-10 bg-neutral-800/50 animate-pulse rounded-xl w-full mb-4"></div>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="w-full p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 animate-pulse h-24"></div>
          ))}
        </div>
      </div>
      <div className="hidden lg:flex flex-1 flex-col bg-neutral-950 p-8 items-center justify-center">
         <div className="w-32 h-32 rounded-full bg-neutral-900 animate-pulse mb-6"></div>
         <div className="w-1/3 h-6 bg-neutral-900 animate-pulse rounded-lg"></div>
      </div>
    </div>
  );
}

