import React from "react";

const GraphViewer = () => {
  return (
    <div className="w-full h-full">
      <iframe
        src="https://www.desmos.com/calculator"
        width="100%"
        height="100%"
        style={{ border: "none" }}
        title="Desmos Graphing Calculator"
        allowFullScreen
      />
    </div>
  );
};

export default GraphViewer;
