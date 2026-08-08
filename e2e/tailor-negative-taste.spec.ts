import { test, expect, type Page, type Route } from "@playwright/test";
import type { TasteModelSnapshot } from "../lib/tasteModel/contracts";
import type {
  TasteModelEdit,
  TasteRefusal,
} from "../schemas/tasteIntelligenceContracts";
import {
  applyEditsToSnapshot,
} from "../lib/tasteIntelligence/applySnapshotEdits";
import {
  createModelEdit,
  createUndoEdit,
} from "../lib/tasteIntelligence/modelEdits";
import { buildRefusalFromExplicit } from "../lib/tasteIntelligence/refusals";
import { computeModelDelta } from "../lib/tasteIntelligence/computeModelDelta";
import {
  assertUndoableEdit,
  deriveEditBaseline,
  replayTasteSnapshot,
} from "../lib/tasteIntelligence/replaySnapshot";
import { buildE2eTasteSnapshot } from "../lib/e2e/tailorPatternGraphFixture";

type MockStore = {
  snapshot: TasteModelSnapshot;
  refusals: TasteRefusal[];
  edits: TasteModelEdit[];
};

function createMockStore(): MockStore {
  return {
    snapshot: buildE2eTasteSnapshot(),
    refusals: [],
    edits: [],
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function installTasteIntelligenceMock(page: Page, store: MockStore) {
  await page.route("**/api/mimi/taste-intelligence/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^.*\/taste-intelligence/, "");
    const method = route.request().method();

    if (method === "GET" && path.startsWith("/refusals")) {
      await fulfillJson(route, { refusals: store.refusals });
      return;
    }

    if (method === "POST" && path === "/refusals") {
      const body = route.request().postDataJSON() as {
        featureIds: string[];
        refusalType: TasteRefusal["refusalType"];
        projectId?: string;
        scope?: TasteRefusal["scope"];
        signedWeight?: number;
        confidence?: number;
        sourceIds?: string[];
      };
      const beforeSnapshot = store.snapshot;
      const refusal = buildRefusalFromExplicit({
        ownerId: "e2e-user",
        projectId: body.projectId,
        featureIds: body.featureIds,
        refusalType: body.refusalType,
        signedWeight: body.signedWeight ?? -1,
        confidence: body.confidence ?? 0.9,
        explicit: true,
        scope: body.scope ?? "persistent",
        sourceIds: body.sourceIds ?? [],
      });
      store.refusals.push(refusal);
      store.snapshot = applyEditsToSnapshot(beforeSnapshot, [], [refusal]);
      await fulfillJson(route, {
        refusal,
        snapshot: store.snapshot,
        modelDelta: computeModelDelta(beforeSnapshot, store.snapshot),
      });
      return;
    }

    if (method === "GET" && path.startsWith("/model-edits")) {
      await fulfillJson(route, { edits: store.edits });
      return;
    }

    if (method === "POST" && path === "/model-edits") {
      const body = route.request().postDataJSON() as {
        operation: TasteModelEdit["operation"];
        targetIds: string[];
        before: Record<string, unknown>;
        after: Record<string, unknown>;
        rationale?: string;
        projectId?: string;
      };
      const beforeSnapshot = store.snapshot;
      const edit = createModelEdit({
        ownerId: "e2e-user",
        projectId: body.projectId,
        operation: body.operation,
        targetIds: body.targetIds,
        before: body.before,
        after: body.after,
        rationale: body.rationale,
      });
      store.edits.push(edit);
      store.snapshot = applyEditsToSnapshot(beforeSnapshot, [edit]);
      await fulfillJson(route, {
        edit,
        snapshot: store.snapshot,
        modelDelta: computeModelDelta(beforeSnapshot, store.snapshot),
      });
      return;
    }

    if (method === "POST" && path === "/model-edits/undo") {
      const body = route.request().postDataJSON() as { editId: string };
      const original = assertUndoableEdit(store.edits, body.editId);
      if (!original) {
        await fulfillJson(
          route,
          {
            error: {
              code: "UNDO_NOT_ALLOWED",
              message: "Undo is limited to reversing the most recent model edit only.",
            },
          },
          409,
        );
        return;
      }
      const beforeSnapshot = store.snapshot;
      const undoEdit = createUndoEdit(original);
      store.edits.push(undoEdit);
      const baseline = deriveEditBaseline(beforeSnapshot, store.edits);
      store.snapshot = replayTasteSnapshot({
        baseline,
        edits: store.edits,
        refusals: store.refusals,
      });
      await fulfillJson(route, {
        edit: undoEdit,
        snapshot: store.snapshot,
        modelDelta: computeModelDelta(beforeSnapshot, store.snapshot),
        undoSemantics: "single_edit_only",
      });
      return;
    }

    await route.continue();
  });
}

async function dismissBlockingOverlays(page: Page) {
  await expect(page.locator("div.fixed.inset-0.z-\\[20000\\].cursor-wait")).toHaveCount(0, {
    timeout: 20000,
  }).catch(() => {});

  const onboarding = page.getByRole("button", { name: "Dismiss onboarding" });
  if (await onboarding.count()) {
    await onboarding.first().click({ force: true }).catch(() => {});
  }
  const essential = page.getByRole("button", { name: /essential only/i });
  if (await essential.count()) {
    await essential.first().click({ force: true }).catch(() => {});
  }
  const gateway = page.locator("div.fixed.inset-0.z-\\[200\\]");
  if (await gateway.count()) {
    const close = gateway.locator("button").first();
    if (await close.count()) {
      await close.click({ force: true }).catch(() => {});
    } else {
      await gateway.locator("div.absolute.inset-0").first().click({ force: true }).catch(() => {});
    }
    await expect(gateway).toHaveCount(0, { timeout: 5000 }).catch(() => {});
  }
}

async function openPatternGraph(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("mimi_core_loop_onboarded", "1");
      localStorage.setItem("mimi_cookie_consent", "essential");
    } catch {
      // ignore
    }
  });
  await page.goto("/tailor/evidence?e2e=patterns");
  await page.waitForLoadState("domcontentloaded");
  await dismissBlockingOverlays(page);
  await expect(page.getByTestId("pattern-graph-screen")).toBeVisible({
    timeout: 30000,
  });
}

async function openRefineSheet(page: Page) {
  const mobileRefine = page.getByRole("button", { name: "Refine this signal" }).first();
  if (await mobileRefine.isVisible().catch(() => false)) {
    await mobileRefine.click();
  } else {
    await expect(page.getByTestId("taste-refine-signal")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("taste-refine-signal").click();
  }
  await expect(page.getByTestId("signal-refine-sheet")).toBeVisible();
}

async function runNegativeTasteFlow(page: Page) {
  await openRefineSheet(page);

  await page.getByTestId("signal-refine-option-not_for_me").click();
  await expect(page.getByText("Active refusals")).toBeVisible();

  await openRefineSheet(page);
  await page.getByTestId("signal-refine-option-only_in_context").click();
  await expect(page.getByText("Contextual")).toBeVisible();

  await openRefineSheet(page);
  await page.getByTestId("signal-refine-option-not_when_combined").click();
  await page
    .getByTestId("signal-refine-sheet")
    .getByTestId("signal-refine-combined-pattern_cluster:cluster-b")
    .click();

  await page.getByTestId("taste-rename-input").fill("Muted contrast");
  await page.getByTestId("taste-rename-save").click();

  await openRefineSheet(page);
  await page.getByTestId("signal-refine-option-reduce_importance").click();
  await expect(page.getByTestId("taste-model-delta")).toBeVisible();

  const undoButton = page.getByTestId("taste-undo-last-edit");
  await undoButton.scrollIntoViewIfNeeded();
  await undoButton.click();
  await expect(page.getByText(/not a full history rollback/i)).toBeVisible();

  await page.reload();
  await dismissBlockingOverlays(page);
  await expect(page.getByTestId("pattern-graph-screen")).toBeVisible({
    timeout: 30000,
  });
}

test.describe("Tailor negative taste editing", () => {
  test.describe.configure({ timeout: 90_000 });

  test("desktop: refusal, contextual, combined, rename, weight, undo, persistence", async ({
    page,
  }) => {
    const store = createMockStore();
    await installTasteIntelligenceMock(page, store);
    await page.setViewportSize({ width: 1280, height: 900 });
    await openPatternGraph(page);
    await runNegativeTasteFlow(page);
  });

  test("mobile: refusal, contextual, combined, rename, weight, undo, persistence", async ({
    page,
  }) => {
    const store = createMockStore();
    await installTasteIntelligenceMock(page, store);
    await page.setViewportSize({ width: 390, height: 844 });
    await openPatternGraph(page);
    await runNegativeTasteFlow(page);
  });
});
