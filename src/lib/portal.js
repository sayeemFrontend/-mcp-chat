import { createContext, useContext } from "react";

// Where Radix portals (tooltips, selects) render. Undefined = document.body; the Shadow DOM embed points it at a
// node inside its shadow root, otherwise the popups would land outside it and lose all styles.
export const PortalContainerContext = createContext(undefined);

export const usePortalContainer = () => useContext(PortalContainerContext);
