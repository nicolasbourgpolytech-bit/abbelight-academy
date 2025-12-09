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
}
