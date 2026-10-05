import { ROUNDNESS } from "@excalidraw/common";

import type { AppState } from "@excalidraw/excalidraw/types";

import { Scene } from "../Scene";
import { addNewNodes, createFlowchartNodesAtPosition } from "../flowchart";
import { newElement, newStickyNoteElement } from "../newElement";
import { isFlowchartNodeElement, isStickyNoteElement } from "../typeChecks";

describe("flowchart", () => {
  it("creates a connected node at a requested position", () => {
    const rectangle = newElement({
      type: "rectangle",
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      backgroundColor: "#aabbcc",
      strokeColor: "#123456",
    });
    if (!isFlowchartNodeElement(rectangle)) {
      throw new Error("Expected a flowchart node");
    }
    const scene = new Scene([rectangle], { skipValidation: true });
    const [nextNode, bindingArrow] = createFlowchartNodesAtPosition(
      rectangle,
      {
        currentItemEndArrowhead: "arrow",
      } as AppState,
      "right",
      scene,
      500,
      250,
    );

    expect(nextNode).toMatchObject({
      type: "rectangle",
      x: 500,
      y: 250,
      width: rectangle.width,
      height: rectangle.height,
      backgroundColor: rectangle.backgroundColor,
      strokeColor: rectangle.strokeColor,
    });
    expect(bindingArrow).toMatchObject({
      type: "arrow",
      startBinding: { elementId: rectangle.id },
      endBinding: { elementId: nextNode.id },
    });
  });

  it("creates connected sticky notes", () => {
    const sticky = newStickyNoteElement({
      type: "stickynote",
      x: 100,
      y: 100,
      width: 240,
      height: 260,
      baseHeight: 220,
      roundness: { type: ROUNDNESS.PROPORTIONAL_RADIUS },
      roughness: 2,
      backgroundColor: "#ffec99",
      strokeColor: "#1e1e1e",
      strokeWidth: 2,
    });
    const scene = new Scene([sticky], { skipValidation: true });
    const {
      nodes: [nextNode, bindingArrow],
    } = addNewNodes(
      sticky,
      {
        currentItemEndArrowhead: "arrow",
      } as AppState,
      "right",
      scene,
      1,
    );

    expect(isFlowchartNodeElement(sticky)).toBe(true);
    expect(isFlowchartNodeElement(nextNode)).toBe(true);
    expect(isStickyNoteElement(nextNode)).toBe(true);
    expect(nextNode).toMatchObject({
      type: "stickynote",
      x: sticky.x + sticky.width + 100,
      y: sticky.y,
      width: sticky.width,
      height: sticky.height,
      baseHeight: sticky.baseHeight,
      roundness: sticky.roundness,
      roughness: sticky.roughness,
      backgroundColor: sticky.backgroundColor,
      strokeColor: sticky.strokeColor,
      strokeWidth: sticky.strokeWidth,
    });
    expect(bindingArrow).toMatchObject({
      type: "arrow",
      startBinding: { elementId: sticky.id },
      endBinding: { elementId: nextNode.id },
    });
  });
});
