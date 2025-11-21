import { useVerification } from "@/context/VerificationContext";
import { useState } from "react";

export interface GatedActionState<T> {
  run: (...args: any[]) => Promise<T | null>;
  result: T | null;
  isLoading: boolean;
  error: string | null;
}

export function useGatedAction<T>(action: (...args: any[]) => Promise<T>): GatedActionState<T> {
  const { requireVerification } = useVerification();
  const [result, setResult] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (...args: any[]): Promise<T | null> => {
    if (!requireVerification()) {
      setError("You must be verified to use this feature.");
      return null;
    }
    setIsLoading(true);
    setError(null);
    try {
      const output = await action(...args);
      setResult(output);
      return output;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { run, result, isLoading, error };
}
