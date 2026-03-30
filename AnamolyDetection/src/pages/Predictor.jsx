import React, { useState } from "react";
import Card from "../components/Card";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const DEFAULT_JSON = `{
  "flow_duration": 1200,
  "flow_packets/s": 15.2,
  "syn_flag_count": 2
}`;

export default function Predictor() {
  const [inputFeatures, setInputFeatures] = useState(DEFAULT_JSON);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    let parsedFeatures;
    try {
      parsedFeatures = JSON.parse(inputFeatures);
    } catch (e) {
      setError("Invalid JSON format. Please correct it and try again.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The API expects: { "flow_features": { ... } }
        body: JSON.stringify({ flow_features: parsedFeatures })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityConf = (score) => {
    if (score < 40) return { label: "Clean", bg: "bg-green-600", text: "text-green-400", border: "border-green-600/50" };
    if (score < 70) return { label: "Suspicious", bg: "bg-yellow-500", text: "text-yellow-400", border: "border-yellow-500/50" };
    return { label: "Threat", bg: "bg-red-600", text: "text-red-400", border: "border-red-600/50" };
  };

  return (
    <div className="bg-gray-900 min-h-[calc(100vh-80px)] p-6 font-sans text-cyan-400 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">ML Predictor Console</h1>
        <p className="text-gray-400 text-sm tracking-wide">
          Run single-instance inference on flow features using the Random Forest & Isolation Forest hybrid model.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Editor Panel */}
        <Card title="Flow Features Editor" className="flex flex-col shadow-xl">
          <p className="text-gray-400 text-xs mb-4">
            Enter a JSON object of flow features. Any missing top-20 features will be treated as 0 automatically.
          </p>
          <textarea
            value={inputFeatures}
            onChange={(e) => setInputFeatures(e.target.value)}
            className="w-full h-80 bg-gray-950 text-cyan-200 p-4 border border-gray-700/50 rounded focus:outline-none focus:border-cyan-500 font-mono text-sm resize-none custom-scrollbar shadow-inner"
            spellCheck="false"
          />
          <div className="mt-6 flex justify-between items-center">
            {error && <span className="text-red-400 text-xs font-bold uppercase w-2/3 truncate">{error}</span>}
            {!error && <span className="text-gray-500 text-xs">Ready</span>}
            <button
              onClick={handlePredict}
              disabled={loading}
              className="border-2 border-cyan-700 text-cyan-400 hover:bg-cyan-600 hover:text-white transition-colors duration-300 font-bold uppercase tracking-widest text-xs px-8 py-2.5 rounded shadow-lg focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              ) : (
                "Run Inference"
              )}
            </button>
          </div>
        </Card>

        {/* Results Panel */}
        <div className="flex flex-col gap-6">
          <Card title="Analysis Results" className="flex-1 shadow-xl">
            {!result && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 italic p-10">
                <p className="text-xs font-semibold tracking-widest uppercase">Awaiting Data...</p>
              </div>
            )}
            {loading && (
              <div className="h-full flex flex-col items-center justify-center text-cyan-500 opacity-50 space-y-4 p-10">
                <div className="w-8 h-8 border-4 border-t-transparent border-cyan-500 rounded-full animate-spin"></div>
                <p className="text-xs font-bold">ANALYZING SIGNAL</p>
              </div>
            )}
            {result && !loading && (() => {
               const sev = getSeverityConf(result.risk_score);
               return (
                 <div className="flex flex-col h-full animate-fade-in space-y-6">
                    {/* Banner */}
                    <div className={`w-full p-4 rounded border ${sev.border} bg-gray-950 flex justify-between items-center shadow-inner`}>
                       <span className={`text-sm font-bold uppercase tracking-widest ${sev.text}`}>
                         Severity: {sev.label}
                       </span>
                       <span className={`${sev.bg} text-white font-bold text-xs px-3 py-1 rounded shadow-sm tracking-wider uppercase`}>
                         {result.risk_score.toFixed(1)}% RISK
                       </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 border border-gray-700/50 bg-gray-800/50 rounded flex flex-col justify-center shadow-inner">
                          <span className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Classification</span>
                          <span className="text-cyan-400 text-lg font-bold tracking-wider truncate" title={result.attack_type}>{result.attack_type}</span>
                       </div>
                       <div className="p-4 border border-gray-700/50 bg-gray-800/50 rounded flex flex-col justify-center shadow-inner">
                          <span className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">AI Confidence</span>
                          <span className="text-cyan-400 text-lg font-bold tracking-wider">{(result.confidence * 100).toFixed(2)}%</span>
                       </div>
                    </div>

                    <div className="flex flex-col border border-gray-700/50 bg-gray-800/50 p-4 rounded shadow-inner flex-1">
                       <span className="text-gray-500 text-[10px] uppercase tracking-widest mb-3">SHAP Explainability</span>
                       <p className="text-cyan-200 text-sm leading-relaxed mb-4 italic">
                         {result.plain_english_explanation || "No explanation provided."}
                       </p>
                       <div className="space-y-2 mt-auto">
                         {result.top_3_shap_features && result.top_3_shap_features.map((entry, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs bg-gray-900 px-3 py-2 rounded">
                               <span className="font-mono text-cyan-500 truncate mr-2" title={entry[0]}>{entry[0]}</span>
                               <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm border ${
                                 entry[1] === 'high' ? 'bg-orange-900/40 text-orange-400 border-orange-500/30' : 'bg-blue-900/40 text-blue-400 border-blue-500/30'
                               }`}>
                                 {entry[1]}
                               </span>
                            </div>
                         ))}
                       </div>
                    </div>
                 </div>
               );
            })()}
          </Card>
        </div>
      </div>
    </div>
  );
}
