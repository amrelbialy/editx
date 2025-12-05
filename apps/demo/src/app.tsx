import { useMemo } from 'react';
import { CreativeEditor } from '@creative-editor/react-editor';
import { CreativeDocument, Engine } from '@creative-editor/engine';
import { Layer } from '@creative-editor/engine';

function App() {
  return <CreativeEditor width={800} height={600} />;
}

export default App;
