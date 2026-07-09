import { describe, expect, it } from "vitest";
import { isClosedStatus, statusLabel } from "./status";

describe("careacao status", () => {
  it("identifies closed statuses", () => {
    expect(isClosedStatus("resolvido")).toBe(true);
    expect(isClosedStatus("cancelado")).toBe(true);
    expect(isClosedStatus("pendente")).toBe(false);
  });

  it("returns friendly labels", () => {
    expect(statusLabel("aguardando_motorista")).toBe("Aguardando motorista");
  });
});
