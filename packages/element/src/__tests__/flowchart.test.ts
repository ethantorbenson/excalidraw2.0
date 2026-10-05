import { ROUNDNESS } from "@excalidraw/common";

import type { AppState } from "@excalidraw/excalidraw/types";

import { Scene } from "../Scene";
import { addNewNodes, FlowChartCreator } from "../flowchart";
import { newElement, newStickyNoteElement } from "../newElement";
import { isFlowchartNodeElement, isStickyNoteElement } from "../typeChecks";

describe("flowchart", () => {
  it("lets the creator grow a style-matched, bound diamond cluster", () => {
    const diamondCandidate = newElement({
      type: "diamond",
      x: 10,
      y: 20,
      width: 120,
      height: 80,
      strokeColor: "#123456",
      backgroundColor: "#abcdef",
      strokeWidth: 3,
    });
    if (diamondCandidate.type !== "diamond") {
      throw new Error("Expected a diamond element");
    }
    const diamond = diamondCandidate;
    const scene = new Scene([diamond], { skipValidation: true });
    const creator = new FlowChartCreator();
    const appState = { currentItemEndArrowhead: "arrow" } as AppState;

    creator.createNodes(diamond, appState, "right", scene);
    creator.createNodes(diamond, appState, "right", scene);

    const nodes = creator.pendingNodes ?? [];
    const diamonds = nodes.filter((node) => node.type === "diamond");
    const arrows = nodes.filter((node) => node.type === "arrow");

    expect(diamonds).toHaveLength(2);
    expect(arrows).toHaveLength(2);
    expect(diamonds[0]).toMatchObject({
      x: diamond.x + diamond.width + 100,
      y: diamond.y,
      strokeColor: diamond.strokeColor,
      backgroundColor: diamond.backgroundColor,
      strokeWidth: diamond.strokeWidth,
    });
    expect(arrows[0]).toMatchObject({
      startBinding: { elementId: diamond.id },
      endBinding: { elementId: diamonds[0].id },
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
