"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class EditorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-dvh items-center justify-center bg-zinc-50">
          <div className="flex flex-col items-center gap-4 text-center px-6">
            <AlertTriangle className="w-12 h-12 text-amber-500" />
            <h2 className="text-lg font-semibold text-zinc-800">
              편집기에 문제가 발생했어요
            </h2>
            <p className="text-sm text-zinc-500 max-w-sm">
              일시적인 오류일 수 있습니다. 아래 버튼을 눌러 다시 시도하거나,
              문제가 계속되면 페이지를 새로고침해주세요.
            </p>
            <div className="flex gap-3">
              <Button onClick={this.handleRetry}>
                <RotateCcw className="w-4 h-4 mr-2" />
                다시 시도
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                페이지 새로고침
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
