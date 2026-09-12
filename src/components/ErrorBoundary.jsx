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
            <div className="h-screen w-full flex items-center justify-center bg-[#0f172a] p-6">
                <div className="glass-panel rounded-2xl p-8 max-w-lg w-full">
                    <h1 className="text-xl font-bold text-white mb-2">JunglerOS hit an error</h1>
                    <p className="text-sm text-gray-400 mb-4">Your saved matchups are still in this browser. Export them first, then reload the page.</p>
                    <pre className="text-xs text-red-300 bg-black/40 rounded p-3 mb-6 overflow-x-auto whitespace-pre-wrap">{String(this.state.error && this.state.error.message)}</pre>
                    <div className="flex gap-3">
                        <button onClick={exportRawSaves} className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold">Export raw data</button>
                        <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold">Reload</button>
                    </div>
                </div>
            </div>
        );
    }
}
