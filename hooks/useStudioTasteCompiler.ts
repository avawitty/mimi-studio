import { useCallback, useEffect, useRef, useState } from "react";
import type {
  GenerationMode,
  TasteCritique,
  TasteGenerationContract,
} from "../schemas/tasteIntelligenceContracts";
import type { TailorLogicDraft } from "../types";
import type { GenerationContractReconciliation } from "../lib/tasteIntelligence/mergeGenerationContracts";
import {
  compileTasteGenerationContract as compileTasteGenerationContractApi,
  critiqueTasteCandidate,
} from "../services/tasteIntelligenceClient";
import { createTailorProfileFromLegacyDraft } from "../services/tailorProfileContract";

export type StudioTasteCompilerOptions = {
  enabled: boolean;
  mode: GenerationMode;
  useTailorProfile: boolean;
  tailorDraft?: TailorLogicDraft | null;
  projectId?: string;
  signedIn: boolean;
};

export function useStudioTasteCompiler(options: StudioTasteCompilerOptions) {
  const {
    enabled,
    mode,
    useTailorProfile,
    tailorDraft,
    projectId,
    signedIn,
  } = options;

  const [contract, setContract] = useState<TasteGenerationContract | null>(null);
  const [reconciliation, setReconciliation] =
    useState<GenerationContractReconciliation | null>(null);
  const [promptBlock, setPromptBlock] = useState<string | null>(null);
  const [critique, setCritique] = useState<TasteCritique | null>(null);
  const [compileLoading, setCompileLoading] = useState(false);
  const [critiqueLoading, setCritiqueLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entitlementBlocked, setEntitlementBlocked] = useState(false);

  const pendingCritiqueRef = useRef<{
    contractId: string;
    candidateId: string;
    tags: string[];
  } | null>(null);

  const resolveTailorContract = useCallback(() => {
    if (!useTailorProfile || !tailorDraft) return undefined;
    try {
      const profile = createTailorProfileFromLegacyDraft(tailorDraft);
      return profile.generationContract;
    } catch {
      return undefined;
    }
  }, [tailorDraft, useTailorProfile]);

  const compileContract = useCallback(async () => {
    if (!enabled || !signedIn) {
      setContract(null);
      setReconciliation(null);
      setPromptBlock(null);
      return null;
    }

    setCompileLoading(true);
    setError(null);
    setEntitlementBlocked(false);

    try {
      const result = await compileTasteGenerationContractApi({
        medium: "editorial",
        mode,
        projectId,
        tailorGenerationContract: resolveTailorContract(),
        persist: true,
      });
      setContract(result.contract);
      setReconciliation(result.reconciliation);
      setPromptBlock(result.promptBlock);
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Contract compile failed.";
      if (message.toLowerCase().includes("entitlement")) {
        setEntitlementBlocked(true);
      }
      setError(message);
      setContract(null);
      setReconciliation(null);
      setPromptBlock(null);
      return null;
    } finally {
      setCompileLoading(false);
    }
  }, [enabled, mode, projectId, resolveTailorContract, signedIn]);

  useEffect(() => {
    if (!enabled || !signedIn) {
      setContract(null);
      setReconciliation(null);
      setPromptBlock(null);
      setCritique(null);
      return;
    }
    void compileContract();
  }, [compileContract, enabled, signedIn]);

  const prepareForGeneration = useCallback(
    async (candidateId: string, tags: string[]) => {
      const result =
        contract && promptBlock
          ? { contract, promptBlock, reconciliation }
          : await compileContract();
      if (!result?.contract) return null;

      pendingCritiqueRef.current = {
        contractId: result.contract.id,
        candidateId,
        tags,
      };
      setCritique(null);
      return result;
    },
    [compileContract, contract, promptBlock, reconciliation],
  );

  const runPendingCritique = useCallback(async () => {
    const pending = pendingCritiqueRef.current;
    if (!enabled || !pending || !signedIn) return null;

    setCritiqueLoading(true);
    setError(null);

    try {
      const result = await critiqueTasteCandidate({
        contractId: pending.contractId,
        candidate: {
          id: pending.candidateId,
          tags: pending.tags,
        },
        projectId,
        persist: true,
      });
      setCritique(result.critique);
      pendingCritiqueRef.current = null;
      return result.critique;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Critique could not run.";
      setError(message);
      return null;
    } finally {
      setCritiqueLoading(false);
    }
  }, [enabled, projectId, signedIn]);

  const clearCritique = useCallback(() => {
    setCritique(null);
    pendingCritiqueRef.current = null;
  }, []);

  return {
    contract,
    reconciliation,
    promptBlock,
    critique,
    compileLoading,
    critiqueLoading,
    error,
    entitlementBlocked,
    compileContract,
    prepareForGeneration,
    runPendingCritique,
    clearCritique,
  };
}
