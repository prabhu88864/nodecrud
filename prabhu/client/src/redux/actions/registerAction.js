import * as types from "./actionTypes";
import { registerApi } from "../../redux/apis/registerApi"; // you'll create this API just like loginApi

// Start Action
export const registerStart = () => ({
  type: types.REGISTER_START,
});

// Success Action
export const registerSuccess = (data) => ({
  type: types.REGISTER_SUCCESS,
  payload: data,
});

// Error Action
export const registerError = (error) => ({
  type: types.REGISTER_ERROR,
  payload: error,
});

// Main Initiator (Thunk)
export const registerInitiate = (userData, navigate) => {
  return function (dispatch) {
    dispatch(registerStart());

    registerApi(userData)
      .then((res) => {
        console.log("register response", res);

        dispatch(registerSuccess(res.data));
        navigate("/login"); // ✅ redirect to login after successful registration
      })
      .catch((error) => {
        console.error("register error", error);
        dispatch(registerError(error.message || "Registration failed"));
      });
  };
};

export default {
  registerInitiate,
};
