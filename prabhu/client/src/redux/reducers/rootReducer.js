import { combineReducers } from "redux"; // ✅ Import this
import loginReducer from "./loginReducer";
import registerReducer from "./registerReducer";

const rootReducer = combineReducers({
  // add other reducers here later
  login: loginReducer,
  register: registerReducer
});

export default rootReducer; // ✅ Export it
