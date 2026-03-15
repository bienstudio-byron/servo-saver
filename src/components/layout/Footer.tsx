export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#1a1a1a]/50 py-4">
      <div className="mx-auto max-w-7xl px-4 text-center text-xs text-[#9aa0a6]">
        Data sourced from{" "}
        <a
          href="https://www.service.vic.gov.au"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#8ab4f8] hover:text-[#aecbfa] transition-colors"
        >
          Service Victoria
        </a>
        {" "}&middot; Prices are delayed ~24 hours
      </div>
    </footer>
  );
}
