import {
  runIntegratedDesign,
  runPhase1Design,
  SILVA_2022_PHASE1_PROFILE
} from "@poolstruct/calculation-engine";
import { describe, expect, it } from "vitest";
import {
  isIntegratedDesignResult,
  normalizeIntegratedDesignInput
} from "./compatibility";
import { DEFAULT_DESIGN_INPUT } from "./defaults";

describe("legacy revision compatibility", () => {
  it("adiciona geotecnia, materiais e perfil sem alterar a geometria histórica", () => {
    const {
      structuralProfileId: _profile,
      geotechnical: _geotechnical,
      masonryMaterials: _materials,
      ...legacyInput
    } = DEFAULT_DESIGN_INPUT;
    const historical = {
      ...legacyInput,
      geometry: {
        ...legacyInput.geometry,
        internalLengthMm: 6200,
        waterDepthMm: 1300,
        depthZones: undefined
      }
    };

    const normalized = normalizeIntegratedDesignInput(historical);

    expect(normalized.geometry.internalLengthMm).toBe(6200);
    expect(normalized.geometry.waterDepthMm).toBe(1300);
    expect(normalized.geometry.depthZones).toEqual([expect.objectContaining({
      lengthMm: 6200,
      waterDepthMm: 1300
    })]);
    expect(normalized.structuralProfileId).toBe(DEFAULT_DESIGN_INPUT.structuralProfileId);
    expect(normalized.geotechnical.layers).toHaveLength(1);
    expect(normalized.geotechnical.excavationBottomDepthMm).toBe(1800);
    expect(normalized.masonryMaterials).toEqual(DEFAULT_DESIGN_INPUT.masonryMaterials);
  });

  it("distingue resultado histórico de resultado integrado", () => {
    const legacyResult = runPhase1Design(DEFAULT_DESIGN_INPUT, SILVA_2022_PHASE1_PROFILE);
    const integratedResult = runIntegratedDesign(DEFAULT_DESIGN_INPUT);

    expect(isIntegratedDesignResult(legacyResult)).toBe(false);
    expect(isIntegratedDesignResult(integratedResult)).toBe(true);
  });
});
