export enum Severity {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low'
}

export enum IssueCategory {
  Layout = 'Layout', // Spacing, Alignment, Size
  Style = 'Style',   // Color, Font, Shadow, Radius
  Content = 'Content' // Missing element, Wrong icon/image
}

export interface AnalysisIssue {
  title: string;
  description: string;
  severity: Severity;
  category: IssueCategory;
  location: string;
  box_2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized to 1000
}

export interface AnalysisResult {
  issues: AnalysisIssue[];
  summary: string;
}

export enum ModelType {
  Flash = 'gemini-2.5-flash',
  Pro = 'gemini-3-pro-preview'
}

export interface UploadedImage {
  src: string; // Base64 data URL
  width: number;
  height: number;
  file: File;
}