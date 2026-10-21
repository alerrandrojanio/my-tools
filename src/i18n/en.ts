/**
 * English texts. This object defines the shape every other language must
 * follow: a missing or extra key in another dictionary is a type error.
 * Functions are used for texts with variables.
 */
export const en = {
  site: {
    name: "My Tools",
    description:
      "A growing collection of small, focused utilities that run right in your browser.",
    footerNote: "Most tools run entirely in your browser.",
  },

  nav: {
    label: "Main",
    home: "Home",
    allTools: "All Tools",
    language: "Language",
    switchTo: "Mudar para português",
  },

  common: {
    copy: "Copy",
    copied: "Copied!",
    copyResult: "Copy result",
    clear: "Clear",
    remove: "Remove",
    result: "Result",
    resultPlaceholder: "The result appears here.",
    networkError: "Network error. Check your connection and try again.",
    somethingWrong: "Something went wrong.",
  },

  home: {
    badge: (tools: number, categories: number) =>
      `${tools} tools · ${categories} categories`,
    title: "Everyday tools, one click away.",
    intro:
      "Convert, format, generate and check — a growing collection of small, focused utilities that run right in your browser. Pick a tool and get the job done in seconds.",
    browse: "Browse all tools",
  },

  toolCard: {
    access: "Access Tool",
    accessLabel: (name: string) => `Access Tool: ${name}`,
    comingSoon: "Coming soon",
  },

  toolPage: {
    back: "All tools",
  },

  categories: {
    "text-and-data": {
      title: "Text and Data",
      description: "Encode, count and generate text.",
    },
    "images-and-colors": {
      title: "Images and Colors",
      description: "Convert files, make codes and work with color values.",
    },
    "development-and-data": {
      title: "Development and Data",
      description: "Helpers for developers, testers and data work.",
    },
    finance: {
      title: "Finance and Markets",
      description: "Live quotes and charts for currencies and stocks.",
    },
  },

  tools: {
    "base64-converter": {
      name: "Base64 to String Converter",
      description:
        "Decode Base64 into readable text, or encode any string back to Base64.",
    },
    "base64-to-file": {
      name: "Base64 to File Converter",
      description:
        "Turn a Base64 string or data URI back into a downloadable file, with a preview.",
    },
    "markdown-to-pdf": {
      name: "Markdown to PDF",
      description:
        "Turn a .md file or pasted Markdown into a clean, selectable-text PDF, with a live preview.",
    },
    "word-counter": {
      name: "Word Counter",
      description:
        "Count words, characters, sentences and paragraphs as you type.",
    },
    "password-generator": {
      name: "Password Generator",
      description:
        "Create strong random passwords with the length and characters you choose.",
    },
    "png-to-pdf": {
      name: "PNG to PDF Converter",
      description:
        "Turn one or more PNG images into a single, shareable PDF file.",
    },
    "qr-code-generator": {
      name: "QR Code Generator",
      description:
        "Generate a QR code for any link or text and download it as an image.",
    },
    "color-converter": {
      name: "Color Converter",
      description:
        "Convert colors between HEX, RGB and HSL, with a live preview.",
    },
    "json-formatter": {
      name: "JSON Formatter & Validator",
      description:
        "Pretty-print, minify and validate JSON, with clear error messages.",
    },
    "url-shortener": {
      name: "URL Shortener",
      description: "Turn long links into short ones that are easy to share.",
    },
    "cpf-cnpj-generator": {
      name: "CPF/CNPJ Generator",
      description:
        "Generate valid-format CPF and CNPJ numbers for testing and development.",
    },
    "market-quotes": {
      name: "Market Quotes",
      description:
        "Live currency and stock prices with a top 10 for each market, search and interactive charts.",
    },
  },

  base64: {
    directionLegend: "Conversion direction",
    encode: "String → Base64",
    decode: "Base64 → String",
    inputEncode: "Text to encode",
    inputDecode: "Base64 to decode",
    placeholderEncode: "Type or paste text…",
    placeholderDecode: "Paste Base64 here…",
    urlSafe: "URL-safe output (uses “-” and “_”, no padding)",
    useAsInput: "Use result as input",
  },

  base64File: {
    inputLabel: "Base64 (raw or data URI)",
    placeholder:
      "Paste Base64 here, e.g. iVBORw0KGgo… or data:image/png;base64,iVBORw0KGgo…",
    fileName: "File name",
    defaultFileName: "file",
    fileNameHint:
      "The extension is added automatically when the file type is detected.",
    convert: "Convert to file",
    ready: "File ready",
    name: "Name",
    type: "Type",
    size: "Size",
    preview: (name: string) => `Preview of ${name}`,
    download: "Download file",
  },

  mdPdf: {
    upload: "Markdown file",
    uploadHint:
      "Choose or drop a .md file (up to 2 MB), or type in the box below.",
    input: "Markdown",
    placeholder: "# Title\n\nWrite **Markdown** here…",
    preview: "Preview",
    previewEmpty: "The preview appears here as you type.",
    fileName: "PDF file name",
    defaultName: "document",
    pageSize: "Page size",
    letter: "Letter",
    download: "Generate and download PDF",
    generating: "Generating…",
    failed: "Could not generate the PDF. Try again.",
    readFailed: (name: string) => `"${name}" could not be read.`,
    note: "The PDF is created in your browser; nothing is uploaded. Images and emoji are not embedded, and raw HTML is ignored.",
  },

  wordCounter: {
    words: "Words",
    characters: "Characters",
    charactersNoSpaces: "Characters (no spaces)",
    sentences: "Sentences",
    paragraphs: "Paragraphs",
    readingTime: "Reading time",
    minutes: (n: number) => `${n} min`,
    yourText: "Your text",
    placeholder: "Type or paste your text here…",
  },

  password: {
    yourPassword: "Your password",
    copy: "Copy password",
    generateNew: "Generate new",
    length: (min: number, max: number) =>
      `Number of characters (${min}–${max})`,
    lengthAria: "Password length",
    types: "Character types",
    lowercase: "Lowercase (a–z)",
    uppercase: "Uppercase (A–Z)",
    digits: "Digits (0–9)",
    symbols: "Symbols (!@#…)",
    note: "Passwords are generated in your browser with a cryptographically secure random source and are never sent anywhere.",
  },

  cpf: {
    generateTitle: "Generate",
    docTypeLegend: "Document type",
    quantity: (max: number) => `Quantity (1–${max})`,
    formatted: "Formatted (with dots, slash and dash)",
    generate: (type: string) => `Generate ${type}`,
    copyAll: "Copy all",
    generatedLabel: "Generated numbers",
    note: "Numbers are mathematically valid but randomly generated. Use them only for testing and development.",
    validateTitle: (type: string) => `Validate a ${type}`,
    numberLabel: (type: string) => `${type} number`,
    valid: (type: string) => `Valid ${type}.`,
    invalid: (type: string) => `Invalid ${type}.`,
  },

  json: {
    indentation: "Indentation",
    spaces2: "2 spaces",
    spaces4: "4 spaces",
    tab: "Tab",
    sortKeys: "Sort keys alphabetically",
    input: "JSON input",
    valid: "Valid JSON.",
    invalid: (error: string, line?: number, column?: number) =>
      `Invalid JSON${line !== undefined ? ` (line ${line}, column ${column})` : ""}: ${error}`,
    format: "Format / Validate",
    minify: "Minify",
  },

  png: {
    images: "PNG images",
    hint: "Each image becomes one page, in the order listed. Transparent areas are filled with white. Files never leave your browser.",
    pageSize: "Page size",
    imageSize: "Image size",
    imageSizeHint: "Each page matches its image exactly.",
    a4: "A4",
    a4Hint: "Portrait A4 pages, image centered with a 1 cm margin.",
    moveUp: (name: string) => `Move ${name} up`,
    moveDown: (name: string) => `Move ${name} down`,
    removeFile: (name: string) => `Remove ${name}`,
    preview: "Preview",
    page: (n: number) => `Page ${n}`,
    pageAlt: (n: number, name: string) => `Page ${n}: ${name}`,
    converting: "Converting…",
    convert: "Convert and download PDF",
    clearAll: "Clear all",
    conversionFailed: "Conversion failed.",
    unreadable: (name: string) => `"${name}" could not be read as an image.`,
  },

  url: {
    longUrl: "Long URL",
    placeholder: "https://example.com/a/very/long/link",
    shortening: "Shortening…",
    shorten: "Shorten URL",
    yourLink: "Your short link",
    copyLink: "Copy link",
    failed: "Could not create the short link.",
    note: "Short links are stored on our server so they can redirect. Only http and https links are accepted.",
  },

  market: {
    searchLabel: "Search any stock, currency pair or crypto",
    searchPlaceholder: "Try “petrobras”, “apple”, “EURUSD” or “bitcoin”",
    searching: "Searching…",
    noMatches: (query: string) => `No matches for “${query}”.`,
    showPricesIn: "Show prices in",
    displayNative: "Original",
    rate: (rate: string) => `US$ 1 = R$ ${rate}`,
    timeRange: "Time range",
    loadingChart: "Loading chart…",
    start: "Start",
    high: "High",
    low: "Low",
    convertedNote: (rate: string) =>
      `Converted at today's rate (US$ 1 = R$ ${rate}); past prices use the same rate, so the chart shows the asset's own movement.`,
    notConverted: (currency: string) =>
      `This asset is quoted in ${currency}; only USD and BRL can be converted, so its original currency is shown.`,
    autoRefresh: (seconds: number, time: string) =>
      `Auto-refreshes every ${seconds}s · last update ${time}`,
    stale: (error: string, time: string) =>
      `${error} Showing the last update at ${time}.`,
    ranges: {
      "1d": "today",
      "5d": "past 5 days",
      "1w": "past week",
      "1m": "past month",
      "3m": "past 3 months",
      "6m": "past 6 months",
      "1y": "past year",
      "5y": "past 5 years",
    },
    topTitle: "Top 10",
    marketLegend: "Market",
    tableCaption: (list: string) =>
      `${list}: price and change today. Select a row to see its chart.`,
    colName: "Name",
    colPrice: "Price",
    colToday: "Today",
    updated: (time: string) => `Updated ${time}`,
    lists: {
      currencies: {
        label: "Currencies",
        description:
          "Major currencies priced in Brazilian reais, plus Bitcoin in US dollars.",
      },
      "stocks-us": {
        label: "US stocks",
        description:
          "Ten of the largest companies listed in the United States.",
      },
      "stocks-br": {
        label: "Brazil stocks",
        description:
          "Ten widely traded companies on B3, the Brazilian stock exchange.",
      },
      "reits-br": {
        label: "Brazil REITs",
        description:
          "Ten popular Brazilian real estate funds (FIIs) traded on B3.",
      },
      "etfs-us": {
        label: "US ETFs",
        description:
          "Ten of the most traded exchange-traded funds in the United States.",
      },
    },
    /** Localized names for the watch-list assets; English uses the list's own names. */
    assetNames: {} as Record<string, string>,
    disclaimer:
      "Data from Yahoo Finance. Prices can be delayed by up to 15 minutes depending on the exchange, and this is not investment advice.",
    chartSummary: (
      name: string,
      range: string,
      first: string,
      last: string,
      low: string,
      high: string,
    ) =>
      `${name}, ${range} price chart. From ${first} to ${last}, low ${low}, high ${high}. Use the left and right arrow keys to read values.`,
    sinceStart: (percent: string) => `${percent} since start`,
  },

  alerts: {
    buttonTitle: "Price alerts",
    buttonActive: (name: string, count: number) =>
      `Price alerts for ${name} (${count} active)`,
    buttonCreate: (name: string) => `Create a price alert for ${name}`,
    title: "Price alert",
    now: (name: string, price: string) => `${name} · now ${price}`,
    close: "Close",
    checking: "Checking notification support…",
    unconfigured: "Alerts are not configured on this server yet.",
    unsupported:
      "This browser does not support push notifications. Try Chrome or Edge on Windows.",
    blocked:
      "Notifications are blocked for this site. Allow them in the browser's site settings (the icon next to the address), then reload the page.",
    intro:
      "Get a Windows notification when a price hits a value you choose. Alerts belong to this browser only, so nobody else receives them.",
    turningOn: "Turning on…",
    turnOn: "Turn on notifications",
    turnOff: "Turn off notifications",
    notAllowed: "Notifications were not allowed.",
    nowOn: "Notifications are on for this browser.",
    enableFailed:
      "Could not turn notifications on. Use regular Chrome or Edge (not a private window) with an internet connection, then try again.",
    nowOff: "Notifications are off and your alerts were removed.",
    disableFailed: "Could not turn notifications off.",
    testSent: "Test notification sent. It should appear in a few seconds.",
    sendTest: "Send test notification",
    notifyWhen: "Notify me when",
    kindBelow: "Price goes below",
    kindAbove: "Price goes above",
    kindReaches: "Price reaches",
    kindRise: "Price rises by",
    kindFall: "Price falls by",
    percent: "Percent",
    value: "Value",
    fromNow: "% from now",
    currency: "Currency",
    previewAbove: (name: string, target: string) =>
      `You will be notified when ${name} reaches or passes ${target}.`,
    previewBelow: (name: string, target: string) =>
      `You will be notified when ${name} reaches or drops under ${target}.`,
    previewReaches: (name: string, target: string) =>
      `You will be notified when ${name} reaches ${target}.`,
    create: "Create alert",
    created: "Alert created.",
    forAsset: (name: string) => `Alerts for ${name}`,
    otherAssets: "Other assets",
    reaches: "reaches",
    active: "active",
    triggered: "triggered",
    removeLabel: (name: string) => `Remove alert for ${name}`,
    telegramOption: "Also notify me on Telegram",
    telegramHint:
      "Free. You will open the My Tools bot in Telegram and tap Start to connect this browser.",
    telegramOpen: "Open Telegram",
    telegramWaiting: "Waiting for you to tap Start in Telegram…",
    telegramLinked: "Connected: your alerts also arrive in Telegram.",
    telegramUnlinked: "Telegram disconnected.",
  },

  /**
   * Translations for messages produced by the tools' logic and the server,
   * which are written in English. English needs none.
   */
  errors: {
    exact: {} as Record<string, string>,
    patterns: [] as [RegExp, (...groups: string[]) => string][],
  },
};

export type Dictionary = typeof en;
