### Scene modal

```json
Scene
 ├── Layer
 │    └── Node[]
 │
 ├── Group (node)
 │    ├── Text (node)
 │    └── Vector (node)
 │
 └── Group (node)
      ├── Image (node)
      ├── Mask Group (node)
      │    ├── Mask Shape
      │    └── Image
      └── Shape
```

Each node follows a consistent structure.

---

## **Node Schema Example**

```json
{
  "id": "123",
  "type": "text" | "image" | "group" | "video" | "shape",
  "children": [],
  "transform": {
    "x": 0,
    "y": 0,
    "rotation": 0,
    "scaleX": 1,
    "scaleY": 1
  },
  "props": {},
  "metadata": {}
}
```

```json
{
  "root": {
    "type": "root",
    "children": [
      {
        "id": "g1",
        "type": "group",
        "name": "Avatar Group",
        "children": [
          {
            "id": "circle1",
            "type": "shape",
            "shapeType": "circle",
            "props": {
              "radius": 100,
              "fill": "#eee"
            }
          },
          {
            "id": "img1",
            "type": "image",
            "src": "/avatar.png",
            "props": {
              "width": 200,
              "height": 200
            }
          }
        ]
      },
      {
        "id": "t1",
        "type": "text",
        "text": "Hello",
        "props": {
          "fontSize": 48,
          "fill": "#000"
        }
      }
    ]
  }
}
```
