import React, { useState, useMemo } from 'react';
import { UploadedImage, AnalysisResult, Severity, IssueCategory } from './types';
import { ImageUploader } from './components/ImageUploader';
import { ComparisonViewer, AlignmentConfig } from './components/ComparisonViewer';
import { AnalysisPanel } from './components/AnalysisPanel';
import { analyzeDesignDiscrepancies } from './services/geminiService';
import { getTransformedImage } from './utils/imageUtils';

const App: React.FC = () => {
  const [designImage, setDesignImage] = useState<UploadedImage | null>(null);
  const [devImage, setDevImage] = useState<UploadedImage | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeIssueIndex, setActiveIssueIndex] = useState<number | null>(null);
  const [ignoreContent, setIgnoreContent] = useState(false);
  
  // Lifted state for alignment so we can use it during analysis
  const [alignment, setAlignment] = useState<AlignmentConfig>({ scale: 1, x: 0, y: 0 });

  // Compute filtered result based on ignoreContent state
  const filteredResult = useMemo(() => {
    if (!analysisResult) return null;
    
    if (!ignoreContent) return analysisResult;

    return {
        ...analysisResult,
        issues: analysisResult.issues.filter(issue => issue.category !== IssueCategory.Content)
    };
  }, [analysisResult, ignoreContent]);

  const handleAnalyze = async () => {
    if (!designImage || !devImage) return;

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    setActiveIssueIndex(null);

    try {
      // Apply the user's manual alignment to the design image before sending to AI
      const transformedDesignImageSrc = await getTransformedImage(
        designImage.src,
        alignment.scale,
        alignment.x,
        alignment.y,
        devImage.width, // Use dev image dimensions as the canvas target to ensure comparison makes sense
        devImage.height
      );

      const result = await analyzeDesignDiscrepancies(transformedDesignImageSrc, devImage.src);
      
      // Sort issues by severity: High > Medium > Low
      const severityScore = {
        [Severity.High]: 3,
        [Severity.Medium]: 2,
        [Severity.Low]: 1
      };
      
      const sortedIssues = result.issues.sort((a, b) => {
        return severityScore[b.severity] - severityScore[a.severity];
      });

      setAnalysisResult({ ...result, issues: sortedIssues });

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setDesignImage(null);
    setDevImage(null);
    setAnalysisResult(null);
    setError(null);
    setActiveIssueIndex(null);
    setAlignment({ scale: 1, x: 0, y: 0 });
    setIgnoreContent(false);
  };

  const handleToggleIgnore = (shouldIgnore: boolean) => {
      setIgnoreContent(shouldIgnore);
      setActiveIssueIndex(null); // Reset selection to avoid index mismatch
  };

  return (
    <div className="flex flex-col h-screen text-zinc-100 bg-black overflow-hidden font-sans">
      {/* Header */}
      <header className="flex-none h-16 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20">
            P
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">PixelPerfect AI</h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleAnalyze}
            disabled={!designImage || !devImage || isAnalyzing}
            className={`
              flex items-center gap-2 px-5 py-2 rounded-md font-medium text-sm transition-all border
              ${(!designImage || !devImage) 
                ? 'bg-zinc-900 border-zinc-800 text-zinc-500 cursor-not-allowed' 
                : isAnalyzing 
                  ? 'bg-indigo-900/20 border-indigo-500/30 text-indigo-300 cursor-wait'
                  : 'bg-indigo-600 hover:bg-indigo-500 border-transparent text-white shadow-lg shadow-indigo-500/20'}
            `}
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                AI 正在检查...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                开始检查
              </>
            )}
          </button>

          {(designImage || devImage) && (
             <button onClick={handleReset} className="text-zinc-500 hover:text-red-400 text-sm font-medium px-2 transition-colors">
                重置
             </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Side: Images & Visual Tools */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-800 bg-zinc-950">
          
          {/* Top: Upload Area */}
          <div className={`flex-none p-4 grid grid-cols-2 gap-4 border-b border-zinc-800 transition-all duration-300 ${analysisResult || isAnalyzing ? 'h-40' : 'h-2/5'}`}>
            <ImageUploader 
              label="1. 设计稿 (Design)" 
              image={designImage} 
              onImageUpload={setDesignImage} 
              color="indigo"
            />
            <ImageUploader 
              label="2. 开发截图 (Dev)" 
              image={devImage} 
              onImageUpload={setDevImage} 
              color="emerald"
            />
          </div>

          {/* Bottom: Comparison View */}
          <div className="flex-1 min-h-0">
             <ComparisonViewer 
               designImage={designImage} 
               devImage={devImage} 
               issues={filteredResult?.issues}
               activeIssueIndex={activeIssueIndex}
               onIssueSelect={setActiveIssueIndex}
               alignment={alignment}
               onAlignmentChange={setAlignment}
             />
          </div>
        </div>

        {/* Right Side: Analysis Results */}
        <div className="w-[400px] bg-zinc-900/30 flex flex-col border-l border-zinc-800/50">
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
            <h2 className="font-semibold text-zinc-100 flex items-center gap-2 text-sm uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              检查报告
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <AnalysisPanel 
              isLoading={isAnalyzing} 
              result={filteredResult} 
              error={error}
              activeIssueIndex={activeIssueIndex}
              onIssueSelect={setActiveIssueIndex}
              ignoreContent={ignoreContent}
              onToggleIgnore={handleToggleIgnore}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;