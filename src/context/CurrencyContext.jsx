import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { chooseCurrency, detectZone, getList, getPick, savePick, setCurrencyList, setCurrent } from "../lib/currency";

/* Shows every price in the student's currency (see lib/currency.js). Loads the currencies admin set up,
   picks one from the device's zone (or the student's own choice) and re-draws the pages when it changes. */
const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [list, setList] = useState(getList);
  const [pick, setPick] = useState(getPick);
  const code = useMemo(() => chooseCurrency(list, pick), [list, pick]);
  setCurrent(code); // before children render, so money() already uses it

  useEffect(() => {
    api.get("/api/user/currencies")
      .then((r) => {
        const next = r.data?.data?.currencies || [];
        if (next.length) { setCurrencyList(next); setList(next); }
      })
      .catch(() => {}); // keep the cached list / EGP
  }, []);

  const choose = useCallback((c) => { savePick(c); setPick(c || ""); }, []);
  const value = useMemo(() => ({ code, list, pick, choose, detected: detectZone() }), [code, list, pick, choose]);

  // keyed on the currency so every price re-renders when the student switches (a rare action)
  return (
    <CurrencyContext.Provider value={value}>
      <Fragment key={code}>{children}</Fragment>
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext) || { code: "EGP", list: [], pick: "", choose: () => {}, detected: {} };
