import "./public-path.js";
import React from "react";
import type { HostComponentProps } from "./capabilities/host/props";
import { createRoot } from "react-dom/client";
import Component from "./component";

declare const __RUN_ON_LOCAL__: boolean;

type ComProps = HostComponentProps;
export default function Com(props: ComProps) {
  const { style } = props;

  return (
    <>
      <div
        style={
          __RUN_ON_LOCAL__
            ? {}
            : {
                ...style,
                backgroundColor: "transparent",
                left: 0,
                top: 0,
                display: "flex",
                transform: `translate(${style?.left}px, ${style?.top}px)`,
              }
        }
      >
        <Component {...props} />
      </div>
    </>
  );
}

if (__RUN_ON_LOCAL__) {
  (() => {
    const container = document.getElementById("app-root");
    const root = createRoot(container);
    root.render(<Com />);
  })();
} else {
  window.GraphicCustomComponent = Com;
}
