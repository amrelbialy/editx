import { useState } from 'react';
import { ImageEditor } from '@creative-editor/image-editor';

const SAMPLE_IMAGE = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200';

function App() {
  const [mode, setMode] = useState<'image-editor' | 'pick'>('pick');
  const [imageSrc, setImageSrc] = useState<string | File | null>(null);

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

  if (mode === 'image-editor' && imageSrc) {
    return <ImageEditor src={imageSrc} />;
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white gap-6">
      <h1 className="text-3xl font-bold">Creative Image Editor</h1>
      <p className="text-gray-400">Choose an image to get started</p>
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
    </div>
  );
}

export default App;
