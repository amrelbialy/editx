import { useState, useCallback } from 'react';
import { ImageEditor } from '@creative-editor/image-editor';

const SAMPLE_IMAGE = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200';

function App() {
  const [mode, setMode] = useState<'image-editor' | 'pick'>('pick');
  const [imageSrc, setImageSrc] = useState<string | File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageSrc(file);
      setMode('image-editor');
    }
  };

  const handleUseSample = () => {
    setImageSrc(SAMPLE_IMAGE);
    setMode('image-editor');
  };

  const handleLoadUrl = () => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      setImageSrc(trimmed);
      setMode('image-editor');
    }
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLoadUrl();
  };

  // --- Drag-and-drop ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageSrc(file);
      setMode('image-editor');
      return;
    }
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      setImageSrc(url);
      setMode('image-editor');
    }
  }, []);

  // --- Clipboard paste ---
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          setImageSrc(blob);
          setMode('image-editor');
          return;
        }
      }
    }
  }, []);

  if (mode === 'image-editor' && imageSrc) {
    return <ImageEditor src={imageSrc} />;
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white gap-8 p-8"
      onPaste={handlePaste}
      tabIndex={0}
    >
      <h1 className="text-3xl font-bold">Creative Image Editor</h1>
      <p className="text-gray-400">Choose an image to get started</p>

      {/* File upload + sample */}
      <div className="flex gap-4">
        <label className="px-6 py-3 bg-blue-600 rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
          Upload Image
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
        <button
          onClick={handleUseSample}
          className="px-6 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
        >
          Use Sample Image
        </button>
      </div>

      {/* URL input */}
      <div className="flex gap-2 w-full max-w-lg">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={handleUrlKeyDown}
          placeholder="Paste an image URL..."
          className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleLoadUrl}
          disabled={!urlInput.trim()}
          className="px-5 py-2.5 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Load
        </button>
      </div>

      {/* Drag-and-drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          w-full max-w-lg h-40 flex flex-col items-center justify-center
          border-2 border-dashed rounded-xl transition-colors cursor-pointer
          ${isDragging
            ? 'border-blue-500 bg-blue-500/10 text-blue-400'
            : 'border-gray-600 text-gray-500 hover:border-gray-500 hover:text-gray-400'
          }
        `}
      >
        <span className="text-2xl mb-2">📁</span>
        <span className="text-sm">
          {isDragging ? 'Drop image here...' : 'Drag & drop an image here'}
        </span>
      </div>

      {/* Paste hint */}
      <p className="text-gray-500 text-xs">
        You can also paste an image from your clipboard with <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 text-xs">Ctrl+V</kbd>
      </p>
    </div>
  );
}

export default App;
