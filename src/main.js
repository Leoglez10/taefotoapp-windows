import { createAppShell } from "./components/app-shell.js";
import { createStore } from "./store/app-store.js";

const mountNode = document.querySelector("#app");
const store = createStore();

createAppShell(mountNode, store);
