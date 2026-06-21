export interface DependencyNode {
  name: string;
  depends_on?: string[] | string | null;
}

export interface BulkStartNode extends DependencyNode {
  driver?: string | null;
  enabled?: boolean | null;
}

export class DependencyCycleError extends Error {
  constructor(readonly cycle: string[]) {
    super(`Dependency cycle detected: ${cycle.join(" -> ")}`);
    this.name = "DependencyCycleError";
  }
}

export function sortByDependencies<T extends DependencyNode>(items: T[]): T[] {
  const byName = new Map(items.map((item) => [item.name, item]));
  const permanent = new Set<string>();
  const temporary = new Set<string>();
  const stack: string[] = [];
  const sorted: T[] = [];

  function visit(item: T): void {
    if (permanent.has(item.name)) {
      return;
    }

    if (temporary.has(item.name)) {
      const cycleStart = stack.indexOf(item.name);
      throw new DependencyCycleError([...stack.slice(cycleStart), item.name]);
    }

    temporary.add(item.name);
    stack.push(item.name);

    for (const dependencyName of normalizeDependencies(item.depends_on)) {
      const dependency = byName.get(dependencyName);
      if (dependency) {
        visit(dependency);
      }
    }

    stack.pop();
    temporary.delete(item.name);
    permanent.add(item.name);
    sorted.push(item);
  }

  for (const item of items) {
    visit(item);
  }

  return sorted;
}

export function selectBulkStartApps<T extends BulkStartNode>(items: T[]): T[] {
  return sortByDependencies(
    items.filter((item) => item.enabled !== false && (item.driver === "command" || item.driver === "compose"))
  );
}

function normalizeDependencies(value: DependencyNode["depends_on"]): string[] {
  if (value == null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return [String(value).trim()].filter(Boolean);
}
