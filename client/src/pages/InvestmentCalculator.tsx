import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getCryptoPrice, cryptoIds, getCryptoNews } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { PortfolioTracker } from "@/components/PortfolioTracker";

const calculatorSchema = z.object({
  currency: z.string().min(1, "Currency is required"),
  crypto: z.string().min(1, "Cryptocurrency is required"),
  investment: z.string().min(1, "Investment amount is required"),
  buyPrice: z.string().min(1, "Buy price is required"),
  sellPrice: z.string().min(1, "Sell price is required"),
  investmentFee: z.string().default("0"),
  exitFee: z.string().default("0"),
});

type CalculatorInput = z.infer<typeof calculatorSchema>;

const cryptocurrencies = [
  { value: "BTC", label: "Bitcoin (BTC)" },
  { value: "ETH", label: "Ethereum (ETH)" },
  { value: "BNB", label: "BNB" },
  { value: "XRP", label: "XRP" },
  { value: "DOGE", label: "Dogecoin (DOGE)" },
  { value: "ADA", label: "Cardano (ADA)" },
  { value: "SOL", label: "Solana (SOL)" },
];

export default function InvestmentCalculator() {
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null);
  const [result, setResult] = useState<{
    totalInvestment: number;
    takeHome: number;
    profitLoss: number;
    percentageChange: number;
  } | null>(null);
  const { toast } = useToast();

  const { data: currentPrice, isLoading: isPriceLoading, error: priceError } = useQuery({
    queryKey: [`/api/crypto/${cryptoIds[selectedCrypto as keyof typeof cryptoIds]}`],
    queryFn: () =>
      selectedCrypto && cryptoIds[selectedCrypto as keyof typeof cryptoIds]
        ? getCryptoPrice(cryptoIds[selectedCrypto as keyof typeof cryptoIds])
        : null,
    enabled: !!selectedCrypto,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
    onError: (error) => {
      toast({
        title: "Error fetching price",
        description: error instanceof Error ? error.message : "Failed to fetch current price",
        variant: "destructive",
      });
    },
  });

  const form = useForm<CalculatorInput>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: {
      currency: "USD",
      crypto: "",
      investment: "",
      buyPrice: "",
      sellPrice: "",
      investmentFee: "0",
      exitFee: "0",
    },
  });

  useEffect(() => {
    if (currentPrice && selectedCrypto) {
      form.setValue("buyPrice", currentPrice.toString());
      form.setValue("sellPrice", currentPrice.toString());
    }
  }, [currentPrice, selectedCrypto, form]);

  const onSubmit = (data: CalculatorInput) => {
    try {
      const investment = parseFloat(data.investment);
      const buyPrice = parseFloat(data.buyPrice);
      const sellPrice = parseFloat(data.sellPrice);
      const investmentFee = parseFloat(data.investmentFee);
      const exitFee = parseFloat(data.exitFee);

      const totalInvestment = investment + investmentFee;
      const grossProfit = (sellPrice - buyPrice) * (investment / buyPrice);
      const takeHome = grossProfit - exitFee;
      const percentageChange = ((sellPrice - buyPrice) / buyPrice) * 100;

      setResult({
        totalInvestment,
        takeHome,
        profitLoss: grossProfit,
        percentageChange,
      });
    } catch (error) {
      toast({
        title: "Calculation Error",
        description: "Please check your input values and try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="news">News</TabsTrigger>
          </TabsList>

          <TabsContent value="calculator">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="backdrop-blur-sm bg-black shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl font-semibold bg-gradient-to-r from-cyan-400 to-pink-300 bg-clip-text text-transparent">
                    Investment Calculator
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="currency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Choose a currency</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="USD">USD</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="crypto"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Choose cryptocurrency</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  setSelectedCrypto(value);
                                }}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select cryptocurrency" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {cryptocurrencies.map((crypto) => (
                                    <SelectItem key={crypto.value} value={crypto.value}>
                                      {crypto.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="investment"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Investment</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="any"
                                  placeholder="0"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="buyPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Buy Price
                                {isPriceLoading && (
                                  <Loader2 className="inline ml-2 h-4 w-4 animate-spin" />
                                )}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="any"
                                  placeholder="0"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sellPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sell Price</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="any"
                                  placeholder="0"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="investmentFee"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Investment Fee</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="any"
                                  placeholder="0"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="exitFee"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Exit Fee</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="any"
                                  placeholder="0"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-cyan-400 to-pink-300 hover:from-cyan-500 hover:to-pink-400 text-white shadow-lg transition-all duration-200 hover:shadow-xl"
                      >
                        Calculate
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {result && (
                <Card className="backdrop-blur-sm bg-black shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium bg-gradient-to-r from-cyan-400 to-pink-300 bg-clip-text text-transparent">
                      Investment Outcome
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Profit/Loss</span>
                          <span className={result.profitLoss >= 0 ? "text-green-500" : "text-red-500"}>
                            ${result.profitLoss.toFixed(2)} ({result.percentageChange.toFixed(2)}%)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Investment</span>
                          <span>${result.totalInvestment.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Take-Home</span>
                          <span>${result.takeHome.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="portfolio">
            <PortfolioTracker />
          </TabsContent>

          <TabsContent value="news">
            <Card className="backdrop-blur-sm bg-black shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold bg-gradient-to-r from-cyan-400 to-pink-300 bg-clip-text text-transparent">
                  Cryptocurrency News
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="max-w-md">
                  <Select onValueChange={setSelectedCrypto}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a cryptocurrency" />
                    </SelectTrigger>
                    <SelectContent>
                      {cryptocurrencies.map((crypto) => (
                        <SelectItem key={crypto.value} value={crypto.value}>
                          {crypto.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCrypto && <CryptoNews cryptoId={cryptoIds[selectedCrypto as keyof typeof cryptoIds]} />}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CryptoNews({ cryptoId }: { cryptoId: string }) {
  const { data: news, isLoading, error } = useQuery({
    queryKey: [`/api/crypto/${cryptoId}/news`],
    queryFn: () => getCryptoNews(cryptoId),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Unable to fetch news. Please try again later.'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!news || news.length === 0) {
    return (
      <Alert>
        <AlertTitle>No News Available</AlertTitle>
        <AlertDescription>
          There are currently no news articles available for this cryptocurrency.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {news.map((item, index) => (
        <Card key={index} className="bg-black/50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:underline flex items-center gap-2"
                >
                  {item.title}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.source}</span>
                <span>{formatDistanceToNow(new Date(item.published_at), { addSuffix: true })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
