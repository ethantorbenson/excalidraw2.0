import { screen } from "@testing-library/react";

import { reseed } from "@excalidraw/common";
import { CaptureUpdateAction } from "@excalidraw/element";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { Excalidraw } from "../index";
import { getNormalizedZoom } from "../scene";

import { API } from "./helpers/api";
import { act, fireEvent, render, unmountComponent } from "./test-utils";

unmountComponent();

const { h } = window;

describe("flowchart add step", () => {
  beforeEach(async () => {
    unmountComponent();
    localStorage.clear();
    reseed(7);
    await render(<Excalidraw handleKeyboardGlobally={true} />);

    const rectangle = API.createElement({
      type: "rectangle",
      x: 100,
      y: 100,
      width: 120,
      height: 80,
    });
    API.updateScene({
      elements: [rectangle],
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    API.setSelectedElements([rectangle]);
  });

  it("commits a cloned node and its bound arrow in one history entry", () => {
    const source = API.getSelectedElements()[0] as NonDeletedExcalidrawElement;
    const undoEntriesBefore = API.getUndoStack().length;

    act(() => {
      h.app.flowchart.addStep(source, "down");
    });

    expect(h.elements).toHaveLength(3);
    const nextNode = h.elements.find(
      (element) => element.type === "rectangle" && element.id !== source.id,
    )!;
    const arrow = h.elements.find((element) => element.type === "arrow")!;

    expect(nextNode).toMatchObject({
      type: source.type,
      x: source.x,
      y: source.y + source.height + 100,
      width: source.width,
      height: source.height,
      strokeColor: source.strokeColor,
      backgroundColor: source.backgroundColor,
    });
    expect(arrow).toMatchObject({
      startBinding: { elementId: source.id },
      endBinding: { elementId: nextNode.id },
    });
    expect(API.getSelectedElements().map(({ id }) => id)).toEqual([
      nextNode.id,
    ]);
    expect(API.getUndoStack()).toHaveLength(undoEntriesBefore + 1);
  });

  it("previews by direction, commits with Enter, and cancels with Escape", () => {
    const source = API.getSelectedElements()[0] as NonDeletedExcalidrawElement;
    fireEvent.click(screen.getByRole("button", { name: "Add step" }));

    const picker = screen.getByRole("group", {
      name: "Choose a direction for the new step",
    });
    expect(h.app.flowchart.pendingNodes).toHaveLength(2);

    const downButton = screen.getByRole("button", { name: "Add step down" });
    fireEvent.keyDown(downButton, { key: "ArrowDown" });
    expect(h.app.flowchart.pendingNodes?.[0].y).toBeGreaterThan(source.y);

    fireEvent.keyDown(downButton, { key: "Enter" });
    expect(picker.isConnected).toBe(false);
    expect(h.elements).toHaveLength(3);
    expect(
      h.elements.find(
        (element) => element.type === "rectangle" && element.id !== source.id,
      )?.y,
    ).toBeGreaterThan(source.y);

    API.setElements([source]);
    API.setSelectedElements([source]);
    fireEvent.click(screen.getByRole("button", { name: "Add step" }));
    expect(h.app.flowchart.pendingNodes).toHaveLength(2);
    fireEvent.keyDown(screen.getByRole("button", { name: "Add step right" }), {
      key: "Escape",
    });
    expect(h.app.flowchart.pendingNodes).toBeNull();
    expect(h.elements).toHaveLength(1);
  });

  it("only offers Add step for selected rectangles and diamonds", () => {
    const source = API.getSelectedElements()[0];
    expect(screen.getByRole("button", { name: "Add step" })).toBeTruthy();

    const ellipse = API.createElement({ type: "ellipse" });
    API.setElements([ellipse]);
    API.setSelectedElements([ellipse]);
    expect(screen.queryByRole("button", { name: "Add step" })).toBeNull();

    const diamond = API.createElement({ type: "diamond" });
    API.setElements([diamond]);
    API.setSelectedElements([diamond]);
    expect(screen.getByRole("button", { name: "Add step" })).toBeTruthy();
    expect(source.type).toBe("rectangle");
  });

  it("hides Add step during multi-select, drag, resize, text edit, and zoom-out", () => {
    const source = API.getSelectedElements()[0] as NonDeletedExcalidrawElement;
    const addStepButton = () =>
      screen.queryByRole("button", { name: "Add step" });

    API.setAppState({ selectedElementsAreBeingDragged: true });
    expect(addStepButton()).toBeNull();

    API.setAppState({
      selectedElementsAreBeingDragged: false,
      resizingElement: source as any,
    });
    expect(addStepButton()).toBeNull();

    API.setAppState({
      resizingElement: null,
      editingTextElement: source as any,
    });
    expect(addStepButton()).toBeNull();

    API.setAppState({ editingTextElement: null });
    const secondRectangle = API.createElement({ type: "rectangle" });
    API.setElements([source, secondRectangle]);
    API.setSelectedElements([source, secondRectangle]);
    expect(addStepButton()).toBeNull();

    API.setSelectedElements([source]);
    API.setAppState({
      zoom: { ...h.state.zoom, value: getNormalizedZoom(0.5) },
    });
    expect(addStepButton()).toBeNull();
  });
});
