import React, { useState } from 'react';
import { UploadedImage, AnalysisIssue } from '../types';

export interface AlignmentConfig {
  scale: number;
  x: number;
  y: number;
}

interface ComparisonViewerProps {
  designImage: UploadedImage | null;
  devImage: UploadedImage | null;
  issues?: AnalysisIssue[];
  activeIssueIndex: number | null;
  onIssueSelect: (index: number | null) => void;
  alignment: AlignmentConfig;
  onAlignmentChange: (config: AlignmentConfig) => void;
}

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({ 
  designImage, 
  devImage, 
  issues = [], 
  activeIssueIndex,
  onIssueSelect,
  alignment,
  onAlignmentChange
}) => {
  const [opacity, setOpacity] = useState(0.5);
  const [showSideBySide, setShowSideBySide] = useState(false);
  
  if (!designImage || !devImage) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-900/30 border-2 border-dashed border-zinc-800/50 rounded-lg m-4">
        <p className="text-zinc-600">请上传设计稿和开发截图以开始比对</p>
      </div>
    );
  }

  // Render bounding box overlay
  const renderBoundingBoxes = () => {
    return issues.map((issue, idx) => {
      if (!issue.box_2d) return null;
      
      const [ymin, xmin, ymax, xmax] = issue.box_2d;
      const isActive = activeIssueIndex === idx;

      return (
        <div
          key={idx}
          className={`absolute border-2 transition-all duration-200 cursor-pointer z-30 ${
            isActive ? 'border-red-500 bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'border-yellow-400/50 hover:border-yellow-400 hover:bg-yellow-400/10'
          }`}
          style={{
            top: `${(ymin / 1000) * 100}%`,
            left: `${(xmin / 1000) * 100}%`,
            height: `${((ymax - ymin) / 1000) * 100}%`,
            width: `${((xmax - xmin) / 1000) * 100}%`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onIssueSelect(idx);
          }}
          title={issue.title}
        >
          {isActive && (
            <div className="absolute -top-7 left-0 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap shadow-sm z-40">
              #{idx + 1} {issue.title}
            </div>
          )}
        </div>
      );
    });
  };

  const handleResetAlignment = () => {
    onAlignmentChange({ scale: 1, x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex flex-col border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-sm text-zinc-300 cursor-pointer select-none hover:text-white transition-colors">
              <input 
                type="checkbox" 
                checked={showSideBySide} 
                onChange={(e) => setShowSideBySide(e.target.checked)}
                className="rounded bg-zinc-700 border-zinc-600 text-indigo-500 focus:ring-indigo-500/20"
              />
              <span>左右并排</span>
            </label>
          </div>

          {!showSideBySide && (
            <div className="flex items-center space-x-3 w-64">
              <span className="text-xs text-zinc-500 font-mono">DEV</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
              />
              <span className="text-xs text-zinc-500 font-mono">DESIGN</span>
            </div>
          )}
        </div>

        {/* Alignment Sub-toolbar (Only for Overlay Mode) */}
        {!showSideBySide && (
          <div className="px-6 py-2 bg-black/20 flex items-center space-x-6 border-t border-zinc-800/50 overflow-x-auto">
             <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">校准设计稿:</span>
             
             <div className="flex items-center space-x-2">
                <span className="text-xs text-zinc-500">缩放</span>
                <input 
                  type="range" min="0.5" max="2" step="0.01" 
                  value={alignment.scale} onChange={(e) => onAlignmentChange({...alignment, scale: parseFloat(e.target.value)})}
                  className="w-24 h-1.5 bg-zinc-700 rounded-lg accent-indigo-500"
                />
                <span className="text-xs text-zinc-400 w-8 text-right">{(alignment.scale * 100).toFixed(0)}%</span>
             </div>

             <div className="flex items-center space-x-2">
                <span className="text-xs text-zinc-500">水平 X</span>
                <input 
                  type="range" min="-200" max="200" step="1" 
                  value={alignment.x} onChange={(e) => onAlignmentChange({...alignment, x: parseFloat(e.target.value)})}
                  className="w-24 h-1.5 bg-zinc-700 rounded-lg accent-indigo-500"
                />
             </div>

             <div className="flex items-center space-x-2">
                <span className="text-xs text-zinc-500">垂直 Y</span>
                <input 
                  type="range" min="-200" max="200" step="1" 
                  value={alignment.y} onChange={(e) => onAlignmentChange({...alignment, y: parseFloat(e.target.value)})}
                  className="w-24 h-1.5 bg-zinc-700 rounded-lg accent-indigo-500"
                />
             </div>

             <button 
               onClick={handleResetAlignment}
               className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded transition-colors"
             >
               重置位置
             </button>
          </div>
        )}
      </div>

      {/* Viewport */}
      <div className="flex-1 overflow-auto bg-[#09090b] p-8 relative flex justify-center" onClick={() => onIssueSelect(null)}>
        {showSideBySide ? (
          <div className="flex gap-4 w-full h-full max-w-[1600px]">
            <div className="flex-1 flex flex-col gap-2 relative">
                <span className="text-xs uppercase tracking-wide text-zinc-500 text-center block">设计稿 (Design)</span>
                <div className="relative border border-zinc-800 shadow-xl rounded-sm bg-zinc-900 overflow-hidden">
                    <img 
                        src={designImage.src} 
                        alt="Design" 
                        className="w-full h-auto block" 
                        style={{
                            transformOrigin: 'top left',
                            transform: `translate(${alignment.x}px, ${alignment.y}px) scale(${alignment.scale})`
                        }}
                    />
                </div>
            </div>
            <div className="flex-1 flex flex-col gap-2 relative">
                <span className="text-xs uppercase tracking-wide text-zinc-500 text-center block">开发实现 (Dev)</span>
                <div className="relative border border-zinc-800 shadow-xl rounded-sm bg-zinc-900">
                    <img 
                        src={devImage.src} 
                        alt="Dev" 
                        className="w-full h-auto block" 
                    />
                    {/* Only show bounding boxes on Dev image in side-by-side */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                       <div className="pointer-events-auto w-full h-full relative">
                         {renderBoundingBoxes()}
                       </div>
                    </div>
                </div>
            </div>
          </div>
        ) : (
          <div className="relative shadow-2xl w-full max-w-[1200px] self-start border border-zinc-800 bg-zinc-900 overflow-hidden">
             {/* 
                Structure Update:
                The container must be sized by the DEV image, because bounding boxes are relative to DEV coordinates.
                1. Dev Image (Base): position relative, determines container size.
                2. Design Image (Overlay): position absolute, sits on top.
             */}

             {/* Dev Image (Base - Relative Flow) */}
             <div className="relative w-full z-0">
                 <img 
                    src={devImage.src} 
                    alt="Dev" 
                    className="w-full h-auto block"
                 />
                 
                 {/* Bounding Boxes Layer (Attached to Dev Image dimensions) */}
                 <div className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none">
                     <div className="relative w-full h-full pointer-events-auto">
                        {renderBoundingBoxes()}
                     </div>
                 </div>
             </div>

             {/* Design Image (Overlay - Absolute) */}
             <div 
                className="absolute top-0 left-0 w-full h-full z-10 transition-opacity duration-100 ease-linear pointer-events-none origin-top-left overflow-hidden"
                style={{ 
                  opacity: opacity,
                }}
             >
                 {/* Apply transforms to inner image or container? Container is fixed to Dev size. */}
                 {/* 
                    If we apply transform to this container, it might clip awkwardly if scale > 1. 
                    Better to transform the img inside, but absolute div needs to match size?
                    Actually, if design is bigger, we want it to overflow? 
                    Let's just apply transform to the image inside the absolute container.
                 */}
                <img 
                    src={designImage.src} 
                    alt="Design" 
                    className="w-full h-auto block"
                    style={{
                        transformOrigin: 'top left',
                        transform: `translate(${alignment.x}px, ${alignment.y}px) scale(${alignment.scale})` 
                    }}
                />
             </div>
             
             {/* Labels */}
             <div className="absolute top-2 right-2 z-30 flex flex-col gap-1 items-end pointer-events-none opacity-60">
                <span className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm">
                  Overlay: {Math.round(opacity * 100)}% Design
                </span>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};