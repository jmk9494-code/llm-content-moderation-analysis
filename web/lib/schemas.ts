
import { z } from "zod";

// Zod schema for the main audit log
export const AuditRowSchema = z.object({
    id: z.string(),
    test_date: z.string().default(""),
    model: z.string(),
    category: z.string(),
    verdict: z.string(),
    cost: z.number().nullable().transform((val) => val ?? 0),
    prompt_text: z.string().default(""),
    response_text: z.string().default(""),
    latency_ms: z.number().optional(),
    tokens_used: z.number().optional(),
});

// Zod schema for the strategy log
export const StrategyRowSchema = z.object({
    test_date: z.string().default(""),
    model: z.string(),
    category: z.string(),
    type: z.enum(["Direct", "Adversarial", "Benign"]).catch("Direct"), // Fallback if type is weird
    verdict: z.string(),
    prompt_id: z.string().optional(),
    prompt_text: z.string().default(""),
    response_text: z.string().default(""),
});

// Zod schema for bias log
export const BiasRowSchema = z.object({
    model: z.string(),
    prompt_id: z.string(),
    leaning: z.string(),
    judge_reasoning: z.string().optional(),
});

export type AuditRow = z.infer<typeof AuditRowSchema>;
export type StrategyRow = z.infer<typeof StrategyRowSchema>;
export type BiasRow = z.infer<typeof BiasRowSchema>;
