// Re-export from engine — the canonical implementation now lives there.
export {
  $restoreSelectionFromOffsets,
  cssStringToRunStyle,
  editorStateToRuns,
  getSelectionOffsets,
  runStyleToCssString,
  runsToEditorState,
  textRunStyleToCssPatch,
} from "@editx/engine";
