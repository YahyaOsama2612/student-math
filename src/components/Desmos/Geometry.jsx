import React from "react";

const Geometry = () => {
  return (
    <div className="w-full h-full">
      <iframe
        src="https://www.desmos.com/geometry"
        width="100%"
        height="100%"
        style={{ border: "none" }}
        title="Desmos geometry"
        allowFullScreen
      />
    </div>
  );
};

export default Geometry;
