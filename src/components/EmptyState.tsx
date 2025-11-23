import { motion } from 'motion/react';
import { MessageSquare, Sparkles, FileText } from 'lucide-react';

interface EmptyStateProps {
  mode?: 'chat' | 'pdf';
  pdfName?: string;
}

export function EmptyState({ mode = 'chat', pdfName }: EmptyStateProps) {
  const chatSuggestions = [
    "What's the weather like today?",
    "Tell me a fun fact",
    "Help me write an email",
    "Explain quantum computing",
  ];

  const pdfSuggestions = [
    "Summarize this document",
    "What are the main points?",
    "Explain the key concepts",
    "Find information about...",
  ];

  const suggestions = mode === 'pdf' ? pdfSuggestions : chatSuggestions;
  const Icon = mode === 'pdf' ? FileText : MessageSquare;
  const title = mode === 'pdf'
    ? (pdfName ? `Ask about ${pdfName}` : 'Ask about your PDF')
    : 'Chat With Me';
  const subtitle = mode === 'pdf'
    ? 'Your PDF is ready! Ask me anything about the document.'
    : 'I am ready to help. Ask me anything!';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col items-center justify-center px-4 py-8"
    >
      <div className="max-w-2xl w-full space-y-8 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Icon className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-2xl md:text-3xl text-slate-800 dark:text-slate-100 mb-3">
            {title}
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            {subtitle}
          </p>
        </div>

        {/* Suggestions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {suggestions.map((suggestion, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span>{suggestion}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {mode === 'pdf'
            ? 'Powered by mini AI • upload pdf get your answers and query'
            : 'Powered by mini AI • Chat history is saved automatically on your local device'
          }
        </p>
      </div>
    </motion.div>
  );
}
