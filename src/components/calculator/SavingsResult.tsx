interface SavingsResultProps {
  savingsPerFill: number;
  annualSavings: number;
  tripCost: number;
  netSavings: number;
}

function formatDollars(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export default function SavingsResult({
  savingsPerFill,
  annualSavings,
  tripCost,
  netSavings,
}: SavingsResultProps) {
  const isWorth = netSavings > 0;

  return (
    <div
      className={`mt-4 rounded-xl border p-5 ${
        isWorth
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-red-500/20 bg-red-500/5"
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
          isWorth ? "bg-emerald-500/20" : "bg-red-500/20"
        }`}>
          {isWorth ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <span className={`text-base font-semibold ${isWorth ? "text-emerald-400" : "text-red-400"}`}>
          {isWorth ? "Worth the trip!" : "Not worth the drive"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white/5 p-3">
          <div className="text-xs text-[#9aa0a6] mb-1">Savings per fill</div>
          <div className="text-lg font-bold font-mono text-white">{formatDollars(savingsPerFill)}</div>
        </div>
        <div className="rounded-lg bg-white/5 p-3">
          <div className="text-xs text-[#9aa0a6] mb-1">Trip fuel cost</div>
          <div className="text-lg font-bold font-mono text-white">{formatDollars(tripCost)}</div>
        </div>
        <div className="rounded-lg bg-white/5 p-3">
          <div className="text-xs text-[#9aa0a6] mb-1">Net savings</div>
          <div className={`text-lg font-bold font-mono ${isWorth ? "text-emerald-400" : "text-red-400"}`}>
            {formatDollars(netSavings)}
          </div>
        </div>
        <div className="rounded-lg bg-white/5 p-3">
          <div className="text-xs text-[#9aa0a6] mb-1">Annual (52 weeks)</div>
          <div className={`text-lg font-bold font-mono ${isWorth ? "text-emerald-400" : "text-red-400"}`}>
            {formatDollars(annualSavings)}
          </div>
        </div>
      </div>
    </div>
  );
}
