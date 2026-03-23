// Re-export from engine — the canonical implementation now lives there.
export {
  runsToEditorState,
  editorStateToRuns,
  getSelectionOffsets,
  $restoreSelectionFromOffsets,
  runStyleToCssString,
  cssStringToRunStyle,
  textRunStyleToCssPatch,
} from '@creative-editor/engine';

