export type AppFormSource = {
  name: string;
  type: string;
  preset: string;
  driver: string;
  path: string | null;
  command: string | null;
  install: string | null;
  dev: string | null;
  build: string | null;
  start: string | null;
  env: Record<string, string>;
  envKeys?: string[];
  port: number | null;
  dependsOn?: string[];
  healthcheck?: { path: string | null; expected_status: number | null } | null;
  domains?: string[];
  source?: { type: string | null; repo: string | null; branch: string | null; auto_deploy?: { enabled: boolean; branches: string[] } } | null;
  image?: string | null;
  internal?: boolean;
  volumes?: string[];
  composeFile?: string | null;
  composeService?: string | null;
  enabled: boolean;
};

export type AppFormState = {
  name: string;
  type: string;
  preset: string;
  driver: string;
  path: string;
  command: string;
  install: string;
  dev: string;
  build: string;
  start: string;
  env: string;
  envLocked: boolean;
  port: string;
  enabled: boolean;
  dependsOn: string;
  healthcheckPath: string;
  healthcheckStatus: string;
  domains: string;
  sourceRepo: string;
  sourceBranch: string;
  sourceAutoDeployConfigured: boolean;
  sourceAutoDeployEnabled: boolean;
  sourceAutoDeployBranches: string;
  image: string;
  internal: boolean;
  volumes: string;
  composeFile: string;
  composeService: string;
};

export type AppFormPayload = Record<string, unknown>;

export const APP_TYPES = ["app", "database", "worker"];
export const APP_DRIVERS = ["command", "compose", "dockerfile"];
export const APP_PRESETS = ["custom", "nextjs", "vite", "express", "postgres", "mysql", "mariadb", "redis", "mongodb"];

export const blankAppForm: AppFormState = {
  name: "",
  type: "app",
  preset: "custom",
  driver: "command",
  path: "",
  command: "",
  install: "",
  dev: "",
  build: "",
  start: "",
  env: "",
  envLocked: false,
  port: "",
  enabled: true,
  dependsOn: "",
  healthcheckPath: "",
  healthcheckStatus: "",
  domains: "",
  sourceRepo: "",
  sourceBranch: "",
  sourceAutoDeployConfigured: false,
  sourceAutoDeployEnabled: true,
  sourceAutoDeployBranches: "",
  image: "",
  internal: false,
  volumes: "",
  composeFile: "",
  composeService: ""
};

export function appFormFromDaemonApp(app: AppFormSource): AppFormState {
  const envEntries = Object.entries(app.env || {});
  const envKeys = app.envKeys || envEntries.map(([key]) => key);
  const envLocked = envEntries.length === 0 && envKeys.length > 0;
  const autoDeploy = app.source?.auto_deploy;

  return {
    name: app.name,
    type: app.type,
    preset: app.preset,
    driver: app.driver,
    path: app.path || "",
    command: app.command || "",
    install: app.install || "",
    dev: app.dev || "",
    build: app.build || "",
    start: app.start || "",
    env: envLocked ? envKeys.map((key) => `${key}=[stored]`).join("\n") : envEntries.map(([key, value]) => `${key}=${value}`).join("\n"),
    envLocked,
    port: app.port == null ? "" : String(app.port),
    enabled: app.enabled,
    dependsOn: (app.dependsOn || []).join(", "),
    healthcheckPath: app.healthcheck?.path || "",
    healthcheckStatus: app.healthcheck?.expected_status == null ? "" : String(app.healthcheck.expected_status),
    domains: (app.domains || []).join(", "),
    sourceRepo: app.source?.repo || "",
    sourceBranch: app.source?.branch || "",
    sourceAutoDeployConfigured: Boolean(autoDeploy),
    sourceAutoDeployEnabled: autoDeploy?.enabled ?? true,
    sourceAutoDeployBranches: (autoDeploy?.branches || []).join(", "),
    image: app.image || "",
    internal: Boolean(app.internal),
    volumes: (app.volumes || []).join("\n"),
    composeFile: app.composeFile || "",
    composeService: app.composeService || ""
  };
}

export function appFormValidationError(form: AppFormState): string | null {
  if (!form.name.trim()) return "App name is required.";
  if (!isPositiveIntegerOrBlank(form.port)) return "Port must be a positive integer.";
  if (!isPositiveIntegerOrBlank(form.healthcheckStatus)) return "Health status must be a positive integer.";
  if (form.driver === "command" && !form.command.trim() && !form.dev.trim() && !form.start.trim()) {
    return "Command driver needs a command, dev, or start command.";
  }
  if (form.driver === "compose" && !form.composeService.trim()) {
    return "Compose driver needs a Compose service name.";
  }
  if ((form.sourceBranch.trim() || form.sourceAutoDeployConfigured) && !form.sourceRepo.trim()) {
    return "Source repo is required when source branch or auto-deploy metadata is set.";
  }
  return null;
}

export function appDriverPatch(driver: string): Partial<AppFormState> {
  if (driver === "command") {
    return { driver, image: "", internal: false, volumes: "", composeFile: "", composeService: "" };
  }
  if (driver === "compose") {
    return { driver, command: "", install: "", dev: "", build: "", start: "" };
  }
  return {
    driver,
    command: "",
    install: "",
    dev: "",
    build: "",
    start: "",
    image: "",
    internal: false,
    volumes: "",
    composeFile: "",
    composeService: ""
  };
}

export function appFormPayload(form: AppFormState): AppFormPayload {
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    type: form.type,
    preset: form.preset.trim() || "custom",
    driver: form.driver,
    path: form.path.trim() || null,
    port: form.port.trim() === "" ? null : Number(form.port),
    enabled: form.enabled,
    depends_on: splitList(form.dependsOn),
    healthcheck: form.healthcheckPath.trim() || form.healthcheckStatus.trim()
      ? {
          path: form.healthcheckPath.trim() || null,
          expected_status: form.healthcheckStatus.trim() ? Number(form.healthcheckStatus) : null
        }
      : null,
    domains: splitList(form.domains),
    source: sourcePayload(form)
  };

  if (form.driver === "command") {
    Object.assign(payload, {
      command: form.command.trim() || form.dev.trim() || form.start.trim() || null,
      install: form.install.trim() || null,
      dev: form.dev.trim() || form.command.trim() || null,
      build: form.build.trim() || null,
      start: form.start.trim() || null,
      image: null,
      internal: false,
      volumes: [],
      compose_file: null,
      compose_service: null
    });
  } else if (form.driver === "compose") {
    Object.assign(payload, {
      command: null,
      install: null,
      dev: null,
      build: null,
      start: null,
      image: form.image.trim() || null,
      internal: form.internal,
      volumes: splitLines(form.volumes),
      compose_file: form.composeFile.trim() || null,
      compose_service: form.composeService.trim() || null
    });
  } else {
    Object.assign(payload, {
      command: null,
      install: null,
      dev: null,
      build: null,
      start: null,
      image: null,
      internal: false,
      volumes: [],
      compose_file: null,
      compose_service: null
    });
  }

  if (!form.envLocked) {
    payload.env = parseEnv(form.env);
  }

  return payload;
}

function sourcePayload(form: AppFormState) {
  if (!form.sourceRepo.trim() && !form.sourceBranch.trim()) return null;

  const source: Record<string, unknown> = {
    type: "github",
    repo: form.sourceRepo.trim() || null,
    branch: form.sourceBranch.trim() || null
  };

  if (form.sourceAutoDeployConfigured) {
    source.auto_deploy = {
      enabled: form.sourceAutoDeployEnabled,
      branches: splitList(form.sourceAutoDeployBranches)
    };
  }

  return source;
}

function parseEnv(value: string): Record<string, string> {
  return Object.fromEntries(
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf("=");
        return separator >= 0 ? [line.slice(0, separator).trim(), line.slice(separator + 1)] : [line, ""];
      })
      .filter(([key]) => key)
  );
}

function isPositiveIntegerOrBlank(value: string): boolean {
  return value.trim() === "" || (Number.isInteger(Number(value)) && Number(value) > 0);
}

function splitLines(value: string): string[] {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function splitList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
