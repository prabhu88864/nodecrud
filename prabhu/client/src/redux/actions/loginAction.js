import * as types from "./actionTypes"
import { loginApi } from "../../redux/apis/loginApi"; // we'll define this API next

// Start Action
export const loginStart = () => ({
  type: types.LOGIN_START,
});

// Success Action
export const loginSuccess = (data) => ({
  type: types.LOGIN_SUCCESS,
  payload: data,
});

// Error Action
export const loginError = (error) => ({
  type: types.LOGIN_ERROR,
  payload: error,
});

// Logout Action
export const logoutUser = () => ({
  type: types.LOGOUT_USER,
});

// Main Initiator (Thunk)
export const loginInitiate = (credentials,  navigate) => {
  return function (dispatch) {
    dispatch(loginStart());
    console.log("loginInitiate called with:", credentials);

    loginApi(credentials)
      .then((res) => {
        console.log("login response", res);

        const userData = res?.data;
        const token = userData?.token;

        // Store token in localStorage
        if (token) localStorage.setItem("token", token);

        dispatch(loginSuccess(userData));
        navigate("/dashboard");
      })
      .catch((error) => {
        console.error("login error", error);
        dispatch(loginError(error.message || "Login failed"));
      });
  };
};

export default {
  loginInitiate,
  logoutUser,
};
