import { revalidatePath } from "next/cache";

import { db } from "@/db";
import * as calendarRepo from "@/modules/calendar/db/repository";
import * as financeRepo from "@/modules/finance/db/repository";
import * as kitchenRepo from "@/modules/kitchen/db/repository";
import { NotFoundError, ValidationError } from "@/modules/tasks/db/repository";
import * as tasksRepo from "@/modules/tasks/db/repository";

/**
 * Tool surface exposed to the AI assistant. Every tool binds to an existing
 * repository operation (the same layer the module form actions use), so the
 * assistant can perform any action the web UI can — through the public,
 * validated interfaces. The catalog is pinned by tests in registry.test.ts:
 * every `operation` must resolve to a real exported repository function.
 */

export interface ToolDef {
  /** Dotted name the LLM calls, e.g. "tasks.createTask". */
  name: string;
  /** Prompt for the LLM: what it does, parameter units and formats. */
  description: string;
  /** JSON Schema for the arguments. */
  parameters: Record<string, unknown>;
  /** Deletes/archives/removes ask for human confirmation (S33). */
  destructive: boolean;
  /** Repository function name, for test pinning and debug output. */
  operation: string;
  /** Runs the operation with raw JSON args; validation lives in the repos. */
  run: (args: Record<string, unknown>) => unknown;
}

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

/* --------------------------------- helpers --------------------------------- */

function num(args: Record<string, unknown>, key: string): number {
  const value = args[key];
  return typeof value === "string" ? Number(value) : Number(value ?? Number.NaN);
}

function str(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
}

function strOrNull(args: Record<string, unknown>, key: string): string | null | undefined {
  const value = args[key];
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

function bool(args: Record<string, unknown>, key: string): boolean | undefined {
  const value = args[key];
  return typeof value === "boolean" ? value : undefined;
}

function pick<T>(args: Record<string, unknown>, keys: (keyof T)[]): Partial<T> {
  const patch: Record<string, unknown> = {};
  for (const key of keys) {
    if (args[key as string] !== undefined) patch[key as string] = args[key as string];
  }
  return patch as Partial<T>;
}

/* JSON Schema shorthand */
const obj = (title: string, properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  title,
  properties,
  required,
  additionalProperties: false,
});
const prop = (kind: string, description: string, extra: Record<string, unknown> = {}) => ({
  type: kind,
  description,
  ...extra,
});

/* -------------------------------- catalog ---------------------------------- */

export const AI_TOOLS: ToolDef[] = [
  /* --------------------------------- tasks --------------------------------- */
  {
    name: "tasks.listProjects",
    description: "List all projects with their status (active/archived).",
    parameters: obj("ListProjects", {}),
    destructive: false,
    operation: "listProjects",
    run: () => tasksRepo.listProjects(db),
  },
  {
    name: "tasks.createProject",
    description: "Create a project. name is required.",
    parameters: obj("CreateProject", { name: prop("string", "Project name", { minLength: 1 }) }, ["name"]),
    destructive: false,
    operation: "createProject",
    run: (a) => tasksRepo.createProject(db, { name: (a.name as string) ?? "", description: str(a, "description") }),
  },
  {
    name: "tasks.updateProject",
    description: "Update a project's name/description. Only provided fields change.",
    parameters: obj("UpdateProject", {
      id: prop("integer", "Project id"),
      name: prop("string", "New name"),
      description: prop("string", "New description"),
    }, ["id"]),
    destructive: false,
    operation: "updateProject",
    run: (a) => tasksRepo.updateProject(db, { id: num(a, "id"), ...pick(a, ["name", "description"]) }),
  },
  {
    name: "tasks.archiveProject",
    description: "Archive a project (hides it from the default project list). Reversible with unarchiveProject.",
    parameters: obj("ArchiveProject", { id: prop("integer", "Project id") }, ["id"]),
    destructive: true,
    operation: "archiveProject",
    run: (a) => tasksRepo.archiveProject(db, num(a, "id")),
  },
  {
    name: "tasks.unarchiveProject",
    description: "Unarchive a project so it shows again.",
    parameters: obj("UnarchiveProject", { id: prop("integer", "Project id") }, ["id"]),
    destructive: false,
    operation: "unarchiveProject",
    run: (a) => tasksRepo.unarchiveProject(db, num(a, "id")),
  },
  {
    name: "tasks.deleteProject",
    description: "Permanently delete a project. Tasks assigned to it detach (project becomes inbox?) — check data. Destructive.",
    parameters: obj("DeleteProject", { id: prop("integer", "Project id") }, ["id"]),
    destructive: true,
    operation: "deleteProject",
    run: (a) => tasksRepo.deleteProject(db, num(a, "id")),
  },
  {
    name: "tasks.listTasks",
    description: "List tasks. Optional filters: status (pending|in_progress|done), projectId, dueDate (YYYY-MM-DD).",
    parameters: obj("ListTasks", {
      status: prop("string", "pending | in_progress | done"),
      projectId: prop("integer", "Project id"),
      dueDate: prop("string", "YYYY-MM-DD"),
    }),
    destructive: false,
    operation: "listTasks",
    run: (a) => {
      const filters: { status?: tasksRepo.TaskStatus; projectId?: number; dueDate?: string } = {};
      const status = str(a, "status");
      const projectId = a.projectId;
      const dueDate = str(a, "dueDate");
      if (status) filters.status = status as tasksRepo.TaskStatus;
      if (projectId !== undefined) filters.projectId = Number(projectId);
      if (dueDate) filters.dueDate = dueDate;
      return tasksRepo.listTasks(db, filters);
    },
  },
  {
    name: "tasks.createTask",
    description:
      "Create a task. title required. priority: high|medium|low. dueDate YYYY-MM-DD. projectId optional (omit for inbox).",
    parameters: obj(
      "CreateTask",
      {
        title: prop("string", "Task title"),
        notes: prop("string", "Notes"),
        projectId: prop("integer", "Project id"),
        priority: prop("string", "high | medium | low"),
        dueDate: prop("string", "YYYY-MM-DD"),
      },
      ["title"],
    ),
    destructive: false,
    operation: "createTask",
    run: (a) =>
      tasksRepo.createTask(db, {
        title: (a.title as string) ?? "",
        notes: str(a, "notes"),
        projectId: a.projectId === undefined ? undefined : Number(a.projectId),
        priority: str(a, "priority") as never,
        dueDate: strOrNull(a, "dueDate"),
      }),
  },
  {
    name: "tasks.updateTask",
    description:
      "Update a task. Only provided fields change. status: pending|in_progress|done. priority: high|medium|low. dueDate null clears it.",
    parameters: obj(
      "UpdateTask",
      {
        id: prop("integer", "Task id"),
        title: prop("string", "New title"),
        notes: prop("string", "New notes"),
        status: prop("string", "pending | in_progress | done"),
        priority: prop("string", "high | medium | low"),
        dueDate: prop("string", "YYYY-MM-DD"),
      },
      ["id"],
    ),
    destructive: false,
    operation: "updateTask",
    run: (a) =>
      tasksRepo.updateTask(db, {
        id: num(a, "id"),
        ...pick(a, ["title", "notes", "status", "priority", "dueDate"]),
      }),
  },
  {
    name: "tasks.setTaskStatus",
    description: "Move a task to a new status: pending | in_progress | done.",
    parameters: obj(
      "SetTaskStatus",
      {
        id: prop("integer", "Task id"),
        status: prop("string", "pending | in_progress | done"),
      },
      ["id", "status"],
    ),
    destructive: false,
    operation: "setTaskStatus",
    run: (a) =>
      tasksRepo.setTaskStatus(db, {
        id: num(a, "id"),
        status: (a.status as string) as tasksRepo.TaskStatus,
      }),
  },
  {
    name: "tasks.deleteTask",
    description: "Permanently delete a task. Destructive.",
    parameters: obj("DeleteTask", { id: prop("integer", "Task id") }, ["id"]),
    destructive: true,
    operation: "deleteTask",
    run: (a) => tasksRepo.deleteTask(db, num(a, "id")),
  },

  /* -------------------------------- calendar -------------------------------- */
  {
    name: "calendar.listEvents",
    description:
      "List calendar events between two dates inclusive (YYYY-MM-DD). Defaults to last 7 days to next 30 days when omitted.",
    parameters: obj("ListEvents", {
      start: prop("string", "Start date YYYY-MM-DD"),
      end: prop("string", "End date YYYY-MM-DD"),
    }),
    destructive: false,
    operation: "listEventsBetween",
    run: (a) => {
      const defaultEnd = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
      const defaultStart = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
      return calendarRepo.listEventsBetween(db, str(a, "start") ?? defaultStart, str(a, "end") ?? defaultEnd);
    },
  },
  {
    name: "calendar.createEvent",
    description:
      "Create a calendar event. title and date (YYYY-MM-DD) required. startTime/endTime in HH:MM (24h); omit both for an all-day event.",
    parameters: obj(
      "CreateEvent",
      {
        title: prop("string", "Event title"),
        notes: prop("string", "Notes"),
        date: prop("string", "YYYY-MM-DD"),
        startTime: prop("string", "HH:MM start time"),
        endTime: prop("string", "HH:MM end time"),
      },
      ["title", "date"],
    ),
    destructive: false,
    operation: "createEvent",
    run: (a) =>
      calendarRepo.createEvent(db, {
        title: (a.title as string) ?? "",
        notes: str(a, "notes"),
        date: (a.date as string) ?? "",
        startTime: strOrNull(a, "startTime"),
        endTime: strOrNull(a, "endTime"),
      }),
  },
  {
    name: "calendar.updateEvent",
    description:
      "Update a calendar event. Only provided fields change; startTime/endTime null clears them (all-day).",
    parameters: obj(
      "UpdateEvent",
      {
        id: prop("integer", "Event id"),
        title: prop("string", "New title"),
        notes: prop("string", "New notes"),
        date: prop("string", "YYYY-MM-DD"),
        startTime: prop("string", "HH:MM"),
        endTime: prop("string", "HH:MM"),
      },
      ["id"],
    ),
    destructive: false,
    operation: "updateEvent",
    run: (a) =>
      calendarRepo.updateEvent(db, {
        id: num(a, "id"),
        ...pick(a, ["title", "notes", "date"]),
        ...(a.startTime !== undefined ? { startTime: a.startTime as string | null } : {}),
        ...(a.endTime !== undefined ? { endTime: a.endTime as string | null } : {}),
      }),
  },
  {
    name: "calendar.deleteEvent",
    description: "Permanently delete a calendar event. Destructive.",
    parameters: obj("DeleteEvent", { id: prop("integer", "Event id") }, ["id"]),
    destructive: true,
    operation: "deleteEvent",
    run: (a) => calendarRepo.deleteEvent(db, num(a, "id")),
  },

  /* --------------------------------- finance -------------------------------- */
  {
    name: "finance.listAccounts",
    description: "List finance accounts. Optional status: active|archived.",
    parameters: obj("ListAccounts", { status: prop("string", "active | archived") }),
    destructive: false,
    operation: "listAccounts",
    run: (a) => financeRepo.listAccounts(db, str(a, "status") as never),
  },
  {
    name: "finance.createAccount",
    description:
      "Create a finance account. name required. type: checking|savings|cash|credit. currency ISO (default ARS). openingBalance in integer cents.",
    parameters: obj(
      "CreateAccount",
      {
        name: prop("string", "Account name"),
        type: prop("string", "checking | savings | cash | credit"),
        currency: prop("string", "ISO currency, default ARS"),
        openingBalance: prop("integer", "Opening balance in cents"),
      },
      ["name"],
    ),
    destructive: false,
    operation: "createAccount",
    run: (a) =>
      financeRepo.createAccount(db, {
        name: (a.name as string) ?? "",
        type: str(a, "type") as never,
        currency: str(a, "currency"),
        openingBalance: a.openingBalance === undefined ? undefined : Number(a.openingBalance),
      }),
  },
  {
    name: "finance.updateAccount",
    description: "Update a finance account. Only provided fields change.",
    parameters: obj(
      "UpdateAccount",
      {
        id: prop("integer", "Account id"),
        name: prop("string", "New name"),
        type: prop("string", "checking | savings | cash | credit"),
        currency: prop("string", "ISO currency"),
        openingBalance: prop("integer", "Opening balance in cents"),
      },
      ["id"],
    ),
    destructive: false,
    operation: "updateAccount",
    run: (a) =>
      financeRepo.updateAccount(db, {
        id: num(a, "id"),
        ...pick(a, ["name", "type", "currency", "openingBalance"]),
      }),
  },
  {
    name: "finance.archiveAccount",
    description: "Archive an account (hidden from the default list). Reversible.",
    parameters: obj("ArchiveAccount", { id: prop("integer", "Account id") }, ["id"]),
    destructive: true,
    operation: "archiveAccount",
    run: (a) => financeRepo.archiveAccount(db, num(a, "id")),
  },
  {
    name: "finance.unarchiveAccount",
    description: "Unarchive an account.",
    parameters: obj("UnarchiveAccount", { id: prop("integer", "Account id") }, ["id"]),
    destructive: false,
    operation: "unarchiveAccount",
    run: (a) => financeRepo.unarchiveAccount(db, num(a, "id")),
  },
  {
    name: "finance.deleteAccount",
    description:
      "Permanently delete an account. All its transactions are deleted too (cascade). Destructive.",
    parameters: obj("DeleteAccount", { id: prop("integer", "Account id") }, ["id"]),
    destructive: true,
    operation: "deleteAccount",
    run: (a) => financeRepo.deleteAccount(db, num(a, "id")),
  },
  {
    name: "finance.listCategories",
    description: "List transaction categories. Optional kind: income|expense.",
    parameters: obj("ListCategories", { kind: prop("string", "income | expense") }),
    destructive: false,
    operation: "listCategories",
    run: (a) => financeRepo.listCategories(db, str(a, "kind") as never),
  },
  {
    name: "finance.createCategory",
    description:
      "Create a transaction category. name and kind (income|expense) required. color optional hex like #6366f1.",
    parameters: obj(
      "CreateCategory",
      {
        name: prop("string", "Category name"),
        kind: prop("string", "income | expense"),
        color: prop("string", "Hex color #rrggbb"),
      },
      ["name", "kind"],
    ),
    destructive: false,
    operation: "createCategory",
    run: (a) =>
      financeRepo.createCategory(db, {
        name: (a.name as string) ?? "",
        kind: (a.kind as string) as never,
        color: str(a, "color"),
      }),
  },
  {
    name: "finance.updateCategory",
    description: "Update a category. Only provided fields change.",
    parameters: obj(
      "UpdateCategory",
      {
        id: prop("integer", "Category id"),
        name: prop("string", "New name"),
        kind: prop("string", "income | expense"),
        color: prop("string", "Hex color #rrggbb"),
      },
      ["id"],
    ),
    destructive: false,
    operation: "updateCategory",
    run: (a) =>
      financeRepo.updateCategory(db, { id: num(a, "id"), ...pick(a, ["name", "kind", "color"]) }),
  },
  {
    name: "finance.deleteCategory",
    description:
      "Permanently delete a category; existing transactions keep their history (category becomes empty). Destructive.",
    parameters: obj("DeleteCategory", { id: prop("integer", "Category id") }, ["id"]),
    destructive: true,
    operation: "deleteCategory",
    run: (a) => financeRepo.deleteCategory(db, num(a, "id")),
  },
  {
    name: "finance.listTransactions",
    description: "List recent transactions (newest first). No filters in MVP.",
    parameters: obj("ListTransactions", {}),
    destructive: false,
    operation: "recentTransactions",
    run: () => financeRepo.recentTransactions(db, 50),
  },
  {
    name: "finance.createTransaction",
    description:
      "Create a transaction. accountId, amount (integer cents; negative for expense, positive for income) and date (YYYY-MM-DD) required. categoryId optional but its kind must match the sign.",
    parameters: obj(
      "CreateTransaction",
      {
        accountId: prop("integer", "Account id"),
        amount: prop("integer", "Amount in cents (150 = 1.50); expense negative, income positive"),
        date: prop("string", "YYYY-MM-DD"),
        description: prop("string", "Description"),
        categoryId: prop("integer", "Category id"),
      },
      ["accountId", "amount", "date"],
    ),
    destructive: false,
    operation: "createTransaction",
    run: (a) =>
      financeRepo.createTransaction(db, {
        accountId: num(a, "accountId"),
        amount: num(a, "amount"),
        date: (a.date as string) ?? "",
        description: str(a, "description"),
        categoryId: a.categoryId === undefined ? undefined : Number(a.categoryId),
      }),
  },
  {
    name: "finance.updateTransaction",
    description: "Update a transaction. Only provided fields change.",
    parameters: obj(
      "UpdateTransaction",
      {
        id: prop("integer", "Transaction id"),
        accountId: prop("integer", "Account id"),
        amount: prop("integer", "Amount in cents"),
        date: prop("string", "YYYY-MM-DD"),
        description: prop("string", "Description"),
        categoryId: prop("integer", "Category id"),
      },
      ["id"],
    ),
    destructive: false,
    operation: "updateTransaction",
    run: (a) =>
      financeRepo.updateTransaction(db, {
        id: num(a, "id"),
        ...pick(a, ["accountId", "amount", "date", "description", "categoryId"]),
      }),
  },
  {
    name: "finance.deleteTransaction",
    description: "Permanently delete a transaction. Destructive.",
    parameters: obj("DeleteTransaction", { id: prop("integer", "Transaction id") }, ["id"]),
    destructive: true,
    operation: "deleteTransaction",
    run: (a) => financeRepo.deleteTransaction(db, num(a, "id")),
  },
  {
    name: "finance.accountBalance",
    description: "Current balance of one account, in integer cents.",
    parameters: obj("AccountBalance", { accountId: prop("integer", "Account id") }, ["accountId"]),
    destructive: false,
    operation: "accountBalance",
    run: (a) => financeRepo.accountBalance(db, num(a, "accountId")),
  },
  {
    name: "finance.totalBalance",
    description: "Total balance across all active accounts, in integer cents.",
    parameters: obj("TotalBalance", {}),
    destructive: false,
    operation: "totalBalance",
    run: () => financeRepo.totalBalance(db),
  },

  /* --------------------------------- kitchen -------------------------------- */
  {
    name: "kitchen.listIngredients",
    description: "List all ingredients (the shopping list). available=true means you have it at home.",
    parameters: obj("ListIngredients", {}),
    destructive: false,
    operation: "listIngredients",
    run: () => kitchenRepo.listIngredients(db),
  },
  {
    name: "kitchen.createIngredient",
    description:
      "Create an ingredient (adds it to the shopping list unavailable by default). name required, unit default 'un', category optional.",
    parameters: obj(
      "CreateIngredient",
      {
        name: prop("string", "Ingredient name"),
        unit: prop("string", "Unit, default 'un'"),
        category: prop("string", "Free-text category"),
        available: prop("boolean", "Whether you already have it"),
      },
      ["name"],
    ),
    destructive: false,
    operation: "createIngredient",
    run: (a) =>
      kitchenRepo.createIngredient(db, {
        name: (a.name as string) ?? "",
        unit: str(a, "unit"),
        category: strOrNull(a, "category"),
        available: bool(a, "available"),
      }),
  },
  {
    name: "kitchen.updateIngredient",
    description: "Update an ingredient. Only provided fields change.",
    parameters: obj(
      "UpdateIngredient",
      {
        id: prop("integer", "Ingredient id"),
        name: prop("string", "New name"),
        unit: prop("string", "New unit"),
        category: prop("string", "New category"),
        available: prop("boolean", "Available at home?"),
      },
      ["id"],
    ),
    destructive: false,
    operation: "updateIngredient",
    run: (a) =>
      kitchenRepo.updateIngredient(db, {
        id: num(a, "id"),
        ...pick(a, ["name", "unit", "category", "available"]),
      }),
  },
  {
    name: "kitchen.toggleAvailable",
    description: "Toggle whether an ingredient is available at home. The list doubles as the shopping list.",
    parameters: obj("ToggleAvailable", { id: prop("integer", "Ingredient id") }, ["id"]),
    destructive: false,
    operation: "toggleAvailable",
    run: (a) => kitchenRepo.toggleAvailable(db, num(a, "id")),
  },
  {
    name: "kitchen.deleteIngredient",
    description: "Permanently delete an ingredient. Fails if a recipe still uses it. Destructive.",
    parameters: obj("DeleteIngredient", { id: prop("integer", "Ingredient id") }, ["id"]),
    destructive: true,
    operation: "deleteIngredient",
    run: (a) => kitchenRepo.deleteIngredient(db, num(a, "id")),
  },
  {
    name: "kitchen.listRecipes",
    description: "List all recipes.",
    parameters: obj("ListRecipes", {}),
    destructive: false,
    operation: "listRecipes",
    run: () => kitchenRepo.listRecipes(db),
  },
  {
    name: "kitchen.listRecipesWithCookability",
    description: "List recipes with cookability: each shows which of its ingredients are missing (not available).",
    parameters: obj("ListRecipesWithCookability", {}),
    destructive: false,
    operation: "listRecipesWithCookability",
    run: () => kitchenRepo.listRecipesWithCookability(db),
  },
  {
    name: "kitchen.createRecipe",
    description:
      "Create a recipe. title required. servings positive integer default 1. Optionally add ingredients afterwards with kitchen.addRecipeIngredient.",
    parameters: obj(
      "CreateRecipe",
      {
        title: prop("string", "Recipe title"),
        description: prop("string", "Short description"),
        servings: prop("integer", "Servings, default 1"),
        instructions: prop("string", "Free-text instructions"),
      },
      ["title"],
    ),
    destructive: false,
    operation: "createRecipe",
    run: (a) =>
      kitchenRepo.createRecipe(db, {
        title: (a.title as string) ?? "",
        description: str(a, "description"),
        servings: a.servings === undefined ? undefined : Number(a.servings),
        instructions: str(a, "instructions"),
      }),
  },
  {
    name: "kitchen.updateRecipe",
    description: "Update a recipe. Only provided fields change.",
    parameters: obj(
      "UpdateRecipe",
      {
        id: prop("integer", "Recipe id"),
        title: prop("string", "New title"),
        description: prop("string", "New description"),
        servings: prop("integer", "Servings"),
        instructions: prop("string", "New instructions"),
      },
      ["id"],
    ),
    destructive: false,
    operation: "updateRecipe",
    run: (a) =>
      kitchenRepo.updateRecipe(db, { id: num(a, "id"), ...pick(a, ["title", "description", "servings", "instructions"]) }),
  },
  {
    name: "kitchen.deleteRecipe",
    description: "Permanently delete a recipe. Destructive.",
    parameters: obj("DeleteRecipe", { id: prop("integer", "Recipe id") }, ["id"]),
    destructive: true,
    operation: "deleteRecipe",
    run: (a) => kitchenRepo.deleteRecipe(db, num(a, "id")),
  },
  {
    name: "kitchen.listRecipeIngredients",
    description: "List the ingredients of one recipe (with names and units).",
    parameters: obj("ListRecipeIngredients", { recipeId: prop("integer", "Recipe id") }, ["recipeId"]),
    destructive: false,
    operation: "listRecipeIngredients",
    run: (a) => kitchenRepo.listRecipeIngredients(db, num(a, "recipeId")),
  },
  {
    name: "kitchen.addRecipeIngredient",
    description:
      "Add an ingredient to a recipe. recipeId and ingredientId required. quantity is scaled ×100 (50 = 0.5). unit overrides the ingredient unit.",
    parameters: obj(
      "AddRecipeIngredient",
      {
        recipeId: prop("integer", "Recipe id"),
        ingredientId: prop("integer", "Ingredient id"),
        quantity: prop("number", "Quantity ×100 (50 = 0.5)"),
        unit: prop("string", "Unit override"),
      },
      ["recipeId", "ingredientId", "quantity"],
    ),
    destructive: false,
    operation: "addRecipeIngredient",
    run: (a) =>
      kitchenRepo.addRecipeIngredient(db, {
        recipeId: num(a, "recipeId"),
        ingredientId: num(a, "ingredientId"),
        quantity: Math.round(num(a, "quantity")),
        unit: str(a, "unit"),
      }),
  },
  {
    name: "kitchen.updateRecipeIngredient",
    description: "Update a recipe ingredient quantity/unit/ingredient. Only provided fields change.",
    parameters: obj(
      "UpdateRecipeIngredient",
      {
        id: prop("integer", "Recipe ingredient id"),
        ingredientId: prop("integer", "Ingredient id"),
        quantity: prop("number", "Quantity ×100 (50 = 0.5)"),
        unit: prop("string", "Unit override"),
      },
      ["id"],
    ),
    destructive: false,
    operation: "updateRecipeIngredient",
    run: (a) =>
      kitchenRepo.updateRecipeIngredient(db, {
        id: num(a, "id"),
        ...pick(a, ["ingredientId", "unit"]),
        ...(a.quantity !== undefined ? { quantity: Math.round(num(a, "quantity")) } : {}),
      }),
  },
  {
    name: "kitchen.removeRecipeIngredient",
    description: "Remove an ingredient from a recipe. Destructive (re-add with addRecipeIngredient).",
    parameters: obj("RemoveRecipeIngredient", { id: prop("integer", "Recipe ingredient id") }, ["id"]),
    destructive: true,
    operation: "removeRecipeIngredient",
    run: (a) => kitchenRepo.removeRecipeIngredient(db, num(a, "id")),
  },
];

/* --------------------------------- helpers --------------------------------- */

export function getTool(name: string): ToolDef | undefined {
  return AI_TOOLS.find((tool) => tool.name === name);
}

export function listToolDefs(): ToolDef[] {
  return AI_TOOLS;
}

/**
 * Execute one tool by name with raw JSON args. Unknown tools and validation
 * errors become structured failures the LLM can read and correct. Any
 * successful mutation refreshes the whole app (same policy as form actions).
 */
export async function executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const tool = getTool(name);
  if (!tool) {
    return { ok: false, error: `Unknown tool: ${name}. Choose one from the provided tool list.` };
  }
  try {
    const data = await tool.run(args);
    revalidatePath("/", "layout");
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}