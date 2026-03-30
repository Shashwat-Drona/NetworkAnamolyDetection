import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const REQUIRED_COLUMNS = [
  'Source IP', 'Destination IP', 'Protocol', 'Label',
  'Packets/s', 'Total Length of Fwd Packets', 'Flow Duration'
];

export default function Upload() {
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Validation States
  const [isValid, setIsValid] = useState(false);
  const [missingCols, setMissingCols] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);

  // Upload States
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null); // { loaded, errors }
  const [uploadError, setUploadError] = useState(null);

  const fileInputRef = useRef(null);

  const processFile = (selectedFile) => {
    setFile(null);
    setFileError(null);
    setIsValid(false);
    setMissingCols([]);
    setPreviewRows([]);
    setUploadResult(null);
    setUploadError(null);

    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setFileError("Invalid file type explicitly. Please provide an active .csv structured file.");
      return;
    }
    
    setFile(selectedFile);

    // Read the first 100KB to safely parse headers without crashing on massive unbuffered memory
    const blob = selectedFile.slice(0, 1024 * 100); 
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      
      if (lines.length < 2) {
        setIsValid(false);
        setMissingCols(["Dataset contains absolute zero usable structures. File is empty."]);
        return;
      }

      // Format header array stripping quotes and spaces natively
      const rawHeaders = lines[0].split(',').map(h => h.replace(/['"]+/g, '').trim());
      
      const missing = REQUIRED_COLUMNS.filter(req => !rawHeaders.includes(req));

      if (missing.length > 0) {
        setIsValid(false);
        setMissingCols(missing);
      } else {
        setIsValid(true);
        setMissingCols([]);
        setPreviewRows(lines.slice(0, 6)); // Header + up to first 5 rows safely
      }
    };
    reader.onerror = () => setFileError("Browser security prevented processing the blob stream.");
    reader.readAsText(blob);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !isValid || uploading) return;
    
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData
      });
      
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `Upload operation rejected with code ${res.status}`);
      }
      
      setUploadResult({ loaded: data.loaded || 0, errors: data.errors || 0 });
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setFileError(null);
    setIsValid(false);
    setMissingCols([]);
    setUploadResult(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bg-gray-900 min-h-screen text-cyan-400 p-6 lg:ml-64 font-sans flex flex-col items-center">
      
      <div className="w-full max-w-4xl mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white tracking-wide uppercase">Dataset Injection Pipeline</h1>
        <p className="text-gray-400 text-sm tracking-wide">Process CICIDS2018 mapping batches accurately straight into the data buffering array. Only structured structural CSV schemas are universally compatible.</p>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 gap-6">

        {/* Upload Card Module */}
        {!uploadResult && (
           <Card className="shadow-2xl">
             <div 
               className={`w-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl transition-all duration-300 ${isDragOver ? 'border-cyan-400 bg-gray-700/70 scale-[1.02]' : 'border-cyan-700 bg-gray-800'}`}
               onDragOver={handleDragOver}
               onDragLeave={handleDragLeave}
               onDrop={handleDrop}
             >
               <span className="text-5xl mb-4 drop-shadow-md">📁</span>
               <p className="text-gray-300 font-bold tracking-wide uppercase mb-2">Drag and drop structural dataset</p>
               <p className="text-gray-500 text-xs italic mb-6">Or select a standard local CSV payload directly</p>
               
               <input 
                 type="file" 
                 accept=".csv" 
                 className="hidden" 
                 ref={fileInputRef}
                 onChange={(e) => processFile(e.target.files[0])}
               />
               <button 
                 onClick={() => fileInputRef.current && fileInputRef.current.click()}
                 className="bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-2.5 px-8 rounded shadow-lg uppercase tracking-widest text-xs transition-colors"
               >
                 Browse File
               </button>
             </div>

             {fileError && (
               <div className="mt-4 p-4 bg-red-900/20 border border-red-500 rounded text-red-400 text-xs font-bold uppercase tracking-widest text-center shadow-inner">
                 ⚠️ {fileError}
               </div>
             )}

             {file && !fileError && (
               <div className="mt-4 p-4 bg-gray-900 border border-gray-700 rounded flex justify-between items-center shadow-inner">
                 <div className="flex flex-col">
                    <span className="text-cyan-400 font-bold text-sm tracking-wide">{file.name}</span>
                    <span className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB buffer block</span>
                 </div>
                 <button onClick={resetForm} className="text-gray-500 hover:text-red-400 font-bold uppercase text-xs tracking-wider transition-colors ml-4">
                    Clear
                 </button>
               </div>
             )}
           </Card>
        )}

        {/* Validation Output Block */}
        {file && !uploadResult && !uploading && (
           <Card title="Structural Header Validation" className="shadow-xl">
             {isValid ? (
               <div className="flex flex-col animate-[slideInUp_0.4s_ease-out]">
                 <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500 flex items-center justify-center text-green-400 font-bold text-lg shadow-[0_0_15px_theme(colors.green.600)]">✓</div>
                    <span className="text-green-400 font-bold uppercase tracking-widest text-sm">Schema Authenticated</span>
                 </div>
                 <div className="bg-gray-900 rounded p-4 border border-gray-700 shadow-inner">
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-3">Identified Native Markers</p>
                    <div className="flex flex-wrap gap-2">
                       {REQUIRED_COLUMNS.map(col => (
                         <span key={col} className="bg-green-900/40 text-green-400 border border-green-800 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest shadow-sm">
                           {col}
                         </span>
                       ))}
                    </div>
                 </div>
                 <div className="bg-gray-900 rounded p-4 border border-gray-700 shadow-inner mt-4 overflow-x-auto">
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-3">Trace Payload Preview</p>
                    <div className="text-gray-400 font-mono text-[10px] whitespace-pre">
                       {previewRows.join('\n')}
                    </div>
                 </div>
               </div>
             ) : (
               <div className="flex flex-col animate-[slideInUp_0.3s_ease-out]">
                 <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center text-red-500 font-bold text-lg shadow-[0_0_15px_theme(colors.red.600)]">✕</div>
                    <span className="text-red-500 font-bold uppercase tracking-widest text-sm">Schema Violations Detected</span>
                 </div>
                 <div className="bg-red-900/10 rounded p-4 border border-red-500/50 shadow-inner">
                    <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-3">Missing Critical Properties</p>
                    <ul className="list-disc list-inside text-red-400 font-mono text-xs pl-4 space-y-1">
                       {missingCols.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                 </div>
               </div>
             )}

             <div className="mt-8 flex justify-end">
               <button 
                 onClick={handleUpload}
                 disabled={!isValid || uploading}
                 className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded shadow-lg uppercase tracking-widest text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-transparent focus:border-cyan-300"
               >
                 Execute Injection
               </button>
             </div>
           </Card>
        )}

        {/* Active Upload Loader Output */}
        {uploading && (
           <Card className="shadow-2xl flex flex-col items-center justify-center py-16 animate-pulse border border-cyan-500/50">
             <div className="w-16 h-16 border-4 border-gray-700 border-t-cyan-500 rounded-full animate-spin mb-6 shadow-lg"></div>
             <span className="text-cyan-400 font-bold uppercase tracking-widest animate-bounce">Transmitting Payload Buffer...</span>
           </Card>
        )}

        {/* Post-Upload Status Components */}
        {uploadError && !uploading && (
           <Card className="shadow-2xl border border-red-600 bg-red-900/10">
             <div className="flex items-center justify-center mb-6">
                <span className="text-red-500 text-5xl drop-shadow-md">⚠️</span>
             </div>
             <div className="text-center mb-8">
                <h2 className="text-red-400 font-bold uppercase tracking-widest text-lg mb-2">Transmission Disconnected</h2>
                <p className="text-red-300 text-sm font-mono bg-red-900/30 p-4 rounded inline-block shadow-inner">{uploadError}</p>
             </div>
             <div className="flex justify-center">
                <button onClick={resetForm} className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600 font-bold py-2.5 px-8 rounded shadow uppercase tracking-widest text-xs transition-colors">
                   Reset Target Parameters
                </button>
             </div>
           </Card>
        )}

        {uploadResult && !uploading && (
           <Card className="shadow-2xl border border-green-600 bg-green-900/10">
             <div className="flex items-center justify-center mb-6 mt-4">
                <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center shadow-[0_0_30px_theme(colors.green.600)]">
                   <span className="text-green-400 text-4xl mt-1.5 ml-0.5">✓</span>
                </div>
             </div>
             <div className="text-center mb-10">
                <h2 className="text-green-400 font-bold uppercase tracking-widest text-xl mb-4">Pipeline Execution Success</h2>
                <div className="inline-flex space-x-12 bg-gray-900 p-6 rounded-lg border border-green-900/30 shadow-inner">
                   <div className="flex flex-col">
                      <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1">Loaded Events</span>
                      <span className="text-green-400 font-mono text-3xl drop-shadow">{uploadResult.loaded}</span>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1">Malformed Drops</span>
                      <span className="text-red-400 font-mono text-3xl">{uploadResult.errors}</span>
                   </div>
                </div>
             </div>
             <div className="flex flex-col sm:flex-row justify-center items-center gap-6 pb-4">
                <button onClick={resetForm} className="text-gray-400 hover:text-cyan-400 font-bold uppercase tracking-widest text-xs transition-colors py-2.5 px-6 border border-gray-700 rounded hover:border-cyan-700 shadow-sm">
                   Run Another Upload
                </button>
                <Link to="/attacks" className="bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-3 px-8 rounded shadow-[0_0_15px_theme(colors.cyan.800)] uppercase tracking-widest text-sm transition-all border border-cyan-500">
                   View In Attacks Table →
                </Link>
             </div>
           </Card>
        )}

      </div>
    </div>
  );
}
