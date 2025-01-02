import { queryClient } from "./queryClient";

interface CryptoPrice {
  [key: string]: {
    usd: number;
  };
}

interface MarketData {
  price_change_percentage_24h: number;
  price_change_percentage_7d: number;
  total_volume: number;
  market_cap: number;
  current_price: {
    usd: number;
  };
}

interface CryptoDetails {
  id: string;
  name: string;
  description: {
    en: string;
  };
  market_data: MarketData;
  last_updated: string;
  links: {
    homepage: string[];
    subreddit_url?: string;
    telegram_channel_identifier?: string;
    twitter_screen_name?: string;
  };
}

interface NewsItem {
  title: string;
  url: string;
  published_at: string;
  source: string;
  description?: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url);

      // Handle rate limiting
      if (response.status === 429) {
        const waitTime = Math.min(1000 * Math.pow(2, i), 30000); // Exponential backoff, max 30s
        console.log(`Rate limit hit, waiting ${waitTime}ms before retry`);
        await delay(waitTime);
        continue;
      }

      // Handle other error status codes
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Network request failed');
      console.error(`Attempt ${i + 1} failed:`, lastError.message);

      if (i === attempts - 1) {
        throw lastError;
      }

      const waitTime = Math.min(1000 * Math.pow(2, i), 30000);
      await delay(waitTime);
    }
  }

  throw lastError || new Error('Maximum retry attempts reached');
}

export async function getCryptoPrice(cryptoId: string): Promise<number> {
  try {
    console.log(`Fetching price for ${cryptoId}`);
    const response = await fetchWithRetry(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=usd`
    );

    const data: CryptoPrice = await response.json();
    if (!data[cryptoId]?.usd) {
      throw new Error('Invalid price data received');
    }

    return data[cryptoId].usd;
  } catch (error) {
    console.error('Error fetching crypto price:', error);
    throw error;
  }
}

export async function getCryptoNews(cryptoId: string): Promise<NewsItem[]> {
  try {
    console.log(`Fetching details for ${cryptoId} to generate news`);
    const response = await fetchWithRetry(
      `https://api.coingecko.com/api/v3/coins/${cryptoId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
    );

    const data: CryptoDetails = await response.json();
    const news: NewsItem[] = [];

    // Market price news
    if (typeof data.market_data.price_change_percentage_24h === 'number') {
      const priceChange = data.market_data.price_change_percentage_24h;
      news.push({
        title: `${data.name} ${priceChange >= 0 ? 'gains' : 'drops'} ${Math.abs(priceChange).toFixed(2)}% in 24h`,
        url: data.links.homepage[0],
        published_at: data.last_updated,
        source: 'Market Data',
        description: `The price of ${data.name} has ${priceChange >= 0 ? 'increased' : 'decreased'} to $${data.market_data.current_price.usd.toFixed(2)}`
      });
    }

    // Weekly trend news
    if (typeof data.market_data.price_change_percentage_7d === 'number') {
      const weeklyChange = data.market_data.price_change_percentage_7d;
      news.push({
        title: `${data.name} ${weeklyChange >= 0 ? 'rises' : 'falls'} ${Math.abs(weeklyChange).toFixed(2)}% this week`,
        url: data.links.homepage[0],
        published_at: data.last_updated,
        source: 'Market Data',
        description: `Weekly performance shows a ${weeklyChange >= 0 ? 'positive' : 'negative'} trend in ${data.name} price`
      });
    }

    // Trading volume news
    if (data.market_data.total_volume) {
      news.push({
        title: `${data.name} records $${(data.market_data.total_volume / 1e6).toFixed(2)}M in daily trading`,
        url: data.links.homepage[0],
        published_at: data.last_updated,
        source: 'Market Data',
        description: `24-hour trading volume reaches significant levels as market activity continues`
      });
    }

    // Market cap news
    if (data.market_data.market_cap) {
      news.push({
        title: `${data.name} market cap at $${(data.market_data.market_cap / 1e9).toFixed(2)}B`,
        url: data.links.homepage[0],
        published_at: data.last_updated,
        source: 'Market Data',
        description: `Current market valuation reflects ${data.name}'s position in the crypto market`
      });
    }

    return news;
  } catch (error) {
    console.error('Error generating crypto news:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

export const cryptoIds = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  XRP: "ripple",
  DOGE: "dogecoin",
  ADA: "cardano",
  SOL: "solana",
};

export async function prefetchCryptoPrices() {
  try {
    const promises = Object.values(cryptoIds).map((id) =>
      queryClient.prefetchQuery({
        queryKey: [`/api/crypto/${id}`],
        queryFn: () => getCryptoPrice(id),
      })
    );

    await Promise.all(promises);
  } catch (error) {
    console.error('Error prefetching crypto prices:', error);
  }
}

export async function getCryptoDetails(cryptoId: string): Promise<CryptoDetails> {
  try {
    const response = await fetchWithRetry(
      `https://api.coingecko.com/api/v3/coins/${cryptoId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch crypto details: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.market_data) {
      throw new Error('Invalid market data received');
    }

    return data;
  } catch (error) {
    console.error('Error fetching crypto details:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch market data');
  }
}

export async function getCryptoPriceHistory(cryptoId: string, days = 30): Promise<PriceHistoryPoint[]> {
  try {
    const response = await fetchWithRetry(
      `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=usd&days=${days}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch price history: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.prices || !Array.isArray(data.prices)) {
      throw new Error('Invalid price history data received');
    }

    return data.prices.map(([timestamp, price]: [number, number]) => ({
      timestamp,
      price,
    }));
  } catch (error) {
    console.error('Error fetching price history:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch price history');
  }
}

export function calculateRiskScore(marketData: MarketData): {
  score: number;
  factors: Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }>;
} {
  try {
    const factors: Array<{
      factor: string;
      impact: 'positive' | 'negative' | 'neutral';
      description: string;
      score: number;
    }> = [
      {
        factor: '24h Price Change',
        impact: marketData.price_change_percentage_24h > 0 ? 'positive' : 'negative',
        description: `${Math.abs(marketData.price_change_percentage_24h).toFixed(2)}% ${
          marketData.price_change_percentage_24h > 0 ? 'increase' : 'decrease'
        } in the last 24 hours`,
        score: Math.abs(marketData.price_change_percentage_24h) > 10 ? -10 : 0,
      },
      {
        factor: 'Weekly Trend',
        impact: marketData.price_change_percentage_7d > 0 ? 'positive' : 'negative',
        description: `${Math.abs(marketData.price_change_percentage_7d).toFixed(2)}% ${
          marketData.price_change_percentage_7d > 0 ? 'gain' : 'loss'
        } over the past week`,
        score: marketData.price_change_percentage_7d > 0 ? 5 : -5,
      },
      {
        factor: 'Market Cap',
        impact: marketData.market_cap > 1000000000 ? 'positive' : 'neutral',
        description: `Market cap of $${(marketData.market_cap / 1000000000).toFixed(2)}B`,
        score: marketData.market_cap > 1000000000 ? 10 : 0,
      },
      {
        factor: 'Trading Volume',
        impact: marketData.total_volume > marketData.market_cap * 0.1 ? 'positive' : 'neutral',
        description: `Daily trading volume of $${(marketData.total_volume / 1000000).toFixed(2)}M`,
        score: marketData.total_volume > marketData.market_cap * 0.1 ? 5 : 0,
      },
    ];

    const baseScore = 70;
    const totalScore = factors.reduce((acc, factor) => acc + factor.score, baseScore);
    const normalizedScore = Math.max(0, Math.min(100, totalScore));

    return {
      score: normalizedScore,
      factors: factors.map(({ factor, impact, description }) => ({
        factor,
        impact,
        description,
      })),
    };
  } catch (error) {
    console.error('Error calculating risk score:', error);
    throw error;
  }
}

interface PriceHistoryPoint {
  timestamp: number;
  price: number;
}
