import React, { useReducer, useMemo } from 'react';
import { create, all } from 'mathjs';
import { motion } from 'framer-motion';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

const math = create(all);

// إعدادات الزوايا (Degrees)
const toRad = (deg) => deg * (Math.PI / 180);
const toDeg = (rad) => rad * (180 / Math.PI);

math.import({
  sin: (x) => Math.sin(toRad(x)),
  cos: (x) => (x % 90 === 0 && x % 180 !== 0 ? 0 : Math.cos(toRad(x))),
  tan: (x) => (x % 180 === 90 ? NaN : Math.tan(toRad(x))),
  asin: (x) => toDeg(Math.asin(x)),
  acos: (x) => toDeg(Math.acos(x)),
  atan: (x) => toDeg(Math.atan(x))
}, { override: true });

// ==========================================
// 1. Logic & Natural Display Rendering
// ==========================================
const LogicUtil = {
  formatDisplay: (expr, cursor) => {
    // وضع المؤشر البصري
    let raw = expr.slice(0, cursor) + "|" + expr.slice(cursor);
    if (!expr) raw = "|";

    // تحويل الصيغ النصية إلى LaTeX طبيعي
    let tex = raw
      .replace(/\|/g, '\\color{black}{|}') 
      .replace(/×/g, '\\times ')
      .replace(/÷/g, '\\div ')
      .replace(/π/g, '\\pi ')
      .replace(/Ans/g, '\\text{Ans}')
      .replace(/sin\(/g, '\\sin(')
      .replace(/cos\(/g, '\\cos(')
      .replace(/tan\(/g, '\\tan(');

    // منطق الكسر العمودي (a/b -> \frac{a}{b})
    // نبحث عن نمط "رقم/رقم" أو "قوس/قوس"
    while (tex.includes('/')) {
      tex = tex.replace(/([0-9a-zA-Z.\\pi]+|\([^)]*\))\/([0-9a-zA-Z.\\pi]+|\([^)]*\))/, '\\frac{$1}{$2}');
    }

    // منطق التربيع والأس (x^2 أو x^n)
    tex = tex.replace(/\^2/g, '^{2}');
    tex = tex.replace(/\^/g, '^{'); // فتح قوس للأس المتغير

    // منطق الجذر الممتد
    let finalTex = '';
    let rootDepth = 0;
    let powerDepth = 0;
    let processed = tex.replace(/sqrt\(/g, '\\sqrt{');

    for (let char of processed) {
      if (char === '(') {
        // إذا كنا داخل جذر أو أس، نستخدم الأقواس المتعرجة لـ LaTeX
        finalTex += '{';
      } else if (char === ')') {
        finalTex += '}';
      } else {
        finalTex += char;
      }
    }

    // إغلاق أي أقواس LaTeX مفتوحة تلقائياً للعرض فقط
    const openBraces = (finalTex.match(/\{/g) || []).length;
    const closeBraces = (finalTex.match(/\}/g) || []).length;
    return finalTex + '}'.repeat(Math.max(0, openBraces - closeBraces));
  },

  prepareForMathJS: (expr, ans) => {
    let clean = expr
      .replace(/Ans/g, `(${ans || 0})`)
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/π/g, 'pi')
      .replace(/sqrt/g, 'sqrt')
      .replace(/x10\^/g, '*10^');

    clean = clean.replace(/(\d)(\()/g, '$1*$2');
    clean = clean.replace(/(\))(\d)/g, '$1*$2');
    clean = clean.replace(/(\d)(pi|e|sin|cos|tan|sqrt|log)/g, '$1*$2');

    const openCount = (clean.match(/\(/g) || []).length;
    const closeCount = (clean.match(/\)/g) || []).length;
    if (openCount > closeCount) clean += ')'.repeat(openCount - closeCount);

    return clean;
  }
};

// ==========================================
// 2. Reducer & State
// ==========================================
const initialState = { expression: '', result: '', ans: '', cursorPos: 0, isShift: false, isAlpha: false, error: false };

function reducer(state, action) {
  if (state.error && !['AC', 'DEL'].includes(action.type)) return { ...initialState, ans: state.ans };

  switch (action.type) {
    case 'MOVE_LEFT': return { ...state, cursorPos: Math.max(0, state.cursorPos - 1) };
    case 'MOVE_RIGHT': return { ...state, cursorPos: Math.min(state.expression.length, state.cursorPos + 1) };
    case 'INPUT':
      let val = action.payload.p;
      if (state.isShift && action.payload.s) val = action.payload.s;
      else if (state.isAlpha && action.payload.a) val = action.payload.a;
      if (!val) return state;

      const newExpr = state.expression.slice(0, state.cursorPos) + val + state.expression.slice(state.cursorPos);
      return { ...state, expression: newExpr, cursorPos: state.cursorPos + val.length, isShift: false, isAlpha: false };

    case 'DEL':
      if (state.cursorPos === 0) return state;
      return { 
        ...state, 
        expression: state.expression.slice(0, state.cursorPos - 1) + state.expression.slice(state.cursorPos), 
        cursorPos: state.cursorPos - 1, 
        error: false 
      };

    case 'AC': return { ...initialState, ans: state.ans };
    case 'SHIFT': return { ...state, isShift: !state.isShift, isAlpha: false };
    case 'ALPHA': return { ...state, isAlpha: !state.isAlpha, isShift: false };

    case 'EVAL':
      try {
        const formula = LogicUtil.prepareForMathJS(state.expression, state.ans);
        const res = math.evaluate(formula);
        const out = Number.isInteger(res) ? String(res) : Number(res.toFixed(9)).toString();
        return { ...state, result: out, ans: out, error: false, cursorPos: state.expression.length };
      } catch { return { ...state, result: 'Math ERROR', error: true }; }
    
    default: return state;
  }
}

// ==========================================
// 3. UI Components
// ==========================================
const Key = ({ label, subY, subP, type, onClick }) => (
  <div className="flex flex-col items-center">
    <div className="flex justify-between w-full px-1 text-[7px] font-bold h-3 mb-0.5">
      <span className="text-[#c89222]">{subY}</span>
      <span className="text-[#a53b49]">{subP}</span>
    </div>
    <motion.button
      whileTap={{ scale: 0.92, y: 1 }}
      onClick={onClick}
      className={`rounded-md font-bold shadow-md active:shadow-none border-t border-white/40 flex items-center justify-center
        ${type === 'orange' ? 'w-12 h-9 bg-[#f17127] text-white shadow-[#c0581f]' : 
          type === 'sci' ? 'w-[38px] h-[22px] bg-[#222] text-white text-[9px] shadow-[#111]' :
          type === 'ctrl' ? 'w-8 h-4 bg-[#7a7b8c] text-white text-[6px] shadow-[#505160]' :
          'w-12 h-9 bg-[#f4f4f4] text-[#111] shadow-[#ccc]'}`}
    >
      {label}
    </motion.button>
  </div>
);

// ==========================================
// 4. Main App
// ==========================================
const CasioCalculator = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const displayLaTeX = useMemo(() => {
    return LogicUtil.formatDisplay(state.expression, state.cursorPos);
  }, [state.expression, state.cursorPos]);

  return (
    <div className="flex items-center justify-center  font-sans select-none">
      <div className="bg-[#484a5c] w-[350px] p-2 rounded-[45px] shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
        <div className="bg-gradient-to-b from-[#f2f4f7] via-[#cfd3d8] to-[#a2a6ae] rounded-[40px] px-5 py-6 shadow-inner">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <h1 className="text-[#222] font-black text-xl italic leading-none font-serif">CASIO</h1>
              <div className="text-[8px] text-emerald-900 font-bold italic mt-1 font-serif tracking-tighter">NATURAL-V.P.A.M.</div>
            </div>
            <div className="w-16 h-7 bg-[#4d3328] rounded-sm shadow-inner flex p-0.5 gap-0.5 border border-[#888]">
              {[1,2,3,4].map(i => <div key={i} className="flex-1 bg-[#231712] opacity-60"></div>)}
            </div>
          </div>

          {/* Screen (Natural Display) */}
          <div className="bg-[#b9c3af] h-30 rounded shadow-inner border-[3px] border-[#333] mb-6 flex flex-col p-2 font-mono text-[#111] relative overflow-hidden">
             <div className="text-[9px] flex gap-3 font-bold mb-1 opacity-70">
                <span className={state.isShift ? 'opacity-100' : 'opacity-20'}>S</span>
                <span className={state.isAlpha ? 'opacity-100' : 'opacity-20'}>A</span>
                <span className="ml-auto">Math ▲</span>
             </div>
             <div className="text-2xl h-10 overflow-x-auto overflow-y-hidden  whitespace-nowrap scrollbar-hide py-1">
                <InlineMath math={displayLaTeX} />
             </div>
             <div className="text-3xl font-bold text-right mt-auto tracking-tighter">{state.result}</div>
          </div>

          {/* Navigation & Controls */}
          <div className="flex justify-between items-center h-20 mb-4 px-1">
            <div className="flex flex-col gap-2">
              <Key label="SHIFT" type="ctrl" onClick={() => dispatch({ type: 'SHIFT' })} />
              <Key label="ALPHA" type="ctrl" onClick={() => dispatch({ type: 'ALPHA' })} />
            </div>

            <div className="w-20 h-16 bg-[#6e7084] rounded-[50%] shadow-lg border-2 border-[#5a5c6e] relative flex items-center justify-center">
               <button onClick={() => dispatch({ type: 'MOVE_LEFT' })} className="absolute left-2 text-gray-300 text-[12px] active:text-white px-2 py-4 transition-colors">◀</button>
               <button onClick={() => dispatch({ type: 'MOVE_RIGHT' })} className="absolute right-2 text-gray-300 text-[12px] active:text-white px-2 py-4 transition-colors">▶</button>
               <div className="w-8 h-8 rounded-full bg-[#7a7c90] shadow-inner flex items-center justify-center border border-black/10">
                 <span className="text-[6px] font-bold text-gray-800 tracking-tighter">REPLAY</span>
               </div>
            </div>

            <div className="flex flex-col gap-2">
              <Key label="MODE" type="ctrl" onClick={() => {}} />
              <Key label="ON" type="ctrl" onClick={() => dispatch({ type: 'AC' })} />
            </div>
          </div>

          {/* Scientific Grid */}
          <div className="grid grid-cols-6 gap-x-[7px] gap-y-1 mb-6">
            <Key label="■/□" subY="abc" type="sci" onClick={() => dispatch({ type: 'INPUT', payload: { p: '/' } })} />
            <Key label="√" subY="∛" type="sci" onClick={() => dispatch({ type: 'INPUT', payload: { p: 'sqrt(' } })} />
            <Key label="x²" subY="x³" type="sci" onClick={() => dispatch({ type: 'INPUT', payload: { p: '^2' } })} />
            <Key label="xⁿ" subY="ⁿ√" type="sci" onClick={() => dispatch({ type: 'INPUT', payload: { p: '^(' } })} />
            <Key label="log" subY="10ⁿ" type="sci" onClick={() => dispatch({ type: 'INPUT', payload: { p: 'log10(' } })} />
            <Key label="ln" subY="eⁿ" type="sci" onClick={() => dispatch({ type: 'INPUT', payload: { p: 'ln(' } })} />
            <Key label="(-)" subY="A" type="sci" onClick={() => dispatch({ type: 'INPUT', payload: { p: '-' } })} />
            <Key label="°'\" subY="B" type="sci" onClick={() => {}} />
            <Key label="hyp" subP="C" type="sci" onClick={() => {}} />
            <Key label="sin" subY="sin⁻¹" subP="D" type="sci" onClick={() => dispatch({ type: 'INPUT', payload: { p: 'sin(', s: 'asin(', a: 'D' } })} />
            <Key label="cos" subY="cos⁻¹" subP="E" type="sci" onClick={() => dispatch({ type: 'INPUT', payload: { p: 'cos(', s: 'acos(', a: 'E' } })} />
            <Key label="tan" subY="tan⁻¹" subP="F" type="sci" onClick={() => dispatch({ type: 'INPUT', payload: { p: 'tan(', s: 'atan(', a: 'F' } })} />
            <Key label="RCL" subY="STO" type="sci" onClick={() => {}} />
            <Key label="ENG" subY="←" type="sci" onClick={() => {}} />
            <Key label="(" subP="X" type="sci" onClick={() => dispatch({ type: 'INPUT', payload: { p: '(', a: 'X' } })} />
            <Key label=")" subP="Y" type="sci" onClick={() => dispatch({ type: 'INPUT', payload: { p: ')', a: 'Y' } })} />
            <Key label="S⇔D" type="sci" onClick={() => {}} />
            <Key label="M+" subY="M-" subP="M" type="sci" onClick={() => {}} />
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-5 gap-2.5">
            {['7','8','9'].map(n => <Key key={n} label={n} onClick={() => dispatch({ type: 'INPUT', payload: { p: n } })} />)}
            <Key label="DEL" type="orange" onClick={() => dispatch({ type: 'DEL' })} />
            <Key label="AC" type="orange" onClick={() => dispatch({ type: 'AC' })} />
            
            {['4','5','6'].map(n => <Key key={n} label={n} onClick={() => dispatch({ type: 'INPUT', payload: { p: n } })} />)}
            <Key label="×" onClick={() => dispatch({ type: 'INPUT', payload: { p: '×' } })} />
            <Key label="÷" onClick={() => dispatch({ type: 'INPUT', payload: { p: '÷' } })} />

            {['1','2','3'].map(n => <Key key={n} label={n} onClick={() => dispatch({ type: 'INPUT', payload: { p: n } })} />)}
            <Key label="+" onClick={() => dispatch({ type: 'INPUT', payload: { p: '+' } })} />
            <Key label="-" onClick={() => dispatch({ type: 'INPUT', payload: { p: '-' } })} />

            <Key label="0" onClick={() => dispatch({ type: 'INPUT', payload: { p: '0' } })} />
            <Key label="." onClick={() => dispatch({ type: 'INPUT', payload: { p: '.' } })} />
            <Key label="x10ˣ" subY="π" subP="e" onClick={() => dispatch({ type: 'INPUT', payload: { p: 'x10^', s: 'π', a: 'e' } })} />
            <Key label="Ans" onClick={() => dispatch({ type: 'INPUT', payload: { p: 'Ans' } })} />
            <Key label="=" onClick={() => dispatch({ type: 'EVAL' })} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CasioCalculator;