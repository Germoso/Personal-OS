import { describe, expect, it } from "vitest";

import * as calendarRepo from "@/modules/calendar/db/repository";
import * as financeRepo from "@/modules/finance/db/repository";
import * as kitchenRepo from "@/modules/kitchen/db/repository";
import * as tasksRepo from "@/modules/tasks/db/repository";

import { AI_TOOLS, executeTool, getTool } from "./registry";

const REPOS: Record<string, Record<string, unknown>> = {
  tasks: tasksRepo,
  calendar: calendarRepo,
  finance: financeRepo,
  kitchen: kitchenRepo,
};

describe("tool registry catalog (S35)", () => {
  it("has unique names", () => {
    const names = AI_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("documents every tool with description and JSON schema", () => {
    for (const tool of AI_TOOLS) {
      expect(tool.description.trim().length, `${tool.name} description`).toBeGreaterThan(10);
      expect(tool.parameters.type).toBe("object");
      expect(tool.parameters.properties).toBeDefined();
    }
  });

  it("marks every delete/archive/remove tool as destructive", () => {
    for (const tool of AI_TOOLS) {
      const signalsDestructive = /(delete|remove|(?<!un)archive)/i.test(tool.name);
      expect(tool.destructive, `${tool.name} destructive flag`).toBe(signalsDestructive);
    }
  });

  it("pins every tool to a real exported repository operation", () => {
    for (const tool of AI_TOOLS) {
      const [module] = tool.name.split(".");
      const repo = REPOS[module];
      expect(repo, `repo module for ${tool.name}`).toBeDefined();
      expect(typeof (repo as Record<string, unknown>)[tool.operation], `${tool.name} -> ${tool.operation}`).toBe(
        "function",
      );
    }
  });
});

describe("executeTool dispatch (S35)", () => {
  it("resolves known tools by name", () => {
    expect(getTool("tasks.createTask")).toBeDefined();
    expect(getTool("kitchen.toggleAvailable")?.destructive).toBe(false);
  });

  it("returns a structured error for unknown tools", async () => {
    const result = await executeTool("nope.nope", {});
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/unknown tool/i);
  });
});