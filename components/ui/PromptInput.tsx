'use client';

import { useState, useRef } from 'react';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

const EXAMPLE_PROMPTS = [
  'A cute cartoon robot with big eyes',
  'A wooden treasure chest with gold trim',
  'A fantasy crystal sword glowing blue',
  'A small potted cactus with a flower',
  'A steampunk mechanical owl',
  'A colorful mushroom house',
];

export function PromptInput({
  onSubmit,
  placeholder = 'Describe the image you want to generate...',
  disabled = false,
  loading = false,
}: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !disabled && !loading) {
      onSubmit(prompt.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const useExample = (example: string) => {
    setPrompt(example);
    textareaRef.current?.focus();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || loading}
            rows={3}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || disabled || loading}
            className="absolute bottom-3 right-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              'Generate'
            )}
          </button>
        </div>
      </form>

      <div>
        <p className="text-sm text-gray-500 mb-2">Try an example:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              onClick={() => useExample(example)}
              disabled={disabled || loading}
              className="px-3 py-1 text-sm bg-gray-800 border border-gray-700 rounded-full hover:bg-gray-700 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
