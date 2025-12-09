"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
    maxRetries?: number;
}

interface State {
    hasError: boolean;
    error: Error | null;
    retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        retryCount: 0,
    };

    public static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);

        // Auto-retry mechanism
        const maxRetries = this.props.maxRetries || 0;
        if (this.state.retryCount < maxRetries) {
            console.log(`Auto-retrying... Attempt ${this.state.retryCount + 1} of ${maxRetries}`);
            setTimeout(() => {
                this.setState((prevState) => ({
                    hasError: false,
                    error: null,
                    retryCount: prevState.retryCount + 1,
                }));
            }, 500); // 500ms delay to allow things to settle
        }
    }

    public render() {
        if (this.state.hasError) {
            // If retrying, show a subtle loading state
            if (this.state.retryCount < (this.props.maxRetries || 0)) {
                return (
                    <div className="flex flex-col items-center justify-center p-10 h-64 bg-gray-50 rounded-lg animate-pulse">
                        <div className="text-gray-400 text-sm font-semibold">Recovering viewer...</div>
                        <div className="text-xs text-gray-300 mt-2">Attempt {this.state.retryCount + 1}/{this.props.maxRetries}</div>
                    </div>
                );
            }

            return (
                this.props.fallback || (
                    <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
                        <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
                        <p className="text-sm font-mono bg-white p-2 rounded border border-red-100 mb-4 overflow-x-auto max-w-full">
                            {this.state.error?.message}
                        </p>
                        <button
                            onClick={() => this.setState({ hasError: false, retryCount: 0 })}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-bold"
                        >
                            Try Again
                        </button>
                    </div>
                )
            );
        }

        return this.props.children;
    }
}
