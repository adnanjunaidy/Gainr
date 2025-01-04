import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getCryptoPrice, cryptoIds } from "@/lib/api";
import { PortfolioItem, AddInvestmentInput, addInvestmentSchema } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const REFETCH_INTERVAL = 30000; // 30 seconds

type CryptoId = keyof typeof cryptoIds;

// Browser-compatible UUID generation
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const cryptocurrencies = [
  { value: "BTC", label: "Bitcoin (BTC)" },
  { value: "ETH", label: "Ethereum (ETH)" },
  { value: "BNB", label: "BNB" },
  { value: "XRP", label: "XRP" },
  { value: "DOGE", label: "Dogecoin (DOGE)" },
  { value: "ADA", label: "Cardano (ADA)" },
  { value: "SOL", label: "Solana (SOL)" },
];

export function PortfolioTracker() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const { toast } = useToast();
  const [isAddingInvestment, setIsAddingInvestment] = useState(false);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const response = await fetch('/api/portfolio');
        if (!response.ok) throw new Error('Failed to fetch portfolio');
        const items = await response.json();
        setPortfolio(items);
      } catch (error) {
        console.error('Error fetching portfolio:', error);
        toast({
          title: "Error",
          description: "Failed to fetch portfolio items",
          variant: "destructive",
        });
      }
    };
    fetchPortfolio();
  }, []);

  const form = useForm<AddInvestmentInput>({
    resolver: zodResolver(addInvestmentSchema),
    defaultValues: {
      cryptoId: "",
      symbol: "",
      amount: "0",
      initialInvestment: "0",
    },
  });

  const { data: prices, isLoading: isPricesLoading } = useQuery({
    queryKey: ["cryptoPrices", portfolio.map(item => item.cryptoId)],
    queryFn: async () => {
      try {
        console.log("Fetching prices for portfolio items:", portfolio);
        const uniqueCryptoIds = Array.from(new Set(portfolio.map(item => item.cryptoId)));
        const prices: Record<string, number> = {};

        await Promise.all(
          uniqueCryptoIds.map(async (cryptoId) => {
            try {
              prices[cryptoId] = await getCryptoPrice(cryptoId);
              console.log(`Fetched price for ${cryptoId}:`, prices[cryptoId]);
            } catch (error) {
              console.error(`Error fetching price for ${cryptoId}:`, error);
              toast({
                title: "Error fetching price",
                description: `Could not fetch price for ${cryptoId}. Please try again later.`,
                variant: "destructive",
              });
            }
          })
        );

        return prices;
      } catch (error) {
        console.error("Error in price fetching:", error);
        throw error;
      }
    },
    enabled: portfolio.length > 0,
    refetchInterval: REFETCH_INTERVAL,
    retry: 3,
  });

  const totalValue = portfolio.reduce((sum, item) => {
    const currentPrice = prices?.[item.cryptoId] ?? 0;
    return sum + (currentPrice * item.amount);
  }, 0);

  const totalInvestment = portfolio.reduce((sum, item) => {
    return sum + Number(item.initialInvestment);
  }, 0);

  const totalProfit = totalValue - totalInvestment;
  const profitPercentage = totalInvestment > 0 
    ? ((totalValue - totalInvestment) / totalInvestment) * 100 
    : 0;

  const handleDeleteInvestment = async (id: number) => {
    try {
      const response = await fetch(`/api/portfolio/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete investment');
      }
      
      setPortfolio(prevPortfolio => prevPortfolio.filter(item => item.id !== id));
      toast({
        title: "Investment removed",
        description: "The investment has been removed from your portfolio.",
      });
    } catch (error) {
      console.error('Error deleting investment:', error);
      toast({
        title: "Error",
        description: "Failed to delete investment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: AddInvestmentInput) => {
    try {
      console.log("Submitting investment data:", data);
      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to add investment");
      const newItem = await response.json();
      setPortfolio(prev => [...prev, newItem]);
      setIsAddingInvestment(false);
      form.reset();

      toast({
        title: "Investment added",
        description: "Your investment has been successfully recorded.",
      });
    } catch (error) {
      console.error("Error adding investment:", error);
      toast({
        title: "Error",
        description: "Failed to add investment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-4 bg-black/20 rounded-lg backdrop-blur-sm">
          <div className="text-sm text-muted-foreground">Total Portfolio Value</div>
          <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
        </div>
        <div className="p-4 bg-black/20 rounded-lg backdrop-blur-sm">
          <div className="text-sm text-muted-foreground">Total Investment</div>
          <div className="text-2xl font-bold">${totalInvestment.toFixed(2)}</div>
        </div>
        <div className="p-4 bg-black/20 rounded-lg backdrop-blur-sm">
          <div className="text-sm text-muted-foreground">Total Profit/Loss</div>
          <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ${totalProfit.toFixed(2)} ({profitPercentage.toFixed(2)}%)
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Your Portfolio</h2>
        <Dialog open={isAddingInvestment} onOpenChange={setIsAddingInvestment}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-400 to-pink-300">
              <Plus className="mr-2 h-4 w-4" /> Add Investment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Investment</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="cryptoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cryptocurrency</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          const cryptoId = cryptoIds[value as CryptoId];
                          if (cryptoId) {
                            field.onChange(cryptoId);
                            form.setValue("symbol", value);
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select cryptocurrency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cryptocurrencies.map((crypto) => (
                            <SelectItem
                              key={crypto.value}
                              value={crypto.value}
                            >
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
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="initialInvestment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Investment (USD)</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-400 to-pink-300"
                >
                  Add Investment
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Initial Investment (USD)</TableHead>
              <TableHead>Cryptocurrency</TableHead>
              <TableHead>Current Price</TableHead>
              <TableHead>Price Purchased</TableHead>
              <TableHead>Profit/Loss</TableHead>
              <TableHead className="w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {portfolio.map((item) => {
              const currentPrice = prices?.[item.cryptoId] ?? 0;
              const purchasePrice = item.initialInvestment / item.amount;
              const currentValue = currentPrice * item.amount;
              const profit = currentValue - item.initialInvestment;
              const profitPercentage = (profit / item.initialInvestment) * 100;

              return (
                <TableRow key={item.id}>
                  <TableCell>${Number(item.initialInvestment).toFixed(2)}</TableCell>
                  <TableCell className="font-medium">{item.symbol}</TableCell>
                  <TableCell>
                    {isPricesLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      `$${currentPrice.toFixed(2)}`
                    )}
                  </TableCell>
                  <TableCell>${purchasePrice.toFixed(2)}</TableCell>
                  <TableCell
                    className={profit >= 0 ? "text-green-500" : "text-red-500"}
                  >
                    ${profit.toFixed(2)} ({profitPercentage.toFixed(2)}%)
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteInvestment(item.id)}
                      className="hover:bg-destructive/20"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {portfolio.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No investments yet. Click "Add Investment" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
