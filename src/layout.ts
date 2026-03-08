import { join } from "node:path";

export function provenanceRoot(root: string): string {
  return join(root, "provenance");
}

export function provenanceInventoriesRoot(root: string): string {
  return join(provenanceRoot(root), "inventories");
}

export function provenanceVendorRoot(root: string): string {
  return join(provenanceRoot(root), "vendor");
}

export function provenanceTraceabilityRoot(root: string): string {
  return join(provenanceRoot(root), "traceability");
}

export function provenanceStabilityRoot(root: string): string {
  return join(provenanceRoot(root), "stability");
}

export function vendoredRepositoryRoot(root: string, repository: string): string {
  return join(provenanceVendorRoot(root), repository.replaceAll("/", "-"));
}

export function vendoredVizeSnapshotRoot(root: string): string {
  return join(provenanceVendorRoot(root), "vize");
}

export function runtimeRoot(root: string): string {
  return join(root, "runtime");
}

export function runtimeHarnessRoot(root: string): string {
  return join(runtimeRoot(root), "harness");
}

export function runtimeTestSuitesRoot(root: string): string {
  return join(runtimeRoot(root), "testsuites");
}
