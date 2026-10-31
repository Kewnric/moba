import { Component } from 'react';
import { exportRawSaves } from '../lib/files.js';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error('JunglerOS crashed', error, info.componentStack);
    }

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div className="h-screen w-full flex items-center justify-center bg-ink p-6">
                <div className="panel p-6 max-w-lg w-full">
                    <h1 className="display text-2xl mb-2">JunglerOS hit an error</h1>
                    <p className="text-sm text-fg-muted mb-4">Your saved tier lists are still in this browser. Export them first, then reload the page.</p>
                    <pre className="text-xs text-bad bg-ink p-3 mb-4 overflow-x-auto whitespace-pre-wrap">{String(this.state.error && this.state.error.message)}</pre>
                    <div className="flex gap-2">
                        <button type="button" onClick={exportRawSaves} className="btn btn-primary">Export raw data</button>
                        <button type="button" onClick={() => window.location.reload()} className="btn">Reload</button>
                    </div>
                </div>
            </div>
        );
    }
}
