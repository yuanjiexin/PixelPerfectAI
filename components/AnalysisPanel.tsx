import React from 'react';
import { AnalysisResult, Severity, IssueCategory } from '../types';

interface AnalysisPanelProps {
  isLoading: boolean;
  result: AnalysisResult | null;
  error: string | null;
  activeIssueIndex: number | null;
  onIssueSelect: (index: number) => void;
  ignoreContent: boolean;
  onToggleIgnore: (ignore: boolean) => void;
}

const SeverityBadge: React.FC<{ severity: Severity }> = ({ severity }) => {
  const colors = {
    [Severity.High]: 'bg-red-500/10 text-red-400 border-red-500/30',
    [Severity.Medium]: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    [Severity.Low]: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  };

  const label = {
    [Severity.High]: '高',
    [Severity.Medium]: '中',
    [Severity.Low]: '低'
  }[severity] || severity;

  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-medium border rounded ${colors[severity]}`}>
      {label}优先级
    </span>
  );
};

const CategoryBadge: React.FC<{ category: IssueCategory }> = ({ category }) => {
    const colors = {
      [IssueCategory.Layout]: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
      [IssueCategory.Style]: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
      [IssueCategory.Content]: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    };
  
    const label = {
      [IssueCategory.Layout]: '布局',
      [IssueCategory.Style]: '样式',
      [IssueCategory.Content]: '内容'
    }[category] || category;
  
    return (
      <span className={`px-1.5 py-0.5 text-[10px] font-medium border rounded ${colors[category] || 'text-zinc-400 border-zinc-700'}`}>
        {label}
      </span>
    );
  };

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ 
  isLoading, 
  result, 
  error,
  activeIssueIndex,
  onIssueSelect,
  ignoreContent,
  onToggleIgnore
}) => {
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-zinc-400 space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="animate-pulse text-sm">正在像素级比对中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="bg-red-900/10 border border-red-800/50 text-red-400 p-4 rounded-lg text-center">
          <p className="font-semibold text-sm">分析失败</p>
          <p className="text-xs mt-1 opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-zinc-500 text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-2">
             <svg className="w-6 h-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
             </svg>
        </div>
        <p className="text-sm">上传图片后点击 "开始检查" </p>
        <p className="text-xs opacity-60">AI 将自动识别视觉差异</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 scroll-smooth">
      <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
        <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">还原度总结</h3>
        <p className="text-sm text-zinc-300 leading-relaxed">{result.summary}</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-2">
            <span>问题列表</span>
            <span className="bg-zinc-800 text-zinc-400 px-1.5 rounded-full text-[10px]">{result.issues.length}</span>
            </h3>
            <label className="flex items-center space-x-2 text-xs text-zinc-400 cursor-pointer select-none hover:text-zinc-200 transition-colors">
                <input 
                    type="checkbox" 
                    checked={ignoreContent}
                    onChange={(e) => onToggleIgnore(e.target.checked)}
                    className="rounded bg-zinc-800 border-zinc-700 text-indigo-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-indigo-500"
                />
                <span>忽略内容错误</span>
            </label>
        </div>
        
        {result.issues.length === 0 ? (
           <div className="text-center py-8 text-zinc-600 text-xs">
              没有发现相关问题
           </div>
        ) : (
            result.issues.map((issue, idx) => {
            const isActive = activeIssueIndex === idx;
            return (
                <div 
                key={idx} 
                onClick={() => onIssueSelect(idx)}
                className={`
                    group rounded-lg border p-3 cursor-pointer transition-all duration-200 relative overflow-hidden
                    ${isActive 
                    ? 'bg-indigo-900/10 border-indigo-500/50 shadow-md shadow-indigo-500/5' 
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}
                `}
                >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500"></div>}
                
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-zinc-500 text-xs font-mono">#{idx + 1}</span>
                        <CategoryBadge category={issue.category} />
                    </div>
                    <SeverityBadge severity={issue.severity} />
                </div>
                
                <h4 className={`text-sm font-medium mb-1 ${isActive ? 'text-indigo-200' : 'text-zinc-200'}`}>
                    {issue.title}
                </h4>
                
                <p className="text-xs text-zinc-400 mb-2 leading-relaxed line-clamp-2 group-hover:line-clamp-none">
                    {issue.description}
                </p>
                
                <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                    <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800/50 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {issue.location}
                    </span>
                </div>
                </div>
            );
            })
        )}
      </div>
    </div>
  );
};