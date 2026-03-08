import type { UpstreamReference } from "../types.ts";

export type RuntimeEnvironment = "browser" | "node";

export interface RuntimeCase {
  id: string;
  title: string;
  summary: string;
  environment: RuntimeEnvironment;
  features: string[];
  upstream: UpstreamReference[];
  run(): Promise<void>;
}
