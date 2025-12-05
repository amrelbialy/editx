// BoundingBox.ts
export function getBoundingBox(nodes) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
  
    nodes.forEach(node => {
      const bounds = node.getBounds(); // PIXI native
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });
  
    return {
      x: minX, y: minY,
      width: maxX - minX,
      height: maxY - minY,
      rotation: averageRotation(nodes),
    };
  }
  