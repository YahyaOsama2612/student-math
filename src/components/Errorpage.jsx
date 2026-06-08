import React from 'react';
import styled from 'styled-components';
import { RotateCcw, ArrowLeft } from 'lucide-react';

const Errorpage = () => {
  return (
    <div className="flex max-h-screen w-full items-center justify-center bg-[#F8FAFC] px-4 font-sans overflow-hidden">
      {/* Container */}
      <div className="w-full max-w-lg rounded-[2.5rem] bg-white p-10 shadow-2xl shadow-slate-200/50 border border-slate-100 relative">
        
        {/* Floating Background Symbols (Subtle) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
          <div className="absolute top-10 left-10 text-4xl font-bold">∑</div>
          <div className="absolute bottom-20 right-12 text-5xl font-bold">∫</div>
          <div className="absolute top-32 right-8 text-3xl font-bold">≈</div>
          <div className="absolute bottom-12 left-16 text-4xl font-bold">∆</div>
        </div>

        <StyledWrapper>
          <div className="math-system">
            {/* Orbiting Paths */}
            <div className="orbit-path path-1"></div>
            <div className="orbit-path path-2"></div>

            {/* Orbiting Math Symbols */}
            <div className="symbol-container">
              <div className="math-symbol s-1">π</div>
              <div className="math-symbol s-2">∞</div>
              <div className="math-symbol s-3">θ</div>
              <div className="math-symbol s-4">√</div>
            </div>

            {/* Core Element (Division by Zero) */}
            <div className="core">
              <span>x</span>
              <div className="core-divider"></div>
              <span>0</span>
            </div>
          </div>
        </StyledWrapper>

        <div className="mt-12 text-center relative z-10">
          <div className="inline-flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-sm font-bold mb-4 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            Math Domain Error
          </div>
          
          <h1 className="text-3xl font-extrabold text-slate-800 mb-3">
            Unsolvable <span className="text-red-500">Equation!</span>
          </h1>
          
          <p className="text-slate-500 font-medium leading-relaxed px-4">
            Looks like we tried to divide by zero. The data you're looking for couldn't be calculated right now.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-blue-600 text-white font-bold transition-all duration-300 shadow-lg shadow-slate-900/20 active:scale-95"
            >
              <RotateCcw size={18} />
              Recalculate
            </button>

            <button
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 active:scale-95"
            >
              <ArrowLeft size={18} />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- CSS IN JS (Styled Components) ---
const StyledWrapper = styled.div`
  position: relative;
  height: 220px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1rem;

  .math-system {
    position: relative;
    width: 120px;
    height: 120px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* The Central Broken Equation */
  .core {
    position: relative;
    z-index: 10;
    font-size: 2.2rem;
    font-family: 'Times New Roman', serif; /* Classic math font look */
    font-style: italic;
    font-weight: 700;
    color: #ef4444; /* Tailwind red-500 */
    animation: corePulse 2s ease-in-out infinite;
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
    background: white;
    padding: 10px;
    border-radius: 50%;
    box-shadow: 0 0 30px rgba(239, 68, 68, 0.15);
  }

  .core-divider {
    width: 35px;
    height: 3px;
    background-color: #ef4444;
    margin: 4px 0;
    border-radius: 2px;
  }

  /* Dashed Orbit Rings */
  .orbit-path {
    position: absolute;
    border: 2px dashed #e2e8f0; /* Tailwind slate-200 */
    border-radius: 50%;
  }

  .orbit-path.path-1 { 
    width: 140px; 
    height: 140px; 
    animation: spin 20s linear infinite; 
  }
  .orbit-path.path-2 { 
    width: 220px; 
    height: 220px; 
    animation: spin 25s linear infinite reverse; 
  }

  .symbol-container {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
  }

  /* Orbiting Math Symbols */
  .math-symbol {
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 40px;
    height: 40px;
    background: white;
    border-radius: 50%;
    font-weight: 800;
    font-size: 1.2rem;
    box-shadow: 0 8px 16px rgba(0,0,0,0.08);
    margin-top: -20px; /* offset by half height */
    margin-left: -20px; /* offset by half width */
    font-family: serif;
  }

  /* Counter-Rotation Magic: 
    Rotates the container out, translates to the edge, then rotates the symbol back 
    so it always stays upright while orbiting!
  */
  .s-1 { 
    animation: orbit1 8s linear infinite; 
    color: #3b82f6; /* blue-500 */
    border: 2px solid #eff6ff;
  }
  .s-2 { 
    animation: orbit2 12s linear infinite; 
    color: #10b981; /* emerald-500 */
    border: 2px solid #ecfdf5;
  }
  .s-3 { 
    animation: orbit3 10s linear infinite; 
    color: #f59e0b; /* amber-500 */
    border: 2px solid #fffbeb;
  }
  .s-4 { 
    animation: orbit4 14s linear infinite; 
    color: #8b5cf6; /* violet-500 */
    border: 2px solid #f5f3ff;
  }

  @keyframes orbit1 {
    0% { transform: rotate(0deg) translateX(70px) rotate(0deg); }
    100% { transform: rotate(360deg) translateX(70px) rotate(-360deg); }
  }
  @keyframes orbit2 {
    0% { transform: rotate(90deg) translateX(110px) rotate(-90deg); }
    100% { transform: rotate(-270deg) translateX(110px) rotate(270deg); }
  }
  @keyframes orbit3 {
    0% { transform: rotate(180deg) translateX(70px) rotate(-180deg); }
    100% { transform: rotate(540deg) translateX(70px) rotate(-540deg); }
  }
  @keyframes orbit4 {
    0% { transform: rotate(270deg) translateX(110px) rotate(-270deg); }
    100% { transform: rotate(-90deg) translateX(110px) rotate(90deg); }
  }

  @keyframes spin {
    100% { transform: rotate(360deg); }
  }

  @keyframes corePulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(239, 68, 68, 0.1); }
    50% { transform: scale(1.08); box-shadow: 0 0 40px rgba(239, 68, 68, 0.3); }
  }
`;

export default Errorpage;