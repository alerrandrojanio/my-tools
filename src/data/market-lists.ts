export type WatchListId =
  | "currencies"
  | "stocks-us"
  | "stocks-br"
  | "reits-br"
  | "etfs-us";

export interface WatchItem {
  symbol: string;
  name: string;
}

export interface WatchList {
  id: WatchListId;
  label: string;
  description: string;
  items: readonly WatchItem[];
}

export const WATCH_LISTS: readonly WatchList[] = [
  {
    id: "currencies",
    label: "Currencies",
    description:
      "Major currencies priced in Brazilian reais, plus Bitcoin in US dollars.",
    items: [
      { symbol: "USDBRL=X", name: "US Dollar" },
      { symbol: "EURBRL=X", name: "Euro" },
      { symbol: "GBPBRL=X", name: "British Pound" },
      { symbol: "JPYBRL=X", name: "Japanese Yen" },
      { symbol: "ARSBRL=X", name: "Argentine Peso" },
      { symbol: "CADBRL=X", name: "Canadian Dollar" },
      { symbol: "AUDBRL=X", name: "Australian Dollar" },
      { symbol: "CHFBRL=X", name: "Swiss Franc" },
      { symbol: "CNYBRL=X", name: "Chinese Yuan" },
      { symbol: "BTC-USD", name: "Bitcoin" },
    ],
  },
  {
    id: "stocks-us",
    label: "US stocks",
    description: "Ten of the largest companies listed in the United States.",
    items: [
      { symbol: "AAPL", name: "Apple" },
      { symbol: "MSFT", name: "Microsoft" },
      { symbol: "NVDA", name: "NVIDIA" },
      { symbol: "AMZN", name: "Amazon" },
      { symbol: "GOOGL", name: "Alphabet" },
      { symbol: "META", name: "Meta Platforms" },
      { symbol: "TSLA", name: "Tesla" },
      { symbol: "BRK-B", name: "Berkshire Hathaway" },
      { symbol: "JPM", name: "JPMorgan Chase" },
      { symbol: "SPCX", name: "SpaceX" },
    ],
  },
  {
    id: "stocks-br",
    label: "Brazil stocks",
    description:
      "Ten widely traded companies on B3, the Brazilian stock exchange.",
    items: [
      { symbol: "PETR4.SA", name: "Petrobras" },
      { symbol: "VALE3.SA", name: "Vale" },
      { symbol: "ITUB4.SA", name: "Itaú Unibanco" },
      { symbol: "BBDC4.SA", name: "Bradesco" },
      { symbol: "BBAS3.SA", name: "Banco do Brasil" },
      { symbol: "ABEV3.SA", name: "Ambev" },
      { symbol: "WEGE3.SA", name: "WEG" },
      { symbol: "B3SA3.SA", name: "B3" },
      { symbol: "RENT3.SA", name: "Localiza" },
      { symbol: "MGLU3.SA", name: "Magazine Luiza" },
    ],
  },
  {
    id: "reits-br",
    label: "Brazil REITs",
    description: "Ten popular Brazilian real estate funds (FIIs) traded on B3.",
    items: [
      { symbol: "MXRF11.SA", name: "Maxi Renda" },
      { symbol: "HGLG11.SA", name: "CSHG Logística" },
      { symbol: "KNRI11.SA", name: "Kinea Renda Imobiliária" },
      { symbol: "XPML11.SA", name: "XP Malls" },
      { symbol: "VISC11.SA", name: "Vinci Shopping Centers" },
      { symbol: "KNCR11.SA", name: "Kinea Rendimentos" },
      { symbol: "BTLG11.SA", name: "BTG Pactual Logística" },
      { symbol: "XPLG11.SA", name: "XP Log" },
      { symbol: "HGRU11.SA", name: "Pátria Renda Urbana" },
      { symbol: "CPTS11.SA", name: "Capitânia Securities" },
    ],
  },
  {
    id: "etfs-us",
    label: "US ETFs",
    description:
      "Ten of the most traded exchange-traded funds in the United States.",
    items: [
      { symbol: "SPY", name: "SPDR S&P 500" },
      { symbol: "VOO", name: "Vanguard S&P 500" },
      { symbol: "IVV", name: "iShares Core S&P 500" },
      { symbol: "QQQ", name: "Invesco QQQ (Nasdaq-100)" },
      { symbol: "VTI", name: "Vanguard Total Stock Market" },
      { symbol: "VUG", name: "Vanguard Growth" },
      { symbol: "VEA", name: "Vanguard Developed Markets" },
      { symbol: "SCHD", name: "Schwab US Dividend Equity" },
      { symbol: "AGG", name: "iShares Core US Aggregate Bond" },
      { symbol: "GLD", name: "SPDR Gold Shares" },
    ],
  },
];

export const DEFAULT_SYMBOL = "USDBRL=X";

/** Short display name when the symbol belongs to one of the lists. */
export function getWatchName(symbol: string): string | undefined {
  for (const list of WATCH_LISTS) {
    const item = list.items.find((entry) => entry.symbol === symbol);
    if (item) return item.name;
  }
  return undefined;
}

export function getWatchList(id: string): WatchList | undefined {
  return WATCH_LISTS.find((list) => list.id === id);
}
