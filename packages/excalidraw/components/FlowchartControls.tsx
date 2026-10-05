import { sceneCoordsToViewportCoords } from "@excalidraw/common";

import type { LinkDirection } from "@excalidraw/element";
import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { PlusIcon } from "./icons";
import "./FlowchartControls.scss";

import type { AppState } from "../types";
import type App from "./App";

const CONTROL_OFFSET = 18;
const MINIMUM_CONTROL_SIZE = 48;

const CONTROL_SIDES: {
  side: "top" | "right" | "bottom" | "left";
  shortcut: string;
}[] = [
  { side: "top", shortcut: "↑" },
  { side: "right", shortcut: "→" },
  { side: "bottom", shortcut: "↓" },
  { side: "left", shortcut: "←" },
];

const getSideControl = (
  element: NonDeletedExcalidrawElement,
  appState: AppState,
  side: typeof CONTROL_SIDES[number]["side"],
) => {
  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;
  const cos = Math.cos(element.angle);
  const sin = Math.sin(element.angle);
  const local = {
    top: { x: centerX, y: element.y, normalX: 0, normalY: -1 },
    right: {
      x: element.x + element.width,
      y: centerY,
      normalX: 1,
      normalY: 0,
    },
    bottom: {
      x: centerX,
      y: element.y + element.height,
      normalX: 0,
      normalY: 1,
    },
    left: { x: element.x, y: centerY, normalX: -1, normalY: 0 },
  }[side];

  const dx = local.x - centerX;
  const dy = local.y - centerY;
  const sceneX = centerX + dx * cos - dy * sin;
  const sceneY = centerY + dx * sin + dy * cos;
  const normalX = local.normalX * cos - local.normalY * sin;
  const normalY = local.normalX * sin + local.normalY * cos;
  const viewport = sceneCoordsToViewportCoords({ sceneX, sceneY }, appState);

  let direction: LinkDirection;
  if (Math.abs(normalX) > Math.abs(normalY)) {
    direction = normalX > 0 ? "right" : "left";
  } else {
    direction = normalY > 0 ? "down" : "up";
  }

  return {
    direction,
    left: viewport.x - appState.offsetLeft + normalX * CONTROL_OFFSET - 14,
    top: viewport.y - appState.offsetTop + normalY * CONTROL_OFFSET - 14,
  };
};

export const FlowchartControls = ({
  app,
  appState,
  element,
}: {
  app: App;
  appState: AppState;
  element: NonDeletedExcalidrawElement;
}) => {
  if (
    (element.type !== "rectangle" && element.type !== "diamond") ||
    appState.zoom.value < 0.6 ||
    Math.min(element.width, element.height) * appState.zoom.value <
      MINIMUM_CONTROL_SIZE ||
    appState.selectionElement ||
    appState.newElement ||
    appState.selectedElementsAreBeingDragged ||
    appState.resizingElement ||
    appState.isRotating ||
    appState.editingTextElement ||
    appState.contextMenu ||
    appState.openMenu ||
    appState.viewModeEnabled ||
    app.flowchart.isCreatingChart
  ) {
    return null;
  }

  return (
    <>
      {CONTROL_SIDES.map(({ side, shortcut }) => {
        const position = getSideControl(element, appState, side);
        const title = `Add shape (Ctrl+${shortcut})`;
        return (
          <button
            key={side}
            type="button"
            className="flowchart-plus-control"
            style={{ left: position.left, top: position.top }}
            title={title}
            aria-label={title}
            data-testid={`flowchart-plus-${side}`}
            data-tooltip={title}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              app.flowchart.createNodeFromSelection(position.direction);
              app.focusContainer();
            }}
          >
            {PlusIcon}
          </button>
        );
      })}
    </>
  );
};
