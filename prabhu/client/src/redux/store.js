import { legacy_createStore as createStore, applyMiddleware, compose } from "redux";
import {thunk} from "redux-thunk"; // ✅ Correct import
import logger from "redux-logger";
import rootReducer from "./reducers/rootReducer";

// Setup middleware
const middleware = [thunk];

// Add logger only in development
if (process.env.NODE_ENV === "development") {
  middleware.push(logger);
}

// Enable Redux DevTools
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

// Create the store
const store = createStore(rootReducer, composeEnhancers(applyMiddleware(...middleware)));

export default store;
