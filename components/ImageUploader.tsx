import React, { useRef, useState } from 'react';
import { UploadedImage } from '../types';
import { processImage } from '../utils/imageUtils';

interface ImageUploaderProps {
  label: string;
  image: UploadedImage | null;
  onImageUpload: (img: UploadedImage) => void;
  color: 'indigo' | 'emerald';
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ label, image, onImageUpload, color }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    try {
      const processed = await processImage(file);
      onImageUpload(processed);
    } catch (err) {
      console.error("Failed to process image", err);
      alert("Could not process image. Please try a valid PNG or JPG.");
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) processFile(file);
        break;
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const borderColor = color === 'indigo' 
    ? (isDragOver ? 'border-indigo-400 bg-indigo-500/20' : 'border-indigo-500/30 hover:border-indigo-500/60') 
    : (isDragOver ? 'border-emerald-400 bg-emerald-500/20' : 'border-emerald-500/30 hover:border-emerald-500/60');
  
  const bgColor = color === 'indigo' ? 'bg-indigo-500/5' : 'bg-emerald-500/5';
  const textColor = color === 'indigo' ? 'text-indigo-400' : 'text-emerald-400';
  const ringColor = color === 'indigo' ? 'focus:ring-indigo-500' : 'focus:ring-emerald-500';

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-xs uppercase font-bold tracking-wider text-zinc-500 mb-2">{label}</h3>
      <div 
        ref={containerRef}
        tabIndex={0}
        onPaste={handlePaste}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          flex-1 relative rounded-lg border-2 border-dashed ${borderColor} ${image ? 'bg-black' : bgColor} 
          transition-all cursor-pointer overflow-hidden group outline-none focus:ring-2 ${ringColor} focus:ring-opacity-50
        `}
      >
        <input 
          type="file" 
          ref={inputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileChange} 
        />
        
        {image ? (
          <>
            <img 
              src={image.src} 
              alt={label} 
              className="w-full h-full object-contain p-2 opacity-80 group-hover:opacity-100 transition-opacity" 
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-center text-xs text-white translate-y-full group-hover:translate-y-0 transition-transform">
              点击替换 / 粘贴 (Ctrl+V)
            </div>
          </>
        ) : (
          <div className={`flex flex-col items-center justify-center h-full text-center p-6 select-none`}>
            <svg className={`w-8 h-8 mb-3 ${textColor} opacity-80`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className={`text-sm font-medium ${textColor}`}>上传 {label}</p>
            <p className="text-xs text-zinc-500 mt-1">支持粘贴 / 拖拽</p>
          </div>
        )}
      </div>
    </div>
  );
};