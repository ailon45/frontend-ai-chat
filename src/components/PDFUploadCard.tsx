import { useState, DragEvent, ChangeEvent } from 'react';
import { motion } from 'motion/react';
import { Upload, FileText } from 'lucide-react';

interface PDFUploadCardProps {
  onUpload: (file: File) => void;
}

export function PDFUploadCard({ onUpload }: PDFUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      onUpload(file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onUpload(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 20 }}
      className="w-full max-w-xl"
    >
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all ${isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105'
            : 'border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-800/50 hover:border-blue-400 dark:hover:border-blue-500'
          }`}
      >
        <motion.div
          animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            {isDragging ? (
              <FileText className="w-8 h-8 md:w-10 md:h-10 text-white" />
            ) : (
              <Upload className="w-8 h-8 md:w-10 md:h-10 text-white" />
            )}
          </div>

          <div>
            <h3 className="text-slate-800 dark:text-slate-100 mb-2 text-lg md:text-xl">
              {isDragging ? 'Drop your PDF here' : 'Upload PDF Document'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base">
              Drag and drop or click to browse
            </p>
          </div>

          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
            id="pdf-upload"
          />

          <label
            htmlFor="pdf-upload"
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-shadow cursor-pointer"
          >
            Browse Files
          </label>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Supports PDF files up to 30MB
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}