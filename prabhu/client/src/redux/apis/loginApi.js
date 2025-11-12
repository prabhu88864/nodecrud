import API from "../../API/API";
const api = new API();

export const loginApi = (credentials) => {
  // replace `auth/login` with your actual endpoint
  return api.post("api/auth/login", credentials);
};
