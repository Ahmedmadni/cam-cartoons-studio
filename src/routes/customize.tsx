import { createFileRoute, redirect } from "@tanstack/react-router";

// Retired camera/GLB-first UI. Legacy authoring data remains recoverable at /projects.
export const Route = createFileRoute("/customize")({
  beforeLoad: () => { throw redirect({ to: "/" }); },
  component: () => null,
});
