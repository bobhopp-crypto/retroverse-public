"use client";

import { Component, useEffect, type ReactNode } from "react";

import { ShowBuilderWorkspace } from "@/components/ops/show-builder/ShowBuilderWorkspace";

type BoundaryState = { error: Error | null };

class ShowBuilderErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[ShowBuilder] render error:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <p className="ops-empty" role="alert">
          Set Builder failed to render: {this.state.error.message}
        </p>
      );
    }
    return this.props.children;
  }
}

export function ShowBuilderClientShell() {
  useEffect(() => {
    console.info("[ShowBuilder] ShowBuilder page mounted");
  }, []);

  return (
    <ShowBuilderErrorBoundary>
      <ShowBuilderWorkspace />
    </ShowBuilderErrorBoundary>
  );
}
