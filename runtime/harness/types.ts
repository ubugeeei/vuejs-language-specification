import type { UpstreamReference } from "../../src/types.ts";

export type RuntimeEnvironment = "browser" | "node";

export interface RuntimeSourceInput {
  kind: "sfc";
  filename: string;
  source: string;
}

export interface RuntimeTestSuite {
  id: string;
  title: string;
  summary: string;
  environment: RuntimeEnvironment;
  features: string[];
  upstream: UpstreamReference[];
  input: RuntimeSourceInput;
  run(): Promise<void>;
}
