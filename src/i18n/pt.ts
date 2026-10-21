import type { Dictionary } from "./en";

/** Textos em português (Brasil). Precisa ter exatamente as mesmas chaves de `en`. */
export const pt: Dictionary = {
  site: {
    name: "My Tools",
    description:
      "Uma coleção crescente de utilitários pequenos e práticos que funcionam direto no seu navegador.",
    footerNote:
      "A maioria das ferramentas funciona inteiramente no seu navegador.",
  },

  nav: {
    label: "Principal",
    home: "Início",
    allTools: "Ferramentas",
    language: "Idioma",
    switchTo: "Switch to English",
  },

  common: {
    copy: "Copiar",
    copied: "Copiado!",
    copyResult: "Copiar resultado",
    clear: "Limpar",
    remove: "Remover",
    result: "Resultado",
    resultPlaceholder: "O resultado aparece aqui.",
    networkError: "Erro de rede. Verifique sua conexão e tente novamente.",
    somethingWrong: "Algo deu errado.",
  },

  home: {
    badge: (tools, categories) =>
      `${tools} ferramentas · ${categories} categorias`,
    title: "Ferramentas do dia a dia, a um clique.",
    intro:
      "Converta, formate, gere e valide: uma coleção crescente de utilitários pequenos e práticos que funcionam direto no navegador. Escolha uma ferramenta e resolva em segundos.",
    browse: "Ver todas as ferramentas",
  },

  toolCard: {
    access: "Acessar",
    accessLabel: (name) => `Acessar ferramenta: ${name}`,
    comingSoon: "Em breve",
  },

  toolPage: {
    back: "Todas as ferramentas",
  },

  categories: {
    "text-and-data": {
      title: "Texto e Dados",
      description: "Codifique, conte e gere textos.",
    },
    "images-and-colors": {
      title: "Imagens e Cores",
      description: "Converta arquivos, gere códigos e trabalhe com cores.",
    },
    "development-and-data": {
      title: "Desenvolvimento e Dados",
      description: "Utilitários para desenvolvedores, testadores e dados.",
    },
    finance: {
      title: "Finanças e Mercado",
      description: "Cotações e gráficos ao vivo de moedas e ações.",
    },
  },

  tools: {
    "base64-converter": {
      name: "Conversor Base64 ⇄ Texto",
      description:
        "Decodifique Base64 em texto legível ou codifique qualquer texto em Base64.",
    },
    "base64-to-file": {
      name: "Base64 para Arquivo",
      description:
        "Transforme um Base64 ou data URI de volta em um arquivo para baixar, com pré-visualização.",
    },
    "markdown-to-pdf": {
      name: "Markdown para PDF",
      description:
        "Transforme um arquivo .md ou um texto em Markdown em um PDF limpo, com texto selecionável e pré-visualização ao vivo.",
    },
    "word-counter": {
      name: "Contador de Palavras",
      description:
        "Conte palavras, caracteres, frases e parágrafos enquanto digita.",
    },
    "password-generator": {
      name: "Gerador de Senhas",
      description:
        "Crie senhas fortes e aleatórias com o tamanho e os caracteres que quiser.",
    },
    "png-to-pdf": {
      name: "Conversor de PNG para PDF",
      description:
        "Junte uma ou mais imagens PNG em um único arquivo PDF fácil de compartilhar.",
    },
    "qr-code-generator": {
      name: "Gerador de QR Code",
      description:
        "Gere um QR code para qualquer link ou texto e baixe como imagem.",
    },
    "color-converter": {
      name: "Conversor de Cores",
      description:
        "Converta cores entre HEX, RGB e HSL, com pré-visualização ao vivo.",
    },
    "json-formatter": {
      name: "Formatador e Validador de JSON",
      description:
        "Formate, minifique e valide JSON, com mensagens de erro claras.",
    },
    "url-shortener": {
      name: "Encurtador de URL",
      description:
        "Transforme links longos em links curtos e fáceis de compartilhar.",
    },
    "cpf-cnpj-generator": {
      name: "Gerador de CPF/CNPJ",
      description:
        "Gere números de CPF e CNPJ válidos para testes e desenvolvimento.",
    },
    "market-quotes": {
      name: "Cotações do Mercado",
      description:
        "Preços de moedas e ações ao vivo, com top 10 de cada mercado, busca e gráficos interativos.",
    },
  },

  base64: {
    directionLegend: "Direção da conversão",
    encode: "Texto → Base64",
    decode: "Base64 → Texto",
    inputEncode: "Texto para codificar",
    inputDecode: "Base64 para decodificar",
    placeholderEncode: "Digite ou cole um texto…",
    placeholderDecode: "Cole o Base64 aqui…",
    urlSafe: "Saída segura para URL (usa “-” e “_”, sem preenchimento)",
    useAsInput: "Usar resultado como entrada",
  },

  base64File: {
    inputLabel: "Base64 (puro ou data URI)",
    placeholder:
      "Cole o Base64 aqui, ex.: iVBORw0KGgo… ou data:image/png;base64,iVBORw0KGgo…",
    fileName: "Nome do arquivo",
    defaultFileName: "arquivo",
    fileNameHint:
      "A extensão é adicionada automaticamente quando o tipo do arquivo é detectado.",
    convert: "Converter em arquivo",
    ready: "Arquivo pronto",
    name: "Nome",
    type: "Tipo",
    size: "Tamanho",
    preview: (name) => `Pré-visualização de ${name}`,
    download: "Baixar arquivo",
  },

  mdPdf: {
    upload: "Arquivo Markdown",
    uploadHint:
      "Escolha ou arraste um arquivo .md (até 2 MB), ou digite na caixa abaixo.",
    input: "Markdown",
    placeholder: "# Título\n\nEscreva em **Markdown** aqui…",
    preview: "Pré-visualização",
    previewEmpty: "A pré-visualização aparece aqui enquanto você digita.",
    fileName: "Nome do arquivo PDF",
    defaultName: "documento",
    pageSize: "Tamanho da página",
    letter: "Carta",
    download: "Gerar e baixar PDF",
    generating: "Gerando…",
    failed: "Não foi possível gerar o PDF. Tente novamente.",
    readFailed: (name) => `"${name}" não pôde ser lido.`,
    note: "O PDF é criado no seu navegador; nada é enviado. Imagens e emoji não são incluídos, e HTML puro é ignorado.",
  },

  wordCounter: {
    words: "Palavras",
    characters: "Caracteres",
    charactersNoSpaces: "Caracteres (sem espaços)",
    sentences: "Frases",
    paragraphs: "Parágrafos",
    readingTime: "Tempo de leitura",
    minutes: (n) => `${n} min`,
    yourText: "Seu texto",
    placeholder: "Digite ou cole seu texto aqui…",
  },

  password: {
    yourPassword: "Sua senha",
    copy: "Copiar senha",
    generateNew: "Gerar outra",
    length: (min, max) => `Número de caracteres (${min}–${max})`,
    lengthAria: "Tamanho da senha",
    types: "Tipos de caractere",
    lowercase: "Minúsculas (a–z)",
    uppercase: "Maiúsculas (A–Z)",
    digits: "Números (0–9)",
    symbols: "Símbolos (!@#…)",
    note: "As senhas são geradas no seu navegador com uma fonte aleatória criptograficamente segura e nunca são enviadas a lugar nenhum.",
  },

  cpf: {
    generateTitle: "Gerar",
    docTypeLegend: "Tipo de documento",
    quantity: (max) => `Quantidade (1–${max})`,
    formatted: "Formatado (com pontos, barra e traço)",
    generate: (type) => `Gerar ${type}`,
    copyAll: "Copiar todos",
    generatedLabel: "Números gerados",
    note: "Os números são matematicamente válidos, mas gerados aleatoriamente. Use-os apenas para testes e desenvolvimento.",
    validateTitle: (type) => `Validar um ${type}`,
    numberLabel: (type) => `Número do ${type}`,
    valid: (type) => `${type} válido.`,
    invalid: (type) => `${type} inválido.`,
  },

  json: {
    indentation: "Indentação",
    spaces2: "2 espaços",
    spaces4: "4 espaços",
    tab: "Tab",
    sortKeys: "Ordenar chaves em ordem alfabética",
    input: "JSON de entrada",
    valid: "JSON válido.",
    invalid: (error, line, column) =>
      `JSON inválido${line !== undefined ? ` (linha ${line}, coluna ${column})` : ""}: ${error}`,
    format: "Formatar / Validar",
    minify: "Minificar",
  },

  png: {
    images: "Imagens PNG",
    hint: "Cada imagem vira uma página, na ordem da lista. Áreas transparentes ficam brancas. Os arquivos nunca saem do seu navegador.",
    pageSize: "Tamanho da página",
    imageSize: "Tamanho da imagem",
    imageSizeHint: "Cada página tem exatamente o tamanho da sua imagem.",
    a4: "A4",
    a4Hint: "Páginas A4 em retrato, imagem centralizada com margem de 1 cm.",
    moveUp: (name) => `Mover ${name} para cima`,
    moveDown: (name) => `Mover ${name} para baixo`,
    removeFile: (name) => `Remover ${name}`,
    preview: "Pré-visualização",
    page: (n) => `Página ${n}`,
    pageAlt: (n, name) => `Página ${n}: ${name}`,
    converting: "Convertendo…",
    convert: "Converter e baixar PDF",
    clearAll: "Limpar tudo",
    conversionFailed: "A conversão falhou.",
    unreadable: (name) => `"${name}" não pôde ser lido como imagem.`,
  },

  url: {
    longUrl: "URL longa",
    placeholder: "https://exemplo.com/um/link/muito/longo",
    shortening: "Encurtando…",
    shorten: "Encurtar URL",
    yourLink: "Seu link curto",
    copyLink: "Copiar link",
    failed: "Não foi possível criar o link curto.",
    note: "Os links curtos ficam salvos no nosso servidor para poderem redirecionar. Só são aceitos links http e https.",
  },

  market: {
    searchLabel: "Pesquise qualquer ação, par de moedas ou cripto",
    searchPlaceholder: "Tente “petrobras”, “apple”, “EURUSD” ou “bitcoin”",
    searching: "Pesquisando…",
    noMatches: (query) => `Nenhum resultado para “${query}”.`,
    showPricesIn: "Mostrar preços em",
    displayNative: "Original",
    rate: (rate) => `US$ 1 = R$ ${rate}`,
    timeRange: "Período",
    loadingChart: "Carregando gráfico…",
    start: "Início",
    high: "Máxima",
    low: "Mínima",
    convertedNote: (rate) =>
      `Convertido pela cotação de hoje (US$ 1 = R$ ${rate}); os preços passados usam a mesma cotação, então o gráfico mostra o movimento do próprio ativo.`,
    notConverted: (currency) =>
      `Este ativo é cotado em ${currency}; só USD e BRL podem ser convertidos, então a moeda original é mostrada.`,
    autoRefresh: (seconds, time) =>
      `Atualiza a cada ${seconds}s · última atualização ${time}`,
    stale: (error, time) =>
      `${error} Mostrando a última atualização, de ${time}.`,
    ranges: {
      "1d": "hoje",
      "5d": "últimos 5 dias",
      "1w": "última semana",
      "1m": "último mês",
      "3m": "últimos 3 meses",
      "6m": "últimos 6 meses",
      "1y": "último ano",
      "5y": "últimos 5 anos",
    },
    topTitle: "Top 10",
    marketLegend: "Mercado",
    tableCaption: (list) =>
      `${list}: preço e variação de hoje. Selecione uma linha para ver o gráfico.`,
    colName: "Nome",
    colPrice: "Preço",
    colToday: "Hoje",
    updated: (time) => `Atualizado às ${time}`,
    lists: {
      currencies: {
        label: "Moedas",
        description:
          "Principais moedas cotadas em reais, mais o Bitcoin em dólares.",
      },
      "stocks-us": {
        label: "Ações EUA",
        description: "Dez das maiores empresas listadas nos Estados Unidos.",
      },
      "stocks-br": {
        label: "Ações Brasil",
        description: "Dez empresas muito negociadas na B3, a bolsa brasileira.",
      },
      "reits-br": {
        label: "FIIs",
        description:
          "Dez fundos imobiliários (FIIs) populares negociados na B3.",
      },
      "etfs-us": {
        label: "ETFs EUA",
        description: "Dez dos ETFs mais negociados nos Estados Unidos.",
      },
    },
    assetNames: {
      "USDBRL=X": "Dólar americano",
      "EURBRL=X": "Euro",
      "GBPBRL=X": "Libra esterlina",
      "JPYBRL=X": "Iene japonês",
      "ARSBRL=X": "Peso argentino",
      "CADBRL=X": "Dólar canadense",
      "AUDBRL=X": "Dólar australiano",
      "CHFBRL=X": "Franco suíço",
      "CNYBRL=X": "Yuan chinês",
    },
    disclaimer:
      "Dados do Yahoo Finance. Os preços podem ter até 15 minutos de atraso, dependendo da bolsa, e isto não é recomendação de investimento.",
    chartSummary: (name, range, first, last, low, high) =>
      `${name}, gráfico de preço (${range}). De ${first} a ${last}, mínima ${low}, máxima ${high}. Use as setas esquerda e direita para ler os valores.`,
    sinceStart: (percent) => `${percent} desde o início`,
  },

  alerts: {
    buttonTitle: "Alertas de preço",
    buttonActive: (name, count) =>
      `Alertas de preço de ${name} (${count} ${count === 1 ? "ativo" : "ativos"})`,
    buttonCreate: (name) => `Criar um alerta de preço para ${name}`,
    title: "Alerta de preço",
    now: (name, price) => `${name} · agora ${price}`,
    close: "Fechar",
    checking: "Verificando suporte a notificações…",
    unconfigured: "Os alertas ainda não foram configurados neste servidor.",
    unsupported:
      "Este navegador não suporta notificações push. Use o Chrome ou o Edge no Windows.",
    blocked:
      "As notificações estão bloqueadas para este site. Permita nas configurações do site no navegador (o ícone ao lado do endereço) e recarregue a página.",
    intro:
      "Receba uma notificação do Windows quando um preço atingir o valor que você escolher. Os alertas pertencem só a este navegador, então ninguém mais os recebe.",
    turningOn: "Ativando…",
    turnOn: "Ativar notificações",
    turnOff: "Desativar notificações",
    notAllowed: "As notificações não foram permitidas.",
    nowOn: "As notificações estão ativas neste navegador.",
    enableFailed:
      "Não foi possível ativar as notificações. Use o Chrome ou o Edge normal (não em janela anônima), com internet, e tente novamente.",
    nowOff: "As notificações foram desativadas e seus alertas, removidos.",
    disableFailed: "Não foi possível desativar as notificações.",
    testSent:
      "Notificação de teste enviada. Ela deve aparecer em alguns segundos.",
    sendTest: "Enviar notificação de teste",
    notifyWhen: "Avise-me quando",
    kindBelow: "O preço ficar abaixo de",
    kindAbove: "O preço ficar acima de",
    kindReaches: "O preço chegar a",
    kindRise: "O preço subir",
    kindFall: "O preço cair",
    percent: "Percentual",
    value: "Valor",
    fromNow: "% a partir de agora",
    currency: "Moeda",
    previewAbove: (name, target) =>
      `Você será avisado quando ${name} chegar a ${target} ou passar disso.`,
    previewBelow: (name, target) =>
      `Você será avisado quando ${name} chegar a ${target} ou ficar abaixo disso.`,
    previewReaches: (name, target) =>
      `Você será avisado quando ${name} chegar a ${target}.`,
    create: "Criar alerta",
    created: "Alerta criado.",
    forAsset: (name) => `Alertas de ${name}`,
    otherAssets: "Outros ativos",
    reaches: "chega a",
    active: "ativo",
    triggered: "disparado",
    removeLabel: (name) => `Remover alerta de ${name}`,
    telegramOption: "Avisar também no Telegram",
    telegramHint:
      "Gratuito. Você vai abrir o bot do My Tools no Telegram e tocar em Iniciar para conectar este navegador.",
    telegramOpen: "Abrir o Telegram",
    telegramWaiting: "Aguardando você tocar em Iniciar no Telegram…",
    telegramLinked: "Conectado: seus alertas também chegam no Telegram.",
    telegramUnlinked: "Telegram desconectado.",
  },

  errors: {
    exact: {
      "Alert not found.": "Alerta não encontrado.",
      "Canvas is not supported in this browser.":
        "Este navegador não suporta canvas.",
      "Choose when you want to be notified.":
        "Escolha quando você quer ser avisado.",
      "Could not create the short link. Try again later.":
        "Não foi possível criar o link curto. Tente mais tarde.",
      "Could not load alerts. Try again later.":
        "Não foi possível carregar os alertas. Tente mais tarde.",
      "Could not remove the alert. Try again later.":
        "Não foi possível remover o alerta. Tente mais tarde.",
      "Could not remove this device. Try again later.":
        "Não foi possível remover este dispositivo. Tente mais tarde.",
      "Could not save the alert. Try again later.":
        "Não foi possível salvar o alerta. Tente mais tarde.",
      "Could not save this device. Try again later.":
        "Não foi possível salvar este dispositivo. Tente mais tarde.",
      "Could not send the notification. Try again later.":
        "Não foi possível enviar a notificação. Tente mais tarde.",
      "Could not read the current price to compare with. Try again.":
        "Não foi possível ler o preço atual para comparar. Tente novamente.",
      "Decoded data is not valid UTF-8 text.":
        "Os dados decodificados não são um texto UTF-8 válido.",
      "Enter a URL.": "Digite uma URL.",
      "Enter a target price greater than zero.":
        "Digite um preço-alvo maior que zero.",
      "Input contains characters that are not valid in Base64.":
        "A entrada contém caracteres que não são válidos em Base64.",
      "Input has an invalid Base64 length.":
        "A entrada tem um tamanho inválido para Base64.",
      "Input is not valid Base64.": "A entrada não é um Base64 válido.",
      "Invalid alert.": "Alerta inválido.",
      "Invalid currency.": "Moeda inválida.",
      "Invalid device.": "Dispositivo inválido.",
      "Invalid range.": "Período inválido.",
      "Invalid request body.": "Requisição inválida.",
      "Invalid symbol.": "Símbolo inválido.",
      "Market data is unavailable right now.":
        "Os dados de mercado estão indisponíveis no momento.",
      "No price data for this symbol.": "Não há preços para este símbolo.",
      "Only http and https links are supported.":
        "Só são aceitos links http e https.",
      "Paste some Base64 first.": "Cole um Base64 primeiro.",
      "Push notifications are not configured on the server.":
        "As notificações push não estão configuradas no servidor.",
      "Select at least one character type.":
        "Selecione pelo menos um tipo de caractere.",
      "Symbol not found.": "Símbolo não encontrado.",
      "The decoded file is empty.": "O arquivo decodificado está vazio.",
      "The notification could not be delivered.":
        "A notificação não pôde ser entregue.",
      "This browser's subscription expired. Turn notifications on again.":
        "A inscrição deste navegador expirou. Ative as notificações novamente.",
      "This device is not registered for alerts.":
        "Este dispositivo não está cadastrado para alertas.",
      "This is not a valid URL.": "Esta não é uma URL válida.",
      "Too many requests. Please wait a moment.":
        "Muitas requisições. Aguarde um momento.",
      "URLs with credentials are not allowed.":
        "URLs com usuário e senha não são permitidas.",
      "Unknown list.": "Lista desconhecida.",
      "Telegram is not configured on the server.":
        "O Telegram não está configurado no servidor.",
      "Could not create the Telegram link. Try again later.":
        "Não foi possível criar o link do Telegram. Tente mais tarde.",
      "Could not load the Telegram status. Try again later.":
        "Não foi possível verificar o Telegram. Tente mais tarde.",
      "Could not unlink Telegram. Try again later.":
        "Não foi possível desconectar o Telegram. Tente mais tarde.",
    },
    patterns: [
      [
        /^Search must be (\d+)–(\d+) characters\.$/,
        (min, max) => `A pesquisa deve ter de ${min} a ${max} caracteres.`,
      ],
      [
        /^Length must be between (\d+) and (\d+)\.$/,
        (min, max) => `O tamanho deve ficar entre ${min} e ${max}.`,
      ],
      [
        /^Length must be at least (\d+) for the selected types\.$/,
        (n) =>
          `O tamanho deve ser de pelo menos ${n} para os tipos escolhidos.`,
      ],
      [
        /^URL is longer than (\d+) characters\.$/,
        (n) => `A URL tem mais de ${n} caracteres.`,
      ],
      [
        /^You can have up to (\d+) alerts on one device\.$/,
        (n) => `Você pode ter até ${n} alertas por dispositivo.`,
      ],
      [
        /^"(.*)" is not a Markdown file\.$/,
        (name) => `"${name}" não é um arquivo Markdown.`,
      ],
      [
        /^"(.*)" is not a PNG image\.$/,
        (name) => `"${name}" não é uma imagem PNG.`,
      ],
      [
        /^"(.*)" is larger than (\d+) MB\.$/,
        (name, size) => `"${name}" tem mais de ${size} MB.`,
      ],
      [
        /^Could not process "(.*)"\.$/,
        (name) => `Não foi possível processar "${name}".`,
      ],
      [
        /^Invalid push subscription: (.*)\.$/,
        (reason) => `Inscrição de push inválida: ${reason}.`,
      ],
    ],
  },
};
