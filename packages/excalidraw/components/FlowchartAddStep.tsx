import { useEffect, useRef, useState } from "react";

import type { LinkDirection } from "@excalidraw/element";
import type {
  ElementsMap,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";

import { t } from "../i18n";

import { ElementCanvasButtons } from "./ElementCanvasButtons";

import "./FlowchartAddStep.scss";

import type { FocusEvent, KeyboardEvent } from "react";

const DIRECTIONS: {
  direction: LinkDirection;
  label:
    | "labels.addStepUp"
    | "labels.addStepRight"
    | "labels.addStepDown"
    | "labels.addStepLeft";
  key: string;
  icon: string;
  className: string;
}[] = [
  {
    direction: "up",
    label: "labels.addStepUp",
    key: "ArrowUp",
    icon: "↑",
    className: "up",
  },
  {
    direction: "right",
    label: "labels.addStepRight",
    key: "ArrowRight",
    icon: "→",
    className: "right",
  },
  {
    direction: "down",
    label: "labels.addStepDown",
    key: "ArrowDown",
    icon: "↓",
    className: "down",
  },
  {
    direction: "left",
    label: "labels.addStepLeft",
    key: "ArrowLeft",
    icon: "←",
    className: "left",
  },
];

const PICKER_WIDTH = 112;

export const FlowchartAddStep = ({
  element,
  elementsMap,
  onPreview,
  onCommit,
}: {
  element: NonDeletedExcalidrawElement;
  elementsMap: ElementsMap;
  onPreview: (direction: LinkDirection | null) => void;
  onCommit: (direction: LinkDirection) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDirection, setActiveDirection] =
    useState<LinkDirection>("right");
  const [openToLeft, setOpenToLeft] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const directionRefs = useRef<
    Partial<Record<LinkDirection, HTMLButtonElement | null>>
  >({});

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const trigger = triggerRef.current;
    const ownerWindow = trigger?.ownerDocument.defaultView;
    if (trigger && ownerWindow) {
      const { right } = trigger.getBoundingClientRect();
      setOpenToLeft(right + PICKER_WIDTH > ownerWindow.innerWidth);
    }

    directionRefs.current[activeDirection]?.focus();
  }, [activeDirection, isOpen]);

  const changeDirection = (direction: LinkDirection) => {
    setActiveDirection(direction);
    onPreview(direction);
  };

  const closePicker = (restoreFocus = false) => {
    setIsOpen(false);
    onPreview(null);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  };

  const openPicker = () => {
    if (isOpen) {
      closePicker();
      return;
    }

    setActiveDirection("right");
    setIsOpen(true);
    onPreview("right");
  };

  const chooseDirection = (direction: LinkDirection) => {
    onCommit(direction);
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction = DIRECTIONS.find((item) => item.key === event.key);
    if (direction) {
      event.preventDefault();
      event.stopPropagation();
      changeDirection(direction.direction);
      directionRefs.current[direction.direction]?.focus();
      return;
    }

    if (event.key === "Enter" && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      chooseDirection(activeDirection);
      return;
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      closePicker(true);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (
      isOpen &&
      !event.currentTarget.contains(event.relatedTarget as Node | null)
    ) {
      closePicker();
    }
  };

  return (
    <ElementCanvasButtons element={element} elementsMap={elementsMap}>
      <div
        className="excalidraw-flowchartAddStep"
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          className="excalidraw-flowchartAddStep__trigger"
          type="button"
          ref={triggerRef}
          aria-label={t("labels.addStep")}
          aria-expanded={isOpen}
          aria-haspopup="true"
          title={t("labels.addStep")}
          onClick={openPicker}
        >
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 20 20"
            className="excalidraw-flowchartAddStep__plus"
          >
            <path d="M10 4v12M4 10h12" />
          </svg>
        </button>
        {isOpen && (
          <div
            className={`excalidraw-flowchartAddStep__picker${
              openToLeft ? " excalidraw-flowchartAddStep__picker--left" : ""
            }`}
            role="group"
            aria-label={t("labels.chooseStepDirection")}
          >
            {DIRECTIONS.map(({ direction, label, icon, className }) => (
              <button
                key={direction}
                ref={(node) => {
                  directionRefs.current[direction] = node;
                }}
                className={`excalidraw-flowchartAddStep__direction excalidraw-flowchartAddStep__direction--${className}`}
                type="button"
                aria-label={t(label)}
                title={t(label)}
                aria-pressed={activeDirection === direction}
                onFocus={() => changeDirection(direction)}
                onMouseEnter={() => changeDirection(direction)}
                onClick={() => chooseDirection(direction)}
              >
                <span aria-hidden="true">{icon}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </ElementCanvasButtons>
  );
};
