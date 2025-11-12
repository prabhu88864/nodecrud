import * as types from "../actions/actionTypes";

const initialState = {
  loading: false,
  user: null,
  token: null,
  error: null,
  isLoggedIn: false,
};

const loginReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.LOGIN_START:
      return { ...state, loading: true, error: null };

    case types.LOGIN_SUCCESS:
      return {
        ...state,
        loading: false,
        user: action.payload.user,
        token: action.payload.token,
        isLoggedIn: true,
      };

    case types.LOGIN_ERROR:
      return { ...state, loading: false, error: action.payload };

    case types.LOGOUT_USER:
      localStorage.removeItem("token");
      return initialState;

    default:
      return state;
  }
};

export default loginReducer;
