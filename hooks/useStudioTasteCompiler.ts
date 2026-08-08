import { useCallback, useEffect, useRef, useState } from "react";
import type {
  GenerationMode,
  TasteCritique,
  TasteGenerationContract,
} from "../schemas/tasteIntelligenceContracts";
import type { GeneratedArtifactForTasteCritique } from "../lib/tasteIntelligence/generatedArtifact";
import type { TailorLogicDraft } from "../types";
import type { GenerationContractReconciliation } from "../lib/tasteIntelligence/mergeGenerationContracts";
import {
  compileTasteGenerationContract as compileTasteGenerationContractApi,
  critiqueTasteCandidate,
} from "../services/tasteIntelligenceClient";
import { createTailorProfileFromLegacyDraft } from "../services/tailorProfileContract";
import { isCritiquableArtifact } from "../lib/tasteIntelligence/generatedArtifact";

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
  const [critiqueUnavailable, setCritiqueUnavailable] = useState(false);

  const pendingContractIdRef = useRef<string | null>(null);
  const sourcePromptTagsRef = useRef<string[]>([]);

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
    async (sourcePromptTags: string[] = []) => {
      const result =
        contract && promptBlock
          ? { contract, promptBlock, reconciliation }
          : await compileContract();
      if (!result?.contract) return null;

      pendingContractIdRef.current = result.contract.id;
      sourcePromptTagsRef.current = sourcePromptTags;
      setCritique(null);
      setCritiqueUnavailable(false);
      return result;
    },
    [compileContract, contract, promptBlock, reconciliation],
  );

  const critiqueGeneratedArtifact = useCallback(
    async (artifact: GeneratedArtifactForTasteCritique) => {
      const contractId = pendingContractIdRef.current ?? contract?.id;
      if (!enabled || !signedIn || !contractId) return null;

      if (!isCritiquableArtifact(artifact)) {
        setCritiqueUnavailable(true);
        setCritique(null);
        return null;
      }

      setCritiqueLoading(true);
      setError(null);
      setCritiqueUnavailable(false);

      try {
        const result = await critiqueTasteCandidate({
          contractId,
          artifact: {
            ...artifact,
            sourcePromptTags:
              artifact.sourcePromptTags ?? sourcePromptTagsRef.current,
          },
          projectId,
          persist: true,
        });
        setCritique(result.critique);
        pendingContractIdRef.current = null;
        sourcePromptTagsRef.current = [];
        return result.critique;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Critique could not run.";
        if (
          message.toLowerCase().includes("artifact") ||
          message.toLowerCase().includes("extraction")
        ) {
          setCritiqueUnavailable(true);
        }
        setError(message);
        return null;
      } finally {
        setCritiqueLoading(false);
      }
    },
    [contract?.id, enabled, projectId, signedIn],
  );

  const clearCritique = useCallback(() => {
    setCritique(null);
    setCritiqueUnavailable(false);
    pendingContractIdRef.current = null;
    sourcePromptTagsRef.current = [];
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
    critiqueUnavailable,
    compileContract,
    prepareForGeneration,
    critiqueGeneratedArtifact,
    clearCritique,
  };
}
