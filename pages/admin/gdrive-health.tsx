import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '@/components/layout/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Cloud,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    RefreshCw,
    Activity,
    FileJson,
    FolderLock,
    ShieldCheck,
    ChevronRight,
    Info
} from 'lucide-react';
import {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
    Badge
} from '@/components/ui';
import { cn } from '@/lib/utils';

interface HealthStep {
    name: string;
    status: 'success' | 'error' | 'warning' | 'pending';
    message: string;
}

interface HealthData {
    overall: 'success' | 'error' | 'pending';
    steps: HealthStep[];
    envVars: {
        GOOGLE_SERVICE_ACCOUNT_KEY: boolean;
        GOOGLE_DRIVE_FOLDER_ID: boolean;
    };
}

export default function GoogleDriveHealthPage() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<HealthData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const checkHealth = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/gdrive-health-check');
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError('Failed to fetch health status. Check browser console.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkHealth();
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return <CheckCircle2 className="text-green-400 w-5 h-5" />;
            case 'error': return <XCircle className="text-red-400 w-5 h-5" />;
            case 'warning': return <AlertTriangle className="text-yellow-400 w-5 h-5" />;
            default: return <RefreshCw className="text-blue-400 w-5 h-5 animate-spin" />;
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'success': return 'bg-green-500/10 border-green-500/20';
            case 'error': return 'bg-red-500/10 border-red-500/20';
            case 'warning': return 'bg-yellow-500/10 border-yellow-500/20';
            default: return 'bg-blue-500/10 border-blue-500/20';
        }
    };

    return (
        <Layout>
            <Head>
                <title>Google Drive Status | Avalanche Scouting</title>
            </Head>

            <div className="max-w-4xl mx-auto space-y-8 p-4">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                            <Cloud className="text-blue-400 w-10 h-10" />
                            Google Drive Health
                        </h1>
                        <p className="text-gray-400 mt-2 text-lg">
                            Diagnostics and connectivity status for robot image storage
                        </p>
                    </motion.div>

                    <Button
                        onClick={checkHealth}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-500 text-white gap-2 px-6 h-12 rounded-xl shadow-lg shadow-blue-900/20 transition-all font-bold group"
                    >
                        <RefreshCw className={cn("w-5 h-5 group-hover:rotate-180 transition-transform duration-500", loading && "animate-spin")} />
                        {loading ? 'Analyzing...' : 'Run Diagnostics'}
                    </Button>
                </div>

                {/* Overview Stats */}
                <div className="grid md:grid-cols-3 gap-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="bg-gray-800/40 border-gray-700/50 backdrop-blur-sm overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <FileJson size={60} />
                            </div>
                            <CardContent className="p-6">
                                <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Credentials</p>
                                <div className="flex items-center gap-2">
                                    {data?.envVars.GOOGLE_SERVICE_ACCOUNT_KEY ? (
                                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">VALID JSON</Badge>
                                    ) : (
                                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">MISSING</Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="bg-gray-800/40 border-gray-700/50 backdrop-blur-sm overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <FolderLock size={60} />
                            </div>
                            <CardContent className="p-6">
                                <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Folder Link</p>
                                <div className="flex items-center gap-2">
                                    {data?.envVars.GOOGLE_DRIVE_FOLDER_ID ? (
                                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">LINKED</Badge>
                                    ) : (
                                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">MISSING</Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card className="bg-gray-800/40 border-gray-700/50 backdrop-blur-sm overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Activity size={60} />
                            </div>
                            <CardContent className="p-6">
                                <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">System Health</p>
                                <div className="flex items-center gap-2">
                                    {data?.overall === 'success' ? (
                                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">OPTIMAL</Badge>
                                    ) : data?.overall === 'error' ? (
                                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">DEGRADED</Badge>
                                    ) : (
                                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">ANALYZING</Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Main Diagnostic Steps */}
                <Card className="bg-gray-900/50 border-gray-800/50 backdrop-blur-md overflow-hidden">
                    <CardHeader className="border-b border-white/5">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <ShieldCheck className="text-blue-400 w-5 h-5" />
                            Diagnostic Report
                        </CardTitle>
                        <CardDescription>Step-by-step verification of Google Drive integration</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="p-12 flex flex-col items-center justify-center space-y-4"
                                >
                                    <RefreshCw className="text-blue-500 w-12 h-12 animate-spin" />
                                    <p className="text-gray-400 animate-pulse">Communicating with Google Cloud...</p>
                                </motion.div>
                            ) : data ? (
                                <motion.div
                                    key="data"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="divide-y divide-white/5"
                                >
                                    {data.steps.map((step, idx) => (
                                        <div key={idx} className="p-6 flex items-start gap-4 hover:bg-white/5 transition-colors group">
                                            <div className={cn("p-2 rounded-lg shrink-0", getStatusBg(step.status))}>
                                                {getStatusIcon(step.status)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors uppercase text-xs tracking-widest">{step.name}</h4>
                                                    <span className={cn(
                                                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                                                        step.status === 'success' ? "text-green-500" :
                                                            step.status === 'error' ? "text-red-500" : "text-yellow-500"
                                                    )}>
                                                        {step.status}
                                                    </span>
                                                </div>
                                                <p className="text-gray-400 text-sm leading-relaxed">{step.message}</p>
                                            </div>
                                            <ChevronRight className="text-gray-700 group-hover:text-gray-500 transition-colors self-center shrink-0" />
                                        </div>
                                    ))}
                                </motion.div>
                            ) : (
                                <div className="p-12 text-center text-gray-500 italic">
                                    Press "Run Diagnostics" to begin.
                                </div>
                            )}
                        </AnimatePresence>
                    </CardContent>
                </Card>

                {/* Documentation Helper */}
                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="bg-blue-900/10 border-blue-900/20 h-full">
                        <CardContent className="p-6 space-y-4">
                            <h3 className="text-blue-400 font-bold flex items-center gap-2">
                                <Info size={18} /> Configuration Tips
                            </h3>
                            <ul className="text-xs text-blue-200/60 space-y-3 list-disc pl-4">
                                <li>The Service Account email must be shared with the target Google Drive folder with <strong>Editor</strong> permissions.</li>
                                <li>Ensure the <strong>Google Drive API</strong> is enabled in your Google Cloud Console.</li>
                                <li>The <code>GOOGLE_SERVICE_ACCOUNT_KEY</code> must be the entire JSON object from the service account key download.</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-800/40 border-gray-700/50 h-full">
                        <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                            <p className="text-gray-400 text-sm italic">"Everything is working perfectly."</p>
                            <div className="w-12 h-1 bg-blue-500 rounded-full opacity-20" />
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">System Operational</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Layout>
    );
}
