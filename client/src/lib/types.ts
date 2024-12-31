import { z } from "zod";

export const portfolioItemSchema = z.object({
  id: z.string(),
  cryptoId: z.string(),
  symbol: z.string(),
  amount: z.number().min(0, "Amount must be positive"),
  initialInvestment: z.number().min(0, "Initial investment must be positive"),
  purchaseDate: z.string(),
});

export type PortfolioItem = z.infer<typeof portfolioItemSchema>;

export const addInvestmentSchema = z.object({
  cryptoId: z.string().min(1, "Cryptocurrency is required"),
  symbol: z.string().min(1, "Symbol is required"),
  amount: z.string().transform((val) => {
    const num = Number(val);
    if (isNaN(num)) throw new Error("Invalid amount");
    if (num < 0) throw new Error("Amount must be positive");
    return num;
  }),
  initialInvestment: z.string().transform((val) => {
    const num = Number(val);
    if (isNaN(num)) throw new Error("Invalid investment amount");
    if (num < 0) throw new Error("Investment must be positive");
    return num;
  }),
});

export type AddInvestmentInput = z.infer<typeof addInvestmentSchema>;
