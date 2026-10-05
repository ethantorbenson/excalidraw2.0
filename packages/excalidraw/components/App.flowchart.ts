import {
  isArrowKey,
  KEYS,
  sceneCoordsToViewportCoords,
  viewportCoordsToSceneCoords,
} from "@excalidraw/common";

import {
  makeNextSelectedElementIds,
  CaptureUpdateAction,
  FlowChartCreator,
  FlowChartNavigator,
  getSelectedElements,
  isFlowchartNodeElement,
  addNewNodes,
  createFlowchartNodesAtPosition,
  type LinkDirection,
} from "@excalidraw/element";

import type {
  ExcalidrawElement,
  ExcalidrawFlowchartNodeElement,
  NonDeleted,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";

import type React from "react";
import type App from "./App";
import type { PendingExcalidrawElements } from "../types";

type FlowchartOperation =
  | { type: "none" }
  | { type: "canceled" }
  | { type: "creating"; pending: PendingExcalidrawElements }
  | { type: "navigating"; nodeId: ExcalidrawElement["id"] | null }
  | { type: "committed"; nodes: PendingExcalidrawElements }
  | { type: "navigationEnded" };

type PointerCreationSession = {
  startNode: NonDeleted<ExcalidrawFlowchartNodeElement>;
  direction: LinkDirection;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  didDrag: boolean;
  defaultNodes: PendingExcalidrawElements;
  defaultPosition: { x: number; y: number };
  pendingNodes: PendingExcalidrawElements;
};

/**
 * Captures the App state management for the flowchart functionality.
 */
export class AppFlowchart {
  private creator = new FlowChartCreator();
  private navigator = new FlowChartNavigator();
  private pointerCreationSession: PointerCreationSession | null = null;

  constructor(private app: App) {}

  get pendingNodes() {
    return (
      this.pointerCreationSession?.pendingNodes ?? this.creator.pendingNodes
    );
  }

  get isCreatingChart() {
    return this.creator.isCreatingChart || !!this.pointerCreationSession;
  }

  /** ends any in-progress flowchart creation/navigation session */
  clear = () => {
    this.clearPointerCreation();
    this.creator.clear();
    this.navigator.clear();
  };

  beginPointerCreation = (
    startNode: NonDeleted<ExcalidrawFlowchartNodeElement>,
    direction: LinkDirection,
    event: PointerEvent,
  ) => {
    if (event.button !== 0) {
      return;
    }

    this.clearPointerCreation();
    event.preventDefault();
    event.stopPropagation();

    const defaultNodes = addNewNodes(
      startNode,
      this.app.state,
      direction,
      this.app.scene,
      1,
    ).nodes;
    const defaultNode = defaultNodes.find(isFlowchartNodeElement);
    if (!defaultNode) {
      return;
    }

    this.pointerCreationSession = {
      startNode,
      direction,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      didDrag: false,
      defaultNodes,
      defaultPosition: { x: defaultNode.x, y: defaultNode.y },
      pendingNodes: defaultNodes,
    };

    this.app.ownerWindow.addEventListener(
      "pointermove",
      this.handlePointerCreationMove,
      true,
    );
    this.app.ownerWindow.addEventListener(
      "pointerup",
      this.handlePointerCreationUp,
      true,
    );
    this.app.ownerWindow.addEventListener(
      "pointercancel",
      this.handlePointerCreationCancel,
      true,
    );
    this.app.ownerWindow.addEventListener(
      "keydown",
      this.handlePointerCreationKeyDown,
      true,
    );
    this.app.triggerRender(true);
  };

  private handlePointerCreationMove = (event: PointerEvent) => {
    const session = this.pointerCreationSession;
    if (!session || event.pointerId !== session.pointerId) {
      return;
    }

    const distanceFromStart = Math.hypot(
      event.clientX - session.startClientX,
      event.clientY - session.startClientY,
    );
    if (!session.didDrag && distanceFromStart < 4) {
      return;
    }

    session.didDrag = true;
    const pointer = viewportCoordsToSceneCoords(event, this.app.state);
    const defaultCenter = sceneCoordsToViewportCoords(
      {
        sceneX: session.defaultPosition.x + session.startNode.width / 2,
        sceneY: session.defaultPosition.y + session.startNode.height / 2,
      },
      this.app.state,
    );
    const snapsToDefault =
      Math.hypot(
        event.clientX - defaultCenter.x,
        event.clientY - defaultCenter.y,
      ) < 24;

    session.pendingNodes = snapsToDefault
      ? session.defaultNodes
      : createFlowchartNodesAtPosition(
          session.startNode,
          this.app.state,
          session.direction,
          this.app.scene,
          pointer.x - session.startNode.width / 2,
          pointer.y - session.startNode.height / 2,
        );
    event.preventDefault();
    this.app.triggerRender(true);
  };

  private handlePointerCreationUp = (event: PointerEvent) => {
    const session = this.pointerCreationSession;
    if (!session || event.pointerId !== session.pointerId) {
      return;
    }

    this.handlePointerCreationMove(event);
    const currentSession = this.pointerCreationSession;
    if (!currentSession) {
      return;
    }

    const pointer = viewportCoordsToSceneCoords(event, this.app.state);
    const isOverSource =
      pointer.x >= currentSession.startNode.x &&
      pointer.x <=
        currentSession.startNode.x + currentSession.startNode.width &&
      pointer.y >= currentSession.startNode.y &&
      pointer.y <= currentSession.startNode.y + currentSession.startNode.height;
    const isNearStart =
      Math.hypot(
        event.clientX - currentSession.startClientX,
        event.clientY - currentSession.startClientY,
      ) < 12;

    if (currentSession.didDrag && (isOverSource || isNearStart)) {
      this.cancelPointerCreation();
      return;
    }

    const nodes = currentSession.pendingNodes;
    this.clearPointerCreation();
    this.app.insertNewElements(nodes);

    const firstNode = nodes.find(isFlowchartNodeElement);
    if (firstNode) {
      this.selectAndReveal(firstNode);
    }

    this.captureUpdate();
  };

  private handlePointerCreationCancel = (event: PointerEvent) => {
    if (
      this.pointerCreationSession &&
      event.pointerId === this.pointerCreationSession.pointerId
    ) {
      this.cancelPointerCreation();
    }
  };

  private handlePointerCreationKeyDown = (event: KeyboardEvent) => {
    if (event.key === KEYS.ESCAPE) {
      event.preventDefault();
      event.stopPropagation();
      this.cancelPointerCreation();
    }
  };

  private cancelPointerCreation = () => {
    this.clearPointerCreation();
    this.app.triggerRender(true);
  };

  private clearPointerCreation = () => {
    if (!this.pointerCreationSession) {
      return;
    }

    this.app.ownerWindow.removeEventListener(
      "pointermove",
      this.handlePointerCreationMove,
      true,
    );
    this.app.ownerWindow.removeEventListener(
      "pointerup",
      this.handlePointerCreationUp,
      true,
    );
    this.app.ownerWindow.removeEventListener(
      "pointercancel",
      this.handlePointerCreationCancel,
      true,
    );
    this.app.ownerWindow.removeEventListener(
      "keydown",
      this.handlePointerCreationKeyDown,
      true,
    );
    this.pointerCreationSession = null;
  };

  handleKeyEvent = (event: React.KeyboardEvent | KeyboardEvent): boolean => {
    if (
      this.pointerCreationSession &&
      event.type === "keydown" &&
      event.key === KEYS.ESCAPE
    ) {
      this.cancelPointerCreation();
      return true;
    }

    const operation = this.resolveKeyboardEventToOperation(event);

    switch (operation.type) {
      case "none":
        return false;
      case "canceled":
        this.app.triggerRender(true);
        return true;
      case "creating":
        event.preventDefault();
        if (operation.pending.length) {
          this.app.revealIfHidden(operation.pending);
        }
        return true;
      case "navigating": {
        event.preventDefault();
        const node =
          operation.nodeId &&
          this.app.scene.getNonDeletedElementsMap().get(operation.nodeId);
        if (node) {
          this.selectAndReveal(node);
        }
        return true;
      }
      case "committed": {
        if (operation.nodes.length) {
          this.app.insertNewElements(operation.nodes);
        }

        const firstNode = operation.nodes[0];
        if (firstNode) {
          this.selectAndReveal(firstNode);
        }

        this.captureUpdate();
        return true;
      }
      case "navigationEnded":
        this.captureUpdate();
        return true;
    }
  };

  private resolveKeyboardEventToOperation(
    event: React.KeyboardEvent | KeyboardEvent,
  ): FlowchartOperation {
    const { creator, navigator, app } = this;

    if (event.type === "keydown") {
      if (event.key === KEYS.ESCAPE && creator.isCreatingChart) {
        creator.clear();
        return { type: "canceled" };
      }

      if (!isArrowKey(event.key)) {
        return { type: "none" };
      }

      if (event[KEYS.CTRL_OR_CMD] && !event.shiftKey) {
        const selectedElements = getSelectedElements(
          app.scene.getNonDeletedElementsMap(),
          app.state,
        );

        if (
          selectedElements.length === 1 &&
          isFlowchartNodeElement(selectedElements[0])
        ) {
          creator.createNodes(
            selectedElements[0],
            app.state,
            AppFlowchart.getLinkDirectionFromKey(event.key),
            app.scene,
          );
        }

        return { type: "creating", pending: creator.pendingNodes ?? [] };
      }

      if (event.altKey) {
        const elementsMap = app.scene.getNonDeletedElementsMap();
        const selectedElements = getSelectedElements(elementsMap, app.state);

        if (selectedElements.length === 1) {
          return {
            type: "navigating",
            nodeId: navigator.exploreByDirection(
              selectedElements[0],
              elementsMap,
              AppFlowchart.getLinkDirectionFromKey(event.key),
            ),
          };
        }
      }

      return { type: "none" };
    }

    // keyup: releasing a modifier finalizes the workflow it was driving;
    // both can finalize on the same event
    const navigationEnded = !event.altKey && navigator.isExploring;
    if (navigationEnded) {
      navigator.clear();
    }

    if (!event[KEYS.CTRL_OR_CMD] && creator.isCreatingChart) {
      const nodes = creator.pendingNodes ?? [];
      creator.clear();
      return { type: "committed", nodes };
    }

    return navigationEnded ? { type: "navigationEnded" } : { type: "none" };
  }

  private selectAndReveal(node: NonDeletedExcalidrawElement) {
    this.app.setState((prevState) => ({
      selectedElementIds: makeNextSelectedElementIds(
        { [node.id]: true },
        prevState,
      ),
    }));
    this.app.revealIfHidden([node]);
  }

  private captureUpdate() {
    this.app.syncActionResult({
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
  }

  private static getLinkDirectionFromKey(key: string): LinkDirection {
    switch (key) {
      case KEYS.ARROW_UP:
        return "up";
      case KEYS.ARROW_DOWN:
        return "down";
      case KEYS.ARROW_RIGHT:
        return "right";
      case KEYS.ARROW_LEFT:
        return "left";
      default:
        return "right";
    }
  }
}
