import { Application, Color, Container, Graphics, Point, Rectangle } from 'pixi.js';

// Transformer.ts
export class Transformer extends Container {
  private targets: Container[];
  private wireframe: Graphics;
  private static tempCorners: Point[] = [
    new Point(),
    new Point(),
    new Point(),
    new Point(),
  ];

  constructor(app: Application, targets: Container | Container[]) {
    super();
    this.app = app;
    this.targets = Array.isArray(targets) ? targets : [targets];

    console.log('targets', this.targets);
    this.wireframe = new Graphics();
    this.addChild(this.wireframe);

    this.eventMode = 'static';
    this.cursor = 'move';
    console.log('this', this);
    this.draw();
  }

  // =============================================================================
  // PART 1: COORDINATE SPACE & BOUNDS CALCULATION
  // =============================================================================

  /**
   * Calculate the 4 corners of an object's bounding box in WORLD SPACE
   * This handles position, scale, rotation, and skew
   */
  private calculateWorldCorners(target: Container): Point[] {
    // Get local bounds (in object's own coordinate system)
    const localBounds = target.getLocalBounds();

    console.log('localBounds', localBounds);
    // Define 4 corners in local space
    const localCorners = Transformer.tempCorners;
    localCorners[0].set(localBounds.x, localBounds.y); // top-left
    localCorners[1].set(localBounds.x + localBounds.width, localBounds.y); // top-right
    localCorners[2].set(
      localBounds.x + localBounds.width,
      localBounds.y + localBounds.height
    ); // bottom-right
    localCorners[3].set(localBounds.x, localBounds.y + localBounds.height); // bottom-left

    console.log('parent', target.parent);
    console.log('localCornersFirst', localCorners);
    console.log('target.worldTransform', target.worldTransform);
    // Transform to world space using the object's worldTransform matrix
    const worldCorners: Point[] = [];
    for (let i = 0; i < 4; i++) {
      // const worldPoint = new Point();
      const transformedPoint = target.worldTransform.apply(localCorners[i]);
      console.log('transformedPoint', transformedPoint);
      worldCorners.push(transformedPoint);
    }

    return worldCorners;
  }

  /**
   * Convert a point from world space to this transformer's local space
   * This is critical for drawing!
   */
  private worldToLocal(worldPoint: Point, output?: Point): Point {
    if (!output) output = new Point();
    return this.worldTransform.applyInverse(worldPoint, output);
  }

  /**
   * Calculate axis-aligned bounding box (AABB) from multiple corners
   * Returns the rectangle that contains all corners
   */
  private calculateAABB(worldCorners: Point[]): Rectangle {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const corner of worldCorners) {
      minX = Math.min(minX, corner.x);
      minY = Math.min(minY, corner.y);
      maxX = Math.max(maxX, corner.x);
      maxY = Math.max(maxY, corner.y);
    }

    return new Rectangle(minX, minY, maxX - minX, maxY - minY);
  }

  /**
   * Calculate bounding box for all targets
   * If multiple targets, this creates a box around all of them
   */
  private calculateGroupBounds(): {
    worldCorners: Point[];
    center: Point;
    aabb: Rectangle;
  } {
    // Collect all corners from all targets
    const allWorldCorners: Point[] = [];

    for (const target of this.targets) {
      const corners = this.calculateWorldCorners(target);
      allWorldCorners.push(...corners);
    }

    console.log('allWorldCorners', allWorldCorners);
    // Calculate AABB
    const aabb = this.calculateAABB(allWorldCorners);
    console.log('aabb', aabb);
    // Calculate center (for rotation/scaling origin)
    const center = new Point(aabb.x + aabb.width / 2, aabb.y + aabb.height / 2);

    // For drawing, we need the 4 corners of the group
    const groupCorners = [
      new Point(aabb.x, aabb.y),
      new Point(aabb.x + aabb.width, aabb.y),
      new Point(aabb.x + aabb.width, aabb.y + aabb.height),
      new Point(aabb.x, aabb.y + aabb.height),
    ];

    console.log('groupCorners', groupCorners);
    console.log('center', center);
    console.log('aabb', aabb);
    return { worldCorners: groupCorners, center, aabb };
  }

  // =============================================================================
  // PART 2: DRAWING THE WIREFRAME
  // =============================================================================

  /**
   * Draw the wireframe (the green box)
   * Called every frame to follow the target
   */
  protected draw(): void {
    // this.wireframe.clear();

    // Get bounds in world space
    const { worldCorners } = this.calculateGroupBounds();

    // Convert to local space for drawing
    const localCorners = worldCorners.map((wc) => this.worldToLocal(wc));
    console.log('localCorners', localCorners);
    // Draw the box outline

    // Add a tiny fill for hit detection (makes it clickable)
    // this.wireframe.fill('red');

    // Draw the quad
    this.wireframe
      .moveTo(localCorners[0].x, localCorners[0].y)
      .lineTo(localCorners[1].x, localCorners[1].y)
      .lineTo(localCorners[2].x, localCorners[2].y)
      .lineTo(localCorners[3].x, localCorners[3].y)
      .closePath()
      .stroke({ width: 2, color: 'red' });

    console.log('fillStyle', this.wireframe.fillStyle);
    // Draw corner dots for visualization
    for (const corner of localCorners) {
      this.wireframe.circle(corner.x, corner.y, 4).fill({ color: 'red' });
    }
  }

  /**
   * Override render to redraw every frame
   * This makes the transformer follow animated objects
   */
  // render(renderer: any): void {
  //   console.log('render', renderer);
  //   this.draw();
  //   // super.render(renderer);
  // }
}
