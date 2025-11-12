import * as types from "../actions/actionTypes";

const initialState = {
  loading: false,
  user: null,
  error: null,
  isRegistered: false,
};

const registerReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.REGISTER_START:
      return { ...state, loading: true, error: null };

    case types.REGISTER_SUCCESS:
      return {
        ...state,
        loading: false,
        user: action.payload,   // backend returns user data
        isRegistered: true,
      };

    case types.REGISTER_ERROR:
      return { ...state, loading: false, error: action.payload, isRegistered: false };

    default:
      return state;
  }
};

export default registerReducer;
