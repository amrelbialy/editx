export const en = {
  // Topbar
  "topbar.undo": "Undo",
  "topbar.redo": "Redo",
  "topbar.zoomIn": "Zoom in",
  "topbar.zoomOut": "Zoom out",
  "topbar.zoomFit": "Fit to screen",
  "topbar.export": "Export Image",
  "topbar.exporting": "Exporting…",
  "topbar.title": "Photo Editor",
  "topbar.back": "Back",
  "topbar.close": "Close editor",

  // Tool sidebar
  "tools.crop": "Crop",
  "tools.adjust": "Adjust",
  "tools.filter": "Filters",
  "tools.text": "Text",
  "tools.shapes": "Shapes",
  "tools.image": "Image",
  "tools.apps": "Apps",

  // Block actions
  "action.replace": "Replace",
  "action.replaceImage": "Replace Image",
  "action.editText": "Edit Text",
  "action.bringForward": "Bring Forward",
  "action.sendBackward": "Send Backward",
  "action.bringToFront": "Bring to Front",
  "action.sendToBack": "Send to Back",
  "action.duplicate": "Duplicate",
  "action.delete": "Delete",
  "action.alignLeft": "Align Left",
  "action.alignCenter": "Align Center",
  "action.alignRight": "Align Right",
  "action.alignTop": "Align Top",
  "action.alignMiddle": "Align Middle",
  "action.alignBottom": "Align Bottom",

  // Image panel
  "image.addImage": "Add Image",
  "image.dropHint": "Drop image here or click to upload",
  "image.sizeHint": "PNG, JPG, WebP — max 5 MB",
  "image.uploadButton": "Upload Image",
  "image.addError": "Failed to add image",

  // Contextual bar
  "bar.reset": "Reset",
  "bar.done": "Done",
  "bar.rotateLeft": "Rotate 90° left",
  "bar.rotateRight": "Rotate 90° right",
  "bar.flipH": "Flip horizontal",
  "bar.flipV": "Flip vertical",
  "bar.adjustHint": "Adjust image tones and colors",
  "bar.filterHint": "Apply preset looks",
  "bar.shapesHint": "Add and arrange shapes",

  // Tool panel
  "panel.close": "Close panel",
  "panel.crop": "Crop",
  "panel.rotateFlip": "Rotate & Flip",
  "panel.adjustments": "Adjustments",
  "panel.filters": "Filters",
  "panel.shapes": "Shapes",
  "panel.text": "Text",
  "panel.image": "Image",
  "panel.color": "Color",
  "panel.background": "Background",
  "panel.shadow": "Shadow",
  "panel.position": "Position",
  "panel.stroke": "Stroke",
  "panel.imageFill": "Image",
  "panel.advanced": "Advanced",

  // Zoom menu
  "zoom.options": "Zoom options",
  "zoom.autoFit": "Auto-Fit Page",
  "zoom.fitPage": "Fit Page",
  "zoom.fit": "Fit",
  "zoom.in": "Zoom In",
  "zoom.out": "Zoom Out",
  "zoom.preset": "{{percent}}% Zoom",

  // Crop panel
  "crop.aspectRatio": "Aspect Ratio",
  "crop.resize": "Resize",
  "crop.width": "Width",
  "crop.height": "Height",
  "crop.lockRatio": "Lock aspect ratio",
  "crop.unlockRatio": "Unlock aspect ratio",

  // Rotate panel
  "rotate.straighten": "Straighten",
  "rotate.rotate": "Rotate",
  "rotate.ccw": "Rotate 90° counter-clockwise",
  "rotate.cw": "Rotate 90° clockwise",
  "rotate.flip": "Flip",
  "rotate.flipH": "Flip horizontally",
  "rotate.flipV": "Flip vertically",
  "rotate.horizontal": "Horizontal",
  "rotate.vertical": "Vertical",

  // Discard dialog
  "dialog.unsavedTitle": "Unsaved changes",
  "dialog.unsavedDescription":
    "You have unsaved changes. Are you sure you want to close the editor? Your changes will be lost.",
  "dialog.cancel": "Cancel",
  "dialog.discard": "Discard",

  // Block properties
  "block.bold": "Bold",
  "block.italic": "Italic",
  "block.underline": "Underline",
  "block.strikethrough": "Strikethrough",
  "block.clearFormatting": "Clear Formatting",
  "block.textAlignment": "Text alignment",
  "block.moreTextOptions": "More text options",
  "block.enableFill": "Enable fill",
  "block.disableFill": "Disable fill",
  "block.color": "Color",
  "block.background": "Background",
  "block.stroke": "Stroke",
  "block.shadow": "Shadow",
  "block.opacity": "Opacity",
  "block.position": "Position",
  "block.style": "Style",
  "block.image": "Image",

  // Loading & errors
  "loading.image": "Loading image...",
  "loading.label": "Loading",
  "error.title": "Failed to load image",
  "error.retry": "Retry",

  // Accessibility
  "a11y.editorTools": "Editor tools",
  "a11y.toolOptions": "Tool options",
  "a11y.imageEditor": "Image editor",
  "a11y.canvas": "Image canvas",
  "a11y.blockActions": "Block actions",
  "a11y.cropMode": "Crop mode",
  "a11y.aspectRatioPresets": "Aspect ratio presets",
} as const;

export type TranslationKey = keyof typeof en;
