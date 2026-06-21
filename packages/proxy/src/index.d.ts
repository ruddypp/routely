export const routelyProxyVersion: string;
export const DOMAIN_STATUSES: string[];
export const DNS_STATUSES: string[];
export const TLS_STATUSES: string[];
export const PROXY_ROUTE_STATUSES: string[];

export interface DnsVerificationResult {
  hostname: string;
  ok: boolean;
  status: string;
  addresses: string[];
  expected: string;
  message: string;
}

export interface TraefikRouteInput {
  domain: { hostname: string; status?: string };
  deployment?: { id?: number; status?: string; host_port?: number | null } | null;
  app?: { type?: string; internal?: boolean | 0 | 1 } | null;
}

export function normalizeHostname(value: string): string;
export function validateHostname(value: string, options?: { allowWildcard?: boolean }): string;
export function wildcardInstructions(rootDomain: string, serverPublicIp?: string | null): {
  rootDomain: string;
  records: Array<{ type: string; name: string; value: string }>;
  examples: string[];
};
export function verifyDnsARecord(
  hostname: string,
  serverPublicIp: string,
  resolver?: (hostname: string) => Promise<string[]>
): Promise<DnsVerificationResult>;
export function routeNameForHostname(hostname: string): string;
export function buildTraefikRoute(input: TraefikRouteInput): Record<string, unknown> | null;
export function buildTraefikDynamicConfig(routes?: Array<Record<string, unknown> | null>): Record<string, unknown>;
export function buildDockerLabelsForRoute(hostname: string, containerPort: number, options?: { certResolver?: string }): string[];
